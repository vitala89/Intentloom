import type {
  AdoptionProposal,
  DoctorPlan,
  Plan,
} from "@intentloom/application";
import type { DoctorResult } from "../../protocol/src/index.js";
import type { ProviderEvidenceResult } from "@intentloom/evidence-provider";
import type { ReleaseTimeline } from "@intentloom/evidence-git";
import type { CleanCacheResult } from "./clean-cache.js";
import {
  analyzeReleaseEvidence,
  type EngineeringConformanceReport,
} from "@intentloom/evidence-analysis";
import { inspectProject } from "@intentloom/application";

export function formatProviderEvidence(result: ProviderEvidenceResult): string {
  return [
    `Provider: ${result.provider}`,
    `Project: ${result.projectKey}`,
    `Status: ${result.status}`,
    `Events: ${result.events.length}`,
    ...(result.diagnostics.length > 0
      ? [`Diagnostics: ${result.diagnostics.join(", ")}`]
      : []),
  ].join("\n");
}

export function formatCleanCacheHuman(result: CleanCacheResult): string {
  const scope = result.provider
    ? result.projectKey
      ? `${result.provider}/${result.projectKey}`
      : result.provider
    : "all providers";
  return [
    "Intentloom cache cleanup completed.",
    `Cache: ${result.cachePath}`,
    `Scope: ${scope}`,
  ].join("\n");
}

export function formatReleaseAnalysis(
  report: ReturnType<typeof analyzeReleaseEvidence>,
): string {
  return [
    `Case: ${report.caseId}`,
    `Project: ${report.projectKey}`,
    `Quality: ${report.quality}`,
    `Findings: ${report.findings.length}`,
    ...report.findings.map(
      (finding) =>
        `${finding.status.padEnd(10)} ${finding.code}${finding.sourceIds.length > 0 ? ` (${finding.sourceIds.join(", ")})` : ""}`,
    ),
  ].join("\n");
}

export function formatPlan(result: Plan): string {
  return [...result.changes]
    .sort((left, right) => left.path.localeCompare(right.path))
    .map(
      (change) => `${change.kind.padEnd(8)} ${change.path} — ${change.reason}`,
    )
    .join("\n");
}

export function formatAdoptionProposal(result: AdoptionProposal): string {
  const lines = [
    `Detected profile: ${result.profileDetection.selectedProfile}`,
    `Workspace topology: ${result.profileDetection.workspaceTopology}`,
    `Application status: ${result.applicationStatus}`,
    ...result.items.map(
      (item) =>
        `${item.action.padEnd(36)} ${item.path} — ${item.reason} Next: ${item.safeNextAction}`,
    ),
  ];
  if (result.transactionOutcome?.status === "failed") {
    lines.push(
      `Transaction failed during: ${result.transactionOutcome.failedStage ?? "unknown"}`,
      `Error: ${result.transactionOutcome.errorCode ?? "transaction-failed"}`,
      `Rollback: ${result.transactionOutcome.rollbackCompleted ? "completed" : "incomplete"}`,
    );
    if (!result.transactionOutcome.rollbackCompleted)
      lines.push(
        "Manual inspection is required.",
        ...result.transactionOutcome.rollbackFailures.map(
          (path) => `- ${path}`,
        ),
      );
  }
  return lines.join("\n");
}

export function formatDoctor(result: DoctorPlan): string {
  return result.findings
    .map(
      (finding) =>
        `${finding.severity.padEnd(7)} ${finding.code} ${finding.path} — ${finding.message}${
          finding.remediation.length > 0
            ? ` Remediation: ${finding.remediation.join(" ")}`
            : ""
        }`,
    )
    .join("\n");
}

export function formatDaemonDoctor(result: DoctorResult): string {
  return result.findings
    .map(
      (finding) =>
        `${finding.severity.padEnd(7)} ${finding.code} ${finding.path} — ${finding.message}`,
    )
    .join("\n");
}

export function formatInspection(
  result: Awaited<ReturnType<typeof inspectProject>>,
): string {
  return [
    `Profile: ${result.profileDetection.selectedProfile}`,
    `Workspace topology: ${result.profileDetection.workspaceTopology}`,
    `Readiness: ${result.readiness}`,
    `Detected adapters: ${result.detectedAdapters.join(", ") || "none"}`,
    `Instruction files: ${result.instructionPaths.join(", ") || "none"}`,
    ...result.findings.map(
      (finding) =>
        `${finding.severity.padEnd(7)} ${finding.code} ${finding.path} — ${finding.message}`,
    ),
  ].join("\n");
}

export function formatEngineeringConformanceHuman(
  report: EngineeringConformanceReport,
): string {
  const lines: string[] = [
    `Intentloom Engineering Conformance Report [v${report.operationVersion}]`,
    `Policy: ${report.policyId}`,
    `Case: ${report.caseType} (${report.caseId})`,
    `Summary: ${report.summary.passed}/${report.summary.totalRules} passed, ${report.summary.violations} violations, ${report.summary.missingEvidence} missing evidence, ${report.summary.ambiguousEvidence} ambiguous, ${report.summary.unsupported} unsupported`,
    "",
    "Findings:",
  ];
  for (const finding of report.findings) {
    const icon =
      finding.status === "pass"
        ? "[PASS]"
        : finding.status === "violation"
          ? "[VIOLATION]"
          : finding.status === "missing-evidence"
            ? "[MISSING EVIDENCE]"
            : `[${finding.status.toUpperCase()}]`;
    lines.push(
      `- ${icon} ${finding.title} (${finding.ruleId}) [Severity: ${finding.severity}]`,
    );
    if (finding.remediation) {
      lines.push(`  Remediation: ${finding.remediation.summary}`);
      for (const step of finding.remediation.actionableSteps) {
        lines.push(`  - ${step}`);
      }
    }
  }
  return lines.join("\n");
}

export function formatTimeline(result: ReleaseTimeline): string {
  return [
    `Case: ${result.caseId}`,
    `Quality: ${result.quality}`,
    `Events: ${result.events.length}`,
    ...result.events.map(
      (event) =>
        `${new Date(event.timestamp * 1000).toISOString()} ${event.commitId} ${event.changedPaths.join(", ")}`,
    ),
    ...(result.findings.length > 0
      ? [`Findings: ${result.findings.join(", ")}`]
      : []),
  ].join("\n");
}
