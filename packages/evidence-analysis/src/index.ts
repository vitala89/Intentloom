import { createHash } from "node:crypto";
import {
  validateGenericTimeline,
  validateEngineeringConformanceReport,
  type EngineeringConformanceFinding,
  type EngineeringConformanceReport,
  type EngineeringConformanceSummary,
  type EngineeringConformanceStatus,
  type EngineeringEvidenceRef,
  type EngineeringWorkflowCaseType,
  type EngineeringWorkflowPolicy,
  type GenericTimeline,
  type TimelineEventRef,
  type WorkflowVariantSummaryReport,
  type WorkflowDurationSummaryReport,
  type ConformanceTrendSummaryReport,
  type WorkflowRepetitionSummaryReport,
  type WorkflowTransitionIntervalsReport,
} from "@intentloom/protocol";

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

export type {
  EngineeringConformanceFinding,
  EngineeringConformanceReport,
  EngineeringConformanceSummary,
  EngineeringConformanceStatus,
  EngineeringEvidenceRef,
  EngineeringWorkflowCaseType,
  EngineeringWorkflowPolicy,
  GenericTimeline,
  TimelineEventRef,
  WorkflowVariantSummaryReport,
  WorkflowDurationSummaryReport,
  ConformanceTrendSummaryReport,
  WorkflowRepetitionSummaryReport,
  WorkflowTransitionIntervalsReport,
} from "@intentloom/protocol";

function toEvidenceRef(event: TimelineEventRef): EngineeringEvidenceRef {
  return {
    source: event.source,
    sourceId: event.sourceId,
    ...(event.timestamp ? { timestamp: event.timestamp } : {}),
  };
}

export function evaluateEngineeringConformance(
  timeline: GenericTimeline,
  policy: EngineeringWorkflowPolicy,
): EngineeringConformanceReport {
  if (policy.schemaVersion !== "1") {
    throw new Error("unsupported engineering workflow policy schema version");
  }
  const ruleIds = policy.rules.map((rule) => rule.ruleId);
  if (new Set(ruleIds).size !== ruleIds.length) {
    throw new Error("engineering workflow policy rule IDs must be unique");
  }

  const matchingRules = policy.rules.filter(
    (rule) => rule.caseType === timeline.caseType,
  );
  const findings: EngineeringConformanceFinding[] = [];

  for (const rule of matchingRules) {
    let status: EngineeringConformanceStatus = "unsupported";
    let evidence: EngineeringEvidenceRef[] = [];

    const condition = rule.condition;

    if (condition.type === "required-activity") {
      const matches = timeline.events.filter(
        (event) => event.activity === condition.activity,
      );
      if (matches.length > 0) {
        status = "pass";
        evidence = matches.map(toEvidenceRef);
      } else {
        status = "missing-evidence";
      }
    } else if (condition.type === "forbidden-activity") {
      const matches = timeline.events.filter(
        (event) => event.activity === condition.activity,
      );
      if (matches.length > 0) {
        status = "violation";
        evidence = matches.map(toEvidenceRef);
      } else {
        status = "pass";
      }
    } else if (condition.type === "ordered-sequence") {
      const seq = condition.sequence ?? [];
      const indices: number[] = [];
      let allPresent = true;

      for (const requiredActivity of seq) {
        const index = timeline.events.findIndex(
          (event) => event.activity === requiredActivity,
        );
        if (index === -1) {
          allPresent = false;
          break;
        }
        indices.push(index);
      }

      if (!allPresent) {
        status = "missing-evidence";
      } else {
        const isStrictlyAscending = indices.every(
          (val, idx, arr) => idx === 0 || val > (arr[idx - 1] ?? -1),
        );
        if (isStrictlyAscending) {
          status = "pass";
          evidence = indices
            .map((idx) => timeline.events[idx])
            .filter((ev): ev is TimelineEventRef => ev !== undefined)
            .map(toEvidenceRef);
        } else {
          status = "violation";
        }
      }
    } else if (condition.type === "evidence-presence") {
      const matches = timeline.events.filter(
        (event) =>
          event.evidenceType === condition.evidenceType ||
          event.activity === condition.evidenceType,
      );
      if (matches.length > 0) {
        status = "pass";
        evidence = matches.map(toEvidenceRef);
      } else {
        status = "missing-evidence";
      }
    } else if (condition.type === "time-delta-threshold") {
      if (timeline.events.length < 2) {
        status = "missing-evidence";
      } else {
        const timestamps = timeline.events
          .map((e) => (e.timestamp ? new Date(e.timestamp).getTime() : NaN))
          .filter((t) => !isNaN(t));

        if (timestamps.length < 2) {
          status = "ambiguous-evidence";
        } else {
          const deltaMs = Math.max(...timestamps) - Math.min(...timestamps);
          const deltaMinutes = deltaMs / (1000 * 60);
          const maxMin = condition.maxMinutes ?? 0;
          if (deltaMinutes <= maxMin) {
            status = "pass";
          } else {
            status = "violation";
          }
        }
      }
    }

    findings.push({
      ruleId: rule.ruleId,
      caseType: rule.caseType,
      severity: rule.severity,
      status,
      title: rule.title,
      evidence,
      ...(rule.remediation ? { remediation: rule.remediation } : {}),
    });
  }

  const summary: EngineeringConformanceSummary = {
    totalRules: matchingRules.length,
    passed: findings.filter((f) => f.status === "pass").length,
    violations: findings.filter((f) => f.status === "violation").length,
    missingEvidence: findings.filter((f) => f.status === "missing-evidence")
      .length,
    ambiguousEvidence: findings.filter((f) => f.status === "ambiguous-evidence")
      .length,
    unsupported: findings.filter((f) => f.status === "unsupported").length,
  };

  return {
    operationVersion: 1,
    policyId: policy.policyId,
    evaluatedAt: new Date().toISOString(),
    caseType: timeline.caseType,
    caseId: timeline.caseId,
    summary,
    findings,
  };
}

