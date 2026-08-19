import { resolve } from "node:path";
import type { AdapterName } from "@intentloom/core";
import {
  EXISTING_PROJECT_ADOPTION_APPLY_SCHEMA_VERSION,
  parseExistingProjectAdoptionApplyViewModel,
  type AdoptionApplyReason,
  type AdoptionApplyStatus,
  type ExistingProjectAdoptionApplyViewModel,
  type ExistingProjectAdoptionApproval,
  type ExistingProjectAdoptionPreparedPlan,
} from "@intentloom/protocol";
import {
  adoptProject,
  syncProject,
  type FileSystem,
  type TransactionOptions,
} from "./index.js";
import { mappingsFromSelectedAdoptionDecisions } from "./existing-project-adoption-decisions.js";
import {
  spreadExistingProjectAdoptionGeneration,
  withExistingProjectAdoptionCatalog,
  type ExistingProjectAdoptionGenerationOptions,
} from "./existing-project-adoption-generation.js";
import { evaluateExistingProjectAdoptionApplyGates } from "./existing-project-adoption-apply-gates.js";
import {
  adoptionApplySafePaths,
  evaluateExistingProjectAdoptionPostApplyHealth,
} from "./existing-project-adoption-apply-health.js";
import { withCanonicalProjectRootLock } from "./project-root-mutation-lock.js";

export interface ApplyExistingProjectAdoptionPreparedPlanOptions extends ExistingProjectAdoptionGenerationOptions {
  readonly root: string;
  readonly preparedPlanId: string;
  readonly planDigest: string;
  readonly preparedPlan: ExistingProjectAdoptionPreparedPlan;
  readonly approval: ExistingProjectAdoptionApproval;
  readonly now?: () => number;
  readonly signal?: AbortSignal;
  readonly transactionOptions?: TransactionOptions;
  readonly onBeforeMutation?: () => Promise<void>;
  readonly onAfterCommit?: () => Promise<void>;
}

function adaptersFor(plan: ExistingProjectAdoptionPreparedPlan): AdapterName[] {
  const names = plan.detectedAdapters.filter(
    (adapter): adapter is AdapterName =>
      adapter === "claude" ||
      adapter === "codex" ||
      adapter === "cursor" ||
      adapter === "copilot",
  );
  return names.length > 0 ? names : ["codex"];
}

function adoptOptions(
  root: string,
  plan: ExistingProjectAdoptionPreparedPlan,
  dryRun: boolean,
  generation: ExistingProjectAdoptionGenerationOptions = {},
) {
  const mappings = mappingsFromSelectedAdoptionDecisions(plan.decisions);
  return {
    root,
    profile: plan.profile,
    adapters: adaptersFor(plan),
    dryRun,
    profileConfirmed: true as const,
    ...spreadExistingProjectAdoptionGeneration(generation),
    ...(mappings.projectOwnedMappings.length > 0
      ? { projectOwnedMappings: mappings.projectOwnedMappings }
      : {}),
    ...(mappings.documentationMappings.length > 0
      ? { documentationMappings: mappings.documentationMappings }
      : {}),
  };
}

function baseResult(
  options: ApplyExistingProjectAdoptionPreparedPlanOptions,
  root: string,
): Pick<
  ExistingProjectAdoptionApplyViewModel,
  | "schemaVersion"
  | "readOnly"
  | "classification"
  | "canonicalRoot"
  | "preparedPlanId"
  | "planDigest"
  | "approvalId"
  | "approval"
  | "plan"
> {
  return {
    schemaVersion: EXISTING_PROJECT_ADOPTION_APPLY_SCHEMA_VERSION,
    readOnly: false,
    classification: "mutating",
    canonicalRoot: root,
    preparedPlanId: options.preparedPlan.preparedPlanId,
    planDigest: options.preparedPlan.planDigest,
    approvalId: options.approval.approvalId,
    approval: options.approval,
    plan: options.preparedPlan,
  };
}

function denied(
  options: ApplyExistingProjectAdoptionPreparedPlanOptions,
  root: string,
  reasons: readonly AdoptionApplyReason[],
  extra: {
    readonly status?: AdoptionApplyStatus;
    readonly rollbackAttempted?: boolean;
    readonly rollbackCompleted?: boolean;
    readonly rollbackFailures?: readonly string[];
    readonly recoveryGuidance?: string | null;
    readonly diagnostics?: readonly string[];
  } = {},
): ExistingProjectAdoptionApplyViewModel {
  return parseExistingProjectAdoptionApplyViewModel({
    ...baseResult(options, root),
    status: extra.status ?? "denied",
    reasons,
    applied: false,
    alreadyApplied: false,
    ready: false,
    changesApplied: 0,
    appliedPaths: [],
    unchangedPaths: [],
    rollbackAttempted: extra.rollbackAttempted ?? false,
    rollbackCompleted: extra.rollbackCompleted ?? true,
    rollbackFailures: extra.rollbackFailures ?? [],
    doctor: null,
    diff: null,
    inspectionReadiness: null,
    recoveryGuidance: extra.recoveryGuidance ?? null,
    diagnostics: extra.diagnostics ?? [...reasons],
    cancelledAfterCommit: false,
  });
}

