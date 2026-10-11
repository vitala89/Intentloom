import {
  evaluateEngineeringConformance,
  summarizeWorkflowVariants,
  summarizeWorkflowDurations,
  summarizeConformanceTrend,
  summarizeWorkflowRepetitions,
  summarizeWorkflowTransitionIntervals,
} from "@intentloom/evidence-analysis";
import type {
  EngineeringConformanceReport,
  EngineeringWorkflowPolicy,
  GenericTimeline,
  WorkflowVariantSummaryReport,
  WorkflowDurationSummaryReport,
  ConformanceTrendSummaryReport,
  WorkflowRepetitionSummaryReport,
  WorkflowTransitionIntervalsReport,
} from "@intentloom/protocol";

export function evaluateProjectEngineeringConformance(options: {
  readonly root: string;
  readonly timeline: GenericTimeline;
  readonly policy: EngineeringWorkflowPolicy;
}): EngineeringConformanceReport {
  if (options.root.length === 0) throw new Error("project root is required");
  return evaluateEngineeringConformance(options.timeline, options.policy);
}

export function summarizeProjectWorkflowVariants(
  timelines: readonly GenericTimeline[],
): WorkflowVariantSummaryReport {
  return summarizeWorkflowVariants(timelines);
}

export function summarizeProjectWorkflowDurations(
  timelines: readonly GenericTimeline[],
): WorkflowDurationSummaryReport {
  return summarizeWorkflowDurations(timelines);
}

export function summarizeProjectConformanceTrend(
  reports: readonly EngineeringConformanceReport[],
): ConformanceTrendSummaryReport {
  return summarizeConformanceTrend(reports);
}

export function summarizeProjectWorkflowRepetitions(
  timelines: readonly GenericTimeline[],
): WorkflowRepetitionSummaryReport {
  return summarizeWorkflowRepetitions(timelines);
}

export function summarizeProjectWorkflowTransitionIntervals(
  timelines: readonly GenericTimeline[],
): WorkflowTransitionIntervalsReport {
  return summarizeWorkflowTransitionIntervals(timelines);
}
