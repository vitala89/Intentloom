import {
  acceptSecurityRisk,
  dismissSecurityFinding,
  getSecurityCoverageReport,
  importSarifSecurityReport,
  listSecurityFindings,
  type FileSystem,
  type SecurityFindingSeverity,
  type SecurityFindingState,
} from "@intentloom/application";
import { resolveWithin } from "@intentloom/core";
import { CliUsageError } from "./cli-project-metadata.js";
import type { SecurityCliExitCode, SecurityCliIo } from "./security-command.js";

export interface SecurityFindingsContext {
  readonly args: readonly string[];
  readonly subcommand: string;
  readonly flags: ReadonlySet<string>;
  readonly values: ReadonlyMap<string, string>;
  readonly root: string;
  readonly projectId: string;
  readonly fileSystem: FileSystem;
  readonly io: SecurityCliIo;
}

export async function runSecurityFindingsCommand(
  context: SecurityFindingsContext,
): Promise<SecurityCliExitCode> {
  const { args, subcommand, flags, values, root, projectId, fileSystem, io } =
    context;

  if (subcommand === "import") {
    const filePath = values.get("--file");
    if (!filePath) {
      throw new CliUsageError("security import requires --file <path>");
    }
    const fullPath = resolveWithin(root, filePath);
    if (!(await fileSystem.exists(fullPath))) {
      throw new Error(`security report file not found: ${filePath}`);
    }
    const content = await fileSystem.read(fullPath);
    const result = await importSarifSecurityReport(
      content,
      filePath,
      { root },
      fileSystem,
    );
    if (flags.has("--json")) {
      io.stdout(JSON.stringify(result, null, 2));
    } else {
      io.stdout(
        `Imported ${result.importedCount} security findings from ${filePath}`,
      );
    }
    return 0;
  }

  if (subcommand === "coverage" || subcommand === "inspect") {
    const report = await getSecurityCoverageReport(
      { root, projectId },
      fileSystem,
    );
    if (flags.has("--json")) {
      io.stdout(JSON.stringify(report, null, 2));
    } else {
      const lines = [
        `Security Posture Report for project ${report.projectId}:`,
        `Total Findings: ${report.totalFindings}`,
        `Scanners: ${report.scanners.join(", ") || "none"}`,
        `Severities: critical=${report.findingsBySeverity.critical}, high=${report.findingsBySeverity.high}, medium=${report.findingsBySeverity.medium}, low=${report.findingsBySeverity.low}, info=${report.findingsBySeverity.info}`,
        `States: open=${report.findingsByState.open}, verified=${report.findingsByState.verified}, dismissed=${report.findingsByState.dismissed}, accepted-risk=${report.findingsByState["accepted-risk"]}, remediated=${report.findingsByState.remediated}`,
      ];
      io.stdout(lines.join("\n"));
    }
    return 0;
  }

  if (subcommand === "dismiss") {
    const id =
      values.get("--id") ??
      (args[2] && !args[2].startsWith("--") ? args[2] : undefined);
    const reason = values.get("--reason") ?? "Dismissed by maintainer";
    if (!id) {
      throw new CliUsageError(
        "security dismiss requires finding ID (--id or positional argument)",
      );
    }
    const updated = await dismissSecurityFinding(
      id,
      { root, reason },
      fileSystem,
    );
    if (flags.has("--json")) {
      io.stdout(JSON.stringify(updated, null, 2));
    } else {
      io.stdout(`Dismissed security finding ${id}: ${updated.dismissalReason}`);
    }
    return 0;
  }

  if (subcommand === "accept-risk") {
    const id =
      values.get("--id") ??
      (args[2] && !args[2].startsWith("--") ? args[2] : undefined);
    const approvedBy = values.get("--approved-by") ?? "maintainer";
    const reason = values.get("--reason") ?? "Accepted risk";
    if (!id) {
      throw new CliUsageError(
        "security accept-risk requires finding ID (--id or positional argument)",
      );
    }
    const updated = await acceptSecurityRisk(
      id,
      { root, approvedBy, reason },
      fileSystem,
    );
    if (flags.has("--json")) {
      io.stdout(JSON.stringify(updated, null, 2));
    } else {
      io.stdout(`Accepted risk for security finding ${id} by ${approvedBy}`);
    }
    return 0;
  }

  if (subcommand === "list") {
    const rawSeverity = values.get("--severity");
    const rawState = values.get("--state");
    const severity = rawSeverity as SecurityFindingSeverity | undefined;
    const state = rawState as SecurityFindingState | undefined;

    const findings = await listSecurityFindings(
      {
        root,
        ...(severity !== undefined ? { severity } : {}),
        ...(state !== undefined ? { state } : {}),
      },
      fileSystem,
    );

    if (flags.has("--json")) {
      io.stdout(JSON.stringify(findings, null, 2));
    } else {
      const lines = [
        `Security Findings (${findings.length}):`,
        ...findings.map(
          (f) =>
            `- [${f.severity.toUpperCase()}] [${f.state}] ${f.id} (${f.title}): ${f.scanner}`,
        ),
      ];
      io.stdout(lines.join("\n"));
    }
    return 0;
  }

  throw new CliUsageError(`unsupported security subcommand: ${subcommand}`);
}
