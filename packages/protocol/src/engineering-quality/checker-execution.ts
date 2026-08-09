export const QUALITY_CHECKER_EXECUTION_SCHEMA_URN =
  "urn:intentloom:schema:engineering-quality-checker-execution:1" as const;

export type CheckerExecutionStatus =
  | "completed"
  | "failed"
  | "timed-out"
  | "cancelled"
  | "output-limit-exceeded"
  | "unsupported";

export type CheckerExecutionFailure =
  | "none"
  | "invalid-request"
  | "executable-not-found"
  | "unsafe-executable"
  | "spawn-error"
  | "non-zero-exit"
  | "timed-out"
  | "cancelled"
  | "output-limit-exceeded"
  | "invalid-output"
  | "network-isolation-unavailable";

export interface ProjectPinnedCheckerCandidate {
  readonly source: "project-local";
  readonly tool: "eslint";
  readonly relativeEntryPath: string;
  readonly version: string;
}

export interface CheckerExecutionPreview {
  readonly tool: "eslint";
  readonly relativeEntryPath: string;
  readonly arguments: readonly string[];
  readonly projectRoot: string;
  readonly environmentKeys: readonly string[];
  readonly networkPolicy: "deny";
  readonly filesystemPolicy: "read-only";
  readonly timeoutMs: number;
  readonly maxOutputBytes: number;
}

export interface CheckerExecutionRequest {
  readonly schemaVersion: typeof QUALITY_CHECKER_EXECUTION_SCHEMA_URN;
  readonly projectRoot: string;
  readonly candidate: ProjectPinnedCheckerCandidate;
  readonly arguments: readonly string[];
  readonly environment: Readonly<Record<string, string>>;
  readonly timeoutMs: number;
  readonly maxOutputBytes: number;
  readonly networkPolicy: "deny";
  readonly filesystemPolicy: "read-only";
  readonly preview: CheckerExecutionPreview;
}

export interface CheckerExecutionResult {
  readonly schemaVersion: typeof QUALITY_CHECKER_EXECUTION_SCHEMA_URN;
  readonly status: CheckerExecutionStatus;
  readonly failure: CheckerExecutionFailure;
  readonly exitCode?: number;
  readonly signal?: string;
  readonly stdout: string;
  readonly stderr: string;
  readonly durationMs: number;
  readonly outputTruncated: boolean;
  readonly preview: CheckerExecutionPreview;
  readonly diagnostics: readonly string[];
}
