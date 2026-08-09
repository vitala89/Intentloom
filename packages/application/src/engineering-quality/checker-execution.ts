import {
  QUALITY_CHECKER_EXECUTION_SCHEMA_URN,
  type CheckerExecutionRequest,
  type CheckerExecutionResult,
  type CheckerExecutionPreview,
  type EngineeringQualityCheckerReport,
  type ProjectPinnedCheckerCandidate,
} from "@intentloom/protocol";
import {
  executeBoundedChecker,
  type CheckerProcessRunner,
} from "@intentloom/evidence-checker";
import { validateCheckerExecutionRequest } from "@intentloom/validator";
import { ingestEngineeringQualityCheckerReport } from "./checker-report-ingestion.js";

const ESLINT_ARGUMENTS = ["--format", "json", "--no-cache", "."] as const;

export interface PrepareProjectPinnedEslintOptions {
  readonly projectRoot: string;
  readonly candidate: Omit<ProjectPinnedCheckerCandidate, "source" | "tool">;
  readonly timeoutMs?: number;
  readonly maxOutputBytes?: number;
  readonly environment?: Readonly<Record<string, string>>;
}

export interface ProjectPinnedEslintExecution {
  readonly execution: CheckerExecutionResult;
  readonly report?: EngineeringQualityCheckerReport;
}

export interface ProjectPinnedEslintExecutionDependencies {
  readonly run?: CheckerProcessRunner;
  readonly signal?: AbortSignal;
}

function preview(
  projectRoot: string,
  candidate: ProjectPinnedCheckerCandidate,
  timeoutMs: number,
  maxOutputBytes: number,
  environment: Readonly<Record<string, string>>,
): CheckerExecutionPreview {
  return {
    tool: "eslint",
    relativeEntryPath: candidate.relativeEntryPath,
    arguments: [...ESLINT_ARGUMENTS],
    projectRoot,
    environmentKeys: Object.keys(environment).sort(),
    networkPolicy: "deny",
    filesystemPolicy: "read-only",
    timeoutMs,
    maxOutputBytes,
  };
}

export function prepareProjectPinnedEslint(
  options: PrepareProjectPinnedEslintOptions,
): CheckerExecutionRequest {
  const candidate: ProjectPinnedCheckerCandidate = {
    source: "project-local",
    tool: "eslint",
    relativeEntryPath: options.candidate.relativeEntryPath,
    version: options.candidate.version,
  };
  const timeoutMs = options.timeoutMs ?? 30_000;
  const maxOutputBytes = options.maxOutputBytes ?? 512_000;
  const environment = options.environment ?? {};
  return validateCheckerExecutionRequest({
    schemaVersion: QUALITY_CHECKER_EXECUTION_SCHEMA_URN,
    projectRoot: options.projectRoot,
    candidate,
    arguments: [...ESLINT_ARGUMENTS],
    environment,
    timeoutMs,
    maxOutputBytes,
    networkPolicy: "deny",
    filesystemPolicy: "read-only",
    preview: preview(
      options.projectRoot,
      candidate,
      timeoutMs,
      maxOutputBytes,
      environment,
    ),
  });
}

export async function executeProjectPinnedEslint(
  request: CheckerExecutionRequest,
  dependencies: ProjectPinnedEslintExecutionDependencies = {},
): Promise<ProjectPinnedEslintExecution> {
  const validated = validateCheckerExecutionRequest(request);
  const execution = await executeBoundedChecker(validated, dependencies);
  try {
    const report = ingestEngineeringQualityCheckerReport({
      source: "eslint",
      input: execution.stdout,
      projectRoot: validated.projectRoot,
    });
    return { execution, report };
  } catch (error) {
    if (execution.status !== "completed") return { execution };
    const message =
      error instanceof Error ? error.message : "invalid checker output";
    return {
      execution: {
        ...execution,
        status: "failed",
        failure: "invalid-output",
        diagnostics: [message],
      },
    };
  }
}
