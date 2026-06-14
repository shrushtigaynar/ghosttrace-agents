export type RiskSeverity = "low" | "medium" | "high";

export type HistorianFinding = {
  phase?: string;
  event?: string;
  impact?: string;
  severity?: RiskSeverity;
};

export type ForensicFinding = {
  title: string;
  evidence: string;
  impact: string;
  severity: RiskSeverity;
};

export type ForensicHotspot = {
  file: string;
  reason: string;
  severity: RiskSeverity;
};

export type ContradictionFinding = {
  title: string;
  description: string;
  evidence: string;
  impact: string;
  severity: RiskSeverity;
};

export type RepositoryMetrics = {
  fileCount?: number;
  totalLines?: number;
  averageComplexity?: number;
  maxComplexity?: number;
  dependencyCount?: number;
  hotspotCount?: number;
  debtCommentCount?: number;
  commitCount?: number;
  activeDays?: number;
};

export type RiskInput = {
  historianFindings?: HistorianFinding[];
  forensicFindings?: ForensicFinding[];
  forensicHotspots?: ForensicHotspot[];
  contradictionFindings?: ContradictionFinding[];
  repositoryMetrics?: RepositoryMetrics;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  architecturalObservations?: string[];
};

export type FutureRisk = {
  title: string;
  description: string;
  evidence: string;
  severity: RiskSeverity;
  confidence: number;
};

export type RiskHotspot = {
  area: string;
  reason: string;
  severity: RiskSeverity;
};

export type SystemHealth = {
  score: number;
  assessment: string;
};

export type RiskReport = {
  agent: "Risk";
  futureRisks: FutureRisk[];
  riskHotspots: RiskHotspot[];
  riskSignals: string[];
  systemHealth: SystemHealth;
  summary: string;
};

function severityRank(severity: RiskSeverity) {
  if (severity === "high") {
    return 3;
  }

  if (severity === "medium") {
    return 2;
  }

  return 1;
}

