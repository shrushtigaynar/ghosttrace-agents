export type RemediationSeverity = "low" | "medium" | "high";
export type RemediationEffort = "low" | "medium" | "high";
export type RemediationPhase = "Immediate" | "Short-Term" | "Long-Term";

export type HistorianTimelineEvent = {
  phase: string;
  event: string;
  impact: string;
  severity: RemediationSeverity;
};

export type HistorianReport = {
  agent: "Historian";
  timeline: HistorianTimelineEvent[];
  keyDecisions: Array<{
    decision: string;
    consequence: string;
  }>;
  historicalObservations: string[];
  story: string;
};

export type ForensicFinding = {
  title: string;
  evidence: string;
  impact: string;
  severity: RemediationSeverity;
};

export type ForensicHotspot = {
  file: string;
  reason: string;
  severity: RemediationSeverity;
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
  severity: RemediationSeverity;
};

export type ContradictionReport = {
  agent: "Contradiction";
  contradictions: ContradictionFinding[];
  patternsDetected: string[];
  architecturalTension: Array<{
    legacyApproach: string;
    modernApproach: string;
    conflict: string;
  }>;
  summary: string;
};

export type RemediationInput = {
  historian?: HistorianReport;
  forensic?: ForensicReport;
  contradiction?: ContradictionReport;
};

export type PriorityAction = {
  title: string;
  reason: string;
  impact: RemediationSeverity;
  effort: RemediationEffort;
};

export type ArchitecturalRecommendation = {
  recommendation: string;
  benefit: string;
};

export type RecoveryPlanItem = {
  phase: RemediationPhase;
  objective: string;
};

export type RemediationReport = {
  agent: "Remediation";
  priorityActions: PriorityAction[];
  architecturalRecommendations: ArchitecturalRecommendation[];
  recoveryPlan: RecoveryPlanItem[];
  quickWins: string[];
  summary: string;
};

function severityRank(severity: RemediationSeverity) {
  if (severity === "high") {
    return 3;
  }

  if (severity === "medium") {
    return 2;
  }

  return 1;
}

function textIncludes(text: string, terms: string[]) {
  const lowerText = text.toLowerCase();
  return terms.some((term) => lowerText.includes(term.toLowerCase()));
}

function hasFinding(input: RemediationInput, terms: string[]) {
  const forensicText = (input.forensic?.findings ?? [])
    .map((finding) => `${finding.title} ${finding.evidence} ${finding.impact}`)
    .join(" ");
  const contradictionText = (input.contradiction?.contradictions ?? [])
    .map((finding) => `${finding.title} ${finding.description} ${finding.evidence}`)
    .join(" ");
  const historyText = (input.historian?.timeline ?? [])
    .map((finding) => `${finding.phase} ${finding.event} ${finding.impact}`)
    .join(" ");

  return textIncludes(`${forensicText} ${contradictionText} ${historyText}`, terms);
}

function inferEffort(title: string): RemediationEffort {
  if (textIncludes(title, ["dependency", "framework", "routing", "architecture"])) {
    return "high";
  }

  if (textIncludes(title, ["duplicate", "service", "responsibility", "complexity", "hotspot"])) {
    return "medium";
  }

  return "low";
}

function buildPriorityActions(input: RemediationInput): PriorityAction[] {
  const actions: PriorityAction[] = [];

  for (const finding of input.forensic?.findings ?? []) {
    if (finding.severity === "low") {
      continue;
    }

    actions.push({
      title: `Stabilize ${finding.title}`,
      reason: finding.evidence,
      impact: finding.severity,
      effort: inferEffort(finding.title),
    });
  }

  for (const contradiction of input.contradiction?.contradictions ?? []) {
    if (contradiction.severity === "low") {
      continue;
    }

    actions.push({
      title: `Consolidate ${contradiction.title}`,
      reason: contradiction.evidence,
      impact: contradiction.severity,
      effort: inferEffort(contradiction.title),
    });
  }

  const highHotspots = (input.forensic?.hotspots ?? []).filter(
    (hotspot) => hotspot.severity === "high"
  );
  for (const hotspot of highHotspots.slice(0, 3)) {
    actions.push({
      title: `Reduce pressure around ${hotspot.file}`,
      reason: hotspot.reason,
      impact: "high",
      effort: "medium",
    });
  }

  if (actions.length === 0) {
    actions.push({
      title: "Establish a baseline recovery checklist",
      reason:
        "The supplied agent reports do not contain medium or high severity recovery targets.",
      impact: "low",
      effort: "low",
    });
  }

  return actions
    .sort((a, b) => severityRank(b.impact) - severityRank(a.impact))
    .slice(0, 8);
}

