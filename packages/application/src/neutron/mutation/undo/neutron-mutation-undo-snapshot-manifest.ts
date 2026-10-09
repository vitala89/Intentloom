import { createHash } from "node:crypto";
import { join } from "node:path";
import { checksum } from "@intentloom/core";
import { NEUTRON_MUTATION_UNDO_RESTORATION_SCHEMA_URN } from "../../../../../protocol/src/neutron-mutation-undo-snapshot.js";
import type { NeutronMutationUndoRestorationClaim } from "../../../../../protocol/src/neutron-mutation-undo-snapshot.js";
import {
  canonicalNeutronMutationJson,
  compareNeutronMutationPaths,
} from "../../../../../validator/src/neutron-mutation-canonical.js";
import { digestGeneratedFileContent } from "../../../../../validator/src/neutron-mutation-review-digest.js";

export const NEUTRON_MUTATION_UNDO_SNAPSHOT_SCHEMA_URN =
  "urn:intentloom:schema:neutron-mutation-undo-snapshot:1" as const;

export const NEUTRON_MUTATION_UNDO_SNAPSHOT_STATES = [
  "prepared",
  "applied-source",
  "abandoned",
] as const;

export type NeutronMutationUndoSnapshotState =
  (typeof NEUTRON_MUTATION_UNDO_SNAPSHOT_STATES)[number];

export interface NeutronMutationUndoSnapshotFile {
  readonly path: string;
  readonly effect: "restore-updated" | "remove-created";
  readonly existedBefore: boolean;
  readonly preApplyDigest: string | null;
  readonly expectedContentDigest: string;
  readonly payloadDigest: string | null;
}

/**
 * Host-private snapshot manifest. Payload bytes are separate objects.
 * Digests are the repository content digest, not a MAC or signature.
 */
export interface NeutronMutationUndoSnapshotManifest {
  readonly schemaVersion: typeof NEUTRON_MUTATION_UNDO_SNAPSHOT_SCHEMA_URN;
  readonly state: NeutronMutationUndoSnapshotState;
  readonly transactionId: string;
  readonly approvalId: string;
  readonly proposalId: string;
  readonly reviewArtifactDigest: string;
  readonly planDigest: string;
  readonly root: string;
  readonly lockKey: string;
  readonly preApplyProjectStateDigest: string;
  readonly changedPaths: readonly string[];
  readonly files: readonly NeutronMutationUndoSnapshotFile[];
  readonly manifestDigest: string;
}

export type NeutronMutationUndoSnapshotDraft = Omit<
  NeutronMutationUndoSnapshotManifest,
  "manifestDigest" | "state"
>;

const DIGEST = /^sha256:[0-9a-f]{64}$/u;
const MANIFEST_KEYS = [
  "schemaVersion",
  "state",
  "transactionId",
  "approvalId",
  "proposalId",
  "reviewArtifactDigest",
  "planDigest",
  "root",
  "lockKey",
  "preApplyProjectStateDigest",
  "changedPaths",
  "files",
  "manifestDigest",
] as const;

export function undoSnapshotTransactionDigest(transactionId: string): string {
  return createHash("sha256").update(transactionId, "utf8").digest("hex");
}

export function undoSnapshotHome(
  directory: string,
  transactionId: string,
): string {
  return join(
    directory,
    "undo-snapshots",
    undoSnapshotTransactionDigest(transactionId),
  );
}

export function undoSnapshotManifestPath(
  directory: string,
  transactionId: string,
): string {
  return join(undoSnapshotHome(directory, transactionId), "manifest.json");
}

export function undoSnapshotGatePath(
  directory: string,
  transactionId: string,
): string {
  return join(
    directory,
    "undo-snapshots",
    `${undoSnapshotTransactionDigest(transactionId)}.gate`,
  );
}

export function undoSnapshotPayloadPath(
  directory: string,
  transactionId: string,
  payloadDigest: string,
): string {
  const hex = payloadDigest.slice("sha256:".length);
  return join(undoSnapshotHome(directory, transactionId), "payloads", hex);
}

export function sealUndoSnapshotManifest(
  draft: NeutronMutationUndoSnapshotDraft,
  state: NeutronMutationUndoSnapshotState,
): NeutronMutationUndoSnapshotManifest {
  const unsigned = unsignedManifest(draft, state);
  return {
    ...unsigned,
    manifestDigest: digestManifest(unsigned),
  };
}

export function encodeUndoSnapshotManifest(
  manifest: NeutronMutationUndoSnapshotManifest,
): string {
  const sealed = sealUndoSnapshotManifest(manifest, manifest.state);
  return `${JSON.stringify(sealed)}\n`;
}

