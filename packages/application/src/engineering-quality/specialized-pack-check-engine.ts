import {
  QUALITY_SPECIALIZED_PACK_CHECK_DEFINITION_SCHEMA_URN,
  QUALITY_SPECIALIZED_PACK_CHECK_REPORT_SCHEMA_URN,
  QUALITY_SPECIALIZED_PACK_CHECK_RESULT_SCHEMA_URN,
  type QualityDetectionPathMatchKind,
  type QualitySpecializedPackCheckDefinition,
  type QualitySpecializedPackCheckFinding,
  type QualitySpecializedPackCheckKind,
  type QualitySpecializedPackCheckReport,
  type QualitySpecializedPackCheckResult,
  type QualitySpecializedPackCheckSignal,
  type QualitySpecializedPackDetectionRule,
  type QualitySpecializedPackManifest,
  type QualitySpecializedPackTrustState,
} from "@intentloom/protocol";
import {
  validateQualitySpecializedPackCheckDefinition,
  validateQualitySpecializedPackCheckReport,
  validateQualitySpecializedPackCheckResult,
} from "@intentloom/validator";
import { resolveSpecializedPackDetection } from "./specialized-pack-detection-engine.js";

const DEFAULT_MAX_PATHS = 5000;

function normalizePath(path: string): string {
  return path.replaceAll("\\", "/");
}

function pathMatchesSignal(
  path: string,
  signal: QualitySpecializedPackCheckSignal,
): boolean {
  const normalizedPath = normalizePath(path);
  const normalizedPattern = normalizePath(signal.pathPattern);
  switch (signal.matchKind) {
    case "exact":
      return normalizedPath === normalizedPattern;
    case "suffix":
      return normalizedPath.endsWith(normalizedPattern);
    case "contains":
      return normalizedPath.includes(normalizedPattern);
  }
}

function signalLabel(signal: QualitySpecializedPackCheckSignal): string {
  return signal.label ?? `${signal.matchKind}:${signal.pathPattern}`;
}

function lexicalSort(values: readonly string[]): string[] {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function orderedUnique(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (!seen.has(value)) {
      seen.add(value);
      result.push(value);
    }
  }
  return lexicalSort(result);
}

function collectMatchedSignals(
  scannedPaths: readonly string[],
  signals: readonly QualitySpecializedPackCheckSignal[],
): Map<string, { readonly label: string; readonly paths: string[] }> {
  const matchedSignals = new Map<
    string,
    { readonly label: string; readonly paths: string[] }
  >();

  for (const signal of signals) {
    const label = signalLabel(signal);
    const paths: string[] = [];
    for (const path of scannedPaths) {
      if (pathMatchesSignal(path, signal)) {
        paths.push(path);
      }
    }
    if (paths.length > 0) {
      matchedSignals.set(label, { label, paths });
    }
  }

  return matchedSignals;
}

function evaluateCheckDefinition(input: {
  readonly definition: QualitySpecializedPackCheckDefinition;
  readonly scannedPaths: readonly string[];
  readonly activePackIds: ReadonlySet<string>;
}): QualitySpecializedPackCheckFinding {
  const { definition, scannedPaths, activePackIds } = input;

  if (!activePackIds.has(definition.packId)) {
    return {
      ruleId: definition.ruleId,
      packId: definition.packId,
      state: "skipped",
      severity: definition.severity,
      summary: definition.summary,
      evidencePaths: [],
      message: `Check skipped because pack ${definition.packId} is not active.`,
    };
  }

  const matchedSignals = collectMatchedSignals(
    scannedPaths,
    definition.signals,
  );
  const minimumMatches = definition.minimumSignalMatches ?? 1;
  const evidencePaths = orderedUnique(
    Array.from(matchedSignals.values()).flatMap((entry) => entry.paths),
  );
  const matchedCount = matchedSignals.size;
  const passed = evaluateCheckKind(
    definition.kind,
    matchedCount,
    minimumMatches,
  );

  return {
    ruleId: definition.ruleId,
    packId: definition.packId,
    state: passed ? "passed" : "failed",
    severity: definition.severity,
    summary: definition.summary,
    evidencePaths,
    message: buildCheckMessage(definition, passed, evidencePaths),
  };
}

function evaluateCheckKind(
  kind: QualitySpecializedPackCheckKind,
  matchedCount: number,
  minimumMatches: number,
): boolean {
  switch (kind) {
    case "path-presence":
      return matchedCount >= minimumMatches;
    case "path-absence":
      return matchedCount === 0;
  }
}

