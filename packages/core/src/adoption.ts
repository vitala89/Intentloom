import { checksum, normalizeStoredPath } from "./index.js";

export const GOVERNANCE_ROLES = [
  "agent-entrypoint",
  "working-agreement",
  "durable-project-context",
  "operational-project-state",
  "duty-watch-log",
  "validation-policy",
  "roadmap",
  "execution-plan",
  "changelog",
  "security-policy",
] as const;

export type GovernanceRole =
  | (typeof GOVERNANCE_ROLES)[number]
  | `provider-instructions:${string}`;

export const OWNERSHIP_CLASSES = [
  "intentloom-managed",
  "project-owned",
  "shared",
  "provider-derivative",
  "external",
  "unknown",
] as const;

export type OwnershipClass = (typeof OWNERSHIP_CLASSES)[number];

export const OPERATION_KINDS = [
  "create",
  "map-existing",
  "update-managed",
  "merge-sections",
  "generate-derivative",
  "rename",
  "deprecate",
  "delete-redundant",
  "preserve-local",
  "record-exception",
  "no-op",
] as const;

export type AdoptionOperationKind = (typeof OPERATION_KINDS)[number];

export type ApprovalClass =
  | "automatic-safe"
  | "review-required"
  | "explicit-destructive"
  | "manual-only";

export type FindingStatus =
  | "verified"
  | "ambiguous"
  | "missing"
  | "conflicting"
  | "unsupported";

export interface RoleCandidate {
  readonly role: GovernanceRole;
  readonly confidence: number;
  readonly evidence: readonly string[];
}

export interface DetectedProjectArtifact {
  readonly path: string;
  readonly contentHash: string;
  readonly ownership: OwnershipClass;
  readonly roleCandidates: readonly RoleCandidate[];
}

export interface RoleMapping {
  readonly role: GovernanceRole;
  readonly path: string;
  readonly ownership: OwnershipClass;
  readonly evidence: readonly string[];
}

export interface AdoptionFinding {
  readonly id: string;
  readonly code: string;
  readonly status: FindingStatus;
  readonly summary: string;
  readonly paths: readonly string[];
  readonly evidence: readonly string[];
}

export interface ValidationRequirement {
  readonly id: string;
  readonly command: string;
  readonly category:
    | "format"
    | "lint"
    | "typecheck"
    | "test"
    | "build"
    | "security"
    | "native"
    | "manual";
  readonly required: boolean;
}

export interface AdoptionOperation {
  readonly id: string;
  readonly kind: AdoptionOperationKind;
  readonly role?: GovernanceRole;
  readonly path?: string;
  readonly reason: string;
  readonly evidence: readonly string[];
  readonly risk: "low" | "medium" | "high";
  readonly approval: ApprovalClass;
  readonly expectedCurrentHash?: string;
  readonly preview: string;
  readonly rollback: string;
  readonly validationIds: readonly string[];
}

export interface AcceptedException {
  readonly id: string;
  readonly findingCode: string;
  readonly decision: "accepted" | "deferred" | "rejected";
  readonly reason: string;
  readonly evidenceHash: string;
}

export interface MigrationJournalEntry {
  readonly id: string;
  readonly planId: string;
  readonly status: "planned" | "applied" | "failed" | "rolled-back";
  readonly operationIds: readonly string[];
  readonly timestamp: string;
}

export interface AdoptionPlan {
  readonly schemaVersion: 1;
  readonly planId: string;
  readonly projectId: string;
  readonly packId: string;
  readonly packVersion: string;
  readonly repositoryHash: string;
  readonly mappings: readonly RoleMapping[];
  readonly findings: readonly AdoptionFinding[];
  readonly operations: readonly AdoptionOperation[];
  readonly validations: readonly ValidationRequirement[];
  readonly exceptions: readonly AcceptedException[];
  readonly automaticApplyAllowed: boolean;
}

