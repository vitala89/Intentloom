export interface ReleaseAnalysisGitEvent {
  readonly commitId: string;
  readonly timestamp: number;
}

export interface ReleaseAnalysisGitTimeline {
  readonly caseId: string;
  readonly quality: "complete" | "bounded" | "unavailable";
  readonly events: readonly ReleaseAnalysisGitEvent[];
}

export interface ReleaseAnalysisProviderEvent {
  readonly eventType: string;
  readonly sourceId: string;
  readonly commitIds?: readonly string[];
}

export interface ReleaseAnalysisProviderEvidence {
  readonly provider: "github" | "gitlab";
  readonly projectKey: string;
  readonly status: "available" | "bounded" | "invalid";
  readonly events: readonly ReleaseAnalysisProviderEvent[];
}

export type ReleaseEvidenceFindingCode =
  | "local-timeline-verified"
  | "local-timeline-bounded"
  | "local-timeline-unavailable"
  | "provider-evidence-missing"
  | "provider-evidence-invalid"
  | "provider-commit-verified"
  | "provider-commit-missing-locally"
  | "provider-commit-ambiguous";

export interface ReleaseEvidenceFinding {
  readonly code: ReleaseEvidenceFindingCode;
  readonly status:
    "verified" | "missing" | "conflicting" | "ambiguous" | "unsupported";
  readonly provider: "github" | "gitlab" | null;
  readonly sourceIds: readonly string[];
}

export interface ReleaseAnalysisReport {
  readonly operationVersion: 1;
  readonly caseType: "release";
  readonly caseId: string;
  readonly projectKey: string;
  readonly quality: "complete" | "bounded" | "unavailable" | "conflicted";
  readonly findings: readonly ReleaseEvidenceFinding[];
}

export type ReleaseConformanceControl =
  "local-release-timeline" | "provider-evidence" | "provider-commit-provenance";
export type ReleaseConformanceStatus = ReleaseEvidenceFinding["status"];
export type ReleaseConformanceSummary =
  | "verified"
  | "evidence-missing"
  | "evidence-conflicted"
  | "evidence-ambiguous"
  | "evidence-unsupported";

export interface ReleaseConformanceControls {
  readonly operationVersion: 1;
  readonly requiredControls: readonly string[];
}

export interface ReleaseConformanceFinding {
  readonly control: string;
  readonly status: ReleaseConformanceStatus;
  readonly evidenceCodes: readonly ReleaseEvidenceFindingCode[];
  readonly sourceIds: readonly string[];
}

export interface ReleaseConformanceReport {
  readonly operationVersion: 1;
  readonly caseType: "release";
  readonly caseId: string;
  readonly projectKey: string;
  readonly summary: ReleaseConformanceSummary;
  readonly findings: readonly ReleaseConformanceFinding[];
}

const conformanceStatusRank: Readonly<
  Record<ReleaseConformanceStatus, number>
> = {
  verified: 0,
  ambiguous: 1,
  missing: 2,
  unsupported: 3,
  conflicting: 4,
};

function controlEvidence(
  control: string,
  report: ReleaseAnalysisReport,
): readonly ReleaseEvidenceFinding[] {
  if (control === "local-release-timeline")
    return report.findings.filter((finding) =>
      finding.code.startsWith("local-timeline-"),
    );
  if (control === "provider-commit-provenance")
    return report.findings.filter(
      (finding) =>
        finding.code.startsWith("provider-commit-") ||
        finding.code === "provider-evidence-missing" ||
        finding.code === "provider-evidence-invalid",
    );
  if (control !== "provider-evidence") return [];
  const availability = report.findings.filter(
    (finding) =>
      finding.code === "provider-evidence-missing" ||
      finding.code === "provider-evidence-invalid",
  );
  if (availability.length > 0) return availability;
  return report.findings
    .filter((finding) => finding.code.startsWith("provider-commit-"))
    .map((finding) => ({ ...finding, status: "verified" as const }));
}

