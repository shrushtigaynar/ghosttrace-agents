export type Severity = "low" | "medium" | "high";

export type CommitEvidence = {
  hash?: string;
  date?: string;
  author?: string;
  message: string;
  filesChanged?: number;
  insertions?: number;
  deletions?: number;
};

export type RepositoryEvidence = {
  name: string;
  structure?: string[];
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  commits?: CommitEvidence[];
  metadata?: Record<string, unknown>;
};

export type HistorianTimelineEvent = {
  phase: string;
  event: string;
  impact: string;
  severity: Severity;
};

export type HistorianDecision = {
  decision: string;
  consequence: string;
};

export type HistorianReport = {
  agent: "Historian";
  timeline: HistorianTimelineEvent[];
  keyDecisions: HistorianDecision[];
  historicalObservations: string[];
  story: string;
};

const FEATURE_WORDS = [
  "add",
  "feature",
  "implement",
  "create",
  "upload",
  "dashboard",
  "agent",
  "api",
  "timeline",
  "risk",
  "verdict",
];

const HOTFIX_WORDS = ["fix", "bug", "patch", "hotfix", "repair", "resolve"];
const RESTRUCTURE_WORDS = ["refactor", "move", "rename", "split", "restructure", "migrate"];

function countDependencies(evidence: RepositoryEvidence) {
  return (
    Object.keys(evidence.dependencies ?? {}).length +
    Object.keys(evidence.devDependencies ?? {}).length
  );
}

function hasPath(structure: string[] = [], token: string) {
  return structure.some((path) => path.toLowerCase().includes(token));
}

function countMessages(commits: CommitEvidence[] = [], words: string[]) {
  return commits.filter((commit) => {
    const message = commit.message.toLowerCase();
    return words.some((word) => message.includes(word));
  }).length;
}

function uniqueDates(commits: CommitEvidence[] = []) {
  return new Set(commits.map((commit) => commit.date).filter(Boolean)).size;
}

function buildTimeline(evidence: RepositoryEvidence): HistorianTimelineEvent[] {
  const commits = evidence.commits ?? [];
  const structure = evidence.structure ?? [];
  const dependencyCount = countDependencies(evidence);
  const featureCommits = countMessages(commits, FEATURE_WORDS);
  const hotfixCommits = countMessages(commits, HOTFIX_WORDS);
  const restructureCommits = countMessages(commits, RESTRUCTURE_WORDS);
  const commitDays = uniqueDates(commits);
  const firstCommit = commits[commits.length - 1] ?? commits[0];
  const latestCommit = commits[0];

  const timeline: HistorianTimelineEvent[] = [
    {
      phase: "Phase 1: Project Genesis",
      event: firstCommit
        ? `The earliest visible commit, "${firstCommit.message}", established ${evidence.name}.`
        : `${evidence.name} has no visible commit history in the supplied evidence.`,
      impact: firstCommit
        ? "The project history begins with an identifiable starting point for later architectural and feature growth."
        : "The historical reconstruction must rely on structure and metadata rather than chronological commit evidence.",
      severity: commits.length ? "medium" : "high",
    },
  ];

  if (hasPath(structure, "app/") || hasPath(structure, "pages/")) {
    timeline.push({
      phase: "Phase 2: Application Shell",
      event: "Application routing files appeared in the repository structure.",
      impact:
        "The project moved from repository initialization toward a user-facing application surface.",
      severity: "medium",
    });
  }

  if (hasPath(structure, "components/")) {
    timeline.push({
      phase: "Phase 3: Interface Expansion",
      event: "Reusable UI component files became part of the project map.",
      impact:
        "The product began accumulating visible workflow surfaces, suggesting growth around interaction and presentation.",
      severity: "medium",
    });
  }

  if (hasPath(structure, "agents/")) {
    timeline.push({
      phase: "Phase 4: Agent Architecture",
      event: "Agent modules were introduced as a distinct architectural layer.",
      impact:
        "The system identity shifted toward coordinated AI roles instead of a single monolithic analysis routine.",
      severity: "high",
    });
  }

  if (dependencyCount > 0) {
    timeline.push({
      phase: "Phase 5: Dependency Expansion",
      event: `${dependencyCount} declared package dependencies are present in the repository metadata.`,
      impact:
        "The project began relying on external libraries, increasing implementation capability and historical complexity.",
      severity: dependencyCount > 12 ? "high" : "medium",
    });
  } else {
    timeline.push({
      phase: "Phase 5: Minimal Dependency Era",
      event: "No declared package dependencies were found in the supplied dependency evidence.",
      impact:
        "The project appears to be in an early scaffold stage before library-driven expansion.",
      severity: "low",
    });
  }

  if (featureCommits > 0) {
    timeline.push({
      phase: "Phase 6: Feature Growth",
      event: `${featureCommits} commit message(s) indicate feature-oriented development.`,
      impact:
        "The repository shows signs of product capability being added through visible feature increments.",
      severity: featureCommits > 5 ? "high" : "medium",
    });
  }

  if (restructureCommits > 0) {
    timeline.push({
      phase: "Phase 7: Structural Reorganization",
      event: `${restructureCommits} commit message(s) suggest migration, refactoring, or file movement.`,
      impact:
        "The architecture likely changed shape as the project adapted to new responsibilities.",
      severity: restructureCommits > 3 ? "high" : "medium",
    });
  }

  if (hotfixCommits > 0) {
    timeline.push({
      phase: "Phase 8: Hotfix Pressure",
      event: `${hotfixCommits} commit message(s) use repair-oriented language.`,
      impact:
        "The history contains evidence of reactive development periods after earlier changes landed.",
      severity: hotfixCommits > 3 ? "high" : "medium",
    });
  }

  if (commits.length > 8 && commitDays <= 2) {
    timeline.push({
      phase: "Phase 9: Compressed Development Burst",
      event: `${commits.length} commits occurred across only ${commitDays || 1} recorded day(s).`,
      impact:
        "The project shows signs of rapid construction where multiple historical steps were compressed into a short window.",
      severity: "high",
    });
  }

  if (latestCommit && latestCommit !== firstCommit) {
    timeline.push({
      phase: "Phase 10: Latest Recorded State",
      event: `The most recent visible commit is "${latestCommit.message}".`,
      impact:
        "This commit marks the current endpoint of the available project evolution record.",
      severity: "low",
    });
  }

  return timeline;
}

