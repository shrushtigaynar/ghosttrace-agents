export type ForensicSeverity = "low" | "medium" | "high";

export type FileSummary = {
  path: string;
  summary?: string;
  responsibilities?: string[];
  imports?: string[];
  exports?: string[];
};

export type FileStatistic = {
  path: string;
  lines?: number;
  functions?: number;
  maxFunctionLines?: number;
  imports?: number;
  exports?: number;
  changes?: number;
};

export type ComplexityMetric = {
  file: string;
  cyclomaticComplexity?: number;
  cognitiveComplexity?: number;
  dependencyCount?: number;
  responsibilityCount?: number;
};

export type DebtComment = {
  file: string;
  line?: number;
  tag: "TODO" | "FIXME" | "HACK" | "TEMP" | "LEGACY" | string;
  text: string;
};

export type LargeFileReport = {
  file: string;
  lines: number;
  reason?: string;
};

export type HistoricalFinding = {
  phase?: string;
  event?: string;
  impact?: string;
  severity?: ForensicSeverity;
};

export type ForensicEvidence = {
  repositoryStructure?: string[];
  fileSummaries?: FileSummary[];
  fileStatistics?: FileStatistic[];
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  complexityMetrics?: ComplexityMetric[];
  debtComments?: DebtComment[];
  largeFiles?: LargeFileReport[];
  historianFindings?: HistoricalFinding[];
};

export type ForensicFinding = {
  title: string;
  evidence: string;
  impact: string;
  severity: ForensicSeverity;
};

export type ForensicHotspot = {
  file: string;
  reason: string;
  severity: ForensicSeverity;
};

export type ForensicReport = {
  agent: "Forensic";
  findings: ForensicFinding[];
  hotspots: ForensicHotspot[];
  technicalDebtSignals: string[];
  architecturalObservations: string[];
  summary: string;
};

const LARGE_FILE_LINES = 400;
const VERY_LARGE_FILE_LINES = 800;
const LARGE_FUNCTION_LINES = 80;
const MANY_IMPORTS = 15;
const MANY_CHANGES = 20;
const HIGH_COMPLEXITY = 20;
const VERY_HIGH_COMPLEXITY = 35;
const MANY_RESPONSIBILITIES = 4;

function allDependencies(evidence: ForensicEvidence) {
  return {
    ...(evidence.dependencies ?? {}),
    ...(evidence.devDependencies ?? {}),
  };
}

function severityFromCount(count: number, medium: number, high: number): ForensicSeverity {
  if (count >= high) {
    return "high";
  }

  if (count >= medium) {
    return "medium";
  }

  return "low";
}

function hasPath(paths: string[] = [], token: string) {
  return paths.some((path) => path.toLowerCase().includes(token.toLowerCase()));
}

function findStatistic(evidence: ForensicEvidence, file: string) {
  return (evidence.fileStatistics ?? []).find((statistic) => statistic.path === file);
}

function uniqueFiles<T extends { file?: string; path?: string }>(items: T[]) {
  return Array.from(
    new Set(items.map((item) => item.file ?? item.path).filter(Boolean) as string[])
  );
}