export function summarizeWorkflowVariants(
  timelines: readonly GenericTimeline[],
): WorkflowVariantSummaryReport {
  if (timelines.length < 2)
    throw new Error("at least two timelines are required");
  const normalized = timelines.map(validateGenericTimeline);
  const caseType = normalized[0]!.caseType;
  if (normalized.some((timeline) => timeline.caseType !== caseType))
    throw new Error("workflow variant timelines must share one case type");
  const caseIds = normalized.map((timeline) => timeline.caseId);
  if (new Set(caseIds).size !== caseIds.length)
    throw new Error("workflow variant timeline case IDs must be unique");

  let timestampedEvents = 0;
  let totalEvents = 0;
  const variants = new Map<
    string,
    { activities: readonly string[]; caseIds: string[] }
  >();
  for (const timeline of normalized) {
    const activities = timeline.events.map((event) => event.activity);
    totalEvents += timeline.events.length;
    timestampedEvents += timeline.events.filter(
      (event) => event.timestamp !== undefined,
    ).length;
    const normalizedSequence = JSON.stringify(activities);
    const variantId = `variant:sha256:${createHash("sha256")
      .update(normalizedSequence)
      .digest("hex")}`;
    const variant = variants.get(variantId);
    if (variant) variant.caseIds.push(timeline.caseId);
    else variants.set(variantId, { activities, caseIds: [timeline.caseId] });
  }

  return {
    operationVersion: 1,
    caseType,
    timelineCount: normalized.length,
    timestampCoverage:
      totalEvents === 0 || timestampedEvents === 0
        ? "unavailable"
        : timestampedEvents === totalEvents
          ? "complete"
          : "partial",
    variants: [...variants.entries()]
      .map(([variantId, variant]) => ({
        variantId,
        activities: variant.activities,
        occurrenceCount: variant.caseIds.length,
        caseIds: [...variant.caseIds].sort(),
      }))
      .sort(
        (left, right) =>
          right.occurrenceCount - left.occurrenceCount ||
          JSON.stringify(left.activities).localeCompare(
            JSON.stringify(right.activities),
          ),
      ),
  };
}