function severityFromScore(score: number): RiskSeverity {
  if (score >= 7) {
    return "high";
  }

  if (score >= 4) {
    return "medium";
  }

  return "low";
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function textIncludes(text: string, terms: string[]) {
  const lowerText = text.toLowerCase();
  return terms.some((term) => lowerText.includes(term.toLowerCase()));
}

function allDependencies(input: RiskInput) {
  return {
    ...(input.dependencies ?? {}),
    ...(input.devDependencies ?? {}),
  };
}

function countDependencyEvidence(input: RiskInput) {
  return input.repositoryMetrics?.dependencyCount ?? Object.keys(allDependencies(input)).length;
}

function confidenceFromEvidence(evidenceCount: number, severity: RiskSeverity) {
  return clamp(45 + evidenceCount * 12 + severityRank(severity) * 8, 50, 95);
}

function buildFutureRisks(input: RiskInput): FutureRisk[] {
  const risks: FutureRisk[] = [];
  const forensicFindings = input.forensicFindings ?? [];
  const contradictionFindings = input.contradictionFindings ?? [];
  const historianFindings = input.historianFindings ?? [];
  const metrics = input.repositoryMetrics ?? {};
  const dependencyCount = countDependencyEvidence(input);

  const complexityEvidence = forensicFindings.filter((finding) =>
    textIncludes(`${finding.title} ${finding.evidence} ${finding.impact}`, [
      "complexity",
      "large",
      "hotspot",
      "oversized",
      "import concentration",
      "responsibility",
    ])
  );
  if (complexityEvidence.length > 0 || (metrics.maxComplexity ?? 0) >= 20) {
    const severity = severityFromScore(
      complexityEvidence.reduce((sum, finding) => sum + severityRank(finding.severity), 0) +
        ((metrics.maxComplexity ?? 0) >= 35 ? 3 : 1)
    );
    risks.push({
      title: "Complexity Hotspots May Become Harder To Maintain",
      description:
        "Modules already marked by size, complexity, or concentrated responsibility may become increasingly difficult to change safely.",
      evidence:
        complexityEvidence.map((finding) => `${finding.title}: ${finding.evidence}`).join(" | ") ||
        `Repository metrics report max complexity ${metrics.maxComplexity}.`,
      severity,
      confidence: confidenceFromEvidence(complexityEvidence.length || 1, severity),
    });
  }

  const contradictionEvidence = contradictionFindings.filter((finding) =>
    textIncludes(`${finding.title} ${finding.description} ${finding.impact}`, [
      "multiple",
      "mixed",
      "duplicate",
      "competing",
      "split",
      "fragmentation",
    ])
  );
  if (contradictionEvidence.length > 0) {
    const severity = severityFromScore(
      contradictionEvidence.reduce((sum, finding) => sum + severityRank(finding.severity), 0)
    );
    risks.push({
      title: "Conflicting Patterns May Slow Future Extension",
      description:
        "Areas with duplicated or competing patterns may become harder for teams to extend consistently.",
      evidence: contradictionEvidence
        .map((finding) => `${finding.title}: ${finding.evidence}`)
        .join(" | "),
      severity,
      confidence: confidenceFromEvidence(contradictionEvidence.length, severity),
    });
  }

  const debtEvidence = forensicFindings.filter((finding) =>
    textIncludes(`${finding.title} ${finding.evidence} ${finding.impact}`, [
      "debt",
      "todo",
      "fixme",
      "hack",
      "temporary",
      "legacy",
    ])
  );
  if (debtEvidence.length > 0 || (metrics.debtCommentCount ?? 0) > 0) {
    const severity = severityFromScore(
      debtEvidence.reduce((sum, finding) => sum + severityRank(finding.severity), 0) +
        Math.floor((metrics.debtCommentCount ?? 0) / 5)
    );
    risks.push({
      title: "Technical Debt May Accumulate Into Maintenance Drag",
      description:
        "Explicit debt markers may become a future maintenance burden if they remain spread across active modules.",
      evidence:
        debtEvidence.map((finding) => `${finding.title}: ${finding.evidence}`).join(" | ") ||
        `Repository metrics report ${metrics.debtCommentCount} debt comment(s).`,
      severity,
      confidence: confidenceFromEvidence(debtEvidence.length || 1, severity),
    });
  }

  if (dependencyCount >= 15) {
    const severity = dependencyCount >= 35 ? "high" : "medium";
    risks.push({
      title: "Dependency Burden May Increase Integration Instability",
      description:
        "A broad dependency surface may make future upgrades and architectural consistency more difficult.",
      evidence: `${dependencyCount} dependencies are present in the supplied dependency evidence.`,
      severity,
      confidence: confidenceFromEvidence(1, severity),
    });
  }

  const growthEvidence = historianFindings.filter((finding) =>
    textIncludes(`${finding.phase} ${finding.event} ${finding.impact}`, [
      "rapid",
      "burst",
      "feature",
      "expansion",
      "growth",
      "compressed",
    ])
  );
  if (growthEvidence.length > 0) {
    const severity = severityFromScore(
      growthEvidence.reduce((sum, finding) => sum + severityRank(finding.severity ?? "low"), 0)
    );
    risks.push({
      title: "Fast Growth May Leave Future Consolidation Pressure",
      description:
        "Historical evidence of rapid expansion may indicate that future development will need more consolidation work to remain stable.",
      evidence: growthEvidence
        .map((finding) => `${finding.phase ?? "History"}: ${finding.event ?? finding.impact}`)
        .join(" | "),
      severity,
      confidence: confidenceFromEvidence(growthEvidence.length, severity),
    });
  }

  if (risks.length === 0) {
    risks.push({
      title: "Limited Future Risk Evidence",
      description:
        "The supplied agent evidence does not identify strong future instability signals.",
      evidence: "No medium or high confidence risk patterns were present in the supplied findings.",
      severity: "low",
      confidence: 50,
    });
  }

  return risks.sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
}

function buildRiskHotspots(input: RiskInput): RiskHotspot[] {
  const hotspots: RiskHotspot[] = [];

  for (const hotspot of input.forensicHotspots ?? []) {
    hotspots.push({
      area: hotspot.file,
      reason: hotspot.reason,
      severity: hotspot.severity,
    });
  }

  for (const contradiction of input.contradictionFindings ?? []) {
    if (contradiction.severity === "low") {
      continue;
    }

    hotspots.push({
      area: contradiction.title,
      reason: contradiction.impact,
      severity: contradiction.severity,
    });
  }

  const dependencyCount = countDependencyEvidence(input);
  if (dependencyCount >= 15) {
    hotspots.push({
      area: "Dependency surface",
      reason: `${dependencyCount} dependencies may increase future upgrade and integration pressure.`,
      severity: dependencyCount >= 35 ? "high" : "medium",
    });
  }

  return hotspots
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
    .slice(0, 8);
}

function buildRiskSignals(input: RiskInput, futureRisks: FutureRisk[]) {
  const signals: string[] = [];

  for (const risk of futureRisks) {
    signals.push(`${risk.severity.toUpperCase()} risk: ${risk.title} (${risk.confidence}% confidence).`);
  }

  for (const observation of input.architecturalObservations ?? []) {
    signals.push(`Architectural observation: ${observation}`);
  }

  if ((input.repositoryMetrics?.hotspotCount ?? 0) > 0) {
    signals.push(`${input.repositoryMetrics?.hotspotCount} hotspot(s) reported in repository metrics.`);
  }

  return signals;
}

function calculateSystemHealth(input: RiskInput, risks: FutureRisk[]): SystemHealth {
  const riskPenalty = risks.reduce((sum, risk) => {
    const confidenceWeight = risk.confidence / 100;
    return sum + severityRank(risk.severity) * 8 * confidenceWeight;
  }, 0);
  const hotspotPenalty = (input.forensicHotspots ?? []).reduce(
    (sum, hotspot) => sum + severityRank(hotspot.severity) * 3,
    0
  );
  const dependencyPenalty = Math.floor(countDependencyEvidence(input) / 8);
  const score = clamp(Math.round(100 - riskPenalty - hotspotPenalty - dependencyPenalty), 0, 100);

  let assessment = "Stable";
  if (score < 45) {
    assessment = "High risk of future engineering instability";
  } else if (score < 70) {
    assessment = "Moderate risk with visible pressure points";
  } else if (score < 85) {
    assessment = "Mostly stable with some watch areas";
  }

  return {
    score,
    assessment,
  };
}

function buildSummary(risks: FutureRisk[], health: SystemHealth) {
  const topRisk = risks[0];

  return `The Risk Agent rates system health at ${health.score}/100: ${health.assessment}. The leading forecast is "${topRisk.title}" with ${topRisk.confidence}% confidence, based only on supplied agent evidence and repository metrics.`;
}

export function analyzeRisk(input: RiskInput): RiskReport {
  const futureRisks = buildFutureRisks(input);
  const systemHealth = calculateSystemHealth(input, futureRisks);

  return {
    agent: "Risk",
    futureRisks,
    riskHotspots: buildRiskHotspots(input),
    riskSignals: buildRiskSignals(input, futureRisks),
    systemHealth,
    summary: buildSummary(futureRisks, systemHealth),
  };
}

export const risk = {
  name: "Risk",
  analyze: analyzeRisk,
};