function detectFindings(evidence: ForensicEvidence): ForensicFinding[] {
  const findings: ForensicFinding[] = [];
  const fileStatistics = evidence.fileStatistics ?? [];
  const complexityMetrics = evidence.complexityMetrics ?? [];
  const debtComments = evidence.debtComments ?? [];
  const fileSummaries = evidence.fileSummaries ?? [];
  const largeFiles = [
    ...(evidence.largeFiles ?? []),
    ...fileStatistics
      .filter((file) => (file.lines ?? 0) >= LARGE_FILE_LINES)
      .map((file) => ({ file: file.path, lines: file.lines ?? 0 })),
  ];

  if (largeFiles.length > 0) {
    const largest = [...largeFiles].sort((a, b) => b.lines - a.lines)[0];
    findings.push({
      title: "Large File Concentration",
      evidence: `${largeFiles.length} large file(s) detected; largest is ${largest.file} at ${largest.lines} lines.`,
      impact:
        "Large files often collect multiple responsibilities and become central evidence of complexity accumulation.",
      severity: largest.lines >= VERY_LARGE_FILE_LINES ? "high" : "medium",
    });
  }

  const oversizedFunctions = fileStatistics.filter(
    (file) => (file.maxFunctionLines ?? 0) >= LARGE_FUNCTION_LINES
  );
  if (oversizedFunctions.length > 0) {
    const worst = [...oversizedFunctions].sort(
      (a, b) => (b.maxFunctionLines ?? 0) - (a.maxFunctionLines ?? 0)
    )[0];
    findings.push({
      title: "Excessive Function Size",
      evidence: `${oversizedFunctions.length} file(s) contain functions at or above ${LARGE_FUNCTION_LINES} lines; highest observed is ${worst.path} with ${worst.maxFunctionLines} lines.`,
      impact:
        "Oversized functions indicate dense procedural regions where behavior is difficult to separate into clear evidence trails.",
      severity: (worst.maxFunctionLines ?? 0) >= 140 ? "high" : "medium",
    });
  }

  const highComplexityFiles = complexityMetrics.filter((metric) => {
    const score = Math.max(
      metric.cyclomaticComplexity ?? 0,
      metric.cognitiveComplexity ?? 0
    );
    return score >= HIGH_COMPLEXITY;
  });
  if (highComplexityFiles.length > 0) {
    const worst = [...highComplexityFiles].sort((a, b) => {
      const aScore = Math.max(a.cyclomaticComplexity ?? 0, a.cognitiveComplexity ?? 0);
      const bScore = Math.max(b.cyclomaticComplexity ?? 0, b.cognitiveComplexity ?? 0);
      return bScore - aScore;
    })[0];
    const worstScore = Math.max(
      worst.cyclomaticComplexity ?? 0,
      worst.cognitiveComplexity ?? 0
    );

    findings.push({
      title: "High Complexity Modules",
      evidence: `${highComplexityFiles.length} file(s) exceed complexity threshold; ${worst.file} has observed complexity ${worstScore}.`,
      impact:
        "High complexity modules leave evidence of accumulated branching, special cases, and dense control flow.",
      severity: worstScore >= VERY_HIGH_COMPLEXITY ? "high" : "medium",
    });
  }

  if (debtComments.length > 0) {
    const tags = Array.from(new Set(debtComments.map((comment) => comment.tag)));
    findings.push({
      title: "Technical Debt Markers",
      evidence: `${debtComments.length} debt comment(s) found with tag(s): ${tags.join(", ")}.`,
      impact:
        "Debt comments are explicit traces of unfinished work, temporary workarounds, or known unstable areas.",
      severity: severityFromCount(debtComments.length, 3, 10),
    });
  }

  const heavyImportFiles = fileStatistics.filter((file) => (file.imports ?? 0) >= MANY_IMPORTS);
  if (heavyImportFiles.length > 0) {
    const worst = [...heavyImportFiles].sort((a, b) => (b.imports ?? 0) - (a.imports ?? 0))[0];
    findings.push({
      title: "Dependency Concentration",
      evidence: `${heavyImportFiles.length} file(s) import ${MANY_IMPORTS} or more modules; ${worst.path} imports ${worst.imports}.`,
      impact:
        "High import concentration indicates modules that touch many systems and may act as coupling centers.",
      severity: (worst.imports ?? 0) >= 25 ? "high" : "medium",
    });
  }

  const frequentlyChanged = fileStatistics.filter((file) => (file.changes ?? 0) >= MANY_CHANGES);
  if (frequentlyChanged.length > 0) {
    const mostChanged = [...frequentlyChanged].sort(
      (a, b) => (b.changes ?? 0) - (a.changes ?? 0)
    )[0];
    findings.push({
      title: "Modification Hotspots",
      evidence: `${frequentlyChanged.length} file(s) changed ${MANY_CHANGES} or more times; ${mostChanged.path} changed ${mostChanged.changes} times.`,
      impact:
        "Frequently modified files are forensic markers of unstable or repeatedly expanded responsibilities.",
      severity: (mostChanged.changes ?? 0) >= 50 ? "high" : "medium",
    });
  }

  const overloadedSummaries = fileSummaries.filter(
    (file) => (file.responsibilities ?? []).length >= MANY_RESPONSIBILITIES
  );
  if (overloadedSummaries.length > 0) {
    const files = overloadedSummaries.map((file) => file.path).join(", ");
    findings.push({
      title: "Overloaded Responsibility Boundaries",
      evidence: `Multiple responsibilities were reported in: ${files}.`,
      impact:
        "Files with many responsibilities show blurred architectural boundaries in the current repository state.",
      severity: overloadedSummaries.length > 2 ? "high" : "medium",
    });
  }

  const dependencyCount = Object.keys(allDependencies(evidence)).length;
  if (dependencyCount >= 20) {
    findings.push({
      title: "Expanded Dependency Surface",
      evidence: `${dependencyCount} package dependencies are declared across dependency metadata.`,
      impact:
        "A broad dependency surface is evidence of accumulated external coupling and expanded project complexity.",
      severity: dependencyCount >= 40 ? "high" : "medium",
    });
  }

  return findings;
}

