import { PROTOCOL_VERSION } from "../../../../../protocol/src/jsonrpc.js";
import {
  NEUTRON_MUTATION_UNDO_PREFLIGHT_SCHEMA_URN,
  parseNeutronMutationUndoIntent,
  type NeutronMutationUndoIntent,
  type NeutronMutationUndoOutcome,
} from "../../../../../protocol/src/neutron-mutation-undo.js";
import {
  validateNeutronMutationUndoPreflightResult,
  type NeutronMutationUndoPathProjection,
  type NeutronMutationUndoPreflightResult,
} from "../../../../../protocol/src/neutron-mutation-undo-result.js";
import type { FileSystem } from "../../../index.js";
import { createPersistentNeutronMutationApprovalStore } from "../apply/neutron-mutation-apply-durable-store.js";
import type { NeutronMutationTransactionRecord } from "../apply/neutron-mutation-apply-store.js";
import {
  NeutronMutationStatusIndexError,
  readNeutronMutationStatusPointer,
} from "../status/neutron-mutation-status-index.js";
import { inspectNeutronMutationUndoCurrent } from "./neutron-mutation-undo-current.js";
import { assessNeutronMutationUndoSnapshot } from "./neutron-mutation-undo-snapshot-validate.js";
import {
  classifyNeutronMutationUndoRecord,
  combineNeutronMutationUndoFindings,
  type NeutronMutationUndoInspection,
} from "./neutron-mutation-undo-eligibility.js";

export interface NeutronMutationUndoPreflightInput {
  readonly directory: string | undefined;
  readonly intent: unknown;
  readonly fs: FileSystem;
}

/**
 * Read-only answer to whether a future user Undo could be offered for one
 * exact already-applied transaction. Does not Apply, approve, or write.
 * Original Apply approval is not an input and is not reusable.
 */
export async function preflightNeutronMutationUndo(
  input: NeutronMutationUndoPreflightInput,
): Promise<NeutronMutationUndoPreflightResult> {
  const intent = parseIntent(input.intent);
  if (intent === undefined) return closed(input.intent, "integrity-failure");
  if (input.directory === undefined || input.directory.trim() === "") {
    return closedIntent(intent, "transaction-not-found");
  }
  const located = await locateUndoTransaction(input.directory, intent);
  if (located.kind !== "record") return closedIntent(intent, located.outcome);
  return decideUndoPreflight(
    intent,
    located.record,
    readOnlyProjectFs(input.fs),
    input.directory,
  );
}

async function decideUndoPreflight(
  intent: NeutronMutationUndoIntent,
  record: NeutronMutationTransactionRecord,
  fs: FileSystem,
  directory: string,
): Promise<NeutronMutationUndoPreflightResult> {
  if (evidenceBoundElsewhere(record, intent)) {
    return project(intent, record, "integrity-failure");
  }
  const decision = classifyNeutronMutationUndoRecord(record);
  if (decision.kind === "closed") {
    return project(intent, record, decision.outcome);
  }
  const current = await inspectNeutronMutationUndoCurrent({
    root: intent.root,
    fs,
    inspection: decision.inspection,
  });
  const evidence = record.result?.verification;
  const snapshot = await assessNeutronMutationUndoSnapshot({
    directory,
    record,
    root: intent.root,
    proposalId: intent.proposalId,
    createdPaths: decision.inspection.createdPaths,
    updatedPaths: decision.inspection.updatedPaths,
    unchangedPaths: decision.inspection.unchangedPaths,
    approvedPaths: evidence?.approvedChangedPaths ?? [],
    expectedDigests: decision.inspection.expectedDigests,
    preApplyProjectStateDigest: evidence?.preApplyProjectStateDigest,
  });
  const outcome = combineNeutronMutationUndoFindings({
    inspection: decision.inspection,
    current,
    snapshot: snapshot.kind,
  });
  const paths = undoPaths(outcome, snapshot, decision.inspection);
  if (outcome === "eligible" && (paths === undefined || paths.length === 0)) {
    return project(intent, record, "undo-source-unavailable");
  }
  return project(intent, record, outcome, paths);
}

async function locateUndoTransaction(
  directory: string,
  intent: NeutronMutationUndoIntent,
): Promise<
  | {
      readonly kind: "record";
      readonly record: NeutronMutationTransactionRecord;
    }
  | { readonly kind: "closed"; readonly outcome: NeutronMutationUndoOutcome }
> {
  try {
    const pointer = await readNeutronMutationStatusPointer(directory, {
      root: intent.root,
      sessionId: intent.sessionId,
      projectId: intent.projectId,
      graphId: intent.graphId,
      proposalId: intent.proposalId,
    });
    if (pointer === undefined) {
      return { kind: "closed", outcome: "transaction-not-found" };
    }
    if (pointer.transactionId !== intent.transactionId) {
      return { kind: "closed", outcome: "transaction-mismatch" };
    }
    const record = await loadRecord(directory, pointer.approvalId);
    if (
      record.transactionId !== pointer.transactionId ||
      record.approvalId !== pointer.approvalId
    ) {
      return { kind: "closed", outcome: "integrity-failure" };
    }
    return { kind: "record", record };
  } catch {
    return { kind: "closed", outcome: "integrity-failure" };
  }
}

