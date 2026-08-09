import {
  QUALITY_CHECKER_REPORT_SCHEMA_URN,
  type EngineeringQualityCheckerDiagnostic,
  type EngineeringQualityCheckerFinding,
  type EngineeringQualityCheckerReport,
  type IngestEngineeringQualityCheckerReportOptions,
  type QualityCheckerReportSource,
} from "@intentloom/protocol";
import {
  validateCheckerReportInput,
  validateEngineeringQualityCheckerReport,
} from "@intentloom/validator";
import {
  diagnostic,
  makeFinding,
  parseCheckerInput,
  type CheckerAdapterOutput,
  type CheckerNormalizationOptions,
} from "./checker-report-common.js";
import { adaptClippyReport } from "./clippy-report.js";
import { adaptEslintReport } from "./eslint-report.js";
import { adaptSarifReport } from "./sarif-report.js";
import { adaptTypescriptReport } from "./typescript-report.js";

function adapt(
  source: QualityCheckerReportSource,
  input: unknown,
): CheckerAdapterOutput {
  if (source === "eslint") return adaptEslintReport(input);
  if (source === "typescript") return adaptTypescriptReport(input);
  if (source === "sarif") return adaptSarifReport(input);
  return adaptClippyReport(input);
}

function deduplicate(findings: readonly EngineeringQualityCheckerFinding[]): {
  readonly findings: readonly EngineeringQualityCheckerFinding[];
  readonly diagnostics: readonly EngineeringQualityCheckerDiagnostic[];
} {
  const byKey = new Map<string, EngineeringQualityCheckerFinding[]>();
  for (const finding of findings) {
    const location = finding.location;
    const key = [
      finding.ruleId,
      location?.path ?? "[UNKNOWN]",
      location?.startLine ?? 0,
      location?.startColumn ?? 0,
    ].join("|");
    const bucket = byKey.get(key) ?? [];
    bucket.push(finding);
    byKey.set(key, bucket);
  }
  const diagnostics: EngineeringQualityCheckerDiagnostic[] = [];
  const retained: EngineeringQualityCheckerFinding[] = [];
  for (const [key, bucket] of byKey) {
    const first = bucket[0];
    if (!first) continue;
    retained.push(first);
    for (const duplicate of bucket.slice(1)) {
      if (
        duplicate.message === first.message &&
        duplicate.severity === first.severity
      ) {
        diagnostics.push(
          diagnostic(
            "duplicate",
            "Equivalent checker findings were deduplicated",
            key,
          ),
        );
      } else {
        retained.push(duplicate);
        diagnostics.push(
          diagnostic(
            "conflicting-meaning",
            "Checker findings share an identity but have different meanings",
            key,
          ),
        );
      }
    }
  }
  retained.sort((a, b) => {
    const aPath = a.location?.path ?? "[UNKNOWN]";
    const bPath = b.location?.path ?? "[UNKNOWN]";
    return (
      aPath.localeCompare(bPath) ||
      a.ruleId.localeCompare(b.ruleId) ||
      (a.location?.startLine ?? 0) - (b.location?.startLine ?? 0) ||
      a.message.localeCompare(b.message) ||
      a.findingId.localeCompare(b.findingId)
    );
  });
  return { findings: retained, diagnostics };
}

export function ingestEngineeringQualityCheckerReport(
  options: IngestEngineeringQualityCheckerReportOptions,
): EngineeringQualityCheckerReport {
  const parsed = parseCheckerInput(options.input, options.source);
  const validatedInput = validateCheckerReportInput(parsed, options.source);
  const adapted = adapt(options.source, validatedInput);
  const normalizationOptions: CheckerNormalizationOptions = {
    source: options.source,
    ...(options.projectRoot === undefined
      ? {}
      : { projectRoot: options.projectRoot }),
  };
  const findings: EngineeringQualityCheckerFinding[] = [];
  const diagnostics = [...adapted.diagnostics];
  for (const candidate of adapted.candidates) {
    const normalized = makeFinding(
      options.source,
      adapted.tool,
      candidate,
      normalizationOptions,
    );
    findings.push(normalized.finding);
    if (normalized.redacted) {
      diagnostics.push(
        diagnostic(
          "redacted-path",
          "Sensitive report text or path was redacted",
          candidate.sourceRecord,
        ),
      );
    }
  }
  const deduped = deduplicate(findings);
  diagnostics.push(...deduped.diagnostics);
  const status =
    findings.length === 0 &&
    diagnostics.some((item) => item.kind === "unsupported")
      ? "unsupported"
      : diagnostics.length > 0
        ? "partial"
        : "resolved";
  return validateEngineeringQualityCheckerReport({
    schemaVersion: QUALITY_CHECKER_REPORT_SCHEMA_URN,
    source: options.source,
    tool: adapted.tool,
    status,
    findings: deduped.findings,
    diagnostics,
  });
}
