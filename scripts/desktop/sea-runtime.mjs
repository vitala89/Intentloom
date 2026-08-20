import { createConnection } from "node:net";
import { spawn, spawnSync } from "node:child_process";
import { join } from "node:path";
import { stat, unlink, writeFile, mkdir } from "node:fs/promises";
import { createDoctorRequest } from "../../packages/protocol/dist/index.js";

export function commandPath(command) {
  const lookup = process.platform === "win32" ? "where.exe" : "which";
  const result = spawnSync(lookup, [command], { encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim().split(/\r?\n/)[0] : null;
}

export function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    ...options,
  });
  if (result.error) {
    throw new Error(`${command} failed to start: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed (${result.status}): ${result.stderr || result.stdout}`,
    );
  }
  return result.stdout;
}

export async function probeSidecar(executable, options) {
  const {
    catalogRoot,
    cwd,
    outputRoot,
    token = "sea-feasibility-token-0123456789abcdef",
  } = options;
  const probeRoot = join(outputRoot, "probe-root");
  await mkdir(probeRoot, { recursive: true });
  await writeFile(join(probeRoot, "README.md"), "# intentloom sidecar probe\n");
  const tokenFile = join(outputRoot, "probe-session-token");
  await writeFile(tokenFile, `${token}\n`, { mode: 0o600 });
  const endpoint =
    process.platform === "win32"
      ? `\\\\.\\pipe\\intentloomd-sea-${process.pid}-${Date.now()}`
      : join(outputRoot, "intentloomd.sock");
  const child = spawn(
    executable,
    ["--endpoint", endpoint, "--token-file", tokenFile, "--catalog-root", catalogRoot],
    { cwd, stdio: ["ignore", "ignore", "pipe"], windowsHide: true },
  );
  child.stderrText = "";
  child.stderr.on("data", (chunk) => {
    child.stderrText += chunk.toString("utf8");
  });
  let response;
  let shutdown;
  try {
    response = await waitForDoctor(endpoint, token, probeRoot, child);
  } finally {
    if (child.exitCode === null) child.kill("SIGTERM");
    shutdown = await waitForExit(child);
    await unlink(tokenFile).catch(() => undefined);
  }
  const endpointRemoved =
    process.platform === "win32"
      ? true
      : await stat(endpoint)
          .then(() => false)
          .catch(() => true);
  return {
    doctor: {
      protocolVersion: response.result?.protocolVersion ?? null,
      exitCode: response.result?.exitCode ?? null,
      findingCount: response.result?.findings?.length ?? null,
    },
    shutdown,
    endpointRemoved,
  };
}

async function requestDoctor(endpoint, token, root) {
  return new Promise((resolveRequest, rejectRequest) => {
    const socket = createConnection(endpoint);
    let output = "";
    const fail = (error) => {
      socket.destroy();
      rejectRequest(error);
    };
    socket.setTimeout(5_000, () => fail(new Error("daemon request timed out")));
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
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error(
        `daemon exited during startup with code ${child.exitCode ?? child.signalCode}: ${child.stderrText}`,
      );
    }
    try {
      return await requestDoctor(endpoint, token, root);
    } catch {
      await new Promise((resolveWait) => setTimeout(resolveWait, 100));
    }
  }
  throw new Error(
    `daemon did not become ready within 15 seconds${child.stderrText ? `: ${child.stderrText}` : ""}`,
  );
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
      if (!forced) resolveExit({ graceful: true, forced: false, exitEvent: true });
    });
  });
}
