import {
  QUALITY_CHECKER_EXECUTION_SCHEMA_URN,
  type CheckerExecutionRequest,
} from "@intentloom/protocol";
import { isObject } from "./common.js";

const SAFE_ENVIRONMENT_KEYS = new Set([
  "CI",
  "FORCE_COLOR",
  "LANG",
  "LC_ALL",
  "NO_COLOR",
  "TERM",
]);
const ESLINT_ARGUMENTS = ["--format", "json", "--no-cache", "."] as const;

function boundedString(value: unknown, field: string, limit: number): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} must be a non-empty string`);
  }
  if (value.length > limit || value.includes("\u0000")) {
    throw new Error(`${field} is invalid or exceeds its limit`);
  }
  return value;
}

function validateProjectRoot(value: unknown): string {
  const root = boundedString(value, "projectRoot", 4_096);
  if (!root.startsWith("/") && !/^[A-Za-z]:[\\/]/u.test(root)) {
    throw new Error("projectRoot must be absolute");
  }
  return root;
}

function validateCandidate(value: unknown) {
  if (!isObject(value)) throw new Error("candidate must be an object");
  if (value.source !== "project-local" || value.tool !== "eslint") {
    throw new Error("candidate must be a project-local ESLint entry");
  }
  const relativeEntryPath = boundedString(
    value.relativeEntryPath,
    "candidate.relativeEntryPath",
    1_024,
  ).replaceAll("\\", "/");
  if (
    relativeEntryPath.startsWith("/") ||
    /^[A-Za-z]:/u.test(relativeEntryPath) ||
    relativeEntryPath.split("/").includes("..") ||
    relativeEntryPath !== "node_modules/eslint/bin/eslint.js"
  ) {
    throw new Error("candidate.relativeEntryPath must be a local ESLint entry");
  }
  return {
    source: "project-local" as const,
    tool: "eslint" as const,
    relativeEntryPath,
    version: boundedString(value.version, "candidate.version", 128),
  };
}

function validateEnvironment(value: unknown): Readonly<Record<string, string>> {
  if (!isObject(value)) throw new Error("environment must be an object");
  const entries = Object.entries(value);
  if (entries.length > SAFE_ENVIRONMENT_KEYS.size) {
    throw new Error("environment exceeds the safe-key limit");
  }
  const environment: Record<string, string> = {};
  for (const [key, rawValue] of entries) {
    if (!SAFE_ENVIRONMENT_KEYS.has(key)) {
      throw new Error(`environment key '${key}' is not allowed`);
    }
    environment[key] = boundedString(rawValue, `environment.${key}`, 256);
  }
  return environment;
}

function validatePositiveBound(value: unknown, field: string, max: number) {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > max
  ) {
    throw new Error(`${field} must be an integer between 1 and ${max}`);
  }
  return value;
}

export function validateCheckerExecutionRequest(
  value: unknown,
): CheckerExecutionRequest {
  if (!isObject(value))
    throw new Error("checker execution request must be an object");
  if (value.schemaVersion !== QUALITY_CHECKER_EXECUTION_SCHEMA_URN) {
    throw new Error("checker execution schemaVersion is invalid");
  }
  const projectRoot = validateProjectRoot(value.projectRoot);
  const candidate = validateCandidate(value.candidate);
  if (
    !Array.isArray(value.arguments) ||
    value.arguments.length !== ESLINT_ARGUMENTS.length ||
    value.arguments.some((item, index) => item !== ESLINT_ARGUMENTS[index])
  ) {
    throw new Error(
      "arguments must be the fixed read-only ESLint argument set",
    );
  }
  const environment = validateEnvironment(value.environment);
  const timeoutMs = validatePositiveBound(
    value.timeoutMs,
    "timeoutMs",
    120_000,
  );
  const maxOutputBytes = validatePositiveBound(
    value.maxOutputBytes,
    "maxOutputBytes",
    5_000_000,
  );
  if (value.networkPolicy !== "deny") {
    throw new Error("networkPolicy must be deny");
  }
  if (value.filesystemPolicy !== "read-only") {
    throw new Error("filesystemPolicy must be read-only");
  }
  if (!isObject(value.preview)) throw new Error("preview must be an object");
  return {
    schemaVersion: QUALITY_CHECKER_EXECUTION_SCHEMA_URN,
    projectRoot,
    candidate,
    arguments: [...ESLINT_ARGUMENTS],
    environment,
    timeoutMs,
    maxOutputBytes,
    networkPolicy: "deny",
    filesystemPolicy: "read-only",
    preview: {
      tool: "eslint",
      relativeEntryPath: candidate.relativeEntryPath,
      arguments: [...ESLINT_ARGUMENTS],
      projectRoot,
      environmentKeys: Object.keys(environment).sort(),
      networkPolicy: "deny",
      filesystemPolicy: "read-only",
      timeoutMs,
      maxOutputBytes,
    },
  };
}