function buildArchitecturalRecommendations(input: RemediationInput): ArchitecturalRecommendation[] {
  const recommendations: ArchitecturalRecommendation[] = [];

  if (hasFinding(input, ["large file", "oversized", "function size", "god", "hotspot"])) {
    recommendations.push({
      recommendation: "Break down the highest-pressure modules into smaller responsibility-focused units.",
      benefit:
        "Reduces concentrated complexity while preserving the existing system shape.",
    });
  }

  if (hasFinding(input, ["multiple", "duplicate", "competing", "mixed", "split"])) {
    recommendations.push({
      recommendation: "Choose one canonical implementation pattern for each duplicated responsibility.",
      benefit:
        "Removes competing conventions and makes future work easier to route through the correct layer.",
    });
  }

  if (hasFinding(input, ["dependency", "library", "framework", "package"])) {
    recommendations.push({
      recommendation: "Review overlapping dependencies and keep only the libraries tied to active architectural decisions.",
      benefit:
        "Reduces external coupling and prevents different parts of the project from evolving around separate toolchains.",
    });
  }

  if (hasFinding(input, ["agent", "service", "orchestration", "boundary", "responsibility"])) {
    recommendations.push({
      recommendation: "Clarify ownership boundaries between agents, services, libraries, and UI components.",
      benefit:
        "Makes responsibilities explicit and limits future cross-module drift.",
    });
  }

  if (hasFinding(input, ["todo", "fixme", "hack", "temporary", "debt"])) {
    recommendations.push({
      recommendation: "Convert visible debt markers into tracked cleanup items grouped by affected module.",
      benefit:
        "Turns scattered recovery evidence into a manageable stabilization queue.",
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      recommendation: "Maintain the current architectural boundaries and monitor future agent findings.",
      benefit:
        "Keeps recovery proportional when supplied evidence does not show structural decay.",
    });
  }

  return recommendations;
}

function buildRecoveryPlan(input: RemediationInput): RecoveryPlanItem[] {
  const immediateObjectives: string[] = [];
  const shortTermObjectives: string[] = [];
  const longTermObjectives: string[] = [];

  if (hasFinding(input, ["debt", "todo", "fixme", "hack", "temporary"])) {
    immediateObjectives.push("Inventory explicit technical debt markers and classify them by module.");
  }

  if ((input.forensic?.hotspots ?? []).length > 0) {
    immediateObjectives.push("Identify the highest-severity hotspot files and freeze their current responsibilities.");
  }

  if (hasFinding(input, ["duplicate", "multiple", "competing", "split"])) {
    shortTermObjectives.push("Consolidate duplicated or competing implementation patterns.");
  }

  if (hasFinding(input, ["large", "complexity", "responsibility", "boundary"])) {
    shortTermObjectives.push("Reduce overloaded modules by separating clearly identified responsibilities.");
  }

  if (hasFinding(input, ["dependency", "framework", "library", "package"])) {
    shortTermObjectives.push("Rationalize dependency usage around the selected architecture.");
  }

  if (hasFinding(input, ["architecture", "agent", "service", "orchestration"])) {
    longTermObjectives.push("Document and enforce stable architectural ownership boundaries.");
  }

  if (hasFinding(input, ["rapid", "burst", "growth", "expansion"])) {
    longTermObjectives.push("Introduce periodic consolidation checkpoints after feature expansion periods.");
  }

  if (immediateObjectives.length === 0) {
    immediateObjectives.push("Confirm the supplied agent findings and select the first recovery target.");
  }

  if (shortTermObjectives.length === 0) {
    shortTermObjectives.push("Address the highest-impact medium or high severity findings incrementally.");
  }

  if (longTermObjectives.length === 0) {
    longTermObjectives.push("Maintain architectural consistency as the repository grows.");
  }

  return [
    {
      phase: "Immediate",
      objective: immediateObjectives.join(" "),
    },
    {
      phase: "Short-Term",
      objective: shortTermObjectives.join(" "),
    },
    {
      phase: "Long-Term",
      objective: longTermObjectives.join(" "),
    },
  ];
}

function buildQuickWins(input: RemediationInput): string[] {
  const quickWins: string[] = [];
  const debtSignals = input.forensic?.technicalDebtSignals ?? [];
  const lowEffortContradictions = (input.contradiction?.contradictions ?? []).filter(
    (finding) => finding.severity === "low"
  );

  if (debtSignals.length > 0 && !debtSignals[0].startsWith("No TODO")) {
    quickWins.push("Group existing debt comments by file and owner before deeper cleanup work begins.");
  }

  if ((input.forensic?.hotspots ?? []).length > 0) {
    quickWins.push("Create a visible hotspot list so future changes can avoid increasing concentrated complexity.");
  }

  if (lowEffortContradictions.length > 0) {
    quickWins.push("Resolve low-severity inconsistencies first to reduce noise in later architectural work.");
  }

  if (input.historian?.historicalObservations?.length) {
    quickWins.push("Use historian observations as context when sequencing recovery work.");
  }

  if (quickWins.length === 0) {
    quickWins.push("Keep remediation lightweight until stronger evidence identifies a higher-priority recovery target.");
  }

  return quickWins;
}

function buildSummary(actions: PriorityAction[], recommendations: ArchitecturalRecommendation[]) {
  const highImpactActions = actions.filter((action) => action.impact === "high").length;

  return `The remediation strategy prioritizes ${actions.length} action(s), including ${highImpactActions} high-impact item(s), and focuses on incremental stabilization rather than replacement. The recommended path is to contain current hotspots, consolidate duplicated patterns, and reinforce architectural boundaries using only the evidence supplied by the specialist agents.`;
}

export function planRemediation(input: RemediationInput): RemediationReport {
  const priorityActions = buildPriorityActions(input);
  const architecturalRecommendations = buildArchitecturalRecommendations(input);

  return {
    agent: "Remediation",
    priorityActions,
    architecturalRecommendations,
    recoveryPlan: buildRecoveryPlan(input),
    quickWins: buildQuickWins(input),
    summary: buildSummary(priorityActions, architecturalRecommendations),
  };
}

export const remediation = {
  name: "Remediation",
  analyze: planRemediation,
};
