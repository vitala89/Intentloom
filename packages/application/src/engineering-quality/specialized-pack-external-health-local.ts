import { posix } from "node:path";
import type {
  ExtensionHealthFinding,
  ExtensionLockEntry,
} from "@intentloom/protocol";
import { validateQualitySpecializedPackManifest } from "@intentloom/validator";
import { resolveWithin } from "@intentloom/core";
import type { FileSystem } from "../propose-and-apply-extension-adoption.js";
import { safeExtensionLockPath } from "../extension-lock-path.js";
import { computeExternalSpecializedPackDigest } from "./specialized-pack-external-lock.js";
import {
  SPECIALIZED_PACK_LOCK_INVALID,
  SPECIALIZED_PACK_MANIFEST_DIGEST_MISMATCH,
  SPECIALIZED_PACK_MANIFEST_IDENTITY_MISMATCH,
  SPECIALIZED_PACK_MANIFEST_MISSING,
  specializedPackFinding,
} from "./specialized-pack-external-health-findings.js";

const MAX_LOCAL_MANIFEST_CHARS = 2_000_000;

export function canInspectLocalSpecializedPackManifest(
  entry: ExtensionLockEntry,
): boolean {
  const locator = entry.source?.package;
  return (
    entry.source?.registry === "local" &&
    typeof locator === "string" &&
    locator.startsWith("./") &&
    !locator.includes("..") &&
    !locator.includes("\\") &&
    !locator.includes("\0")
  );
}

function projectRelativeLocator(locator: string): string {
  return locator.slice(2);
}

function lockInvalid(
  extensionId: string,
  path: string,
  message: string,
): ExtensionHealthFinding {
  return specializedPackFinding(
    extensionId,
    SPECIALIZED_PACK_LOCK_INVALID,
    "error",
    path,
    message,
    "Repair or replace the specialized-pack lock entry after explicit review.",
  );
}

function mapPathSafetyError(
  extensionId: string,
  path: string,
  error: unknown,
): ExtensionHealthFinding {
  const code = error instanceof Error ? error.message : "";
  if (code === "extension-lock-path-symbolic-link")
    return lockInvalid(
      extensionId,
      path,
      `${extensionId}: referenced local specialized-pack path is a symbolic link`,
    );
  if (code === "extension-lock-path-outside-root")
    return lockInvalid(
      extensionId,
      path,
      `${extensionId}: referenced local specialized-pack path escapes the project root`,
    );
  return lockInvalid(
    extensionId,
    path,
    `${extensionId}: referenced local specialized-pack path cannot be verified safely`,
  );
}

async function readBoundedLocalManifest(
  absolutePath: string,
  relativePath: string,
  extensionId: string,
  fs: FileSystem,
): Promise<{ content: string } | { finding: ExtensionHealthFinding }> {
  if (!(await fs.exists(absolutePath)))
    return {
      finding: specializedPackFinding(
        extensionId,
        SPECIALIZED_PACK_MANIFEST_MISSING,
        "warning",
        relativePath,
        `${extensionId}: referenced local specialized-pack manifest is unavailable`,
        "Restore the referenced local specialized-pack manifest or re-activate the pin.",
      ),
    };
  const content = await fs.read(absolutePath);
  if (content.length > MAX_LOCAL_MANIFEST_CHARS)
    return {
      finding: lockInvalid(
        extensionId,
        relativePath,
        `${extensionId}: referenced local specialized-pack manifest exceeds the size bound`,
      ),
    };
  return { content };
}

function inspectParsedLocalManifest(
  entry: ExtensionLockEntry,
  relativePath: string,
  content: string,
): ExtensionHealthFinding[] {
  const id = entry.extensionId;
  let parsed: unknown;
  try {
    parsed = JSON.parse(content) as unknown;
  } catch {
    return [
      lockInvalid(
        id,
        relativePath,
        `${id}: referenced local specialized-pack manifest is malformed`,
      ),
    ];
  }
  try {
    const manifest = validateQualitySpecializedPackManifest(parsed);
    const digest = computeExternalSpecializedPackDigest(manifest);
    const findings: ExtensionHealthFinding[] = [];
    if (entry.integrity && digest !== entry.integrity)
      findings.push(
        specializedPackFinding(
          id,
          SPECIALIZED_PACK_MANIFEST_DIGEST_MISMATCH,
          "error",
          relativePath,
          `${id}: local specialized-pack manifest digest does not match the lock`,
          "Stop using the pin and restore the reviewed manifest or re-activate after review.",
        ),
      );
    if (
      manifest.id !== entry.extensionId ||
      manifest.version !== entry.resolvedVersion ||
      manifest.publisher !== entry.publisher?.name
    )
      findings.push(
        specializedPackFinding(
          id,
          SPECIALIZED_PACK_MANIFEST_IDENTITY_MISMATCH,
          "error",
          relativePath,
          `${id}: local specialized-pack manifest identity does not match the lock`,
          "Re-activate the specialized pack so lock identity matches the local manifest.",
        ),
      );
    return findings;
  } catch {
    return [
      lockInvalid(
        id,
        relativePath,
        `${id}: referenced local specialized-pack manifest is malformed`,
      ),
    ];
  }
}

export async function inspectLocalSpecializedPackManifest(
  entry: ExtensionLockEntry,
  options: { readonly root: string; readonly fs: FileSystem },
): Promise<readonly ExtensionHealthFinding[]> {
  if (!canInspectLocalSpecializedPackManifest(entry)) return [];
  const locator = entry.source!.package;
  const relativePath = projectRelativeLocator(locator);
  if (posix.normalize(relativePath) !== relativePath)
    return [
      lockInvalid(
        entry.extensionId,
        ".aif/extension-lock.json",
        `${entry.extensionId}: specialized-pack local locator is not a portable path`,
      ),
    ];
  let absolutePath: string;
  try {
    absolutePath = resolveWithin(options.root, relativePath);
  } catch {
    return [
      lockInvalid(
        entry.extensionId,
        ".aif/extension-lock.json",
        `${entry.extensionId}: referenced local specialized-pack path escapes the project root`,
      ),
    ];
  }
  try {
    await safeExtensionLockPath(options.root, absolutePath, options.fs);
  } catch (error) {
    return [mapPathSafetyError(entry.extensionId, relativePath, error)];
  }
  const read = await readBoundedLocalManifest(
    absolutePath,
    relativePath,
    entry.extensionId,
    options.fs,
  );
  if ("finding" in read) return [read.finding];
  return inspectParsedLocalManifest(entry, relativePath, read.content);
}
