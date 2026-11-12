import type { GeneratedFile } from "@intentloom/core";
import type {
  TransactionOptions,
  TransactionResult,
} from "../generated-file/transaction-contracts.js";
import {
  lockPath,
  sourceMapPath,
} from "../generated-file/transaction-metadata.js";
import type { FileSystem } from "../host-file-system.js";
import type { Change } from "../project-change.js";
import { detectProjectProfiles } from "../project-profile-detection.js";
import type { ProfileDetectionResult } from "../project-profile-detection.js";
import { inside } from "../project-path.js";
import { desired } from "../project-lifecycle/desired-generated-state.js";
import { ownership } from "../project-lifecycle/ownership-state.js";
import { plan } from "../project-lifecycle/project-plan.js";
import {
  configPath,
  type InitOptions,
  type SyncDryRunResult,
  type SyncOptions,
} from "../project-lifecycle/project-lifecycle-contracts.js";
import type {
  AdoptionProposal,
  AdoptionProposalItem,
  AdoptionTransactionOutcome,
} from "./generated-file-adoption-contracts.js";
import { buildAdoptionItems } from "./generated-file-adoption-classification.js";
import { collectGeneratedAdoptionMappings } from "./generated-file-adoption-mappings.js";
import { mapAdoptionTransactionOutcome } from "./generated-file-adoption-outcome.js";

export type ProjectSync = (
  options: SyncOptions,
  fs: FileSystem,
  transactionOptions: TransactionOptions,
) => Promise<SyncDryRunResult | TransactionResult>;

interface GeneratedAdoptionContext {
  readonly profileDetection: ProfileDetectionResult;
  readonly scannedPaths: readonly string[];
  readonly scanned: ReadonlySet<string>;
  readonly desiredFiles: readonly GeneratedFile[];
  readonly desiredByPath: ReadonlyMap<string, GeneratedFile>;
  readonly owned: ReadonlyMap<string, unknown>;
  readonly invalidOwnershipMetadata: boolean;
  readonly completeMetadata: boolean;
  readonly changes: Change[];
  readonly changeByPath: ReadonlyMap<string, Change>;
}

interface AdoptionWriteDecision {
  readonly profileConfirmationRequired: boolean;
  readonly shouldSync: boolean;
  readonly applicationStatus: AdoptionProposal["applicationStatus"];
}

interface AdoptionWriteState {
  readonly applied: boolean;
  readonly applicationStatus: AdoptionProposal["applicationStatus"];
  readonly transactionOutcome: AdoptionTransactionOutcome | null;
}

export async function adoptGeneratedFiles(
  options: InitOptions,
  fs: FileSystem,
  transactionOptions: TransactionOptions,
  syncProject: ProjectSync,
): Promise<AdoptionProposal> {
  const context = await readGeneratedAdoptionContext(options, fs);
  const mappings = collectGeneratedAdoptionMappings(
    options.projectOwnedMappings,
    options.documentationMappings,
    context.scannedPaths,
    context.scanned,
  );
  const items = await buildAdoptionItems(
    { ...context, root: options.root, profile: options.profile },
    mappings,
    fs,
  );
  const validationDiagnostics = validationDiagnosticCodes(options);
  const decision = adoptionWriteDecision(
    options,
    context.profileDetection,
    mappings.diagnostics,
    validationDiagnostics,
    items,
  );
  const write = await applyPermittedAdoptionSync(
    options,
    fs,
    transactionOptions,
    syncProject,
    decision,
  );
  return adoptionProposal(
    context,
    items,
    mappings.diagnostics,
    validationDiagnostics,
    decision,
    write,
  );
}

