import { parseDocument } from "yaml";
import type {
  ExtensionManifest,
  ExtensionLockfile,
  ExtensionAdoptionPlan,
  ExtensionCapabilities,
} from "@intentloom/protocol";
import {
  resolveExtensionAdoptionProposal,
  applyExtensionAdoptionPlan,
  type ResolveAdoptionProposalOptions,
} from "@intentloom/validator";

export interface FileSystem {
  exists(path: string): Promise<boolean>;
  read(path: string): Promise<string>;
  write(path: string, content: string): Promise<void>;
  mkdir?(path: string): Promise<void>;
  remove?(path: string): Promise<void>;
  list?(path: string): Promise<string[]>;
  realpath?(path: string): Promise<string>;
  isSymbolicLink?(path: string): Promise<boolean>;
}

export interface ProposeExtensionAdoptionOptions {
  readonly root: string;
  readonly manifestInput: string | ExtensionManifest;
  readonly lockfilePath?: string | undefined;
  readonly registryResolution?: ResolveAdoptionProposalOptions["registryResolution"];
  readonly approvedCapabilities?: ExtensionCapabilities | undefined;
  readonly approver?: string | undefined;
  readonly timestamp?: string | undefined;
}

export async function proposeExtensionAdoption(
  options: ProposeExtensionAdoptionOptions,
  fs: FileSystem,
): Promise<ExtensionAdoptionPlan> {
  let manifest: ExtensionManifest;
  if (typeof options.manifestInput === "string") {
    const rawContent = await fs.read(options.manifestInput);
    const parsed = parseDocument(rawContent).toJS();
    manifest = parsed as ExtensionManifest;
  } else {
    manifest = options.manifestInput;
  }

  const lockfilePath =
    options.lockfilePath ?? `${options.root}/.aif/extension-lock.json`;

  let lockfile: ExtensionLockfile | undefined;
  try {
    const rawLockfile = await fs.read(lockfilePath);
    const parsed = parseDocument(rawLockfile).toJS();
    lockfile = parsed as ExtensionLockfile;
  } catch {
    lockfile = undefined;
  }

  const resolveOpts: {
    lockfile?: ExtensionLockfile | undefined;
    registryResolution?: ResolveAdoptionProposalOptions["registryResolution"];
    approvedCapabilities?: ExtensionCapabilities | undefined;
    approver?: string | undefined;
    timestamp?: string | undefined;
  } = {};
  if (lockfile !== undefined) resolveOpts.lockfile = lockfile;
  if (options.registryResolution !== undefined)
    resolveOpts.registryResolution = options.registryResolution;
  if (options.approvedCapabilities !== undefined)
    resolveOpts.approvedCapabilities = options.approvedCapabilities;
  if (options.approver !== undefined) resolveOpts.approver = options.approver;
  if (options.timestamp !== undefined)
    resolveOpts.timestamp = options.timestamp;

  return resolveExtensionAdoptionProposal(manifest, resolveOpts);
}

export interface ApplyExtensionAdoptionOptions {
  readonly root: string;
  readonly plan: ExtensionAdoptionPlan;
  readonly lockfilePath?: string | undefined;
  readonly forceApproval?: boolean | undefined;
  readonly timestamp?: string | undefined;
}

export interface ApplyExtensionAdoptionApplicationResult {
  readonly lockfile: ExtensionLockfile;
  readonly updated: boolean;
  readonly diagnostics: readonly string[];
}

export async function applyExtensionAdoption(
  options: ApplyExtensionAdoptionOptions,
  fs: FileSystem,
): Promise<ApplyExtensionAdoptionApplicationResult> {
  const lockfilePath =
    options.lockfilePath ?? `${options.root}/.aif/extension-lock.json`;

  let currentLockfile: ExtensionLockfile;
  try {
    const rawLockfile = await fs.read(lockfilePath);
    const parsed = parseDocument(rawLockfile).toJS();
    currentLockfile = parsed as ExtensionLockfile;
  } catch {
    currentLockfile = {
      lockVersion: 1,
      updatedAt: options.timestamp ?? new Date().toISOString(),
      extensions: {},
    };
  }

  const applyOpts: {
    forceApproval?: boolean | undefined;
    timestamp?: string | undefined;
  } = {};
  if (options.forceApproval !== undefined)
    applyOpts.forceApproval = options.forceApproval;
  if (options.timestamp !== undefined) applyOpts.timestamp = options.timestamp;

  const result = applyExtensionAdoptionPlan(
    options.plan,
    currentLockfile,
    applyOpts,
  );

  if (result.updated) {
    const formattedContent = JSON.stringify(result.lockfile, null, 2) + "\n";
    await fs.write(lockfilePath, formattedContent);
  }

  return result;
}

export * from "./discover-and-apply-extension-update.js";