export interface PlanGovernanceAdoptionInput {
  readonly projectId: string;
  readonly packId: string;
  readonly packVersion: string;
  readonly artifacts: readonly DetectedProjectArtifact[];
  readonly validations?: readonly ValidationRequirement[];
  readonly exceptions?: readonly AcceptedException[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sortedUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function normalizeArtifact(
  artifact: DetectedProjectArtifact,
): DetectedProjectArtifact {
  if (!/^[a-f0-9]{64}$/u.test(artifact.contentHash)) {
    throw new Error(`${artifact.path}: contentHash must be a sha256 hex digest`);
  }
  if (!OWNERSHIP_CLASSES.includes(artifact.ownership)) {
    throw new Error(`${artifact.path}: unsupported ownership class`);
  }
  return {
    ...artifact,
    path: normalizeStoredPath(artifact.path),
    roleCandidates: artifact.roleCandidates
      .map((candidate) => {
        if (
          !Number.isFinite(candidate.confidence) ||
          candidate.confidence < 0 ||
          candidate.confidence > 1
        ) {
          throw new Error(
            `${artifact.path}: role confidence must be between 0 and 1`,
          );
        }
        return {
          ...candidate,
          evidence: sortedUnique(candidate.evidence),
        };
      })
      .sort(
        (left, right) =>
          right.confidence - left.confidence ||
          left.role.localeCompare(right.role),
      ),
  };
}

export function stableStringify(value: unknown): string {
  const visit = (current: unknown): unknown => {
    if (Array.isArray(current)) return current.map(visit);
    if (!isRecord(current)) return current;
    return Object.fromEntries(
      Object.entries(current)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, visit(child)]),
    );
  };
  return JSON.stringify(visit(value));
}

export function deterministicId(namespace: string, value: unknown): string {
  if (!/^[a-z][a-z0-9-]{1,63}$/u.test(namespace)) {
    throw new Error("deterministic id namespace is invalid");
  }
  return `${namespace}-${checksum(stableStringify(value)).slice(0, 24)}`;
}

function finding(
  code: string,
  status: FindingStatus,
  summary: string,
  paths: readonly string[],
  evidence: readonly string[],
): AdoptionFinding {
  const normalizedPaths = sortedUnique(paths);
  const normalizedEvidence = sortedUnique(evidence);
  return {
    id: deterministicId("finding", {
      code,
      status,
      paths: normalizedPaths,
      evidence: normalizedEvidence,
    }),
    code,
    status,
    summary,
    paths: normalizedPaths,
    evidence: normalizedEvidence,
  };
}

function operation(value: Omit<AdoptionOperation, "id">): AdoptionOperation {
  return {
    ...value,
    id: deterministicId("operation", value),
    evidence: sortedUnique(value.evidence),
    validationIds: sortedUnique(value.validationIds),
  };
}

