import { cwd } from "node:process";
import { nodeFileSystem, type FileSystem } from "@intentloom/application";
import { resolveWithin } from "@intentloom/core";
import { collectGitEvidence } from "@intentloom/evidence-git";
import {
  evaluateEngineeringConformance,
  type EngineeringWorkflowCaseType,
  type EngineeringWorkflowPolicy,
  type GenericTimeline,
} from "@intentloom/evidence-analysis";
import { formatEngineeringConformanceHuman } from "./formatters.js";

export type ConformanceCliExitCode = 0 | 2 | 3;

export interface ConformanceCliIo {
  readonly stdout: (message: string) => void;
  readonly stderr: (message: string) => void;
}

export interface ConformanceCliDependencies {
  readonly fileSystem?: FileSystem;
}

interface ConformanceArguments {
  readonly root: string;
  readonly policyFile?: string;
  readonly timelineFile?: string;
  readonly caseId: string;
  readonly caseType: EngineeringWorkflowCaseType;
  readonly json: boolean;
}

const legacyBooleanFlags = new Set([
  "--cache",
  "--dry-run",
  "--force",
  "--json",
  "--plan",
  "--strict",
  "--enable",
  "--disable",
  "--clear",
]);
const valueFlags = new Set([
  "--root",
  "--policy",
  "--timeline",
  "--case-id",
  "--case-type",
]);

const conformanceUsage =
  "Usage: intentloom conformance [PROJECT_PATH|--root PATH] [--policy PATH] [--timeline PATH] [--case-id ID] [--case-type TYPE] [--json]";

export const defaultEngineeringPolicy: EngineeringWorkflowPolicy = {
  schemaVersion: "1",
  policyId: "policy:default-engineering-conformance",
  description: "Default Intentloom engineering workflow policy",
  rules: [
    {
      ruleId: "rule:require-commit-evidence",
      caseType: "pull-request",
      severity: "error",
      title: "Commit Evidence Presence",
      condition: {
        type: "required-activity",
        activity: "commit",
      },
      remediation: {
        summary: "Pull request workflow timeline must contain commit evidence.",
        actionableSteps: [
          "Ensure local Git history contains commits on the topic branch.",
        ],
      },
    },
    {
      ruleId: "rule:require-release-evidence",
      caseType: "release",
      severity: "error",
      title: "Release Evidence Presence",
      condition: {
        type: "required-activity",
        activity: "commit",
      },
      remediation: {
        summary: "Release workflow timeline must contain commit evidence.",
        actionableSteps: [
          "Ensure Git tags and release commits exist in the repository.",
        ],
      },
    },
  ],
};

function parseConformanceArguments(
  args: readonly string[],
): ConformanceArguments {
  const flags = new Set<string>();
  const values = new Map<string, string>();

  for (let index = 1; index < args.length; index += 1) {
    const token = args[index]!;
    if (legacyBooleanFlags.has(token)) {
      flags.add(token);
      continue;
    }
    if (!token.startsWith("--")) {
      if (values.has("--root"))
        throw new Error("project path specified more than once");
      values.set("--root", token);
      continue;
    }
    if (!valueFlags.has(token)) throw new Error(`unknown option: ${token}`);
    const value = args[index + 1];
    if (value === undefined || value.startsWith("--"))
      throw new Error(`missing value for ${token}`);
    if (token === "--root" && values.has("--root"))
      throw new Error("project path specified more than once");
    values.set(token, value);
    index += 1;
  }

  return {
    root: values.get("--root") ?? cwd(),
    ...(values.has("--policy") ? { policyFile: values.get("--policy")! } : {}),
    ...(values.has("--timeline")
      ? { timelineFile: values.get("--timeline")! }
      : {}),
    caseId: values.get("--case-id") ?? "current",
    caseType:
      (values.get("--case-type") as EngineeringWorkflowCaseType) ??
      "pull-request",
    json: flags.has("--json"),
  };
}

export async function runConformanceCommand(
  args: readonly string[],
  dependencies: ConformanceCliDependencies,
  io: ConformanceCliIo,
): Promise<ConformanceCliExitCode> {
  try {
    const parsed = parseConformanceArguments(args);
    const fileSystem = dependencies.fileSystem ?? nodeFileSystem;

    let policy: EngineeringWorkflowPolicy;
    if (parsed.policyFile) {
      policy = JSON.parse(
        await fileSystem.read(resolveWithin(parsed.root, parsed.policyFile)),
      );
    } else {
      policy = defaultEngineeringPolicy;
    }

    let timeline: GenericTimeline;
    if (parsed.timelineFile) {
      timeline = JSON.parse(
        await fileSystem.read(resolveWithin(parsed.root, parsed.timelineFile)),
      );
    } else {
      const rawGit = await collectGitEvidence({ root: parsed.root });
      timeline = {
        caseType: parsed.caseType,
        caseId: parsed.caseId,
        events: rawGit.commits.map((commit) => ({
          activity: "commit",
          source: "git",
          sourceId: commit.id,
          timestamp: new Date(commit.timestamp * 1000).toISOString(),
          commitIds: [commit.id],
        })),
      };
    }

    const report = evaluateEngineeringConformance(timeline, policy);
    io.stdout(
      parsed.json
        ? JSON.stringify(report, null, 2)
        : formatEngineeringConformanceHuman(report),
    );
    return report.summary.violations > 0 || report.summary.missingEvidence > 0
      ? 3
      : 0;
  } catch (error) {
    io.stderr(error instanceof Error ? error.message : conformanceUsage);
    return 2;
  }
}
