export type ContradictionSeverity = "low" | "medium" | "high";

export type FileSummary = {
  path: string;
  summary?: string;
  exports?: string[];
  imports?: string[];
  responsibilities?: string[];
};

export type PriorFinding = {
  title?: string;
  phase?: string;
  event?: string;
  description?: string;
  impact?: string;
  severity?: ContradictionSeverity;
};

export type ContradictionEvidence = {
  repositoryStructure?: string[];
  fileSummaries?: FileSummary[];
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  historianFindings?: PriorFinding[];
  forensicFindings?: PriorFinding[];
};

export type ContradictionFinding = {
  title: string;
  description: string;
  evidence: string;
  impact: string;
  severity: ContradictionSeverity;
};

export type ArchitecturalTension = {
  legacyApproach: string;
  modernApproach: string;
  conflict: string;
};

export type ContradictionReport = {
  agent: "Contradiction";
  contradictions: ContradictionFinding[];
  patternsDetected: string[];
  architecturalTension: ArchitecturalTension[];
  summary: string;
};

const STATE_LIBRARIES = ["redux", "zustand", "mobx", "recoil", "jotai"];
const UI_LIBRARIES = ["@mui/material", "antd", "chakra-ui", "react-bootstrap", "shadcn"];
const STYLE_LIBRARIES = ["tailwindcss", "styled-components", "@emotion/react", "sass"];
const AUTH_LIBRARIES = ["next-auth", "passport", "@clerk/nextjs", "@auth/core", "firebase"];
const API_CLIENTS = ["axios", "graphql", "@apollo/client", "swr", "@tanstack/react-query"];

function allDependencies(evidence: ContradictionEvidence) {
  return {
    ...(evidence.dependencies ?? {}),
    ...(evidence.devDependencies ?? {}),
  };
}

function dependencyMatches(evidence: ContradictionEvidence, names: string[]) {
  const dependencies = allDependencies(evidence);
  return Object.keys(dependencies).filter((dependency) =>
    names.some((name) => dependency.toLowerCase().includes(name.toLowerCase()))
  );
}

function hasPath(paths: string[] = [], token: string) {
  return paths.some((path) => path.toLowerCase().includes(token.toLowerCase()));
}

function matchingPaths(paths: string[] = [], tokens: string[]) {
  return paths.filter((path) => {
    const lowerPath = path.toLowerCase();
    return tokens.some((token) => lowerPath.includes(token.toLowerCase()));
  });
}