function buildCheckMessage(
  definition: QualitySpecializedPackCheckDefinition,
  passed: boolean,
  evidencePaths: readonly string[],
): string {
  const evidenceSummary =
    evidencePaths.length > 0
      ? ` Evidence paths: ${evidencePaths.join(", ")}.`
      : "";

  if (passed) {
    return `${definition.summary} passed.${evidenceSummary}`;
  }

  if (definition.kind === "path-presence") {
    return `${definition.summary} failed because required project evidence was not found.${evidenceSummary}`;
  }

  return `${definition.summary} failed because forbidden project evidence was found.${evidenceSummary}`;
}

export function registerSpecializedPackCheckDefinition(options: {
  readonly packId: string;
  readonly ruleId: string;
  readonly kind: QualitySpecializedPackCheckKind;
  readonly signals: readonly {
    readonly pathPattern: string;
    readonly matchKind: QualityDetectionPathMatchKind;
    readonly label?: string;
  }[];
  readonly minimumSignalMatches?: number;
  readonly severity: QualitySpecializedPackCheckDefinition["severity"];
  readonly summary: string;
}): QualitySpecializedPackCheckDefinition {
  return validateQualitySpecializedPackCheckDefinition({
    schemaVersion: QUALITY_SPECIALIZED_PACK_CHECK_DEFINITION_SCHEMA_URN,
    packId: options.packId,
    ruleId: options.ruleId,
    kind: options.kind,
    signals: options.signals,
    ...(options.minimumSignalMatches !== undefined
      ? { minimumSignalMatches: options.minimumSignalMatches }
      : {}),
    severity: options.severity,
    summary: options.summary,
  });
}

export function runSpecializedPackDeterministicChecks(input: {
  readonly projectPaths: readonly string[];
  readonly definitions: readonly QualitySpecializedPackCheckDefinition[];
  readonly activePackIds: readonly string[];
  readonly maxPaths?: number;
}): QualitySpecializedPackCheckResult {
  const maxPaths = input.maxPaths ?? DEFAULT_MAX_PATHS;
  const normalizedPaths = input.projectPaths.map(normalizePath);
  const scannedPaths = normalizedPaths.slice(0, maxPaths);
  const excludedPathCount = Math.max(
    normalizedPaths.length - scannedPaths.length,
    0,
  );
  const activePackIds = new Set(input.activePackIds);

  const sortedDefinitions = [...input.definitions].sort((left, right) => {
    const packCompare = left.packId.localeCompare(right.packId);
    return packCompare !== 0
      ? packCompare
      : left.ruleId.localeCompare(right.ruleId);
  });

  const findings = sortedDefinitions.map((definition) =>
    evaluateCheckDefinition({
      definition,
      scannedPaths,
      activePackIds,
    }),
  );

  return validateQualitySpecializedPackCheckResult({
    schemaVersion: QUALITY_SPECIALIZED_PACK_CHECK_RESULT_SCHEMA_URN,
    scannedPathCount: scannedPaths.length,
    excludedPathCount,
    scanLimitReached: excludedPathCount > 0,
    findings,
  });
}

export function resolveSpecializedPackDeterministicChecks(input: {
  readonly projectPaths: readonly string[];
  readonly definitions: readonly QualitySpecializedPackCheckDefinition[];
  readonly rules: readonly QualitySpecializedPackDetectionRule[];
  readonly manifests: readonly QualitySpecializedPackManifest[];
  readonly trustStates: readonly QualitySpecializedPackTrustState[];
  readonly maxPaths?: number;
}): QualitySpecializedPackCheckReport {
  const detection = resolveSpecializedPackDetection({
    projectPaths: input.projectPaths,
    rules: input.rules,
    manifests: input.manifests,
    trustStates: input.trustStates,
    ...(input.maxPaths !== undefined ? { maxPaths: input.maxPaths } : {}),
  });

  const result = runSpecializedPackDeterministicChecks({
    projectPaths: input.projectPaths,
    definitions: input.definitions,
    activePackIds: detection.compatiblePackIds,
    ...(input.maxPaths !== undefined ? { maxPaths: input.maxPaths } : {}),
  });

  return validateQualitySpecializedPackCheckReport({
    schemaVersion: QUALITY_SPECIALIZED_PACK_CHECK_REPORT_SCHEMA_URN,
    activePackIds: detection.compatiblePackIds,
    result,
  });
}
