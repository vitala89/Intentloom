import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { buildSeaExecutable } from "./build-sea-executable.mjs";
import { probeSidecar } from "./sea-runtime.mjs";
import {
  assertPackagingSidecar,
  inspectPackagedMacosApp,
  inspectSidecar,
  removeStaleSidecar,
} from "./sidecar-contract.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const daemonBundle = join(repositoryRoot, "packages/daemon/dist/intentloomd.cjs");
const args = new Set(process.argv.slice(2));
const skipBuild = args.has("--skip-build");
const tauriOnly = args.has("--tauri-only");

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: "inherit",
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${commandArgs.join(" ")} failed (${result.status})`);
  }
}

function tauriBundles() {
  if (process.env.INTENTLOOM_DESKTOP_BUNDLES) {
    return process.env.INTENTLOOM_DESKTOP_BUNDLES.split(",").filter(Boolean);
  }
  if (process.platform === "darwin") return ["app"];
  if (process.platform === "linux") return ["deb"];
  return [];
}

async function prepareCurrentSidecar() {
  if (!skipBuild) run("pnpm", ["build"]);
  await removeStaleSidecar(repositoryRoot);
  const outputRoot =
    process.env.INTENTLOOM_SEA_OUTPUT_DIR ??
    (await mkdtemp(join(tmpdir(), "intentloom-sea-")));
  await mkdir(outputRoot, { recursive: true });
  const built = await buildSeaExecutable({ repositoryRoot, daemonBundle, outputRoot });
  const inspected = await inspectSidecar(built.executable);
  if (!inspected.ok) throw new Error(inspected.message);
  const probe = await probeSidecar(built.executable, {
    catalogRoot: join(repositoryRoot, "catalog"),
    cwd: repositoryRoot,
    outputRoot,
  });
  if (probe.doctor.protocolVersion !== 1) {
    throw new Error("generated SEA sidecar did not answer protocol v1");
  }
  process.env.INTENTLOOM_DESKTOP_SIDECAR = built.executable;
  run("pnpm", ["desktop:prepare-sidecar"]);
  const ready = await assertPackagingSidecar({ repositoryRoot, daemonBundlePath: daemonBundle });
  return { outputRoot, built, probe, ready };
}

function tauriEnv() {
  const env = { ...process.env };
  if (process.env.INTENTLOOM_TAURI_TARGET_DIR) {
    env.CARGO_TARGET_DIR = process.env.INTENTLOOM_TAURI_TARGET_DIR;
  } else {
    delete env.CARGO_TARGET_DIR;
  }
  return env;
}

function tauriBundleRoot() {
  const targetDir =
    process.env.INTENTLOOM_TAURI_TARGET_DIR ||
    join(repositoryRoot, "apps/desktop/src-tauri/target");
  return join(targetDir, "release/bundle");
}

async function packageTauri(expectedSha256) {
  const bundles = tauriBundles();
  if (bundles.length === 0) {
    return { skipped: true, reason: `no Tauri bundle for ${process.platform}` };
  }
  run("pnpm", [
    "--filter",
    "@intentloom/desktop",
    "exec",
    "tauri",
    "build",
    "--config",
    "src-tauri/tauri.packaging.conf.json",
    "--bundles",
    bundles.join(","),
  ], { env: tauriEnv() });
  if (process.platform !== "darwin") {
    return { skipped: false, platform: process.platform, bundles };
  }
  const appPath = join(tauriBundleRoot(), "macos/Intentloom.app");
  const packaged = await inspectPackagedMacosApp(appPath, { expectedSha256 });
  if (!packaged.ok) throw new Error(packaged.message);
  const packagedProbe = await probeSidecar(packaged.sidecar.path, {
    catalogRoot: packaged.catalog,
    cwd: repositoryRoot,
    outputRoot: await mkdtemp(join(tmpdir(), "intentloom-packaged-")),
  });
  if (packagedProbe.doctor.protocolVersion !== 1) {
    throw new Error("packaged sidecar did not answer protocol v1");
  }
  return { skipped: false, appPath, layout: packaged, probe: packagedProbe, bundles };
}

const prepared = tauriOnly
  ? { ready: await assertPackagingSidecar({ repositoryRoot, daemonBundlePath: daemonBundle }) }
  : await prepareCurrentSidecar();
const packaged = await packageTauri(prepared.ready.sidecar.sha256);
const result = {
  platform: process.platform,
  nodeVersion: process.version,
  tauriOnly,
  sidecar: prepared.ready.sidecar,
  stamp: prepared.ready.stamp,
  doctor: prepared.probe?.doctor,
  shutdown: prepared.probe?.shutdown,
  endpointRemoved: prepared.probe?.endpointRemoved,
  executable: prepared.built?.executableDetails,
  sea: prepared.built
    ? {
        outputRoot: prepared.outputRoot,
        postject: prepared.built.postject,
        daemonBundle: prepared.built.daemonBundle,
        executable: prepared.built.executableDetails,
        doctor: prepared.probe.doctor,
        shutdown: prepared.probe.shutdown,
        endpointRemoved: prepared.probe.endpointRemoved,
      }
    : undefined,
  packaged,
};
const encoded = JSON.stringify(result, null, 2);
console.log(encoded);
if (process.env.INTENTLOOM_DESKTOP_PACKAGE_RESULT) {
  await writeFile(process.env.INTENTLOOM_DESKTOP_PACKAGE_RESULT, `${encoded}\n`);
}