export function summarizeWorkflowDurations(
  timelines: readonly GenericTimeline[],
): WorkflowDurationSummaryReport {
  if (timelines.length < 2)
    throw new Error("at least two timelines are required");
  const normalized = timelines.map(validateGenericTimeline);
  const caseType = normalized[0]!.caseType;
  if (normalized.some((timeline) => timeline.caseType !== caseType))
    throw new Error("workflow duration timelines must share one case type");
  const caseIds = normalized.map((timeline) => timeline.caseId);
  if (new Set(caseIds).size !== caseIds.length)
    throw new Error("workflow duration timeline case IDs must be unique");

  let timestampedEvents = 0;
  let totalEvents = 0;
  const elapsed: number[] = [];
  for (const timeline of normalized) {
    const timestamps = timeline.events
      .map((event) => (event.timestamp ? Date.parse(event.timestamp) : NaN))
      .filter((timestamp) => Number.isFinite(timestamp));
    totalEvents += timeline.events.length;
    timestampedEvents += timestamps.length;
    if (timestamps.length >= 2)
      elapsed.push(
        (Math.max(...timestamps) - Math.min(...timestamps)) / 60_000,
      );
  }
  const sortedElapsed = [...elapsed].sort((left, right) => left - right);
  const middle = Math.floor(sortedElapsed.length / 2);
  const median =
    sortedElapsed.length % 2 === 0
      ? ((sortedElapsed[middle - 1] ?? 0) + (sortedElapsed[middle] ?? 0)) / 2
      : (sortedElapsed[middle] ?? 0);
  return {
    operationVersion: 1,
    caseType,
    timelineCount: normalized.length,
    timestampCoverage:
      totalEvents === 0 || timestampedEvents === 0
        ? "unavailable"
        : timestampedEvents === totalEvents
          ? "complete"
          : "partial",
    observableCaseCount: sortedElapsed.length,
    ...(sortedElapsed.length > 0
      ? {
          elapsedMinutes: {
            minimum: sortedElapsed[0]!,
            median,
            maximum: sortedElapsed.at(-1)!,
          },
        }
      : {}),
  };
}

export function summarizeWorkflowTransitionIntervals(
  timelines: readonly GenericTimeline[],
): WorkflowTransitionIntervalsReport {
  if (timelines.length < 2)
    throw new Error("at least two timelines are required");
  const normalized = timelines.map(validateGenericTimeline);
  const caseType = normalized[0]!.caseType;
  if (normalized.some((timeline) => timeline.caseType !== caseType))
    throw new Error(
      "workflow transition interval timelines must share one case type",
    );
  const caseIds = normalized.map((timeline) => timeline.caseId);
  if (new Set(caseIds).size !== caseIds.length)
    throw new Error(
      "workflow transition interval timeline case IDs must be unique",
    );

  let totalEvents = 0;
  let validTimestampCount = 0;
  let observableIntervalCount = 0;
  const aggregates = new Map<
    string,
    { from: string; to: string; intervals: number[]; caseIds: Set<string> }
  >();
  const isoTimestamp =
    /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?)(Z|[+-]\d{2}:\d{2})$/;
  for (const timeline of normalized) {
    totalEvents += timeline.events.length;
    const parsed = timeline.events.map((event) => {
      const timestamp =
        event.timestamp && isoTimestamp.test(event.timestamp)
          ? Date.parse(event.timestamp)
          : NaN;
      if (Number.isFinite(timestamp)) validTimestampCount += 1;
      return { event, timestamp };
    });
    for (let index = 1; index < parsed.length; index += 1) {
      const previous = parsed[index - 1]!;
      const current = parsed[index]!;
      if (
        !Number.isFinite(previous.timestamp) ||
        !Number.isFinite(current.timestamp) ||
        current.timestamp < previous.timestamp
      )
        continue;
      const key = `${previous.event.activity}\u0000${current.event.activity}`;
      const aggregate = aggregates.get(key) ?? {
        from: previous.event.activity,
        to: current.event.activity,
        intervals: [],
        caseIds: new Set<string>(),
      };
      aggregate.intervals.push(
        (current.timestamp - previous.timestamp) / 60_000,
      );
      aggregate.caseIds.add(timeline.caseId);
      aggregates.set(key, aggregate);
      observableIntervalCount += 1;
    }
  }
  const transitions = [...aggregates.values()]
    .map((aggregate) => {
      const elapsed = [...aggregate.intervals].sort(
        (left, right) => left - right,
      );
      const middle = Math.floor(elapsed.length / 2);
      const median =
        elapsed.length % 2 === 0
          ? ((elapsed[middle - 1] ?? 0) + (elapsed[middle] ?? 0)) / 2
          : (elapsed[middle] ?? 0);
      return {
        from: aggregate.from,
        to: aggregate.to,
        intervalCount: elapsed.length,
        observableCaseCount: aggregate.caseIds.size,
        elapsedMinutes: {
          minimum: elapsed[0]!,
          median,
          maximum: elapsed.at(-1)!,
        },
      };
    })
    .sort(
      (left, right) =>
        right.intervalCount - left.intervalCount ||
        left.from.localeCompare(right.from) ||
        left.to.localeCompare(right.to),
    );
  return {
    operationVersion: 1,
    caseType,
    timelineCount: normalized.length,
    timestampCoverage:
      totalEvents === 0 || validTimestampCount === 0
        ? "unavailable"
        : validTimestampCount === totalEvents
          ? "complete"
          : "partial",
    observableIntervalCount,
    transitions,
  };
}

