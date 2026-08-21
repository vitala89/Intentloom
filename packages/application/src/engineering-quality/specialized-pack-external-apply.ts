import { dirname, resolve } from "node:path";
import type { ExternalQualityPackActivationApproval } from "@intentloom/protocol";
import { applyExtensionAdoptionPlan } from "@intentloom/validator";
import {
  assertCanonicalProjectRoot,
  ProjectRootError,
  type FileSystem,
} from "../index.js";
import {
  defaultExtensionLockfile,
  extensionLockRelativePath,
  formatExtensionLockfile,
  readExtensionLockfile,
  safeExtensionLockPath,
} from "../extension-lock-path.js";
import {
  restoreExtensionUpdateSnapshots,
  type ExtensionUpdateFileSnapshot,
} from "../extension-update-files.js";
import { withCanonicalProjectRootLock } from "../project-root-mutation-lock.js";
import type { ExternalSpecializedPackActivation } from "./specialized-pack-external-lock.js";
import {
  prepareExternalSpecializedPackActivationPlan,
  type ExternalSpecializedPackActivationPlan,
} from "./specialized-pack-external-apply-plan.js";

export type {
  ExternalSpecializedPackActivationPlan,
  ExternalSpecializedPackActivationPlanStatus,
  PrepareExternalSpecializedPackActivationPlanInput,
} from "./specialized-pack-external-apply-plan.js";
export { prepareExternalSpecializedPackActivationPlan } from "./specialized-pack-external-apply-plan.js";

export type ExternalSpecializedPackActivationApplyStatus =
  "applied" | "already-applied" | "conflict" | "denied" | "failed";

export interface ApplyExternalSpecializedPackActivationInput {
  readonly root: string;
  readonly activation: ExternalSpecializedPackActivation;
  readonly approval: ExternalQualityPackActivationApproval;
  readonly declaredLicense: string;
  readonly lockfilePath?: string | undefined;
  readonly timestamp?: string | undefined;
}

export interface ExternalSpecializedPackActivationApplyResult {
  readonly status: ExternalSpecializedPackActivationApplyStatus;
  readonly projectRoot: string;
  readonly extensionId: string;
  readonly digest: string;
  readonly pin: string;
  readonly changedPaths: readonly string[];
  readonly writes: number;
  readonly diagnostics: readonly string[];
  readonly rollbackAttempted: boolean;
  readonly rollbackCompleted: boolean;
  readonly rollbackFailures: readonly string[];
}

function deniedResult(
  projectRoot: string,
  activation: ExternalSpecializedPackActivation,
  diagnostics: readonly string[],
): ExternalSpecializedPackActivationApplyResult {
  return {
    status: "denied",
    projectRoot,
    extensionId: activation.manifest.id,
    digest: activation.digest,
    pin: activation.source.pin,
    changedPaths: [],
    writes: 0,
    diagnostics,
    rollbackAttempted: false,
    rollbackCompleted: true,
    rollbackFailures: [],
  };
}

function planResult(
  projectRoot: string,
  activation: ExternalSpecializedPackActivation,
  plan: ExternalSpecializedPackActivationPlan,
  relativeLockPath: string,
  extra: Partial<ExternalSpecializedPackActivationApplyResult> = {},
): ExternalSpecializedPackActivationApplyResult {
  const status =
    plan.status === "ready"
      ? "applied"
      : plan.status === "already-applied"
        ? "already-applied"
        : "conflict";
  return {
    status,
    projectRoot,
    extensionId: activation.manifest.id,
    digest: activation.digest,
    pin: activation.source.pin,
    changedPaths: status === "applied" ? [relativeLockPath] : [],
    writes: status === "applied" ? 1 : 0,
    diagnostics: [...plan.diagnostics],
    rollbackAttempted: false,
    rollbackCompleted: true,
    rollbackFailures: [],
    ...extra,
  };
}

export async function applyExternalSpecializedPackActivation(
  input: ApplyExternalSpecializedPackActivationInput,
  fs: FileSystem,
): Promise<ExternalSpecializedPackActivationApplyResult> {
  let projectRoot: string;
  try {
    projectRoot = await assertCanonicalProjectRoot(input.root, fs);
  } catch (error) {
    const code =
      error instanceof ProjectRootError
        ? error.clientErrorCode
        : "invalid_root";
    return deniedResult(resolve(input.root), input.activation, [
      `project-root-${code}`,
    ]);
  }

  return withCanonicalProjectRootLock(projectRoot, async () => {
    const lockfilePath =
      input.lockfilePath ?? resolve(projectRoot, ".aif/extension-lock.json");
    const relativeLockPath = extensionLockRelativePath(
      projectRoot,
      lockfilePath,
    );
    try {
      await safeExtensionLockPath(projectRoot, lockfilePath, fs);
    } catch (error) {
      return deniedResult(projectRoot, input.activation, [
        error instanceof Error ? error.message : String(error),
      ]);
    }

    let current: Awaited<ReturnType<typeof readExtensionLockfile>>;
    try {
      current = await readExtensionLockfile(lockfilePath, fs);
    } catch (error) {
      return deniedResult(projectRoot, input.activation, [
        error instanceof Error ? error.message : String(error),
      ]);
    }

    let plan: ExternalSpecializedPackActivationPlan;
    try {
      plan = prepareExternalSpecializedPackActivationPlan({
        activation: input.activation,
        approval: input.approval,
        declaredLicense: input.declaredLicense,
        currentLockfile: current?.lockfile,
      });
    } catch (error) {
      return deniedResult(projectRoot, input.activation, [
        error instanceof Error ? error.message : String(error),
      ]);
    }

    if (plan.status !== "ready") {
      return planResult(projectRoot, input.activation, plan, relativeLockPath);
    }

    const timestamp =
      input.timestamp ??
      plan.lockEntry.approvedAt ??
      current?.lockfile.updatedAt;
    if (!timestamp) {
      return deniedResult(projectRoot, input.activation, [
        "specialized-pack-lock-timestamp-required",
      ]);
    }

    const baseLockfile =
      current?.lockfile ?? defaultExtensionLockfile(timestamp);
    const applied = applyExtensionAdoptionPlan(
      plan.adoptionPlan,
      baseLockfile,
      {
        forceApproval: true,
        timestamp,
      },
    );
    if (!applied.updated) {
      return deniedResult(projectRoot, input.activation, applied.diagnostics);
    }

    const nextContent = formatExtensionLockfile(applied.lockfile);
    if (current?.content === nextContent) {
      return planResult(
        projectRoot,
        input.activation,
        {
          ...plan,
          status: "already-applied",
          diagnostics: ["specialized-pack-lock-already-applied"],
        },
        relativeLockPath,
      );
    }

    const snapshot: ExtensionUpdateFileSnapshot = current
      ? { path: lockfilePath, existed: true, content: current.content }
      : { path: lockfilePath, existed: false };

    try {
      await fs.mkdir?.(dirname(lockfilePath));
      await fs.write(lockfilePath, nextContent);
    } catch (error) {
      const rollbackFailures = await restoreExtensionUpdateSnapshots(
        [snapshot],
        fs,
      );
      return {
        status: "failed",
        projectRoot,
        extensionId: input.activation.manifest.id,
        digest: input.activation.digest,
        pin: input.activation.source.pin,
        changedPaths: [],
        writes: 0,
        diagnostics: [error instanceof Error ? error.message : String(error)],
        rollbackAttempted: true,
        rollbackCompleted: rollbackFailures.length === 0,
        rollbackFailures,
      };
    }

    return planResult(projectRoot, input.activation, plan, relativeLockPath);
  });
}