export async function applyExistingProjectAdoptionPreparedPlan(
  options: ApplyExistingProjectAdoptionPreparedPlanOptions,
  fs: FileSystem,
): Promise<ExistingProjectAdoptionApplyViewModel> {
  const root = resolve(options.root);
  return withCanonicalProjectRootLock(root, () =>
    applyUnderLock(options, root, fs),
  );
}

async function applyUnderLock(
  options: ApplyExistingProjectAdoptionPreparedPlanOptions,
  root: string,
  fs: FileSystem,
): Promise<ExistingProjectAdoptionApplyViewModel> {
  if (options.signal?.aborted) return denied(options, root, ["cancelled"]);
  const generation = await withExistingProjectAdoptionCatalog(options);
  const bound = { ...options, ...generation };
  const gateReasons = await evaluateExistingProjectAdoptionApplyGates(
    bound,
    fs,
  );
  if (options.signal?.aborted) return denied(options, root, ["cancelled"]);
  const blockingReasons = gateReasons.filter(
    (reason) =>
      reason !== "stale-fingerprint" &&
      reason !== "stale-digest" &&
      reason !== "stale-preview" &&
      reason !== "proposal-changed" &&
      reason !== "decisions-changed",
  );
  if (blockingReasons.length > 0) {
    return denied(options, root, gateReasons);
  }
  const dry = await syncProject(
    adoptOptions(root, options.preparedPlan, true, generation),
    fs,
  );
  if (!("dryRun" in dry) || dry.conflictFiles.length > 0) {
    return denied(options, root, ["collision"]);
  }
  const alreadyApplied =
    dry.createdFiles.length === 0 && dry.updatedFiles.length === 0;
  if (gateReasons.length > 0 && !alreadyApplied) {
    return denied(options, root, gateReasons);
  }
  const plannedWrites = adoptionApplySafePaths([
    ...dry.createdFiles,
    ...dry.updatedFiles,
  ]);
  if (options.onBeforeMutation) await options.onBeforeMutation();
  if (options.signal?.aborted && !alreadyApplied) {
    return denied(options, root, ["cancelled"]);
  }
  if (!alreadyApplied) {
    const proposal = await adoptProject(
      adoptOptions(root, options.preparedPlan, false, generation),
      fs,
      options.transactionOptions ?? {},
    );
    const outcome = proposal.transactionOutcome;
    if (proposal.applicationStatus === "failed-restored") {
      return denied(options, root, [], {
        status: "rolled-back",
        rollbackAttempted: outcome?.rollbackAttempted ?? true,
        rollbackCompleted: outcome?.rollbackCompleted ?? true,
        rollbackFailures: outcome?.rollbackFailures ?? [],
        diagnostics: outcome?.diagnostics ?? ["transaction-failed"],
        recoveryGuidance:
          "The transaction was rolled back. Revalidate the prepared plan before retrying Apply.",
      });
    }
    if (proposal.applicationStatus === "failed-incomplete") {
      return denied(options, root, ["incomplete-rollback"], {
        status: "failed-incomplete",
        rollbackAttempted: outcome?.rollbackAttempted ?? true,
        rollbackCompleted: false,
        rollbackFailures: outcome?.rollbackFailures ?? [],
        diagnostics: outcome?.diagnostics ?? [
          "transaction-rollback-incomplete",
        ],
        recoveryGuidance:
          "Rollback did not complete. Inspect Doctor and Diff, then repair the project before retrying Apply.",
      });
    }
    if (proposal.applicationStatus === "blocked" || !proposal.applied) {
      return denied(options, root, ["blocked-diagnostics"]);
    }
  }
  if (options.onAfterCommit) await options.onAfterCommit();
  const health = await evaluateExistingProjectAdoptionPostApplyHealth(
    root,
    adoptOptions(root, options.preparedPlan, true, generation),
    fs,
  );
  const cancelledAfterCommit = options.signal?.aborted === true;
  const status: AdoptionApplyStatus = health.ready
    ? alreadyApplied
      ? "already-applied"
      : "applied"
    : "applied-needs-attention";
  return parseExistingProjectAdoptionApplyViewModel({
    ...baseResult(options, root),
    status,
    reasons: cancelledAfterCommit ? ["cancelled"] : [],
    applied: true,
    alreadyApplied,
    ready: health.ready,
    changesApplied: alreadyApplied ? 0 : plannedWrites.length,
    appliedPaths: alreadyApplied ? [] : plannedWrites,
    unchangedPaths: adoptionApplySafePaths(dry.unchangedFiles),
    rollbackAttempted: false,
    rollbackCompleted: true,
    rollbackFailures: [],
    doctor: health.doctor,
    diff: health.diff,
    inspectionReadiness: health.inspectionReadiness,
    recoveryGuidance:
      status === "applied-needs-attention"
        ? "The transaction committed. Resolve Doctor or Diff findings before treating the project as Ready."
        : null,
    diagnostics: cancelledAfterCommit ? ["cancelled"] : [],
    cancelledAfterCommit,
  });
}
