import { chmod, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { commandPath, run } from "./sea-runtime.mjs";
import { digestFile } from "./sidecar-contract.mjs";

export const POSTJECT_VERSION = "1.0.0-alpha.6";
export const POSTJECT_INTEGRITY =
  "sha512-b9Eb8h2eVqNE8edvKdwqkrY6O7kAwmI8kcnBv1NScolYJbo59XUF0noFq+lxbC1yN20bmC0WBEbDC5H/7ASb0A==";

export async function buildSeaExecutable({
  repositoryRoot,
  daemonBundle,
  outputRoot,
}) {
  await mkdir(outputRoot, { recursive: true });
  const blobFile = join(outputRoot, "sea-prep.blob");
  const executable = join(
    outputRoot,
    process.platform === "win32" ? "intentloomd-sea.exe" : "intentloomd-sea",
  );
  const configFile = join(outputRoot, "sea-config.json");
  await writeFile(
    configFile,
    `${JSON.stringify(
      {
        main: daemonBundle,
        output: blobFile,
        disableExperimentalSEAWarning: true,
        useCodeCache: false,
        useSnapshot: false,
      },
      null,
      2,
    )}\n`,
  );
  run(process.execPath, ["--experimental-sea-config", configFile], {
    cwd: repositoryRoot,
  });
  await copyFile(process.execPath, executable);
  if (process.platform === "darwin") {
    run("codesign", ["--remove-signature", executable], { cwd: repositoryRoot });
  }
  const postject = await injectSeaBlob(executable, blobFile);
  if (process.platform !== "win32") await chmod(executable, 0o755);
  if (process.platform === "darwin") {
    run("codesign", ["--sign", "-", executable], { cwd: repositoryRoot });
  }
  return {
    executable,
    postject,
    daemonBundle: await digestFile(daemonBundle),
    seaBlob: await digestFile(blobFile),
    executableDetails: await digestFile(executable),
  };
}

async function injectSeaBlob(executable, blobFile) {
  const postjectApi = process.env.POSTJECT_API;
  if (postjectApi) {
    const require = createRequire(import.meta.url);
    const { inject } = require(postjectApi);
    await inject(executable, "NODE_SEA_BLOB", await readFile(blobFile), {
      sentinelFuse: "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2",
      ...(process.platform === "darwin" ? { machoSegmentName: "NODE_SEA" } : {}),
    });
    return postjectApi;
  }
  const postjectBin = process.env.POSTJECT_BIN ?? commandPath("postject");
  if (postjectBin) {
    const args = [
      executable,
      "NODE_SEA_BLOB",
      blobFile,
      "--sentinel-fuse",
      "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2",
    ];
    if (process.platform === "darwin") args.push("--macho-segment-name", "NODE_SEA");
    run(postjectBin, args);
    return postjectBin;
  }
  return injectWithFetchedPostject(executable, blobFile);
}

async function injectWithFetchedPostject(executable, blobFile) {
  const api = await fetchPostjectApi();
  process.env.POSTJECT_API = api;
  return injectSeaBlob(executable, blobFile);
}

async function fetchPostjectApi() {
  const packRoot = join(tmpdir(), "intentloom-postject");
  await mkdir(packRoot, { recursive: true });
  run("npm", ["pack", `postject@${POSTJECT_VERSION}`, "--pack-destination", packRoot]);
  const tarball = join(packRoot, `postject-${POSTJECT_VERSION}.tgz`);
  const integrity = `sha512-${createHash("sha512").update(await readFile(tarball)).digest("base64")}`;
  if (integrity !== POSTJECT_INTEGRITY) {
    throw new Error(
      `postject tarball integrity mismatch\n  expected: ${POSTJECT_INTEGRITY}\n  actual:   ${integrity}`,
    );
  }
  run("tar", ["-xzf", tarball, "-C", packRoot]);
  return join(packRoot, "package/dist/api.js");
}
