import type { AdapterName } from "@intentloom/core";
import type { ArtifactValidationResult } from "@intentloom/validator";
import { collectExtensionHealthDoctorFindings } from "../extension-inspection/extension-health.js";
import type { FileSystem } from "../host-file-system.js";
import type { Change, Plan } from "../project-change.js";
import { projectRelativePaths } from "../project-path.js";
import {
  lockPath,
  sourceMapPath,
} from "../generated-file/transaction-metadata.js";
import { desired } from "./desired-generated-state.js";
import { invalidPathScopedRuleFindings } from "./doctor-adapter-output.js";
import { driftFindings } from "./doctor-drift.js";
import {
  collectValidatorMetadataResults,
  malformedMetadataFindings,
  missingMetadataFindings,
  readMetadataPresence,
  schemaFindings,
} from "./doctor-metadata.js";
import {
  headerWithoutOwnershipFindings,
  missingGeneratedHeaderFindings,
} from "./doctor-generated-headers.js";
import {
  adapterSelectionFindings,
  manifestGeneratedRecords,
  manifestVersionFindings,
  orphanedManifestFindings,
  ownedSourcePaths,
  readMetadataObject,
  sourceMapFileRecords,
  sourceMapOrphanFindings,
  storedPathFindings,
} from "./doctor-ownership.js";
import {
  adapterCapabilityFindings,
  conflictingInstructionRootsFinding,
  missingProductDocumentationFinding,
  profileMismatchFinding,
  unsupportedProfileFinding,
} from "./doctor-profile.js";
import { plan } from "./project-plan.js";
import type {
  DoctorError,
  DoctorFinding,
  DoctorPlan,
  InitOptions,
} from "./project-lifecycle-contracts.js";

export async function doctorProject(
  options: InitOptions,
  fs: FileSystem,
  validationResults: readonly ArtifactValidationResult[] = [],
): Promise<DoctorPlan> {
  const metadataPresence = await readMetadataPresence(options, fs);
  const validation = await collectValidatorMetadataResults(
    options,
    fs,
    validationResults,
  );
  const selectedAdapters = [...new Set(options.adapters)].sort();
  const findings: DoctorFinding[] = [
    ...schemaFindings(validation, options.profile),
    ...(await malformedMetadataFindings(options, fs, validation)),
    ...missingMetadataFindings(metadataPresence, options.profile),
  ];
  const proposal = await plan({ ...options, dryRun: true }, fs, true);
  const changes = mapDoctorChanges(proposal.changes);
  findings.push(
    ...driftFindings(changes, metadataPresence, options, selectedAdapters),
  );
  const scannedPaths = projectRelativePaths(
    options.root,
    await fs.list(options.root),
  );
  const scanned = new Set(scannedPaths);
  const desiredPaths = new Set(
    (await desired(options))
      .map((file) => file.path)
      .filter((path) => path !== lockPath && path !== sourceMapPath),
  );
  const ownership = await ownershipPhaseFindings(
    options,
    fs,
    scanned,
    desiredPaths,
    selectedAdapters,
  );
  findings.push(...ownership.findings);
  findings.push(
    ...(await invalidPathScopedRuleFindings(
      options,
      fs,
      scanned,
      desiredPaths,
      selectedAdapters,
    )),
  );
  await appendProfileFindings(
    findings,
    options,
    fs,
    metadataPresence,
    scannedPaths,
    desiredPaths,
    ownership.ownedPaths,
    selectedAdapters,
  );
  findings.push(...(await collectExtensionHealthDoctorFindings(options, fs)));
  return projectDoctorPlan(proposal, changes, findings, options);
}

function mapDoctorChanges(changes: readonly Change[]): Change[] {
  return changes.map(({ content: _content, ...change }) =>
    change.kind === "update"
      ? {
          ...change,
          kind: "stale" as const,
          reason: "generated state is stale",
        }
      : change,
  );
}

async function ownershipPhaseFindings(
  options: InitOptions,
  fs: FileSystem,
  scanned: ReadonlySet<string>,
  desiredPaths: ReadonlySet<string>,
  selectedAdapters: readonly AdapterName[],
): Promise<{
  findings: DoctorFinding[];
  ownedPaths: ReadonlySet<string>;
}> {
  const manifest = await readMetadataObject(options.root, lockPath, fs);
  const sourceMap = await readMetadataObject(options.root, sourceMapPath, fs);
  const generatedRecords = manifestGeneratedRecords(manifest);
  const sourceRecords = sourceMapFileRecords(sourceMap);
  const ownedPaths = ownedSourcePaths(sourceRecords);
  return {
    ownedPaths,
    findings: [
      ...manifestVersionFindings(manifest, options),
      ...storedPathFindings(lockPath, generatedRecords, options),
      ...orphanedManifestFindings(generatedRecords, desiredPaths, options),
      ...adapterSelectionFindings(manifest, options),
      ...storedPathFindings(sourceMapPath, sourceRecords, options),
      ...sourceMapOrphanFindings(sourceRecords, desiredPaths, options),
      ...(await missingGeneratedHeaderFindings(
        options,
        fs,
        sourceRecords,
        scanned,
      )),
      ...(await headerWithoutOwnershipFindings(
        options,
        fs,
        scanned,
        desiredPaths,
        ownedPaths,
        selectedAdapters,
      )),
    ],
  };
}

async function appendProfileFindings(
  findings: DoctorFinding[],
  options: InitOptions,
  fs: FileSystem,
  metadataPresence: Awaited<ReturnType<typeof readMetadataPresence>>,
  scannedPaths: readonly string[],
  desiredPaths: ReadonlySet<string>,
  ownedPaths: ReadonlySet<string>,
  selectedAdapters: readonly AdapterName[],
): Promise<void> {
  const unsupported = unsupportedProfileFinding(options);
  if (unsupported) findings.push(unsupported);
  const mismatch = await profileMismatchFinding(options, fs);
  if (mismatch) findings.push(mismatch);
  findings.push(
    ...adapterCapabilityFindings(options, metadataPresence, selectedAdapters),
  );
  const roots = conflictingInstructionRootsFinding(
    scannedPaths,
    ownedPaths,
    desiredPaths,
    options,
  );
  if (roots) findings.push(roots);
  const documentation = missingProductDocumentationFinding(
    scannedPaths,
    options,
  );
  if (documentation) findings.push(documentation);
}

function projectDoctorPlan(
  proposal: Plan,
  changes: readonly Change[],
  findings: DoctorFinding[],
  options: InitOptions,
): DoctorPlan {
  if (!findings.some((finding) => finding.severity === "error"))
    findings.push({
      code: "installation-healthy",
      severity: "info",
      category: "config",
      path: ".aif/",
      message: "Intentloom required state is healthy",
      remediation: [],
      readOnly: true,
      adapter: null,
      profile: options.profile,
    });
  findings.sort((left, right) =>
    `${left.code}:${left.path}`.localeCompare(`${right.code}:${right.path}`),
  );
  const errors: DoctorError[] = findings
    .filter((finding) => finding.severity === "error")
    .map((finding) => ({
      ...finding,
      phase: "semantic",
      artifactType: "generated-state",
      schemaId: "urn:aif:semantic:generated-state:1",
      schemaVersion: "1",
      documentPath: finding.path,
      affectedPath: finding.path,
      fieldPath: "/",
    }));
  return {
    ...proposal,
    changes,
    diagnostics: errors.map((finding) => `${finding.path}: ${finding.message}`),
    findings,
    errors,
  };
}
