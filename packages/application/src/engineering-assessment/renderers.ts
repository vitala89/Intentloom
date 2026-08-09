import type { AssessmentReportModel } from "@intentloom/protocol";

export type AssessmentReportExportFormat = "json" | "markdown" | "html";

export interface ExportAssessmentReportOptions {
  readonly format: AssessmentReportExportFormat;
  readonly redactSecrets?: boolean;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function redactSecrets(text: string): string {
  return text.replaceAll(
    /(api[_-]?key|secret|token|password)=([^\s&]+)/gi,
    "$1=[REDACTED]",
  );
}

export function renderAssessmentReport(
  report: AssessmentReportModel,
  options: ExportAssessmentReportOptions,
): string {
  let content = "";
  const format = options.format;

  if (format === "json") {
    content = JSON.stringify(report, null, 2);
  } else if (format === "markdown") {
    const env = report.envelope;
    content = [
      `# Engineering Assessment Report: ${env.scope.projectId}`,
      "",
      `**Assessment ID:** \`${env.identity.id}\`  `,
      `**Status:** \`${env.status}\`  `,
      `**Root:** \`${env.scope.root}\`  `,
      `**Timestamp:** ${new Date(env.timestamp).toISOString()}`,
      "",
      "## Summary",
      report.summary,
      "",
      "## Findings Summary",
      `Total Findings: ${env.findingReferences.length}`,
      ...(env.findingProjections ?? []).map(
        (fp) =>
          `- [${fp.severity.toUpperCase()}] **${fp.id}** (${fp.category}/${fp.scope}): ${fp.impactSummary}`,
      ),
      "",
      "## Technical Debt Map",
      `Total Debt Items: ${report.technicalDebtMap.items.length}`,
      ...report.technicalDebtMap.items.map(
        (item) =>
          `- **${item.id}** [${item.category}]: Complexity ${item.estimatedRemediationComplexity}`,
      ),
    ].join("\n");
  } else if (format === "html") {
    const env = report.envelope;
    const safeTitle = escapeHtml(env.scope.projectId);
    const safeSummary = escapeHtml(report.summary);
    content = [
      "<!DOCTYPE html>",
      "<html>",
      "<head>",
      `  <title>Assessment Report - ${safeTitle}</title>`,
      "  <style>body{font-family:sans-serif;margin:2rem;} h1{color:#333;}</style>",
      "</head>",
      "<body>",
      `  <h1>Engineering Assessment Report: ${safeTitle}</h1>`,
      `  <p><strong>ID:</strong> ${escapeHtml(env.identity.id)}</p>`,
      `  <p><strong>Status:</strong> ${escapeHtml(env.status)}</p>`,
      `  <h2>Summary</h2>`,
      `  <p>${safeSummary}</p>`,
      "</body>",
      "</html>",
    ].join("\n");
  } else {
    throw new Error(`Unsupported export format: ${String(format)}`);
  }

  return options.redactSecrets === true ? redactSecrets(content) : content;
}
