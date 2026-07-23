import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { isAbsolute, relative, resolve, sep } from "node:path";

const executeGit = promisify(execFile);
const logFormat = "%H%x00%P%x00%ct";

export interface GitEvidenceOptions {
  readonly root: string;
  readonly limit?: number;
  readonly timeoutMs?: number;
  readonly maxOutputBytes?: number;
  readonly run?: GitRunner;
}

export type GitRunner = (
  file: string,
  args: readonly string[],
  options: {
    readonly cwd: string;
    readonly timeout: number;
    readonly maxBuffer: number;
  },
) => Promise<{ readonly stdout: string; readonly stderr: string }>;

export interface GitCommitEvidence {
  readonly id: string;
  readonly parents: readonly string[];
  readonly timestamp: number;
  readonly changedPaths: readonly string[];
}

export interface GitEvidenceResult {
  readonly operationVersion: 1;
  readonly source: "local-git";
  readonly trust: "local-observed-unverified";
  readonly root: ".";
  readonly status: "available" | "unavailable" | "limit-reached";
  readonly commitLimit: number;
  readonly commits: readonly GitCommitEvidence[];
  readonly diagnostics: readonly string[];
}

export interface ReleaseTimelineEvent {
  readonly id: string;
  readonly eventType: "commit";
  readonly timestamp: number;
  readonly commitId: string;
  readonly parents: readonly string[];
  readonly changedPaths: readonly string[];
  readonly source: "local-git";
  readonly trust: "local-observed-unverified";
}

export interface ReleaseTimeline {
  readonly operationVersion: 1;
  readonly caseType: "release";
  readonly caseId: string;
  readonly quality: "complete" | "bounded" | "unavailable";
  readonly events: readonly ReleaseTimelineEvent[];
  readonly findings: readonly ("evidence-bounded" | "evidence-unavailable")[];
}

export function createReleaseTimeline(
  caseId: string,
  evidence: GitEvidenceResult,
): ReleaseTimeline {
  const quality =
    evidence.status === "available"
      ? "complete"
      : evidence.status === "limit-reached"
        ? "bounded"
        : "unavailable";
  return {
    operationVersion: 1,
    caseType: "release",
    caseId,
    quality,
    events: [...evidence.commits]
      .sort(
        (left, right) =>
          left.timestamp - right.timestamp || left.id.localeCompare(right.id),
      )
      .map((commit) => ({
        id: `commit:${commit.id}`,
        eventType: "commit" as const,
        timestamp: commit.timestamp,
        commitId: commit.id,
        parents: commit.parents,
        changedPaths: commit.changedPaths,
        source: evidence.source,
        trust: evidence.trust,
      })),
    findings:
      evidence.status === "limit-reached"
        ? ["evidence-bounded"]
        : evidence.status === "unavailable"
          ? ["evidence-unavailable"]
          : [],
  };
}

const defaultRunner: GitRunner = async (file, args, options) => {
  const result = await executeGit(file, [...args], {
    cwd: options.cwd,
    timeout: options.timeout,
    maxBuffer: options.maxBuffer,
    shell: false,
    windowsHide: true,
    env: {
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_CONFIG_NOGLOBAL: "1",
      GIT_TERMINAL_PROMPT: "0",
    },
  });
  return { stdout: result.stdout, stderr: result.stderr };
};

function safeRelativePath(root: string, value: string): string | null {
  const candidate = value.replaceAll("\\", "/");
  if (candidate === "" || candidate.includes("\0") || isAbsolute(candidate))
    return null;
  const normalized = relative(
    resolve(root),
    resolve(root, candidate),
  ).replaceAll("\\", "/");
  if (normalized === "" || normalized === ".." || normalized.startsWith("../"))
    return null;
  return normalized;
}

function unavailable(
  limit: number,
  diagnostics: readonly string[],
): GitEvidenceResult {
  return {
    operationVersion: 1,
    source: "local-git",
    trust: "local-observed-unverified",
    root: ".",
    status: "unavailable",
    commitLimit: limit,
    commits: [],
    diagnostics,
  };
}

export async function collectGitEvidence(
  options: GitEvidenceOptions,
): Promise<GitEvidenceResult> {
  const limit = Math.min(500, Math.max(1, Math.trunc(options.limit ?? 50)));
  const timeoutMs = Math.min(
    30_000,
    Math.max(100, Math.trunc(options.timeoutMs ?? 5_000)),
  );
  const maxOutputBytes = Math.min(
    4 * 1024 * 1024,
    Math.max(4_096, Math.trunc(options.maxOutputBytes ?? 512 * 1024)),
  );
  const root = resolve(options.root);
  const run = options.run ?? defaultRunner;
  try {
    const result = await run(
      "git",
      [
        "log",
        "--no-ext-diff",
        "--no-decorate",
        "--no-renames",
        `--format=${logFormat}`,
        "--name-only",
        "--max-count",
        String(limit),
      ],
      { cwd: root, timeout: timeoutMs, maxBuffer: maxOutputBytes },
    );
    const records: GitCommitEvidence[] = [];
    let current:
      | {
          id: string;
          parents: readonly string[];
          timestamp: number;
          changedPaths: string[];
        }
      | undefined;
    for (const line of result.stdout.split(/\r?\n/u)) {
      if (line.includes("\0")) {
        const [id, parentsText, timestampText] = line.split("\0");
        if (
          !/^[0-9a-f]{7,64}$/u.test(id ?? "") ||
          !/^\d+$/u.test(timestampText ?? "")
        )
          continue;
        current = {
          id: id!,
          parents: (parentsText ?? "")
            .split(" ")
            .filter((parent) => /^[0-9a-f]{7,64}$/u.test(parent)),
          timestamp: Number(timestampText),
          changedPaths: [],
        };
        records.push(current);
      } else if (current) {
        const path = safeRelativePath(root, line.trim());
        if (path && !current.changedPaths.includes(path))
          current.changedPaths = [...current.changedPaths, path].sort();
      }
    }
    const status = records.length >= limit ? "limit-reached" : "available";
    return {
      operationVersion: 1,
      source: "local-git",
      trust: "local-observed-unverified",
      root: ".",
      status,
      commitLimit: limit,
      commits: records,
      diagnostics: status === "limit-reached" ? ["commit-limit-reached"] : [],
    };
  } catch {
    return unavailable(limit, ["git-unavailable"]);
  }
}