function buildDecisions(evidence: RepositoryEvidence): HistorianDecision[] {
  const decisions: HistorianDecision[] = [];
  const structure = evidence.structure ?? [];

  if (hasPath(structure, "agents/")) {
    decisions.push({
      decision: "Separate forensic intelligence into named agent modules.",
      consequence:
        "Historical complexity began accumulating through specialized roles and orchestration boundaries.",
    });
  }

  if (hasPath(structure, "components/")) {
    decisions.push({
      decision: "Represent the product through reusable interface components.",
      consequence:
        "Feature growth could be expressed as visible panels, meters, timelines, and workflow surfaces.",
    });
  }

  if (hasPath(structure, "api/")) {
    decisions.push({
      decision: "Expose analysis through an application API route.",
      consequence:
        "The project reserved a backend entry point for repository analysis and agent coordination.",
    });
  }

  if (hasPath(structure, "lib/")) {
    decisions.push({
      decision: "Place shared parsing and integration logic in a library layer.",
      consequence:
        "Repository analysis, model calls, and supporting data could evolve separately from UI files.",
    });
  }

  if (countDependencies(evidence) === 0) {
    decisions.push({
      decision: "Keep the initial dependency footprint minimal.",
      consequence:
        "The visible history suggests a scaffold-first project before external library expansion.",
    });
  }

  return decisions;
}

function buildObservations(evidence: RepositoryEvidence): string[] {
  const commits = evidence.commits ?? [];
  const dependencyCount = countDependencies(evidence);
  const structure = evidence.structure ?? [];
  const observations: string[] = [];

  observations.push(
    commits.length
      ? `The supplied history contains ${commits.length} visible commit(s).`
      : "No commit records were supplied, so the timeline is inferred from repository structure."
  );

  observations.push(
    `The repository currently exposes ${structure.length} tracked structural path(s) to historical analysis.`
  );

  observations.push(
    dependencyCount
      ? `Dependency evidence shows ${dependencyCount} declared package relationship(s).`
      : "Dependency evidence does not yet show a library expansion event."
  );

  if (hasPath(structure, "agents/")) {
    observations.push(
      "The agent directory is a major historical signal that the system was conceived as multiple cooperating forensic roles."
    );
  }

  if (hasPath(structure, "components/")) {
    observations.push(
      "The component directory indicates that user-facing workflow surfaces were planned as part of the system's early shape."
    );
  }

  if (commits.length === 1) {
    observations.push(
      "A single-commit history compresses project origin, architecture, and feature intent into one forensic snapshot."
    );
  }

  return observations;
}

function buildStory(evidence: RepositoryEvidence, timeline: HistorianTimelineEvent[]) {
  const dependencyCount = countDependencies(evidence);
  const commits = evidence.commits ?? [];
  const structure = evidence.structure ?? [];
  const layers = [
    hasPath(structure, "agents/") ? "agent roles" : "",
    hasPath(structure, "components/") ? "interface components" : "",
    hasPath(structure, "api/") ? "API entry points" : "",
    hasPath(structure, "lib/") ? "shared library utilities" : "",
  ].filter(Boolean);

  return `${evidence.name} appears to have evolved from ${
    commits.length ? "a visible repository starting point" : "a structure-first snapshot"
  } into a planned forensic intelligence system organized around ${
    layers.length ? layers.join(", ") : "a small set of project files"
  }. The historical record shows ${
    timeline.length
  } reconstructed phase(s), with ${
    dependencyCount
      ? "dependency growth already present in the metadata"
      : "dependency growth not yet visible in the supplied evidence"
  }. Complexity accumulated primarily through named architectural surfaces and role separation rather than through a long visible sequence of implementation commits.`;
}

export function analyzeHistory(evidence: RepositoryEvidence): HistorianReport {
  const timeline = buildTimeline(evidence);

  return {
    agent: "Historian",
    timeline,
    keyDecisions: buildDecisions(evidence),
    historicalObservations: buildObservations(evidence),
    story: buildStory(evidence, timeline),
  };
}

export const historian = {
  name: "Historian",
  analyze: analyzeHistory,
};
