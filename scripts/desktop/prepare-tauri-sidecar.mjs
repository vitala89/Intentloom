import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ensureUnixExecutable,
  inspectSidecar,
  sidecarResourceDirectory,
  sidecarResourcePath,
  writeSidecarStamp,
} from "./sidecar-contract.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const source = process.env.INTENTLOOM_DESKTOP_SIDECAR;
if (!source) {
  throw new Error(
    "INTENTLOOM_DESKTOP_SIDECAR must point to a self-contained intentloomd executable",
  );
}

const sourcePath = resolve(source);
const inspected = await inspectSidecar(sourcePath);
if (!inspected.ok) throw new Error(inspected.message);

const resourceDirectory = sidecarResourceDirectory(repositoryRoot);
const targetPath = sidecarResourcePath(repositoryRoot);
await mkdir(resourceDirectory, { recursive: true });
await copyFile(sourcePath, targetPath);
await ensureUnixExecutable(targetPath);
const stamp = await writeSidecarStamp({
  repositoryRoot,
  sidecarPath: targetPath,
  daemonBundlePath: join(repositoryRoot, "packages/daemon/dist/intentloomd.cjs"),
  createdBy: "prepare-tauri-sidecar",
});

console.log(
  JSON.stringify(
    {
      source: sourcePath,
      target: targetPath,
      bytes: stamp.bytes,
      sha256: stamp.sha256,
      kind: stamp.kind,
    },
    null,
    2,
  ),
);
