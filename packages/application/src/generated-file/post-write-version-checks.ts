import { INTENTLOOM_VERSION } from "@intentloom/core";
import type { InvalidPostWriteValidation } from "./transaction-contracts.js";
import {
  adapterOutputVersion,
  lockPath,
  metadataFormatVersion,
  sourceMapPath,
} from "./transaction-metadata.js";
import {
  invalidPostWriteState,
  type MetadataObject,
} from "./post-write-metadata-checks.js";

function frameworkVersionAgreement(
  manifest: MetadataObject,
  sourceMap: MetadataObject,
): InvalidPostWriteValidation | null {
  const frameworkPaths: string[] = [];
  if (typeof manifest.frameworkVersion !== "string")
    frameworkPaths.push(lockPath);
  if (typeof sourceMap.frameworkVersion !== "string")
    frameworkPaths.push(sourceMapPath);
  if (frameworkPaths.length > 0)
    return invalidPostWriteState("framework-version-missing", frameworkPaths, [
      "frameworkVersion",
    ]);
  if (
    manifest.frameworkVersion !== INTENTLOOM_VERSION ||
    sourceMap.frameworkVersion !== INTENTLOOM_VERSION
  )
    return invalidPostWriteState(
      "framework-version-incompatible",
      [lockPath, sourceMapPath],
      ["frameworkVersion"],
    );
  return null;
}

function adapterOutputVersionAgreement(
  manifest: MetadataObject,
  sourceMap: MetadataObject,
): InvalidPostWriteValidation | null {
  const adapterVersionPaths: string[] = [];
  if (typeof manifest.adapterOutputVersion !== "string")
    adapterVersionPaths.push(lockPath);
  if (typeof sourceMap.adapterOutputVersion !== "string")
    adapterVersionPaths.push(sourceMapPath);
  if (adapterVersionPaths.length > 0)
    return invalidPostWriteState(
      "adapter-output-version-missing",
      adapterVersionPaths,
      ["adapterOutputVersion"],
    );
  if (
    manifest.adapterOutputVersion !== adapterOutputVersion ||
    sourceMap.adapterOutputVersion !== adapterOutputVersion
  )
    return invalidPostWriteState(
      "adapter-output-version-incompatible",
      [lockPath, sourceMapPath],
      ["adapterOutputVersion"],
    );
  return null;
}

function metadataFormatAgreement(
  manifest: MetadataObject,
  sourceMap: MetadataObject,
): InvalidPostWriteValidation | null {
  if (
    manifest.metadataFormatVersion !== metadataFormatVersion ||
    sourceMap.metadataFormatVersion !== metadataFormatVersion ||
    manifest.lockVersion !== metadataFormatVersion ||
    sourceMap.schemaVersion !== metadataFormatVersion
  )
    return invalidPostWriteState(
      "metadata-format-version-incompatible",
      [lockPath, sourceMapPath],
      ["metadataFormatVersion"],
    );
  return null;
}

export function versionAgreement(
  manifest: MetadataObject,
  sourceMap: MetadataObject,
): InvalidPostWriteValidation | null {
  return (
    frameworkVersionAgreement(manifest, sourceMap) ??
    adapterOutputVersionAgreement(manifest, sourceMap) ??
    metadataFormatAgreement(manifest, sourceMap)
  );
}
