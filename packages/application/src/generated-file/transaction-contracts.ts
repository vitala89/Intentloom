import type { FileSystem } from "../host-file-system.js";
import type { Plan } from "../project-change.js";
import type { GeneratedFileSyncMode } from "./sync-mode.js";

export type TransactionStage =
  | "generated-stage"
  | "generated-commit"
  | "manifest-stage"
  | "manifest-finalize"
  | "source-map-stage"
  | "source-map-finalize"
  | "post-write-consistency"
  | "success-cleanup";

export interface TransactionResult extends Plan {
  readonly status: "success" | "failed";
  readonly failedStage?: TransactionStage;
  readonly rollbackAttempted: boolean;
  readonly rollbackCompleted: boolean;
  readonly rollbackFailures: readonly string[];
  readonly createdFiles: readonly string[];
  readonly updatedFiles: readonly string[];
  readonly unchangedFiles: readonly string[];
  readonly manifestUpdated: boolean;
  readonly sourceMapUpdated: boolean;
  readonly consistencyValidated: boolean;
  readonly cleanupCompleted: boolean;
  readonly postWriteValidation?: PostWriteValidationResult;
}

export type PostWriteCorruptionCode =
  | "manifest-json-malformed"
  | "source-map-json-malformed"
  | "manifest-entry-missing"
  | "source-map-entry-missing"
  | "manifest-destination-missing"
  | "source-map-destination-missing"
  | "generated-checksum-mismatch"
  | "manifest-source-map-checksum-mismatch"
  | "manifest-generated-checksum-mismatch"
  | "manifest-absolute-path"
  | "source-map-absolute-path"
  | "manifest-path-escape"
  | "source-map-path-escape"
  | "manifest-duplicate-destination"
  | "source-map-duplicate-ownership"
  | "ownership-classification-invalid"
  | "adapter-id-missing"
  | "adapter-id-mismatch"
  | "canonical-source-id-missing"
  | "canonical-source-id-mismatch"
  | "framework-version-missing"
  | "framework-version-incompatible"
  | "adapter-output-version-missing"
  | "adapter-output-version-incompatible"
  | "metadata-format-version-incompatible"
  | "committed-generated-bytes-mismatch"
  | "committed-manifest-bytes-mismatch"
  | "committed-source-map-bytes-mismatch"
  | "generated-file-without-ownership"
  | "ownership-record-without-generated-file"
  | "normalized-destination-duplicate";

export interface ValidPostWriteValidation {
  readonly status: "valid";
  readonly checkedGeneratedFileCount: number;
  readonly checkedManifestEntryCount: number;
  readonly checkedSourceMapEntryCount: number;
  readonly checksumsValidated: true;
  readonly ownershipValidated: true;
  readonly pathsValidated: true;
  readonly versionsValidated: true;
  readonly metadataBytesValidated: true;
}

export interface InvalidPostWriteValidation {
  readonly status: "invalid";
  readonly code: PostWriteCorruptionCode;
  readonly affectedPaths: readonly string[];
  readonly affectedIdentifiers: readonly string[];
}

export type PostWriteValidationResult =
  ValidPostWriteValidation | InvalidPostWriteValidation;

export interface PostWriteCorruptionContext {
  readonly root: string;
  readonly fileSystem: FileSystem;
}

export interface TransactionOptions {
  readonly syncMode?: GeneratedFileSyncMode;
  readonly failAt?: TransactionStage;
  readonly rollbackFailPaths?: readonly string[];
  readonly corruptAfterFinalization?: (
    context: PostWriteCorruptionContext,
  ) => void | Promise<void>;
}
