import { chmod, copyFile, mkdir, readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const source = process.env.INTENTLOOM_DESKTOP_SIDECAR;
if (!source)
  throw new Error(
    "INTENTLOOM_DESKTOP_SIDECAR must point to a self-contained intentloomd executable",
  );

const sourcePath = resolve(source);
const sourceStats = await stat(sourcePath).catch(() => undefined);
if (!sourceStats?.isFile())
  throw new Error(`self-contained daemon sidecar not found: ${sourcePath}`);

const resourceDirectory = join(
  repositoryRoot,
  "apps/desktop/src-tauri/resources",
);
const resourceName =
  process.platform === "win32" ? "intentloomd.exe" : "intentloomd";
const targetPath = join(resourceDirectory, resourceName);
await mkdir(resourceDirectory, { recursive: true });
await copyFile(sourcePath, targetPath);

if (process.platform !== "win32") {
  await chmod(targetPath, 0o755);
}

const hash = createHash("sha256");
hash.update(await readFile(targetPath));
console.log(
  JSON.stringify(
    {
      source: sourcePath,
      target: targetPath,
      bytes: sourceStats.size,
      sha256: hash.digest("hex"),
    },
    null,
    2,
  ),
);
