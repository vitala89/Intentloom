import {
  checkSecurityPolicyAndBaseline,
  evaluateProposalAgainstSandbox,
  getSandboxCapabilityPolicy,
  getSecurityPolicy,
  runContinuousSecurityAudit,
  runLocalSecurityAdapters,
  updateSecurityBaseline,
  type FileSystem,
  type SecurityAdapterCategory,
} from "@intentloom/application";
import type { SecurityCliExitCode, SecurityCliIo } from "./security-command.js";

export interface SecurityOperationsContext {
  readonly args: readonly string[];
  readonly subcommand: string;
  readonly flags: ReadonlySet<string>;
  readonly values: ReadonlyMap<string, string>;
  readonly root: string;
  readonly projectId: string;
  readonly fileSystem: FileSystem;
  readonly io: SecurityCliIo;
}

export async function runSecurityOperationsCommand(
  context: SecurityOperationsContext,
): Promise<SecurityCliExitCode> {
  const { args, subcommand, flags, values, root, projectId, fileSystem, io } =
    context;

  if (subcommand === "scan") {
    const rawCategory = values.get("--category");
    const categories = rawCategory
      ? ([rawCategory] as SecurityAdapterCategory[])
      : undefined;

    const results = await runLocalSecurityAdapters(
      {
        root,
        ...(categories !== undefined ? { categories } : {}),
      },
      fileSystem,
    );
    if (flags.has("--json")) {
      io.stdout(JSON.stringify(results, null, 2));
    } else {
      const total = results.reduce((acc, r) => acc + r.totalCount, 0);
      const lines = [
        `Ran ${results.length} security adapters (${total} total findings discovered):`,
        ...results.map(
          (r) =>
            `- [${r.adapter.category}] ${r.adapter.name}: ${r.totalCount} findings`,
        ),
      ];
      io.stdout(lines.join("\n"));
    }
    return 0;
  }

  if (subcommand === "baseline") {
    const action = args[2] ?? "check";
    if (action === "update") {
      const baseline = await updateSecurityBaseline(
        { root, projectId },
        fileSystem,
      );
      if (flags.has("--json")) {
        io.stdout(JSON.stringify(baseline, null, 2));
      } else {
        io.stdout(
          `Updated security baseline for ${projectId}: ${baseline.acceptedFindings.length} findings accepted (hash: ${baseline.baselineHash.slice(0, 8)})`,
        );
      }
      return 0;
    }
    const result = await checkSecurityPolicyAndBaseline(
      { root, projectId },
      fileSystem,
    );
    if (flags.has("--json")) {
      io.stdout(JSON.stringify(result, null, 2));
    } else {
      const lines = [
        `Security Baseline & Policy Check for ${projectId}:`,
        `New Findings: ${result.newFindings.length}`,
        `Resolved Findings: ${result.resolvedFindings.length}`,
        `Policy Violations: ${result.policyViolations.length}`,
        `Exit Code: ${result.exitCode}`,
      ];
      io.stdout(lines.join("\n"));
    }
    return result.exitCode as SecurityCliExitCode;
  }

  if (subcommand === "policy") {
    const policy = await getSecurityPolicy({ root, projectId }, fileSystem);
    if (flags.has("--json")) {
      io.stdout(JSON.stringify(policy, null, 2));
    } else {
      const lines = [
        `Security Policy for ${policy.projectId}:`,
        `Default Enforcement: ${policy.defaultEnforcement}`,
        `Rules (${policy.rules.length}):`,
        ...policy.rules.map((r) => `- ${r.target}: ${r.enforcement}`),
      ];
      io.stdout(lines.join("\n"));
    }
    return 0;
  }

  if (subcommand === "sandbox") {
    const action = args[2] ?? "policy";
    if (action === "policy" || action === "check") {
      const policy = await getSandboxCapabilityPolicy(
        { root, projectId },
        fileSystem,
      );
      if (flags.has("--json")) {
        io.stdout(JSON.stringify(policy, null, 2));
      } else {
        const lines = [
          `Sandbox Capability Policy for ${policy.projectId}:`,
          `Mode: ${policy.mode}`,
          `Allow Network: ${policy.allowNetwork}`,
          `Path Rules (${policy.pathRules.length}):`,
          ...policy.pathRules.map(
            (r) =>
              `- ${r.pathPrefix} (write: ${r.allowWrite}, delete: ${r.allowDelete})`,
          ),
          `Command Rules (${policy.commandRules.length}):`,
          ...policy.commandRules.map((c) => `- ${c.commandPrefix}`),
        ];
        io.stdout(lines.join("\n"));
      }
      return 0;
    }

    if (action === "validate" || action === "eval") {
      const targetPath = values.get("--path") ?? "src/app.ts";
      const sampleProposal = {
        actions: [{ type: "write", path: targetPath }],
      };
      const result = await evaluateProposalAgainstSandbox(
        sampleProposal,
        { root, projectId },
        fileSystem,
      );
      if (flags.has("--json")) {
        io.stdout(JSON.stringify(result, null, 2));
      } else {
        const lines = [
          `Sandbox Evaluation for ${projectId}:`,
          `Allowed: ${result.allowed}`,
          `Violations (${result.violations.length}):`,
          ...result.violations.map((v) => `- ${v}`),
        ];
        io.stdout(lines.join("\n"));
      }
      return (result.allowed ? 0 : 3) as SecurityCliExitCode;
    }
    return 0;
  }

  if (subcommand === "audit" || subcommand === "verify") {
    const report = await runContinuousSecurityAudit(
      { root, projectId },
      fileSystem,
    );
    if (flags.has("--json")) {
      io.stdout(JSON.stringify(report, null, 2));
    } else {
      const lines = [
        `Continuous Security Audit & Verification for ${report.projectId}:`,
        `Security Health Score: ${report.healthScore}%`,
        `Audit Hash: ${report.auditHash.slice(0, 8)}`,
        `Invariant Verification (${report.invariantChecks.length} checks):`,
        ...report.invariantChecks.map(
          (c) =>
            `- [#${c.invariantId}] ${c.title}: ${c.status.toUpperCase()} (${c.details})`,
        ),
      ];
      io.stdout(lines.join("\n"));
    }
    const hasFailedInvariant = report.invariantChecks.some(
      (c) => c.status === "failed",
    );
    return (
      report.healthScore >= 80 && !hasFailedInvariant ? 0 : 3
    ) as SecurityCliExitCode;
  }

  throw new Error(`unsupported security operations subcommand: ${subcommand}`);
}
