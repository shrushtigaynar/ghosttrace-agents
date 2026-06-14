export type OrchestratorSeverity = "low" | "medium" | "high";

export type HistorianTimelineEvent = {
  phase: string;
  event: string;
  impact: string;
  severity: OrchestratorSeverity;
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

export type ForensicFinding = {
  title: string;
  evidence: string;
  impact: string;
  severity: OrchestratorSeverity;
};

export type ForensicHotspot = {
  file: string;
  reason: string;
  severity: OrchestratorSeverity;
};

export type ForensicReport = {
  agent: "Forensic";
  findings: ForensicFinding[];
  hotspots: ForensicHotspot[];
  technicalDebtSignals: string[];
  architecturalObservations: string[];
  summary: string;
};

export type ContradictionFinding = {
  title: string;
  description: string;
  evidence: string;
  impact: string;
  severity: OrchestratorSeverity;
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

export type OrchestratorInput = {
  historian?: HistorianReport;
  forensic?: ForensicReport;
  contradiction?: ContradictionReport;
};

export type RootCause = {
  title: string;
  description: string;
  severity: OrchestratorSeverity;
};

export type KeyFactor = {
  factor: string;
  evidence: string;
};

export type InvestigationTimelineItem = {
  phase: string;
  finding: string;
};

export type CriticalConcern = {
  title: string;
  severity: OrchestratorSeverity;
};

export type OrchestratorReport = {
  agent: "Orchestrator";
  rootCause: RootCause;
  keyFactors: KeyFactor[];
  investigationTimeline: InvestigationTimelineItem[];
  criticalConcerns: CriticalConcern[];
  finalNarrative: string;
  verdict: string;
};

function severityRank(severity: OrchestratorSeverity) {
  if (severity === "high") {
    return 3;
  }

  if (severity === "medium") {
    return 2;
  }

  return 1;
}

function highestSeverity(severities: OrchestratorSeverity[]): OrchestratorSeverity {
  const ranked = severities.sort((a, b) => severityRank(b) - severityRank(a));
  return ranked[0] ?? "low";
}

function textIncludes(text: string, terms: string[]) {
  const lowerText = text.toLowerCase();
  return terms.some((term) => lowerText.includes(term.toLowerCase()));
}

function collectThemeScores(input: OrchestratorInput) {
  const scores = {
    rapidGrowth: 0,
    dependencyExpansion: 0,
    architecturalFragmentation: 0,
    technicalDebt: 0,
    complexityConcentration: 0,
  };

  for (const event of input.historian?.timeline ?? []) {
    const text = `${event.phase} ${event.event} ${event.impact}`;

    if (textIncludes(text, ["burst", "rapid", "feature", "expansion", "growth"])) {
      scores.rapidGrowth += severityRank(event.severity);
    }

    if (textIncludes(text, ["dependency", "library", "package"])) {
      scores.dependencyExpansion += severityRank(event.severity);
    }

    if (textIncludes(text, ["architecture", "agent", "structure", "fragmentation"])) {
      scores.architecturalFragmentation += severityRank(event.severity);
    }
  }

  for (const finding of input.forensic?.findings ?? []) {
    const text = `${finding.title} ${finding.evidence} ${finding.impact}`;

    if (textIncludes(text, ["debt", "todo", "fixme", "hack", "temporary"])) {
      scores.technicalDebt += severityRank(finding.severity);
    }

    if (textIncludes(text, ["large", "complexity", "hotspot", "import", "concentration"])) {
      scores.complexityConcentration += severityRank(finding.severity);
    }

    if (textIncludes(text, ["responsibility", "boundary", "coupling"])) {
      scores.architecturalFragmentation += severityRank(finding.severity);
    }
  }

  for (const contradiction of input.contradiction?.contradictions ?? []) {
    const text = `${contradiction.title} ${contradiction.description} ${contradiction.impact}`;

    if (textIncludes(text, ["multiple", "mixed", "duplicate", "competing", "split"])) {
      scores.architecturalFragmentation += severityRank(contradiction.severity);
    }

    if (textIncludes(text, ["dependency", "library", "framework"])) {
      scores.dependencyExpansion += severityRank(contradiction.severity);
    }
  }

  return scores;
}

function strongestTheme(scores: ReturnType<typeof collectThemeScores>) {
  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0] ?? ["architecturalFragmentation", 0];
}

function buildRootCause(input: OrchestratorInput): RootCause {
  const scores = collectThemeScores(input);
  const [theme, score] = strongestTheme(scores);
  const severities = [
    ...(input.historian?.timeline ?? []).map((item) => item.severity),
    ...(input.forensic?.findings ?? []).map((item) => item.severity),
    ...(input.contradiction?.contradictions ?? []).map((item) => item.severity),
  ];
  const severity = score >= 8 ? "high" : highestSeverity(severities);

  if (theme === "rapidGrowth") {
    return {
      title: "Compressed Growth Without Consolidation",
      description:
        "Historian evidence points to rapid or compressed growth, while specialist findings show current structural pressure created by that expansion.",
      severity,
    };
  }

  if (theme === "dependencyExpansion") {
    return {
      title: "Dependency-Led Complexity Expansion",
      description:
        "The strongest cross-agent pattern is expansion through packages, libraries, or competing external systems.",
      severity,
    };
  }

  if (theme === "technicalDebt") {
    return {
      title: "Accumulated Technical Debt Signals",
      description:
        "Forensic evidence identifies explicit debt markers that dominate the current assessment.",
      severity,
    };
  }

  if (theme === "complexityConcentration") {
    return {
      title: "Complexity Concentrated In Hotspots",
      description:
        "Forensic findings indicate that complexity and change pressure are concentrated in identifiable files or modules.",
      severity,
    };
  }

  return {
    title: "Architectural Fragmentation",
    description:
      "The strongest shared pattern is fragmentation across architectural layers, responsibilities, or competing implementation styles.",
    severity,
  };
}

function buildKeyFactors(input: OrchestratorInput): KeyFactor[] {
  const factors: KeyFactor[] = [];

  const severeHistory = (input.historian?.timeline ?? []).filter(
    (item) => item.severity !== "low"
  );
  if (severeHistory.length > 0) {
    factors.push({
      factor: "Historical pressure",
      evidence: severeHistory.map((item) => `${item.phase}: ${item.event}`).slice(0, 3).join(" | "),
    });
  }

  const severeForensics = (input.forensic?.findings ?? []).filter(
    (item) => item.severity !== "low"
  );
  if (severeForensics.length > 0) {
    factors.push({
      factor: "Current forensic evidence",
      evidence: severeForensics.map((item) => `${item.title}: ${item.evidence}`).slice(0, 3).join(" | "),
    });
  }

  const severeContradictions = (input.contradiction?.contradictions ?? []).filter(
    (item) => item.severity !== "low"
  );
  if (severeContradictions.length > 0) {
    factors.push({
      factor: "Architectural inconsistency",
      evidence: severeContradictions
        .map((item) => `${item.title}: ${item.evidence}`)
        .slice(0, 3)
        .join(" | "),
    });
  }

  const hotspots = (input.forensic?.hotspots ?? []).filter((item) => item.severity !== "low");
  if (hotspots.length > 0) {
    factors.push({
      factor: "Hotspot concentration",
      evidence: hotspots.map((item) => `${item.file}: ${item.reason}`).slice(0, 3).join(" | "),
    });
  }

  if (factors.length === 0) {
    factors.push({
      factor: "Limited evidence",
      evidence:
        "The supplied specialist reports do not contain medium or high severity findings.",
    });
  }

  return factors;
}

function buildInvestigationTimeline(input: OrchestratorInput): InvestigationTimelineItem[] {
  const timeline: InvestigationTimelineItem[] = [];

  for (const event of input.historian?.timeline ?? []) {
    timeline.push({
      phase: event.phase,
      finding: event.event,
    });
  }

  if (input.forensic?.summary) {
    timeline.push({
      phase: "Current Forensic State",
      finding: input.forensic.summary,
    });
  }

  if (input.contradiction?.summary) {
    timeline.push({
      phase: "Architectural Consistency Review",
      finding: input.contradiction.summary,
    });
  }

  return timeline;
}

function buildCriticalConcerns(input: OrchestratorInput): CriticalConcern[] {
  const concerns: CriticalConcern[] = [
    ...(input.forensic?.findings ?? []).map((finding) => ({
      title: finding.title,
      severity: finding.severity,
    })),
    ...(input.contradiction?.contradictions ?? []).map((finding) => ({
      title: finding.title,
      severity: finding.severity,
    })),
  ];

  return concerns
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
    .slice(0, 6);
}

function buildFinalNarrative(input: OrchestratorInput, rootCause: RootCause) {
  const historianStory = input.historian?.story;
  const forensicSummary = input.forensic?.summary;
  const contradictionSummary = input.contradiction?.summary;

  return [
    historianStory ? `Historian evidence indicates that ${historianStory}` : "",
    forensicSummary ? `Forensic evidence records the current state as follows: ${forensicSummary}` : "",
    contradictionSummary
      ? `The contradiction review adds this consistency assessment: ${contradictionSummary}`
      : "",
    `Correlating these reports, the lead finding is ${rootCause.title.toLowerCase()}: ${rootCause.description}`,
  ]
    .filter(Boolean)
    .join(" ");
}

function buildVerdict(rootCause: RootCause, concerns: CriticalConcern[]) {
  const highConcern = concerns.find((concern) => concern.severity === "high");

  if (highConcern) {
    return `${rootCause.title} is the dominant cause, with ${highConcern.title.toLowerCase()} as the most critical visible concern.`;
  }

  return `${rootCause.title} is the dominant explanation supported by the supplied agent evidence.`;
}

export function orchestrateInvestigation(input: OrchestratorInput): OrchestratorReport {
  const rootCause = buildRootCause(input);
  const criticalConcerns = buildCriticalConcerns(input);

  return {
    agent: "Orchestrator",
    rootCause,
    keyFactors: buildKeyFactors(input),
    investigationTimeline: buildInvestigationTimeline(input),
    criticalConcerns,
    finalNarrative: buildFinalNarrative(input, rootCause),
    verdict: buildVerdict(rootCause, criticalConcerns),
  };
}

export const orchestrator = {
  name: "Orchestrator",
  analyze: orchestrateInvestigation,
};
