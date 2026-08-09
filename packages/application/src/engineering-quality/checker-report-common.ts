import { createHash } from "node:crypto";
import type {
  EngineeringQualityCheckerDiagnostic,
  EngineeringQualityCheckerFinding,
  EngineeringQualityCheckerLocation,
  EngineeringQualityCheckerTool,
  QualityCheckerReportSource,
  QualityCheckerSeverity,
} from "@intentloom/protocol";

export interface CheckerCandidate {
  readonly ruleId: string;
  readonly severity: QualityCheckerSeverity;
  readonly message: string;
  readonly path?: string;
  readonly startLine?: number;
  readonly startColumn?: number;
  readonly endLine?: number;
  readonly endColumn?: number;
  readonly fingerprint?: string;
  readonly helpUri?: string;
  readonly tool?: EngineeringQualityCheckerTool;
  readonly sourceRecord?: string;
}

export interface CheckerAdapterOutput {
  readonly tool: EngineeringQualityCheckerTool;
  readonly candidates: readonly CheckerCandidate[];
  readonly diagnostics: readonly EngineeringQualityCheckerDiagnostic[];
}

export interface CheckerNormalizationOptions {
  readonly source: QualityCheckerReportSource;
  readonly projectRoot?: string;
}

export function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

export function textValue(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

export function parseCheckerInput(
  input: unknown,
  source: QualityCheckerReportSource,
): unknown {
  if (typeof input !== "string") return input;
  if (input.length > 5_000_000) {
    throw new Error("checker report exceeds the 5000000-character limit");
  }
  try {
    const parsed = JSON.parse(input);
    return source === "clippy" && !Array.isArray(parsed) ? [parsed] : parsed;
  } catch (error) {
    if (source !== "clippy") {
      throw new Error(`malformed ${source} JSON report`, { cause: error });
    }
    const records = input
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          throw new Error("malformed clippy JSON line");
        }
      });
    if (!records.length && error instanceof Error) throw error;
    return records;
  }
}

function secretLike(value: string): boolean {
  return /(?:^|[\\/])(?:\.env(?:\.[^\\/]+)?|[^\\/]+\.(?:key|pem|p12|pfx))$/iu.test(
    value,
  );
}

function redactText(value: string): string {
  return value
    .replace(
      /-----BEGIN [^-]+-----[\s\S]*?-----END [^-]+-----/giu,
      "[REDACTED]",
    )
    .replace(
      /((?:api[_-]?key|token|password|secret)\s*[=:]\s*)[^\s,;]+/giu,
      "$1[REDACTED]",
    );
}

export function normalizePath(
  rawPath: string | undefined,
  projectRoot: string | undefined,
): { readonly path: string; readonly redacted: boolean } {
  if (!rawPath?.trim()) return { path: "[UNKNOWN]", redacted: false };
  const raw = rawPath.replace(/^file:\/\//iu, "").replaceAll("\\", "/");
  const root = projectRoot?.replaceAll("\\", "/").replace(/\/+$/u, "");
  const absolute = raw.startsWith("/") || /^[A-Za-z]:\//u.test(raw);
  const insideProjectRoot = Boolean(
    root && (raw === root || raw.startsWith(`${root}/`)),
  );
  let path = raw;
  if (insideProjectRoot && root) {
    path = raw.slice(root.length).replace(/^\/+/, "");
  }
  const segments: string[] = [];
  for (const segment of path.split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      if (segments.length) segments.pop();
      else return { path: "[REDACTED]", redacted: true };
    } else segments.push(segment);
  }
  const normalized = segments.join("/") || "[UNKNOWN]";
  if (secretLike(normalized) || (absolute && !insideProjectRoot)) {
    return { path: "[REDACTED]", redacted: true };
  }
  return { path: normalized, redacted: false };
}

export function makeFinding(
  source: QualityCheckerReportSource,
  tool: EngineeringQualityCheckerTool,
  candidate: CheckerCandidate,
  options: CheckerNormalizationOptions,
): {
  readonly finding: EngineeringQualityCheckerFinding;
  readonly redacted: boolean;
} {
  const normalizedPath = normalizePath(candidate.path, options.projectRoot);
  const message = redactText(candidate.message);
  const findingTool = candidate.tool ?? tool;
  const location: EngineeringQualityCheckerLocation | undefined = candidate.path
    ? {
        path: normalizedPath.path,
        ...(candidate.startLine === undefined
          ? {}
          : { startLine: candidate.startLine }),
        ...(candidate.startColumn === undefined
          ? {}
          : { startColumn: candidate.startColumn }),
        ...(candidate.endLine === undefined
          ? {}
          : { endLine: candidate.endLine }),
        ...(candidate.endColumn === undefined
          ? {}
          : { endColumn: candidate.endColumn }),
      }
    : undefined;
  const identity = JSON.stringify({
    source,
    ruleId: candidate.ruleId,
    severity: candidate.severity,
    message,
    location,
    fingerprint: candidate.fingerprint,
  });
  const findingId = `chk-${createHash("sha256").update(identity).digest("hex").slice(0, 20)}`;
  return {
    finding: {
      findingId,
      source,
      tool: findingTool,
      ruleId: candidate.ruleId,
      severity: candidate.severity,
      message,
      ...(location === undefined ? {} : { location }),
      ...(candidate.fingerprint === undefined
        ? {}
        : { fingerprint: candidate.fingerprint }),
      ...(candidate.helpUri === undefined
        ? {}
        : { helpUri: candidate.helpUri }),
    },
    redacted: normalizedPath.redacted || message !== candidate.message,
  };
}

export function diagnostic(
  kind: EngineeringQualityCheckerDiagnostic["kind"],
  message: string,
  sourceRecord?: string,
): EngineeringQualityCheckerDiagnostic {
  return sourceRecord === undefined
    ? { kind, message }
    : { kind, message, sourceRecord };
}

export function asPositiveInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : undefined;
}
