import type {
  AdoptionProposal,
  DoctorPlan,
  Plan,
} from "@intentloom/application";
import type { ProviderEvidenceResult } from "@intentloom/evidence-provider";
import type { CleanCacheResult } from "./clean-cache.js";
import { analyzeReleaseEvidence } from "@intentloom/evidence-analysis";
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

export function formatInspection(
  result: Awaited<ReturnType<typeof inspectProject>>,
): string {
  return [
    `Profile: ${result.profileDetection.selectedProfile}`,
    `Readiness: ${result.readiness}`,
    `Detected adapters: ${result.detectedAdapters.join(", ") || "none"}`,
    `Instruction files: ${result.instructionPaths.join(", ") || "none"}`,
    ...result.findings.map(
      (finding) =>
        `${finding.severity.padEnd(7)} ${finding.code} ${finding.path} — ${finding.message}`,
    ),
  ].join("\n");
}
