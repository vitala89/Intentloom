import type { NeutronMutationApplyResult } from "../../../../../protocol/src/neutron-mutation-apply.js";
import type { NeutronMutationUndoOutcome } from "../../../../../protocol/src/neutron-mutation-undo.js";
import { NEUTRON_HIDDEN_GENERATED_METADATA_PATHS } from "../../../../../protocol/src/neutron-mutation-verification.js";
import type { NeutronMutationTransactionRecord } from "../apply/neutron-mutation-apply-store.js";

/**
 * User Undo is a later human action. It is not Slice 4 transaction rollback.
 * Pre-U2 records keep digests only, so an updated path stays unavailable.
 * U2 records carry a restoration claim. Eligibility still requires the
 * trusted snapshot to validate, and it does not execute Undo.
 * This function does not write and does not clear `applied`.
 */
export interface NeutronMutationUndoInspection {
  readonly createdPaths: readonly string[];
  readonly updatedPaths: readonly string[];
  readonly unchangedPaths: readonly string[];
  readonly expectedDigests: ReadonlyMap<string, string>;
  readonly createsProvenAbsent: boolean;
  readonly verified: boolean;
}

export type NeutronMutationUndoRecordDecision =
  | {
      readonly kind: "closed";
      readonly outcome: NeutronMutationUndoOutcome;
    }
  | {
      readonly kind: "inspect";
      readonly inspection: NeutronMutationUndoInspection;
    };

export function classifyNeutronMutationUndoRecord(
  record: NeutronMutationTransactionRecord,
): NeutronMutationUndoRecordDecision {
  const closed = closedUndoState(record);
  if (closed !== undefined) return { kind: "closed", outcome: closed };
  const result = record.result;
  if (result === undefined) {
    return { kind: "closed", outcome: "integrity-failure" };
  }
  const verification = verifiableUndoEvidence(result);
  if (verification.kind === "closed") {
    return { kind: "closed", outcome: verification.outcome };
  }
  const scope = undoScopeDecision(result, verification.approved);
  if (scope.kind === "closed") return scope;
  return {
    kind: "inspect",
    inspection: {
      createdPaths: result.createdPaths,
      updatedPaths: result.updatedPaths,
      unchangedPaths: result.unchangedPaths,
      expectedDigests: verification.expectedDigests,
      createsProvenAbsent: scope.createsProvenAbsent,
      verified: verification.verified,
    },
  };
}

export function combineNeutronMutationUndoFindings(input: {
  readonly inspection: NeutronMutationUndoInspection;
  readonly current: "match" | "stale" | "escape" | "unprovable";
  readonly snapshot: "absent" | "valid" | "corrupt";
}): NeutronMutationUndoOutcome {
  if (input.current === "escape") return "integrity-failure";
  if (input.snapshot === "corrupt") return "integrity-failure";
  if (input.current === "stale") return "stale-current-state";
  if (input.current === "unprovable") return "undo-source-unavailable";
  if (!input.inspection.verified) return "undo-source-unavailable";
  const hasUpdate = input.inspection.updatedPaths.length > 0;
  const hasCreate = input.inspection.createdPaths.length > 0;
  if (!hasUpdate && !hasCreate) return "unsupported-transaction";
  if (hasUpdate && input.snapshot !== "valid") {
    return "undo-source-unavailable";
  }
  if (input.snapshot === "valid") return "eligible";
  if (!input.inspection.createsProvenAbsent) return "undo-source-unavailable";
  return "eligible";
}

function closedUndoState(
  record: NeutronMutationTransactionRecord,
): NeutronMutationUndoOutcome | undefined {
  if (record.state === "claimed" || record.state === "executing") {
    return "unsupported-transaction";
  }
  if (record.state === "failed-before-write") return "not-applied";
  if (record.state === "failed-needs-reconciliation") {
    return "reconciliation-required";
  }
  if (record.state !== "applied" || record.result?.applied !== true) {
    return "not-applied";
  }
  return undefined;
}

function verifiableUndoEvidence(result: NeutronMutationApplyResult):
  | { readonly kind: "closed"; readonly outcome: NeutronMutationUndoOutcome }
  | {
      readonly kind: "open";
      readonly verified: boolean;
      readonly approved: ReadonlySet<string>;
      readonly expectedDigests: ReadonlyMap<string, string>;
    } {
  const evidence = result.verification;
  if (evidence === undefined) {
    return { kind: "closed", outcome: "undo-source-unavailable" };
  }
  if (evidence.status === "reconciliation-required") {
    return { kind: "closed", outcome: "reconciliation-required" };
  }
  const status = evidence.status;
  if (
    status !== "verified" &&
    status !== "verification-failed" &&
    status !== "verification-incomplete"
  ) {
    return { kind: "closed", outcome: "undo-source-unavailable" };
  }
  return {
    kind: "open",
    verified: status === "verified",
    approved: new Set(evidence.approvedChangedPaths),
    expectedDigests: new Map(
      evidence.byteVerification.files.map((file) => [
        file.path,
        file.expectedContentDigest,
      ]),
    ),
  };
}

function undoScopeDecision(
  result: NeutronMutationApplyResult,
  approved: ReadonlySet<string>,
):
  | { readonly kind: "closed"; readonly outcome: "integrity-failure" }
  | { readonly kind: "open"; readonly createsProvenAbsent: boolean } {
  const scope = [...result.createdPaths, ...result.updatedPaths];
  if (scope.some((path) => !approved.has(path))) {
    return { kind: "closed", outcome: "integrity-failure" };
  }
  if (hiddenUndoScopeWidened(scope, approved)) {
    return { kind: "closed", outcome: "integrity-failure" };
  }
  const unchanged = new Set(result.unchangedPaths);
  if (scope.some((path) => unchanged.has(path))) {
    return { kind: "closed", outcome: "integrity-failure" };
  }
  return {
    kind: "open",
    createsProvenAbsent: createdPathsProvenAbsent(result),
  };
}

function hiddenUndoScopeWidened(
  scope: readonly string[],
  approved: ReadonlySet<string>,
): boolean {
  const scoped = new Set(scope);
  return NEUTRON_HIDDEN_GENERATED_METADATA_PATHS.some(
    (path) => scoped.has(path) && !approved.has(path),
  );
}

function createdPathsProvenAbsent(result: NeutronMutationApplyResult): boolean {
  const previous = new Map(
    (result.verification?.rollback.previousContentDigests ?? []).map(
      (entry) => [entry.path, entry] as const,
    ),
  );
  return result.createdPaths.every((path) => {
    const entry = previous.get(path);
    return (
      entry !== undefined &&
      entry.existedBefore === false &&
      entry.digest === null
    );
  });
}
