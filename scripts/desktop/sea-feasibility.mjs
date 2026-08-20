import { mkdir, mkdtemp } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { buildSeaExecutable } from "./build-sea-executable.mjs";
import { probeSidecar } from "./sea-runtime.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const daemonBundle = join(repositoryRoot, "packages/daemon/dist/intentloomd.cjs");
const outputRoot =
  process.env.INTENTLOOM_SEA_OUTPUT_DIR ??
  (await mkdtemp(join(tmpdir(), "intentloom-sea-")));

await mkdir(outputRoot, { recursive: true });
const built = await buildSeaExecutable({
  repositoryRoot,
  daemonBundle,
  outputRoot,
});
const probe = await probeSidecar(built.executable, {
  catalogRoot: join(repositoryRoot, "catalog"),
  cwd: repositoryRoot,
  outputRoot,
});

console.log(
  JSON.stringify(
    {
      platform: process.platform,
      nodeVersion: process.version,
      outputRoot,
      postject: built.postject,
      daemonBundle: built.daemonBundle,
      seaBlob: built.seaBlob,
      executable: built.executableDetails,
      doctor: probe.doctor,
      shutdown: probe.shutdown,
      endpointRemoved: probe.endpointRemoved,
    },
    null,
    2,
  ),
);