export function decodeUndoSnapshotManifest(
  raw: string,
): NeutronMutationUndoSnapshotManifest {
  const parsed: unknown = JSON.parse(raw);
  if (!isRecord(parsed)) throw new Error("undo snapshot manifest is invalid");
  assertExactKeys(parsed, MANIFEST_KEYS);
  const state = parsed.state;
  if (!isSnapshotState(state)) {
    throw new Error("undo snapshot manifest state is invalid");
  }
  const draft = {
    schemaVersion: NEUTRON_MUTATION_UNDO_SNAPSHOT_SCHEMA_URN,
    transactionId: requiredString(parsed.transactionId),
    approvalId: requiredString(parsed.approvalId),
    proposalId: requiredString(parsed.proposalId),
    reviewArtifactDigest: requiredDigest(parsed.reviewArtifactDigest),
    planDigest: requiredDigest(parsed.planDigest),
    root: requiredString(parsed.root),
    lockKey: requiredString(parsed.lockKey),
    preApplyProjectStateDigest: requiredDigest(
      parsed.preApplyProjectStateDigest,
    ),
    changedPaths: stringList(parsed.changedPaths),
    files: fileList(parsed.files),
  };
  if (parsed.schemaVersion !== draft.schemaVersion) {
    throw new Error("undo snapshot manifest schema is invalid");
  }
  const sealed = sealUndoSnapshotManifest(draft, state);
  if (parsed.manifestDigest !== sealed.manifestDigest) {
    throw new Error("undo snapshot manifest digest mismatch");
  }
  return sealed;
}

export function restorationClaim(
  manifestDigest: string,
): NeutronMutationUndoRestorationClaim {
  return {
    schemaVersion: NEUTRON_MUTATION_UNDO_RESTORATION_SCHEMA_URN,
    state: "applied-source",
    manifestDigest,
  };
}

export function snapshotContentDigest(content: string): string {
  return digestGeneratedFileContent(content);
}

function unsignedManifest(
  draft: NeutronMutationUndoSnapshotDraft,
  state: NeutronMutationUndoSnapshotState,
) {
  return {
    schemaVersion: NEUTRON_MUTATION_UNDO_SNAPSHOT_SCHEMA_URN,
    state,
    transactionId: draft.transactionId,
    approvalId: draft.approvalId,
    proposalId: draft.proposalId,
    reviewArtifactDigest: draft.reviewArtifactDigest,
    planDigest: draft.planDigest,
    root: draft.root,
    lockKey: draft.lockKey,
    preApplyProjectStateDigest: draft.preApplyProjectStateDigest,
    changedPaths: [...draft.changedPaths],
    files: draft.files.map((file) => ({ ...file })),
  };
}

function digestManifest(value: unknown): string {
  return `sha256:${checksum(canonicalNeutronMutationJson(value))}`;
}

function fileList(value: unknown): readonly NeutronMutationUndoSnapshotFile[] {
  if (!Array.isArray(value)) throw new Error("undo snapshot files are invalid");
  const files = value.map((entry) => snapshotFile(entry));
  const ordered = [...files];
  ordered.sort((left, right) =>
    compareNeutronMutationPaths(left.path, right.path),
  );
  if (files.some((file, index) => file.path !== ordered[index]?.path)) {
    throw new Error("undo snapshot files are not ordered");
  }
  return files;
}

function snapshotFile(value: unknown): NeutronMutationUndoSnapshotFile {
  if (!isRecord(value)) throw new Error("undo snapshot file is invalid");
  assertExactKeys(value, [
    "path",
    "effect",
    "existedBefore",
    "preApplyDigest",
    "expectedContentDigest",
    "payloadDigest",
  ]);
  const effect = value.effect;
  if (effect !== "restore-updated" && effect !== "remove-created") {
    throw new Error("undo snapshot file effect is invalid");
  }
  const existedBefore = value.existedBefore === true;
  if (value.existedBefore !== true && value.existedBefore !== false) {
    throw new Error("undo snapshot existedBefore is invalid");
  }
  return {
    path: requiredString(value.path),
    effect,
    existedBefore,
    preApplyDigest: nullableDigest(value.preApplyDigest),
    expectedContentDigest: requiredDigest(value.expectedContentDigest),
    payloadDigest: nullableDigest(value.payloadDigest),
  };
}

function stringList(value: unknown): readonly string[] {
  if (
    !Array.isArray(value) ||
    value.some((entry) => typeof entry !== "string")
  ) {
    throw new Error("undo snapshot paths are invalid");
  }
  return value as readonly string[];
}

function nullableDigest(value: unknown): string | null {
  if (value === null) return null;
  return requiredDigest(value);
}

function requiredDigest(value: unknown): string {
  if (typeof value !== "string" || !DIGEST.test(value)) {
    throw new Error("undo snapshot digest is invalid");
  }
  return value;
}

function requiredString(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("undo snapshot field is invalid");
  }
  return value;
}

function assertExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): void {
  const actual = Object.keys(value);
  if (
    actual.length !== keys.length ||
    keys.some((key) => !actual.includes(key))
  ) {
    throw new Error("undo snapshot manifest shape is invalid");
  }
}

function isSnapshotState(
  value: unknown,
): value is NeutronMutationUndoSnapshotState {
  return (
    typeof value === "string" &&
    NEUTRON_MUTATION_UNDO_SNAPSHOT_STATES.some((state) => state === value)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
