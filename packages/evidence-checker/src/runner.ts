import { spawn } from "node:child_process";
import { relative, resolve } from "node:path";
import type {
  CheckerExecutionRequest,
  CheckerExecutionResult,
} from "@intentloom/protocol";

export interface CheckerProcessOutcome {
  readonly status:
    | "completed"
    | "failed"
    | "timed-out"
    | "cancelled"
    | "output-limit-exceeded";
  readonly exitCode?: number;
  readonly signal?: string;
  readonly stdout: string;
  readonly stderr: string;
  readonly durationMs: number;
  readonly outputTruncated: boolean;
  readonly preview: CheckerExecutionRequest["preview"];
}

export type CheckerProcessRunner = (options: {
  readonly entryPath: string;
  readonly arguments: readonly string[];
  readonly cwd: string;
  readonly environment: Readonly<Record<string, string>>;
  readonly timeoutMs: number;
  readonly maxOutputBytes: number;
  readonly signal?: AbortSignal;
  readonly preview: CheckerExecutionRequest["preview"];
}) => Promise<CheckerProcessOutcome>;

function appendOutput(
  current: string,
  chunk: Buffer,
  remaining: number,
): {
  readonly value: string;
  readonly used: number;
  readonly truncated: boolean;
} {
  if (remaining <= 0) return { value: current, used: 0, truncated: true };
  const accepted = chunk.subarray(0, remaining);
  return {
    value: current + accepted.toString("utf8"),
    used: accepted.byteLength,
    truncated: accepted.byteLength < chunk.byteLength,
  };
}

export const defaultCheckerProcessRunner: CheckerProcessRunner = (options) =>
  new Promise((resolveResult) => {
    const startedAt = Date.now();
    const child = spawn(
      process.execPath,
      [options.entryPath, ...options.arguments],
      {
        cwd: options.cwd,
        env: { ...options.environment },
        shell: false,
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let stdout = "";
    let stderr = "";
    let usedBytes = 0;
    let timedOut = false;
    let cancelled = false;
    let outputLimitExceeded = false;
    let settled = false;
    const finish = (outcome: Omit<CheckerProcessOutcome, "durationMs">) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      options.signal?.removeEventListener("abort", abort);
      resolveResult({ ...outcome, durationMs: Date.now() - startedAt });
    };
    const stop = (kind: "timeout" | "cancel" | "output") => {
      timedOut = kind === "timeout";
      cancelled = kind === "cancel";
      outputLimitExceeded = kind === "output";
      child.kill();
    };
    const abort = () => stop("cancel");
    const timeout = setTimeout(() => stop("timeout"), options.timeoutMs);
    const collect = (target: "stdout" | "stderr", chunk: Buffer) => {
      const result = appendOutput(
        target === "stdout" ? stdout : stderr,
        chunk,
        options.maxOutputBytes - usedBytes,
      );
      usedBytes += result.used;
      if (target === "stdout") stdout = result.value;
      else stderr = result.value;
      if (result.truncated) stop("output");
    };
    child.stdout.on("data", (chunk: Buffer) => collect("stdout", chunk));
    child.stderr.on("data", (chunk: Buffer) => collect("stderr", chunk));
    child.once("error", (error) =>
      finish({
        status: "failed",
        stdout,
        stderr: `${stderr}${error.message}`,
        outputTruncated: outputLimitExceeded,
        preview: options.preview,
      }),
    );
    child.once("close", (exitCode, signal) =>
      finish({
        status: timedOut
          ? "timed-out"
          : cancelled
            ? "cancelled"
            : outputLimitExceeded
              ? "output-limit-exceeded"
              : exitCode === 0
                ? "completed"
                : "failed",
        ...(exitCode === null ? {} : { exitCode }),
        ...(signal === null ? {} : { signal }),
        stdout,
        stderr,
        outputTruncated: outputLimitExceeded,
        preview: options.preview,
      }),
    );
    if (options.signal?.aborted) abort();
    else options.signal?.addEventListener("abort", abort, { once: true });
  });

export async function executeBoundedChecker(
  request: CheckerExecutionRequest,
  options: {
    readonly run?: CheckerProcessRunner;
    readonly signal?: AbortSignal;
  } = {},
): Promise<CheckerExecutionResult> {
  const root = resolve(request.projectRoot);
  const entryPath = resolve(root, request.candidate.relativeEntryPath);
  const outsideRoot = relative(root, entryPath);
  if (
    outsideRoot === ".." ||
    outsideRoot.startsWith(`..${entryPath.includes("\\") ? "\\" : "/"}`)
  ) {
    return {
      schemaVersion: request.schemaVersion,
      status: "unsupported",
      failure: "unsafe-executable",
      stdout: "",
      stderr: "",
      durationMs: 0,
      outputTruncated: false,
      preview: request.preview,
      diagnostics: ["checker-entry-escapes-project-root"],
    };
  }
  const processOptions = {
    entryPath,
    arguments: request.arguments,
    cwd: root,
    environment: request.environment,
    timeoutMs: request.timeoutMs,
    maxOutputBytes: request.maxOutputBytes,
    preview: request.preview,
    ...(options.signal === undefined ? {} : { signal: options.signal }),
  };
  const outcome = await (options.run ?? defaultCheckerProcessRunner)(
    processOptions,
  );
  const failure =
    outcome.status === "completed"
      ? "none"
      : outcome.status === "failed"
        ? outcome.exitCode === undefined
          ? "spawn-error"
          : "non-zero-exit"
        : outcome.status;
  return {
    schemaVersion: request.schemaVersion,
    status: outcome.status,
    failure,
    ...(outcome.exitCode === undefined ? {} : { exitCode: outcome.exitCode }),
    ...(outcome.signal === undefined ? {} : { signal: outcome.signal }),
    stdout: outcome.stdout,
    stderr: outcome.stderr,
    durationMs: outcome.durationMs,
    outputTruncated: outcome.outputTruncated,
    preview: request.preview,
    diagnostics:
      outcome.status === "completed" ? [] : [`checker-${outcome.status}`],
  };
}
