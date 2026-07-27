import {
  chmod,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { createConnection } from "node:net";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { spawn, spawnSync } from "node:child_process";
import { createDoctorRequest } from "../../packages/protocol/dist/index.js";

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const daemonBundle = join(
  repositoryRoot,
  "packages/daemon/dist/intentloomd.cjs",
);
const outputRoot =
  process.env.INTENTLOOM_SEA_OUTPUT_DIR ??
  (await mkdtemp(join(tmpdir(), "intentloom-sea-")));
const tokenFile = join(outputRoot, "session-token");
const configFile = join(outputRoot, "sea-config.json");
const blobFile = join(outputRoot, "sea-prep.blob");
const executable = join(
  outputRoot,
  process.platform === "win32" ? "intentloomd-sea.exe" : "intentloomd-sea",
);

async function digest(path) {
  const hash = createHash("sha256");
  hash.update(await readFile(path));
  const details = await stat(path);
  return { bytes: details.size, sha256: hash.digest("hex") };
}

function commandPath(command) {
  const lookup = process.platform === "win32" ? "where.exe" : "which";
  const result = spawnSync(lookup, [command], { encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim().split(/\r?\n/)[0] : null;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    ...options,
  });
  if (result.error)
    throw new Error(`${command} failed to start: ${result.error.message}`);
  if (result.status !== 0)
    throw new Error(
      `${command} ${args.join(" ")} failed (${result.status}): ${result.stderr || result.stdout}`,
    );
  return result.stdout;
}

async function requestDoctor(endpoint, token, root) {
  return new Promise((resolveRequest, rejectRequest) => {
    const socket = createConnection(endpoint);
    let output = "";
    const fail = (error) => {
      socket.destroy();
      rejectRequest(error);
    };
    socket.setTimeout(2_000, () => fail(new Error("daemon request timed out")));
    socket.once("connect", () =>
      socket.write(
        `${JSON.stringify({
          token,
          request: createDoctorRequest(1, {
            root,
            profile: "generic",
            adapters: ["claude", "codex", "cursor", "copilot"],
          }),
        })}\n`,
      ),
    );
    socket.on("data", (chunk) => {
      output += chunk.toString("utf8");
    });
    socket.once("error", fail);
    socket.once("end", () => {
      try {
        resolveRequest(JSON.parse(output.slice(0, output.indexOf("\n"))));
      } catch (error) {
        fail(error instanceof Error ? error : new Error("invalid response"));
      }
    });
  });
}

async function waitForDoctor(endpoint, token, root, child) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null)
      throw new Error(
        `daemon exited during startup with code ${child.exitCode ?? child.signalCode}: ${child.stderrText}`,
      );
    try {
      return await requestDoctor(endpoint, token, root);
    } catch {
      await new Promise((resolveWait) => setTimeout(resolveWait, 100));
    }
  }
  throw new Error("daemon did not become ready within 15 seconds");
}

async function waitForExit(child) {
  if (child.exitCode !== null) return { graceful: true, forced: false };
  return new Promise((resolveExit) => {
    let forced = false;
    const timer = setTimeout(() => {
      forced = true;
      child.kill("SIGKILL");
      resolveExit({ graceful: false, forced: true, exitEvent: false });
    }, 5_000);
    child.once("exit", () => {
      clearTimeout(timer);
      if (!forced)
        resolveExit({ graceful: true, forced: false, exitEvent: true });
    });
  });
}

const bundleDetails = await digest(daemonBundle);
await mkdir(outputRoot, { recursive: true });
const token = "sea-feasibility-token-0123456789abcdef";
await writeFile(tokenFile, `${token}\n`, { mode: 0o600 });
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

run(process.execPath, ["--experimental-sea-config", configFile]);
await copyFile(process.execPath, executable);

if (process.platform === "darwin")
  run("codesign", ["--remove-signature", executable]);

const postjectArgs = [
  executable,
  "NODE_SEA_BLOB",
  blobFile,
  "--sentinel-fuse",
  "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2",
];
if (process.platform === "darwin")
  postjectArgs.push("--macho-segment-name", "NODE_SEA");
const postjectApi = process.env.POSTJECT_API;
const postject = process.env.POSTJECT_BIN ?? commandPath("postject");
if (postjectApi) {
  const require = createRequire(import.meta.url);
  const { inject } = require(postjectApi);
  await inject(executable, "NODE_SEA_BLOB", await readFile(blobFile), {
    sentinelFuse: "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2",
    ...(process.platform === "darwin" ? { machoSegmentName: "NODE_SEA" } : {}),
  });
} else {
  if (!postject)
    throw new Error(
      "postject is required for injection; provide POSTJECT_API or POSTJECT_BIN in the temporary spike environment",
    );
  run(postject, postjectArgs);
}
if (process.platform !== "win32") await chmod(executable, 0o755);
if (process.platform === "darwin") run("codesign", ["--sign", "-", executable]);

const endpoint =
  process.platform === "win32"
    ? `\\\\.\\pipe\\intentloomd-sea-${process.pid}-${Date.now()}`
    : join(outputRoot, "intentloomd.sock");
const child = spawn(
  executable,
  [
    "--endpoint",
    endpoint,
    "--token-file",
    tokenFile,
    "--catalog-root",
    join(repositoryRoot, "catalog"),
  ],
  {
    cwd: repositoryRoot,
    stdio: ["ignore", "ignore", "pipe"],
    windowsHide: true,
  },
);
child.stderrText = "";
child.stderr.on("data", (chunk) => {
  child.stderrText += chunk.toString("utf8");
});
let response;
let shutdown;
try {
  response = await waitForDoctor(endpoint, token, repositoryRoot, child);
} finally {
  if (child.exitCode === null) child.kill("SIGTERM");
  shutdown = await waitForExit(child);
}

const executableDetails = await digest(executable);
const endpointRemoved =
  process.platform === "win32"
    ? true
    : await stat(endpoint)
        .then(() => false)
        .catch(() => true);

console.log(
  JSON.stringify(
    {
      platform: process.platform,
      nodeVersion: process.version,
      outputRoot,
      postject: postjectApi ?? postject,
      daemonBundle: bundleDetails,
      seaBlob: await digest(blobFile),
      executable: executableDetails,
      doctor: {
        protocolVersion: response.result?.protocolVersion ?? null,
        exitCode: response.result?.exitCode ?? null,
        findingCount: response.result?.findings?.length ?? null,
      },
      shutdown,
      endpointRemoved,
    },
    null,
    2,
  ),
);

await unlink(tokenFile).catch(() => undefined);