export function planGovernanceAdoption(
  input: PlanGovernanceAdoptionInput,
): AdoptionPlan {
  const artifacts = input.artifacts
    .map(normalizeArtifact)
    .sort((left, right) => left.path.localeCompare(right.path));
  const repositoryHash = checksum(
    stableStringify(
      artifacts.map(({ path, contentHash, ownership }) => ({
        path,
        contentHash,
        ownership,
      })),
    ),
  );

  const roles = sortedUnique(
    artifacts.flatMap((artifact) =>
      artifact.roleCandidates.map((candidate) => candidate.role),
    ),
  ) as GovernanceRole[];
  const mappings: RoleMapping[] = [];
  const findings: AdoptionFinding[] = [];
  const operations: AdoptionOperation[] = [];

  for (const role of roles) {
    const candidates = artifacts
      .flatMap((artifact) =>
        artifact.roleCandidates
          .filter((candidate) => candidate.role === role)
          .map((candidate) => ({ artifact, candidate })),
      )
      .sort(
        (left, right) =>
          right.candidate.confidence - left.candidate.confidence ||
          left.artifact.path.localeCompare(right.artifact.path),
      );
    if (candidates.length === 0) continue;
    const topConfidence = candidates[0]!.candidate.confidence;
    const top = candidates.filter(
      ({ candidate }) => candidate.confidence === topConfidence,
    );
    if (top.length > 1) {
      findings.push(
        finding(
          "ambiguous-role-mapping",
          "ambiguous",
          `Multiple artifacts are equally likely to fulfil ${role}.`,
          top.map(({ artifact }) => artifact.path),
          top.flatMap(({ candidate }) => candidate.evidence),
        ),
      );
      continue;
    }
    const selected = top[0]!;
    const mapping: RoleMapping = {
      role,
      path: selected.artifact.path,
      ownership: selected.artifact.ownership,
      evidence: selected.candidate.evidence,
    };
    mappings.push(mapping);
    operations.push(
      operation({
        kind: "map-existing",
        role,
        path: mapping.path,
        reason: `Use the existing ${mapping.path} as ${role}.`,
        evidence: mapping.evidence,
        risk: "low",
        approval: "automatic-safe",
        expectedCurrentHash: selected.artifact.contentHash,
        preview: `map ${role} -> ${mapping.path}`,
        rollback: "Remove the role mapping; do not alter the project file.",
        validationIds: [],
      }),
    );
    if (candidates.length > 1) {
      findings.push(
        finding(
          "role-overlap",
          "verified",
          `Additional artifacts overlap with the selected ${role} source.`,
          candidates.slice(1).map(({ artifact }) => artifact.path),
          candidates.slice(1).flatMap(({ candidate }) => candidate.evidence),
        ),
      );
    }
  }

  if (!mappings.some(({ role }) => role === "agent-entrypoint")) {
    operations.push(
      operation({
        kind: "create",
        role: "agent-entrypoint",
        path: "AGENT_START_HERE.md",
        reason: "No equivalent agent entrypoint was detected.",
        evidence: ["portable-duty-watch-pack"],
        risk: "low",
        approval: "review-required",
        preview: "create AGENT_START_HERE.md",
        rollback: "Delete the newly created file.",
        validationIds: input.validations?.map(({ id }) => id) ?? [],
      }),
    );
  }

  const normalizedMappings = mappings.sort(
    (left, right) =>
      left.role.localeCompare(right.role) || left.path.localeCompare(right.path),
  );
  const normalizedFindings = findings.sort((left, right) =>
    left.id.localeCompare(right.id),
  );
  const normalizedOperations = operations.sort((left, right) =>
    left.id.localeCompare(right.id),
  );
  const validations = [...(input.validations ?? [])].sort((left, right) =>
    left.id.localeCompare(right.id),
  );
  const exceptions = [...(input.exceptions ?? [])].sort((left, right) =>
    left.id.localeCompare(right.id),
  );
  const automaticApplyAllowed =
    normalizedFindings.every(({ status }) => status !== "ambiguous") &&
    normalizedOperations.every(
      ({ approval }) => approval === "automatic-safe",
    );
  const planContent = {
    schemaVersion: 1 as const,
    projectId: input.projectId,
    packId: input.packId,
    packVersion: input.packVersion,
    repositoryHash,
    mappings: normalizedMappings,
    findings: normalizedFindings,
    operations: normalizedOperations,
    validations,
    exceptions,
    automaticApplyAllowed,
  };
  return {
    ...planContent,
    planId: deterministicId("plan", planContent),
  };
}

export function parseAdoptionPlan(value: string | unknown): AdoptionPlan {
  const parsed =
    typeof value === "string" ? (JSON.parse(value) as unknown) : value;
  if (!isRecord(parsed) || parsed.schemaVersion !== 1) {
    throw new Error("adoption plan must use schema version 1");
  }
  const requiredStrings = [
    "planId",
    "projectId",
    "packId",
    "packVersion",
    "repositoryHash",
  ] as const;
  for (const key of requiredStrings) {
    if (typeof parsed[key] !== "string" || parsed[key] === "") {
      throw new Error(`adoption plan ${key} must be a non-empty string`);
    }
  }
  for (const key of [
    "mappings",
    "findings",
    "operations",
    "validations",
    "exceptions",
  ] as const) {
    if (!Array.isArray(parsed[key])) {
      throw new Error(`adoption plan ${key} must be an array`);
    }
  }
  if (typeof parsed.automaticApplyAllowed !== "boolean") {
    throw new Error("adoption plan automaticApplyAllowed must be a boolean");
  }
  return parsed as unknown as AdoptionPlan;
}
