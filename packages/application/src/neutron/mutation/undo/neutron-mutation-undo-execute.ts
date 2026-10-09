import { digestGeneratedFileContent } from "../../../../../validator/src/neutron/mutation/review/neutron-mutation-review-digest.js";
import type { FileSystem } from "../../../index.js";
import { assertNeutronMutationPathContained } from "../apply/neutron-mutation-containment.js";
import type { NeutronMutationUndoPlanFile } from "./neutron-mutation-undo-plan.js";

export type UndoExecutionFault = "after-first-mutation" | "rollback";

export type UndoExecutionResult =
  | { readonly kind: "undone" }
  | { readonly kind: "not-current"; readonly reason: "stale" | "escape" }
  | { readonly kind: "rolled-back" }
  | { readonly kind: "reconciliation" };

interface CapturedUndoStep {
  readonly path: string;
  readonly captured: string;
}

/**
 * Narrow Undo writer. It restores snapshot bytes or removes a created file.
 * It does not accept a caller path list or caller bytes.
 */
export async function executeUndoPlan(input: {
  readonly canonicalRoot: string;
  readonly fs: FileSystem;
  readonly files: readonly NeutronMutationUndoPlanFile[];
  readonly failAt?: UndoExecutionFault;
}): Promise<UndoExecutionResult> {
  const completed: CapturedUndoStep[] = [];
  for (const file of input.files) {
    const step = await mutateOne(input, file, completed);
    if (step !== "continue") return step;
    if (input.failAt !== undefined && completed.length === 1) {
      return rollback(input, completed);
    }
  }
  return { kind: "undone" };
}

async function mutateOne(
  input: {
    readonly canonicalRoot: string;
    readonly fs: FileSystem;
    readonly failAt?: UndoExecutionFault;
  },
  file: NeutronMutationUndoPlanFile,
  completed: CapturedUndoStep[],
): Promise<UndoExecutionResult | "continue"> {
  const current = await readCurrentTarget(input.canonicalRoot, input.fs, file);
  if (current.kind !== "match") {
    return unfinished(input, completed, current.kind);
  }
  try {
    await applyUndoFile(input.canonicalRoot, input.fs, file);
  } catch {
    return rollback(input, completed);
  }
  completed.push({ path: file.path, captured: current.captured });
  return "continue";
}

async function applyUndoFile(
  canonicalRoot: string,
  fs: FileSystem,
  file: NeutronMutationUndoPlanFile,
): Promise<void> {
  const fullPath = projectPath(canonicalRoot, file.path);
  if (await fs.isSymbolicLink(fullPath)) {
    throw new Error("undo target changed");
  }
  if (file.effect === "remove-created") {
    await fs.remove(fullPath);
    return;
  }
  if (file.payload === null) throw new Error("undo payload missing");
  await fs.write(fullPath, file.payload);
}

async function unfinished(
  input: {
    readonly canonicalRoot: string;
    readonly fs: FileSystem;
    readonly failAt?: UndoExecutionFault;
  },
  completed: readonly CapturedUndoStep[],
  reason: "stale" | "escape",
): Promise<UndoExecutionResult> {
  if (completed.length === 0) return { kind: "not-current", reason };
  return rollback(input, completed);
}

async function rollback(
  input: {
    readonly canonicalRoot: string;
    readonly fs: FileSystem;
    readonly failAt?: UndoExecutionFault;
  },
  completed: readonly CapturedUndoStep[],
): Promise<UndoExecutionResult> {
  for (const step of [...completed].reverse()) {
    try {
      if (input.failAt === "rollback") throw new Error("undo rollback failed");
      const fullPath = projectPath(input.canonicalRoot, step.path);
      if (await input.fs.isSymbolicLink(fullPath)) {
        throw new Error("undo rollback target changed");
      }
      await input.fs.write(fullPath, step.captured);
    } catch {
      return { kind: "reconciliation" };
    }
  }
  return { kind: "rolled-back" };
}

async function readCurrentTarget(
  canonicalRoot: string,
  fs: FileSystem,
  file: NeutronMutationUndoPlanFile,
): Promise<
  | { readonly kind: "match"; readonly captured: string }
  | { readonly kind: "stale" | "escape" }
> {
  const contained = await assertNeutronMutationPathContained(
    canonicalRoot,
    file.path,
    fs,
  );
  if (!contained) return { kind: "escape" };
  const fullPath = projectPath(canonicalRoot, file.path);
  if (await fs.isSymbolicLink(fullPath)) return { kind: "stale" };
  if (!(await fs.exists(fullPath))) return { kind: "stale" };
  try {
    const captured = await fs.read(fullPath);
    const actual = digestGeneratedFileContent(captured);
    if (actual !== file.expectedContentDigest) return { kind: "stale" };
    return { kind: "match", captured };
  } catch {
    return { kind: "stale" };
  }
}

function projectPath(canonicalRoot: string, path: string): string {
  return `${canonicalRoot}/${path}`;
}