export function summarizeConformanceTrend(
  reports: readonly EngineeringConformanceReport[],
): ConformanceTrendSummaryReport {
  if (reports.length < 2)
    throw new Error("at least two conformance reports are required");
  const normalized = reports.map((report) =>
    validateEngineeringConformanceReport(report),
  );
  const first = normalized[0]!;
  if (normalized.some((report) => report.caseType !== first.caseType))
    throw new Error("conformance trend reports must share one case type");
  if (normalized.some((report) => report.policyId !== first.policyId))
    throw new Error("conformance trend reports must share one policy");
  const statusCounts = {
    pass: 0,
    violation: 0,
    "missing-evidence": 0,
    "ambiguous-evidence": 0,
    unsupported: 0,
  };
  const severityCounts = {
    error: 0,
    warning: 0,
    info: 0,
  };
  let findingCount = 0;
  for (const report of normalized) {
    for (const finding of report.findings) {
      statusCounts[finding.status] += 1;
      severityCounts[finding.severity] += 1;
      findingCount += 1;
    }
  }
  return {
    operationVersion: 1,
    caseType: first.caseType,
    policyId: first.policyId,
    reportCount: normalized.length,
    findingCount,
    statusCounts,
    severityCounts,
  };
}

export function summarizeWorkflowRepetitions(
  timelines: readonly GenericTimeline[],
): WorkflowRepetitionSummaryReport {
  if (timelines.length < 2)
    throw new Error("at least two timelines are required");
  const normalized = timelines.map((timeline) =>
    validateGenericTimeline(timeline),
  );
  const first = normalized[0]!;
  if (normalized.some((timeline) => timeline.caseType !== first.caseType))
    throw new Error("workflow repetition timelines must share one case type");
  const caseIds = new Set<string>();
  const aggregates = new Map<
    string,
    {
      caseCount: number;
      occurrenceCount: number;
      maxOccurrencesPerCase: number;
    }
  >();
  for (const timeline of normalized) {
    if (caseIds.has(timeline.caseId))
      throw new Error(
        "workflow repetition timelines must have unique case ids",
      );
    caseIds.add(timeline.caseId);
    const counts = new Map<string, number>();
    for (const event of timeline.events)
      counts.set(event.activity, (counts.get(event.activity) ?? 0) + 1);
    for (const [activity, count] of counts) {
      if (count < 2) continue;
      const aggregate = aggregates.get(activity) ?? {
        caseCount: 0,
        occurrenceCount: 0,
        maxOccurrencesPerCase: 0,
      };
      aggregate.caseCount += 1;
      aggregate.occurrenceCount += count;
      aggregate.maxOccurrencesPerCase = Math.max(
        aggregate.maxOccurrencesPerCase,
        count,
      );
      aggregates.set(activity, aggregate);
    }
  }
  const repeatedActivities = [...aggregates.entries()]
    .map(([activity, counts]) => ({ activity, ...counts }))
    .sort(
      (left, right) =>
        right.caseCount - left.caseCount ||
        right.occurrenceCount - left.occurrenceCount ||
        left.activity.localeCompare(right.activity),
    );
  return {
    operationVersion: 1,
    caseType: first.caseType,
    timelineCount: normalized.length,
    repeatedActivities,
  };
}