function conformanceSummary(
  findings: readonly ReleaseConformanceFinding[],
): ReleaseConformanceSummary {
  const status = findings.reduce<ReleaseConformanceStatus>(
    (current, finding) =>
      conformanceStatusRank[finding.status] > conformanceStatusRank[current]
        ? finding.status
        : current,
    "verified",
  );
  return status === "verified"
    ? "verified"
    : status === "conflicting"
      ? "evidence-conflicted"
      : status === "missing"
        ? "evidence-missing"
        : status === "ambiguous"
          ? "evidence-ambiguous"
          : "evidence-unsupported";
}

export function evaluateReleaseConformance(
  report: ReleaseAnalysisReport,
  controls: ReleaseConformanceControls,
): ReleaseConformanceReport {
  if (controls.operationVersion !== 1)
    throw new Error("unsupported release conformance controls version");
  if (
    new Set(controls.requiredControls).size !== controls.requiredControls.length
  )
    throw new Error("release conformance controls must be unique");
  const findings = [...controls.requiredControls].sort().map((control) => {
    const evidence = controlEvidence(control, report);
    const status = evidence.reduce<ReleaseConformanceStatus>(
      (current, finding) =>
        conformanceStatusRank[finding.status] > conformanceStatusRank[current]
          ? finding.status
          : current,
      "verified",
    );
    return {
      control,
      status: evidence.length === 0 ? "unsupported" : status,
      evidenceCodes: evidence.map(({ code }) => code).sort(),
      sourceIds: evidence.flatMap(({ sourceIds }) => sourceIds).sort(),
    };
  });
  return {
    operationVersion: 1,
    caseType: "release",
    caseId: report.caseId,
    projectKey: report.projectKey,
    summary: conformanceSummary(findings),
    findings,
  };
}

export function analyzeReleaseEvidence(
  git: ReleaseAnalysisGitTimeline,
  provider: ReleaseAnalysisProviderEvidence,
  projectKey: string,
): ReleaseAnalysisReport {
  const findings: ReleaseEvidenceFinding[] = [];
  findings.push({
    code:
      git.quality === "complete"
        ? "local-timeline-verified"
        : git.quality === "bounded"
          ? "local-timeline-bounded"
          : "local-timeline-unavailable",
    status:
      git.quality === "complete"
        ? "verified"
        : git.quality === "bounded"
          ? "ambiguous"
          : "unsupported",
    provider: null,
    sourceIds: [],
  });
  if (provider.status === "invalid") {
    findings.push({
      code: "provider-evidence-invalid",
      status: "unsupported",
      provider: provider.provider,
      sourceIds: [],
    });
  } else if (provider.events.length === 0) {
    findings.push({
      code: "provider-evidence-missing",
      status: "missing",
      provider: provider.provider,
      sourceIds: [],
    });
  } else if (provider.projectKey !== projectKey) {
    findings.push({
      code: "provider-commit-missing-locally",
      status: "conflicting",
      provider: provider.provider,
      sourceIds: provider.events.map(({ sourceId }) => sourceId).sort(),
    });
  } else {
    const localCommits = new Set(git.events.map(({ commitId }) => commitId));
    for (const event of [...provider.events].sort((left, right) =>
      left.sourceId.localeCompare(right.sourceId),
    )) {
      const commits = event.commitIds ?? [];
      if (commits.length === 0) {
        findings.push({
          code: "provider-commit-ambiguous",
          status: "ambiguous",
          provider: provider.provider,
          sourceIds: [event.sourceId],
        });
      } else if (commits.some((commit) => localCommits.has(commit))) {
        findings.push({
          code: "provider-commit-verified",
          status: "verified",
          provider: provider.provider,
          sourceIds: [event.sourceId],
        });
      } else {
        findings.push({
          code: "provider-commit-missing-locally",
          status: "conflicting",
          provider: provider.provider,
          sourceIds: [event.sourceId],
        });
      }
    }
  }
  const quality = findings.some(({ status }) => status === "conflicting")
    ? "conflicted"
    : git.quality === "unavailable"
      ? "unavailable"
      : git.quality === "bounded"
        ? "bounded"
        : "complete";
  return {
    operationVersion: 1,
    caseType: "release",
    caseId: git.caseId,
    projectKey,
    quality,
    findings,
  };
}