async function loadRecord(
  directory: string,
  approvalId: string,
): Promise<NeutronMutationTransactionRecord> {
  const store = createPersistentNeutronMutationApprovalStore({ directory });
  const record = await store.getByApproval(approvalId);
  if (record === undefined) {
    throw new NeutronMutationStatusIndexError("durable-status-corrupt");
  }
  return record;
}

function evidenceBoundElsewhere(
  record: NeutronMutationTransactionRecord,
  intent: NeutronMutationUndoIntent,
): boolean {
  const evidence = record.result?.verification;
  if (evidence === undefined) return false;
  return (
    evidence.rootIdentity !== intent.root ||
    evidence.projectId !== intent.projectId ||
    evidence.transactionId !== intent.transactionId
  );
}

function undoPaths(
  outcome: NeutronMutationUndoOutcome,
  snapshot: Awaited<ReturnType<typeof assessNeutronMutationUndoSnapshot>>,
  inspection: NeutronMutationUndoInspection,
): readonly NeutronMutationUndoPathProjection[] | undefined {
  if (outcome !== "eligible") return undefined;
  if (snapshot.kind === "valid") return snapshot.paths;
  return eligibleUndoPaths(inspection);
}

function eligibleUndoPaths(
  inspection: NeutronMutationUndoInspection,
): readonly NeutronMutationUndoPathProjection[] | undefined {
  const paths: NeutronMutationUndoPathProjection[] = [];
  for (const path of inspection.createdPaths) {
    const expectedContentDigest = inspection.expectedDigests.get(path);
    if (expectedContentDigest === undefined) return undefined;
    paths.push({ path, effect: "remove-created", expectedContentDigest });
  }
  const ordered = [...paths];
  ordered.sort((left, right) => left.path.localeCompare(right.path));
  return ordered;
}

function project(
  intent: NeutronMutationUndoIntent,
  record: NeutronMutationTransactionRecord,
  outcome: NeutronMutationUndoOutcome,
  paths?: readonly NeutronMutationUndoPathProjection[],
): NeutronMutationUndoPreflightResult {
  const result = record.result;
  const createdPathCount = result?.createdPaths.length ?? 0;
  const updatedPathCount = result?.updatedPaths.length ?? 0;
  const unchangedPathCount = result?.unchangedPaths.length ?? 0;
  return finish({
    outcome,
    proposalId: intent.proposalId,
    transactionId: intent.transactionId,
    historicalApplied: result?.applied === true,
    affectedPathCount: createdPathCount + updatedPathCount,
    createdPathCount,
    updatedPathCount,
    unchangedPathCount,
    ...(paths === undefined ? {} : { paths }),
  });
}

function closedIntent(
  intent: NeutronMutationUndoIntent,
  outcome: NeutronMutationUndoOutcome,
): NeutronMutationUndoPreflightResult {
  return finish({
    outcome,
    proposalId: intent.proposalId,
    transactionId: intent.transactionId,
    historicalApplied: false,
    affectedPathCount: 0,
    createdPathCount: 0,
    updatedPathCount: 0,
    unchangedPathCount: 0,
  });
}

function closed(
  value: unknown,
  outcome: NeutronMutationUndoOutcome,
): NeutronMutationUndoPreflightResult {
  return finish({
    outcome,
    proposalId: boundedId(value, "proposalId"),
    transactionId: boundedId(value, "transactionId"),
    historicalApplied: false,
    affectedPathCount: 0,
    createdPathCount: 0,
    updatedPathCount: 0,
    unchangedPathCount: 0,
  });
}

function finish(
  body: Omit<
    NeutronMutationUndoPreflightResult,
    | "schemaVersion"
    | "protocolVersion"
    | "executionAuthorized"
    | "approvalReusable"
  >,
): NeutronMutationUndoPreflightResult {
  return validateNeutronMutationUndoPreflightResult({
    schemaVersion: NEUTRON_MUTATION_UNDO_PREFLIGHT_SCHEMA_URN,
    protocolVersion: PROTOCOL_VERSION,
    executionAuthorized: false,
    approvalReusable: false,
    ...body,
  });
}

function parseIntent(value: unknown): NeutronMutationUndoIntent | undefined {
  try {
    return parseNeutronMutationUndoIntent(value);
  } catch {
    return undefined;
  }
}

function boundedId(
  value: unknown,
  field: "proposalId" | "transactionId",
): string {
  if (typeof value !== "object" || value === null) return "invalid";
  const id = (value as Record<string, unknown>)[field];
  return typeof id === "string" && id.length > 0 && id.length <= 4096
    ? id
    : "invalid";
}

function readOnlyProjectFs(fs: FileSystem): FileSystem {
  return {
    exists: (path) => fs.exists(path),
    read: (path) => fs.read(path),
    list: (path) => fs.list(path),
    realpath: (path) => fs.realpath(path),
    isSymbolicLink: (path) => fs.isSymbolicLink(path),
    write: () => Promise.reject(new Error("undo-preflight-write-forbidden")),
    mkdir: () => Promise.reject(new Error("undo-preflight-write-forbidden")),
    remove: () => Promise.reject(new Error("undo-preflight-write-forbidden")),
  };
}
