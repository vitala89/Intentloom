import {
  checksum,
  normalizeOutputPath,
  type GeneratedFile,
} from "@intentloom/core";
import { planExistingGeneratedChange } from "../generated-metadata-compare.js";
import {
  lockPath,
  sourceMapPath,
} from "../generated-file/transaction-metadata.js";
import {
  collisionPlan,
  safeDestination,
} from "../generated-file/transaction-path-safety.js";
import type { FileSystem } from "../host-file-system.js";
import type { Change, Plan } from "../project-change.js";
import { inside } from "../project-path.js";
import { desired } from "./desired-generated-state.js";
import { ownership } from "./ownership-state.js";
import type { InitOptions } from "./project-lifecycle-contracts.js";

type OwnedDestinations = ReadonlyMap<string, { readonly checksum: string }>;

type DestinationDecision =
  { readonly stop: Plan } | { readonly change: Change | null };

export async function plan(
  options: InitOptions,
  fs: FileSystem,
  sync = false,
): Promise<Plan> {
  const changes: Change[] = [];
  const desiredFiles = await desired(options);
  const unsafeMetadata = await rejectUnsafeMetadataDestinations(options, fs);
  if (unsafeMetadata) return unsafeMetadata;
  const collision = collisionPlan(desiredFiles);
  if (collision) return collision;
  const owned = await ownership(options.root, fs);
  if (owned === null) return invalidSourceMapPlan();
  for (const file of desiredFiles) {
    const decision = await planGeneratedDestination(
      options,
      fs,
      file,
      sync,
      owned,
    );
    if ("stop" in decision) return decision.stop;
    if (decision.change) changes.push(decision.change);
  }
  return { changes, diagnostics: [] };
}

export async function diffProject(
  options: InitOptions,
  fs: FileSystem,
): Promise<Plan> {
  return plan(options, fs);
}

async function rejectUnsafeMetadataDestinations(
  options: InitOptions,
  fs: FileSystem,
): Promise<Plan | null> {
  for (const metadataPath of [lockPath, sourceMapPath]) {
    try {
      await safeDestination(
        options.root,
        inside(options.root, metadataPath),
        fs,
      );
    } catch (error) {
      return securityPlan(
        metadataPath,
        error instanceof Error ? error.message : String(error),
      );
    }
  }
  return null;
}

function invalidSourceMapPlan(): Plan {
  return {
    changes: [
      {
        path: sourceMapPath,
        kind: "conflict",
        reason: "malformed source-map; refusing all writes",
      },
    ],
    diagnostics: ["invalid source-map"],
  };
}

function securityPlan(path: string, reason: string): Plan {
  return {
    changes: [{ path, kind: "security-error", reason }],
    diagnostics: ["security-error"],
  };
}

async function planGeneratedDestination(
  options: InitOptions,
  fs: FileSystem,
  file: GeneratedFile,
  sync: boolean,
  owned: OwnedDestinations,
): Promise<DestinationDecision> {
  const path = inside(options.root, normalizeOutputPath(file.path));
  try {
    await safeDestination(options.root, path, fs);
  } catch (error) {
    return {
      stop: securityPlan(
        file.path,
        error instanceof Error ? error.message : String(error),
      ),
    };
  }
  if (!(await fs.exists(path)))
    return { change: missingGeneratedChange(file, sync, owned) };
  const existing = await fs.read(path);
  return {
    change:
      planExistingGeneratedChange({
        path: file.path,
        existing,
        desired: file.content,
        sync,
        ownedChecksum: owned.get(file.path)?.checksum,
        checksum,
        approvedOverwrite: options.profileConfirmed === true,
      }) ?? null,
  };
}

function missingGeneratedChange(
  file: GeneratedFile,
  sync: boolean,
  owned: OwnedDestinations,
): Change {
  const ownedMissing = sync && owned.has(file.path);
  return {
    path: file.path,
    kind: ownedMissing ? "missing" : "create",
    reason: ownedMissing
      ? "Intentloom-owned generated file is missing"
      : "missing",
    content: file.content,
  };
}