function summariesMention(fileSummaries: FileSummary[] = [], tokens: string[]) {
  return fileSummaries.filter((file) => {
    const haystack = [
      file.path,
      file.summary,
      ...(file.exports ?? []),
      ...(file.imports ?? []),
      ...(file.responsibilities ?? []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return tokens.some((token) => haystack.includes(token.toLowerCase()));
  });
}

function uniqueParentFolders(paths: string[]) {
  return Array.from(
    new Set(
      paths.map((path) => {
        const normalized = path.replace(/\\/g, "/");
        const parts = normalized.split("/");
        return parts.length > 1 ? parts[0] : ".";
      })
    )
  );
}

function pushDependencyContradiction(
  contradictions: ContradictionFinding[],
  title: string,
  matches: string[],
  category: string
) {
  if (matches.length < 2) {
    return;
  }

  contradictions.push({
    title,
    description: `The dependency list contains multiple ${category} libraries: ${matches.join(", ")}.`,
    evidence: `Detected dependency overlap in package metadata: ${matches.join(", ")}.`,
    impact:
      "Competing libraries can cause different areas of the project to follow different implementation conventions.",
    severity: matches.length > 2 ? "high" : "medium",
  });
}

function detectContradictions(evidence: ContradictionEvidence): ContradictionFinding[] {
  const contradictions: ContradictionFinding[] = [];
  const structure = evidence.repositoryStructure ?? [];
  const fileSummaries = evidence.fileSummaries ?? [];

  pushDependencyContradiction(
    contradictions,
    "Multiple State Management Approaches",
    dependencyMatches(evidence, STATE_LIBRARIES),
    "state management"
  );

  pushDependencyContradiction(
    contradictions,
    "Multiple UI Frameworks",
    dependencyMatches(evidence, UI_LIBRARIES),
    "UI framework"
  );

  pushDependencyContradiction(
    contradictions,
    "Multiple Styling Systems",
    dependencyMatches(evidence, STYLE_LIBRARIES),
    "styling"
  );

  pushDependencyContradiction(
    contradictions,
    "Multiple Authentication Systems",
    dependencyMatches(evidence, AUTH_LIBRARIES),
    "authentication"
  );

  pushDependencyContradiction(
    contradictions,
    "Competing API Data Clients",
    dependencyMatches(evidence, API_CLIENTS),
    "API data access"
  );

  const appRouter = hasPath(structure, "app/");
  const pagesRouter = hasPath(structure, "pages/");
  if (appRouter && pagesRouter) {
    contradictions.push({
      title: "Mixed Routing Architecture",
      description:
        "The repository contains both app-style routing and pages-style routing structures.",
      evidence: "Both app/ and pages/ paths were detected in the repository structure.",
      impact:
        "Routing behavior and data-loading conventions may diverge across the frontend surface.",
      severity: "medium",
    });
  }

  const apiLocations = matchingPaths(structure, ["api/", "routes/", "controllers/"]);
  const apiFolders = uniqueParentFolders(apiLocations);
  if (apiLocations.length > 1 && apiFolders.length > 1) {
    contradictions.push({
      title: "Distributed API Responsibility",
      description:
        "API-related files appear in multiple folder families, suggesting competing endpoint organization styles.",
      evidence: `API-like paths found across ${apiFolders.join(", ")}.`,
      impact:
        "Endpoint ownership can become harder to trace when route definitions and controllers follow different layouts.",
      severity: "medium",
    });
  }

  const servicePaths = matchingPaths(structure, ["service", "client", "lib/api", "utils/api"]);
  if (servicePaths.length > 2 && uniqueParentFolders(servicePaths).length > 1) {
    contradictions.push({
      title: "Possible Duplicate Service Layers",
      description:
        "Service or client responsibilities appear to be spread across multiple structural locations.",
      evidence: `Service-like paths include: ${servicePaths.slice(0, 6).join(", ")}.`,
      impact:
        "The same integration responsibility may be implemented through parallel abstractions.",
      severity: "medium",
    });
  }

  const authFiles = summariesMention(fileSummaries, ["auth", "session", "token", "login"]);
  if (authFiles.length > 1 && uniqueParentFolders(authFiles.map((file) => file.path)).length > 1) {
    contradictions.push({
      title: "Possible Split Authentication Responsibility",
      description:
        "Authentication-related behavior appears in multiple areas of the repository.",
      evidence: `Auth-related summaries found in: ${authFiles.map((file) => file.path).join(", ")}.`,
      impact:
        "Session and authorization assumptions may drift when authentication logic is distributed.",
      severity: "medium",
    });
  }

  const parserFiles = summariesMention(fileSummaries, ["parse", "parser", "extract"]);
  if (parserFiles.length > 1) {
    contradictions.push({
      title: "Possible Duplicate Parsing Logic",
      description:
        "Multiple files appear to claim parsing or extraction responsibilities.",
      evidence: `Parsing-related files include: ${parserFiles.map((file) => file.path).join(", ")}.`,
      impact:
        "Repository interpretation may become inconsistent if parsing rules evolve separately.",
      severity: parserFiles.length > 3 ? "high" : "low",
    });
  }

  const historianMentionsScaffold = (evidence.historianFindings ?? []).some((finding) =>
    [finding.title, finding.phase, finding.event, finding.description]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes("scaffold")
  );
  const forensicMentionsImplemented = (evidence.forensicFindings ?? []).some((finding) =>
    [finding.title, finding.phase, finding.event, finding.description]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes("implemented")
  );

  if (historianMentionsScaffold && forensicMentionsImplemented) {
    contradictions.push({
      title: "Historical Scaffold Versus Implemented Behavior",
      description:
        "Historian evidence suggests scaffold-stage development while forensic evidence describes implemented behavior.",
      evidence:
        "Historian findings mention scaffolding and forensic findings mention implemented functionality.",
      impact:
        "The project may contain areas where planned architecture and actual implementation maturity are uneven.",
      severity: "low",
    });
  }

  return contradictions;
}

function detectPatterns(evidence: ContradictionEvidence, contradictions: ContradictionFinding[]) {
  const patterns: string[] = [];
  const structure = evidence.repositoryStructure ?? [];

  if (contradictions.length === 0) {
    patterns.push("No strong contradictions were detected from the supplied evidence.");
  }

  if (hasPath(structure, "agents/")) {
    patterns.push("Agent-oriented architecture detected.");
  }

  if (hasPath(structure, "components/")) {
    patterns.push("Componentized frontend surface detected.");
  }

  if (hasPath(structure, "lib/") && hasPath(structure, "utils/")) {
    patterns.push("Both lib and utils folders are present, which can indicate overlapping shared-code conventions.");
  }

  if (dependencyMatches(evidence, STATE_LIBRARIES).length > 1) {
    patterns.push("Competing state management dependencies detected.");
  }

  if (dependencyMatches(evidence, STYLE_LIBRARIES).length > 1) {
    patterns.push("Multiple styling systems detected.");
  }

  return patterns;
}

function detectArchitecturalTension(evidence: ContradictionEvidence): ArchitecturalTension[] {
  const tensions: ArchitecturalTension[] = [];
  const structure = evidence.repositoryStructure ?? [];

  if (hasPath(structure, "pages/") && hasPath(structure, "app/")) {
    tensions.push({
      legacyApproach: "pages directory routing",
      modernApproach: "app directory routing",
      conflict:
        "Both routing models can coexist during migration, but they follow different conventions for layouts, loading, and server boundaries.",
    });
  }

  if (hasPath(structure, "utils/") && hasPath(structure, "lib/")) {
    tensions.push({
      legacyApproach: "general-purpose utilities",
      modernApproach: "domain-oriented library modules",
      conflict:
        "Shared logic may be split between broad helper files and more intentional domain modules.",
    });
  }

  if (hasPath(structure, "agents/") && hasPath(structure, "services/")) {
    tensions.push({
      legacyApproach: "service-layer orchestration",
      modernApproach: "agent-based orchestration",
      conflict:
        "Workflow ownership may be unclear if both services and agents coordinate the same repository analysis behavior.",
    });
  }

  return tensions;
}

function buildSummary(contradictions: ContradictionFinding[]) {
  if (contradictions.length === 0) {
    return "No direct architectural contradictions were found in the supplied evidence. The repository may still be too early or too lightly described for conflicts to be visible.";
  }

  const highCount = contradictions.filter((item) => item.severity === "high").length;
  const mediumCount = contradictions.filter((item) => item.severity === "medium").length;

  return `The Contradiction Agent found ${contradictions.length} potential inconsistency area(s): ${highCount} high severity and ${mediumCount} medium severity. The main tensions involve competing architectural locations, duplicated responsibilities, or overlapping dependency choices.`;
}

export function analyzeContradictions(evidence: ContradictionEvidence): ContradictionReport {
  const contradictions = detectContradictions(evidence);

  return {
    agent: "Contradiction",
    contradictions,
    patternsDetected: detectPatterns(evidence, contradictions),
    architecturalTension: detectArchitecturalTension(evidence),
    summary: buildSummary(contradictions),
  };
}

export const contradiction = {
  name: "Contradiction",
  analyze: analyzeContradictions,
};