function detectHotspots(evidence: ForensicEvidence): ForensicHotspot[] {
  const hotspots: ForensicHotspot[] = [];
  const fileStatistics = evidence.fileStatistics ?? [];
  const complexityMetrics = evidence.complexityMetrics ?? [];

  for (const largeFile of evidence.largeFiles ?? []) {
    hotspots.push({
      file: largeFile.file,
      reason: largeFile.reason ?? `Large file with ${largeFile.lines} lines.`,
      severity: largeFile.lines >= VERY_LARGE_FILE_LINES ? "high" : "medium",
    });
  }

  for (const statistic of fileStatistics) {
    const reasons: string[] = [];

    if ((statistic.lines ?? 0) >= LARGE_FILE_LINES) {
      reasons.push(`${statistic.lines} lines`);
    }

    if ((statistic.imports ?? 0) >= MANY_IMPORTS) {
      reasons.push(`${statistic.imports} imports`);
    }

    if ((statistic.changes ?? 0) >= MANY_CHANGES) {
      reasons.push(`${statistic.changes} recorded changes`);
    }

    if ((statistic.maxFunctionLines ?? 0) >= LARGE_FUNCTION_LINES) {
      reasons.push(`largest function is ${statistic.maxFunctionLines} lines`);
    }

    if (reasons.length > 0) {
      hotspots.push({
        file: statistic.path,
        reason: reasons.join("; "),
        severity:
          (statistic.lines ?? 0) >= VERY_LARGE_FILE_LINES ||
          (statistic.imports ?? 0) >= 25 ||
          (statistic.changes ?? 0) >= 50
            ? "high"
            : "medium",
      });
    }
  }

  for (const metric of complexityMetrics) {
    const score = Math.max(
      metric.cyclomaticComplexity ?? 0,
      metric.cognitiveComplexity ?? 0
    );

    if (score >= HIGH_COMPLEXITY && !hotspots.some((hotspot) => hotspot.file === metric.file)) {
      hotspots.push({
        file: metric.file,
        reason: `Observed complexity score ${score}.`,
        severity: score >= VERY_HIGH_COMPLEXITY ? "high" : "medium",
      });
    }
  }

  return hotspots;
}

function detectDebtSignals(evidence: ForensicEvidence): string[] {
  const signals: string[] = [];
  const debtComments = evidence.debtComments ?? [];

  for (const comment of debtComments) {
    const location = comment.line ? `${comment.file}:${comment.line}` : comment.file;
    signals.push(`${comment.tag} in ${location}: ${comment.text}`);
  }

  if (signals.length === 0) {
    signals.push("No TODO, FIXME, HACK, TEMP, or LEGACY comments were supplied as evidence.");
  }

  return signals;
}

function detectArchitecturalObservations(evidence: ForensicEvidence): string[] {
  const observations: string[] = [];
  const structure = evidence.repositoryStructure ?? [];
  const fileSummaries = evidence.fileSummaries ?? [];

  if (hasPath(structure, "agents/")) {
    observations.push("The repository contains an agent layer, indicating role-based analysis boundaries.");
  }

  if (hasPath(structure, "components/")) {
    observations.push("The repository contains a component layer, indicating a user-facing presentation surface.");
  }

  if (hasPath(structure, "lib/")) {
    observations.push("The repository contains a library layer for shared implementation concerns.");
  }

  const filesWithManyImports = (evidence.fileStatistics ?? []).filter(
    (file) => (file.imports ?? 0) >= MANY_IMPORTS
  );
  if (filesWithManyImports.length > 0) {
    observations.push(
      `${filesWithManyImports.length} file(s) show high import concentration, suggesting coupling centers.`
    );
  }

  const responsibilityFiles = fileSummaries.filter(
    (file) => (file.responsibilities ?? []).length >= MANY_RESPONSIBILITIES
  );
  if (responsibilityFiles.length > 0) {
    observations.push(
      `${responsibilityFiles.length} file(s) were summarized with broad responsibility sets.`
    );
  }

  const historicalBurst = (evidence.historianFindings ?? []).some((finding) =>
    [finding.phase, finding.event, finding.impact]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes("burst")
  );
  if (historicalBurst) {
    observations.push(
      "Historian evidence references a compressed development burst, which is relevant context for current structural accumulation."
    );
  }

  if (observations.length === 0) {
    observations.push("No architectural decay signals were visible in the supplied evidence.");
  }

  return observations;
}

function buildSummary(evidence: ForensicEvidence, findings: ForensicFinding[], hotspots: ForensicHotspot[]) {
  if (findings.length === 0) {
    return "The Forensic Agent found no strong evidence of architectural decay, technical debt, or instability in the supplied repository evidence.";
  }

  const highFindings = findings.filter((finding) => finding.severity === "high").length;
  const debtFiles = uniqueFiles(evidence.debtComments ?? []).length;

  return `The Forensic Agent documented ${findings.length} evidence-backed finding(s), including ${highFindings} high-severity signal(s) and ${hotspots.length} hotspot file(s). The visible evidence points to ${
    debtFiles ? `technical debt markers across ${debtFiles} file(s)` : "structural and complexity signals"
  } rather than inferred defects.`;
}

export function analyzeForensics(evidence: ForensicEvidence): ForensicReport {
  const findings = detectFindings(evidence);
  const hotspots = detectHotspots(evidence);

  return {
    agent: "Forensic",
    findings,
    hotspots,
    technicalDebtSignals: detectDebtSignals(evidence),
    architecturalObservations: detectArchitecturalObservations(evidence),
    summary: buildSummary(evidence, findings, hotspots),
  };
}

export const forensic = {
  name: "Forensic",
  analyze: analyzeForensics,
};
