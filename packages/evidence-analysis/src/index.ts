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
