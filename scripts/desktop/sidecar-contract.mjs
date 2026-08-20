import { chmod, lstat, open, readFile, rm, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";

export const SIDECAR_STAMP_NAME = ".sidecar-stamp.json";
export const MIN_SEA_BYTES = 10_000_000;
export const STAMP_FORMAT_VERSION = 1;

export function sidecarResourceName(platform = process.platform) {
  return platform === "win32" ? "intentloomd.exe" : "intentloomd";
}

export function sidecarResourceDirectory(repositoryRoot) {
  return join(repositoryRoot, "apps/desktop/src-tauri/resources");
}

export function sidecarResourcePath(repositoryRoot, platform = process.platform) {
  return join(sidecarResourceDirectory(repositoryRoot), sidecarResourceName(platform));
}

export function sidecarStampPath(repositoryRoot) {
  return join(sidecarResourceDirectory(repositoryRoot), SIDECAR_STAMP_NAME);
}

export async function digestFile(path) {
  const hash = createHash("sha256");
  hash.update(await readFile(path));
  const details = await stat(path);
  return { bytes: details.size, sha256: hash.digest("hex") };
}

export function nativeKindFromMagic(header, platform = process.platform) {
  if (header.length >= 2 && header[0] === 0x23 && header[1] === 0x21) {
    return "shebang";
  }
  if (header.length >= 4 && header[0] === 0x7f && header[1] === 0x45) {
    return platform === "linux" ? "elf" : "elf-wrong-platform";
  }
  if (header.length >= 2 && header[0] === 0x4d && header[1] === 0x5a) {
    return platform === "win32" ? "pe" : "pe-wrong-platform";
  }
  if (isMachO(header)) {
    return platform === "darwin" ? "mach-o" : "mach-o-wrong-platform";
  }
  return "unknown";
}

function isMachO(header) {
  if (header.length < 4) return false;
  const magic = header.readUInt32BE(0);
  return (
    magic === 0xfeedface ||
    magic === 0xfeedfacf ||
    magic === 0xcefaedfe ||
    magic === 0xcffaedfe ||
    magic === 0xcafebabe ||
    magic === 0xbebafeca
  );
}

export async function inspectSidecar(path, options = {}) {
  const minBytes = options.minBytes ?? MIN_SEA_BYTES;
  const platform = options.platform ?? process.platform;
  const details = await lstat(path).catch(() => undefined);
  if (!details?.isFile()) {
    return fail("sidecar_missing", `packaged daemon executable not found: ${path}`);
  }
  const header = await readMagic(path);
  const kind = nativeKindFromMagic(header, platform);
  if (kind === "shebang") {
    return fail(
      "sidecar_script",
      `packaged daemon is a script, not a self-contained executable: ${path}`,
    );
  }
  if (kind.endsWith("-wrong-platform") || kind === "unknown") {
    return fail(
      "sidecar_format",
      `sidecar is not a native self-contained executable for ${platform}: ${path}`,
    );
  }
  if (details.size < minBytes) {
    return fail(
      "sidecar_too_small",
      `sidecar is too small to be a self-contained SEA executable (${details.size} bytes): ${path}`,
    );
  }
  if (platform !== "win32" && (details.mode & 0o111) === 0) {
    return fail("sidecar_not_executable", `sidecar is not executable: ${path}`);
  }
  const digest = await digestFile(path);
  return { ok: true, path, kind, ...digest };
}

export async function removeStaleSidecar(repositoryRoot) {
  const directory = sidecarResourceDirectory(repositoryRoot);
  await rm(join(directory, "intentloomd"), { force: true });
  await rm(join(directory, "intentloomd.exe"), { force: true });
  await rm(sidecarStampPath(repositoryRoot), { force: true });
}

export async function writeSidecarStamp({
  repositoryRoot,
  sidecarPath,
  daemonBundlePath,
  createdBy,
  minBytes,
}) {
  const sidecar = await inspectSidecar(sidecarPath, { minBytes });
  if (!sidecar.ok) throw new Error(sidecar.message);
  const bundle = await digestFile(daemonBundlePath);
  const stamp = {
    formatVersion: STAMP_FORMAT_VERSION,
    createdBy,
    platform: process.platform,
    sidecarName: sidecarResourceName(),
    bytes: sidecar.bytes,
    sha256: sidecar.sha256,
    kind: sidecar.kind,
    daemonBundleSha256: bundle.sha256,
    nodeVersion: process.version,
  };
  await writeFile(sidecarStampPath(repositoryRoot), `${JSON.stringify(stamp, null, 2)}\n`);
  return stamp;
}

export async function assertPackagingSidecar({
  repositoryRoot,
  daemonBundlePath,
  minBytes,
}) {
  const sidecarPath = sidecarResourcePath(repositoryRoot);
  const sidecar = await inspectSidecar(sidecarPath, { minBytes });
  if (!sidecar.ok) throw new Error(sidecar.message);
  const stamp = await readStamp(repositoryRoot);
  const bundle = await digestFile(daemonBundlePath);
  if (stamp.sha256 !== sidecar.sha256) {
    throw new Error(
      `sidecar stamp does not match ${sidecarPath}; refusing to reuse a stale resource`,
    );
  }
  if (stamp.daemonBundleSha256 !== bundle.sha256) {
    throw new Error(
      "sidecar stamp does not match the current daemon bundle; regenerate the SEA sidecar",
    );
  }
  if (stamp.platform !== process.platform) {
    throw new Error(`sidecar stamp platform ${stamp.platform} does not match ${process.platform}`);
  }
  return { sidecar, stamp };
}

export async function ensureUnixExecutable(path) {
  if (process.platform !== "win32") await chmod(path, 0o755);
}

export function packagedSidecarCandidates(resourceDirectory, platform = process.platform) {
  const name = sidecarResourceName(platform);
  return [join(resourceDirectory, name), join(resourceDirectory, "resources", name)];
}

export function packagedCatalogCandidates(resourceDirectory) {
  return [
    join(resourceDirectory, "catalog"),
    join(resourceDirectory, "_up_", "_up_", "catalog"),
    join(resourceDirectory, "_up_", "_up_", "_up_", "catalog"),
  ];
}

export function macosPackagedResourceDirectory(appPath) {
  return join(appPath, "Contents/Resources");
}

export async function inspectPackagedMacosApp(appPath, options = {}) {
  const { expectedSha256, minBytes } = options;
  const resourceDirectory = macosPackagedResourceDirectory(appPath);
  const sidecar = await firstExistingFile(packagedSidecarCandidates(resourceDirectory, "darwin"));
  if (!sidecar) {
    return fail("packaged_sidecar_missing", `packaged daemon executable not found in ${appPath}`);
  }
  const inspected = await inspectSidecar(sidecar, { minBytes });
  if (!inspected.ok) return inspected;
  if (expectedSha256 && inspected.sha256 !== expectedSha256) {
    return fail(
      "packaged_sidecar_mismatch",
      `packaged sidecar hash ${inspected.sha256} does not match generated SEA ${expectedSha256}`,
    );
  }
  const catalog = await firstExistingDirectory(packagedCatalogCandidates(resourceDirectory));
  if (!catalog) {
    return fail("packaged_catalog_missing", `packaged catalog is not available in ${appPath}`);
  }
  return {
    ok: true,
    appPath,
    resourceDirectory,
    sidecar: inspected,
    catalog,
  };
}

async function readStamp(repositoryRoot) {
  const path = sidecarStampPath(repositoryRoot);
  const raw = await readFile(path, "utf8").catch(() => undefined);
  if (!raw) {
    throw new Error(
      `sidecar stamp not found: ${path}; run pnpm desktop:package so the current SEA sidecar is generated`,
    );
  }
  const stamp = JSON.parse(raw);
  if (stamp.formatVersion !== STAMP_FORMAT_VERSION || typeof stamp.sha256 !== "string") {
    throw new Error(`sidecar stamp is invalid: ${path}`);
  }
  return stamp;
}

async function firstExistingFile(candidates) {
  for (const candidate of candidates) {
    const details = await lstat(candidate).catch(() => undefined);
    if (details?.isFile()) return candidate;
  }
  return undefined;
}

async function firstExistingDirectory(candidates) {
  for (const candidate of candidates) {
    const details = await stat(candidate).catch(() => undefined);
    if (details?.isDirectory()) return candidate;
  }
  return undefined;
}

async function readMagic(path) {
  const handle = await open(path, "r");
  try {
    const header = Buffer.alloc(4);
    await handle.read(header, 0, 4, 0);
    return header;
  } finally {
    await handle.close();
  }
}

function fail(code, message) {
  return { ok: false, code, message };
}
