import {
  QUALITY_SPECIALIZED_PACK_DETECTION_RESOLUTION_SCHEMA_URN,
  QUALITY_SPECIALIZED_PACK_DETECTION_RESULT_SCHEMA_URN,
  QUALITY_SPECIALIZED_PACK_DETECTION_RULE_SCHEMA_URN,
  type QualityDetectionConfidence,
  type QualityDetectionPathMatchKind,
  type QualityDetectionSecurityImpact,
  type QualitySpecializedPackDetectionCandidate,
  type QualitySpecializedPackDetectionResolution,
  type QualitySpecializedPackDetectionResult,
  type QualitySpecializedPackDetectionRule,
  type QualitySpecializedPackDetectionSignal,
  type QualitySpecializedPackManifest,
  type QualitySpecializedPackTrustState,
} from "@intentloom/protocol";
import {
  validateQualitySpecializedPackDetectionResolution,
  validateQualitySpecializedPackDetectionResult,
  validateQualitySpecializedPackDetectionRule,
} from "@intentloom/validator";
import { evaluateSpecializedPackCompatibility } from "./specialized-pack-manifest-engine.js";

const DEFAULT_MAX_PATHS = 5000;

function normalizePath(path: string): string {
  return path.replaceAll("\\", "/");
}

function pathMatchesSignal(
  path: string,
  signal: QualitySpecializedPackDetectionSignal,
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

function signalLabel(signal: QualitySpecializedPackDetectionSignal): string {
  return signal.label ?? `${signal.matchKind}:${signal.pathPattern}`;
}

function confidenceFromMatches(
  matchedCount: number,
  totalSignals: number,
): QualityDetectionConfidence {
  if (matchedCount >= totalSignals) return "high";
  const ratio = matchedCount / totalSignals;
  if (ratio >= 0.75) return "high";
  if (ratio >= 0.5) return "medium";
  return "low";
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

function hasOverlappingEvidence(
  left: QualitySpecializedPackDetectionCandidate,
  right: QualitySpecializedPackDetectionCandidate,
): boolean {
  const rightPaths = new Set(right.evidencePaths);
  return left.evidencePaths.some((path) => rightPaths.has(path));
}

export function registerSpecializedPackDetectionRule(options: {
  readonly packId: string;
  readonly signals: readonly {
    readonly pathPattern: string;
    readonly matchKind: QualityDetectionPathMatchKind;
    readonly label?: string;
  }[];
  readonly minimumSignalMatches?: number;
  readonly securityImpact?: QualityDetectionSecurityImpact;
}): QualitySpecializedPackDetectionRule {
  return validateQualitySpecializedPackDetectionRule({
    schemaVersion: QUALITY_SPECIALIZED_PACK_DETECTION_RULE_SCHEMA_URN,
    packId: options.packId,
    signals: options.signals,
    ...(options.minimumSignalMatches !== undefined
      ? { minimumSignalMatches: options.minimumSignalMatches }
      : {}),
    ...(options.securityImpact !== undefined
      ? { securityImpact: options.securityImpact }
      : {}),
  });
}

export function detectSpecializedPacks(input: {
  readonly projectPaths: readonly string[];
  readonly rules: readonly QualitySpecializedPackDetectionRule[];
  readonly maxPaths?: number;
}): QualitySpecializedPackDetectionResult {
  const maxPaths = input.maxPaths ?? DEFAULT_MAX_PATHS;
  const normalizedPaths = input.projectPaths.map(normalizePath);
  const scannedPaths = normalizedPaths.slice(0, maxPaths);
  const excludedPathCount = Math.max(
    normalizedPaths.length - scannedPaths.length,
    0,
  );

  const preliminaryCandidates: QualitySpecializedPackDetectionCandidate[] = [];

  for (const rule of input.rules) {
    const minimumMatches = rule.minimumSignalMatches ?? 1;
    const matchedSignals = new Map<
      string,
      { readonly label: string; readonly paths: string[] }
    >();

    for (const signal of rule.signals) {
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

    if (matchedSignals.size < minimumMatches) {
      continue;
    }

    const evidencePaths = orderedUnique(
      Array.from(matchedSignals.values()).flatMap((entry) => entry.paths),
    );
    const matchedSignalLabels = orderedUnique(
      Array.from(matchedSignals.keys()),
    );

    preliminaryCandidates.push({
      packId: rule.packId,
      evidencePaths,
      matchedSignalLabels,
      confidence: confidenceFromMatches(
        matchedSignals.size,
        rule.signals.length,
      ),
      ambiguity: false,
      securityImpact: rule.securityImpact ?? "none",
      requiresConfirmation: true,
    });
  }

  const candidates = preliminaryCandidates.map((candidate) => {
    const ambiguous = preliminaryCandidates.some(
      (other) =>
        other.packId !== candidate.packId &&
        other.confidence === candidate.confidence &&
        hasOverlappingEvidence(candidate, other),
    );
    return ambiguous ? { ...candidate, ambiguity: true } : candidate;
  });

  const sortedCandidates = lexicalSort(
    candidates.map((candidate) => candidate.packId),
  ).map((packId) =>
    candidates.find((candidate) => candidate.packId === packId)!,
  );

  return validateQualitySpecializedPackDetectionResult({
    schemaVersion: QUALITY_SPECIALIZED_PACK_DETECTION_RESULT_SCHEMA_URN,
    scannedPathCount: scannedPaths.length,
    excludedPathCount,
    scanLimitReached: excludedPathCount > 0,
    candidates: sortedCandidates,
  });
}

export function resolveSpecializedPackDetection(input: {
  readonly projectPaths: readonly string[];
  readonly rules: readonly QualitySpecializedPackDetectionRule[];
  readonly manifests: readonly QualitySpecializedPackManifest[];
  readonly trustStates: readonly QualitySpecializedPackTrustState[];
  readonly maxPaths?: number;
}): QualitySpecializedPackDetectionResolution {
  const detection = detectSpecializedPacks({
    projectPaths: input.projectPaths,
    rules: input.rules,
    ...(input.maxPaths !== undefined ? { maxPaths: input.maxPaths } : {}),
  });

  const detectedPackIds = new Set(
    detection.candidates.map((candidate) => candidate.packId),
  );
  const detectedManifests = input.manifests.filter((manifest) =>
    detectedPackIds.has(manifest.id),
  );

  const { compatiblePacks, rejectedPacks } =
    evaluateSpecializedPackCompatibility(detectedManifests, input.trustStates);

  const compatiblePackIds = lexicalSort(
    compatiblePacks.map((manifest) => manifest.id),
  );

  const sortedRejectedPacks = [...rejectedPacks].sort((left, right) =>
    left.packId.localeCompare(right.packId),
  );

  return validateQualitySpecializedPackDetectionResolution({
    schemaVersion: QUALITY_SPECIALIZED_PACK_DETECTION_RESOLUTION_SCHEMA_URN,
    detection,
    compatiblePackIds,
    rejectedPacks: sortedRejectedPacks,
  });
}
