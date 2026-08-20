import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  ensureUnixExecutable,
  inspectSidecar,
  sidecarResourceDirectory,
  sidecarResourcePath,
  writeSidecarStamp,
} from "./sidecar-contract.mjs";

export async function prepareTauriSidecar({ repositoryRoot, sourcePath }) {
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
  return { source: sourcePath, target: targetPath, stamp };
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (invokedDirectly) {
  const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const source = process.env.INTENTLOOM_DESKTOP_SIDECAR;
  if (!source) {
    throw new Error(
      "INTENTLOOM_DESKTOP_SIDECAR must point to a self-contained intentloomd executable",
    );
  }
  const result = await prepareTauriSidecar({
    repositoryRoot,
    sourcePath: resolve(source),
  });
  console.log(
    JSON.stringify(
      {
        source: result.source,
        target: result.target,
        bytes: result.stamp.bytes,
        sha256: result.stamp.sha256,
        kind: result.stamp.kind,
      },
      null,
      2,
    ),
  );
}