async function readGeneratedAdoptionContext(
  options: InitOptions,
  fs: FileSystem,
): Promise<GeneratedAdoptionContext> {
  const profileDetection = await detectProjectProfiles(options.root, fs);
  const scannedPaths = profileDetection.scannedPaths;
  const scanned = new Set(scannedPaths);
  const desiredFiles = await desired(options);
  const desiredByPath = new Map(desiredFiles.map((file) => [file.path, file]));
  const ownershipState = await ownership(options.root, fs);
  const invalidOwnershipMetadata = ownershipState === null;
  const owned = ownershipState ?? new Map();
  const metadataPresent = await Promise.all(
    [configPath, lockPath, sourceMapPath].map((path) =>
      fs.exists(inside(options.root, path)),
    ),
  );
  const proposal = await plan({ ...options, dryRun: true }, fs);
  const changes = proposal.changes.map(
    ({ content: _content, ...change }) => change,
  );
  return {
    profileDetection,
    scannedPaths,
    scanned,
    desiredFiles,
    desiredByPath,
    owned,
    invalidOwnershipMetadata,
    completeMetadata: metadataPresent.every(Boolean) && owned.size > 0,
    changes,
    changeByPath: new Map(changes.map((change) => [change.path, change])),
  };
}

function adoptionWriteDecision(
  options: InitOptions,
  profileDetection: ProfileDetectionResult,
  mappingDiagnostics: readonly string[],
  validationDiagnostics: readonly string[],
  items: readonly AdoptionProposalItem[],
): AdoptionWriteDecision {
  const profileConfirmationRequired =
    profileDetection.manualConfirmationRequired && !options.profileConfirmed;
  const blocked =
    profileConfirmationRequired ||
    mappingDiagnostics.length > 0 ||
    validationDiagnostics.length > 0 ||
    items.some(
      (item) =>
        item.manualDecisionRequired ||
        (item.action === "conflict" && options.profileConfirmed !== true),
    );
  return {
    profileConfirmationRequired,
    shouldSync: !options.dryRun && !blocked,
    applicationStatus: options.dryRun
      ? "not-requested"
      : blocked
        ? "blocked"
        : "applied",
  };
}

async function applyPermittedAdoptionSync(
  options: InitOptions,
  fs: FileSystem,
  transactionOptions: TransactionOptions,
  syncProject: ProjectSync,
  decision: AdoptionWriteDecision,
): Promise<AdoptionWriteState> {
  if (!decision.shouldSync) return idleAdoptionWrite(decision);
  const result = await syncProject(
    { ...options, dryRun: false },
    fs,
    transactionOptions,
  );
  if ("dryRun" in result) return idleAdoptionWrite(decision);
  const mapped = mapAdoptionTransactionOutcome(result);
  return {
    applied: mapped.applied,
    applicationStatus: mapped.applicationStatus,
    transactionOutcome: mapped.transactionOutcome,
  };
}

function idleAdoptionWrite(
  decision: AdoptionWriteDecision,
): AdoptionWriteState {
  return {
    applied: false,
    applicationStatus: decision.applicationStatus,
    transactionOutcome: null,
  };
}

function validationDiagnosticCodes(options: InitOptions): string[] {
  return (options.existingValidationResults ?? [])
    .flatMap((result) => [
      ...result.structuralErrors.map(
        (error) => `${result.documentPath}: ${error.code}`,
      ),
      ...result.semanticErrors.map(
        (error) => `${result.documentPath}: ${error.code}`,
      ),
    ])
    .sort();
}

function adoptionProposal(
  context: GeneratedAdoptionContext,
  items: readonly AdoptionProposalItem[],
  mappingDiagnostics: readonly string[],
  validationDiagnostics: readonly string[],
  decision: AdoptionWriteDecision,
  write: AdoptionWriteState,
): AdoptionProposal {
  return {
    kind: "adoption-proposal",
    changes: context.changes,
    diagnostics: [
      ...(decision.profileConfirmationRequired
        ? ["profile: explicit confirmation required"]
        : []),
      ...mappingDiagnostics,
      ...validationDiagnostics,
      ...items
        .filter((item) => item.manualDecisionRequired)
        .map((item) => `${item.path}: manual decision required`),
    ].sort(),
    items,
    profileDetection: context.profileDetection,
    applied: write.applied,
    applicationStatus: write.applicationStatus,
    transactionOutcome: write.transactionOutcome,
  };
}
