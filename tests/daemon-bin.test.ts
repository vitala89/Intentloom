import { spawn, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { statSync } from "node:fs";
import { chmod, mkdir, mkdtemp, stat, writeFile } from "node:fs/promises";
import { createConnection } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { startLocalDaemon } from "../packages/daemon/src/index.js";
import { desktopOwnedDaemonLaunchArgs } from "../scripts/desktop/daemon-launch-args.mjs";

const children: ReturnType<typeof spawn>[] = [];
afterEach(() => children.splice(0).forEach((child) => child.kill("SIGTERM")));

const listenGatePreload = `
const { readSync, writeSync } = require("node:fs");
const net = require("node:net");
const originalListen = net.Server.prototype.listen;
let held = false;
net.Server.prototype.listen = function holdFirstListen(...args) {
  const server = originalListen.apply(this, args);
  if (process.env.INTENTLOOM_DAEMON_LISTEN_GATE !== "1" || held) return server;
  held = true;
  writeSync(3, "ready\\n");
  readSync(4, Buffer.alloc(1));
  return server;
};
`;

function daemonEndpoint(directory: string): string {
  return process.platform === "win32"
    ? `\\\\.\\pipe\\intentloom-before-listen-${randomBytes(8).toString("hex")}`
    : join(directory, "daemon.sock");
}

async function waitForExit(child: ChildProcess): Promise<void> {
  const exit =
    child.exitCode !== null || child.signalCode !== null
      ? { code: child.exitCode, signal: child.signalCode }
      : await new Promise<{
          code: number | null;
          signal: NodeJS.Signals | null;
        }>((resolveExit) =>
          child.once("exit", (code, signal) => resolveExit({ code, signal })),
        );
  expect(exit).toEqual({ code: 0, signal: null });
}

async function waitForSocket(endpoint: string): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      await stat(endpoint);
      return;
    } catch {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 25));
    }
  }
  throw new Error("daemon socket did not appear");
}

async function request(
  endpoint: string,
  token: string,
  root: string,
): Promise<unknown> {
  return new Promise((resolveRequest, reject) => {
    const socket = createConnection(endpoint);
    let output = "";
    socket.on("connect", () =>
      socket.write(
        `${JSON.stringify({
          token,
          request: {
            jsonrpc: "2.0",
            id: 1,
            method: "intentloom.project.doctor.v1",
            params: {
              protocolVersion: 1,
              root,
              profile: "generic",
              adapters: [],
            },
          },
        })}\n`,
      ),
    );
    socket.on("data", (chunk: Buffer) => {
      output += chunk.toString("utf8");
    });
    socket.on("end", () => resolveRequest(JSON.parse(output)));
    socket.on("error", reject);
  });
}

describe.skipIf(process.platform === "win32")("intentloomd binary", () => {
  it("starts with a token file and stops on SIGTERM", async () => {
    const directory = await mkdtemp(join(tmpdir(), "intentloomd-bin-"));
    const tokenFile = join(directory, "token");
    await writeFile(tokenFile, "d".repeat(32));
    await chmod(tokenFile, 0o600);
    const child = spawn(
      process.execPath,
      [
        resolve("packages/daemon/dist/intentloomd.cjs"),
        "--endpoint",
        join(directory, "daemon.sock"),
        "--token-file",
        tokenFile,
        "--catalog-root",
        resolve("catalog"),
      ],
      { stdio: ["ignore", "ignore", "pipe"] },
    );
    children.push(child);
    let stderr = "";
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    const endpoint = join(directory, "daemon.sock");
    await waitForSocket(endpoint);
    expect({ exitCode: child.exitCode, stderr }).toEqual({
      exitCode: null,
      stderr: "",
    });
    await expect(
      request(endpoint, "d".repeat(32), directory),
    ).resolves.toMatchObject({
      id: 1,
      result: { protocolVersion: 1 },
    });
    child.kill("SIGTERM");
    await waitForExit(child);
    await expect(stat(endpoint)).rejects.toThrow("ENOENT");
  });

  it("relaunches with the same Desktop durable-state directory after endpoint cleanup", async () => {
    const directory = await mkdtemp(join(tmpdir(), "intentloomd-durable-"));
    const tokenFile = join(directory, "token");
    await writeFile(tokenFile, "d".repeat(32));
    await chmod(tokenFile, 0o600);
    const endpoint = join(directory, "daemon.sock");
    const neutronMutationStateDir = join(directory, "neutron-mutation-state");
    const launchArgs = desktopOwnedDaemonLaunchArgs({
      endpoint,
      tokenFile,
      catalogRoot: resolve("catalog"),
      neutronMutationStateDir,
    });
    await mkdir(neutronMutationStateDir, { recursive: true, mode: 0o700 });
    await writeFile(join(neutronMutationStateDir, "marker"), "keep\n");
    const first = spawn(
      process.execPath,
      [resolve("packages/daemon/dist/intentloomd.cjs"), ...launchArgs],
      { stdio: ["ignore", "ignore", "pipe"] },
    );
    children.push(first);
    await waitForSocket(endpoint);
    first.kill("SIGTERM");
    await waitForExit(first);
    await expect(stat(endpoint)).rejects.toThrow("ENOENT");
    await expect(
      stat(join(neutronMutationStateDir, "marker")),
    ).resolves.toMatchObject({ size: 5 });
    const second = spawn(
      process.execPath,
      [resolve("packages/daemon/dist/intentloomd.cjs"), ...launchArgs],
      { stdio: ["ignore", "ignore", "pipe"] },
    );
    children.push(second);
    await waitForSocket(endpoint);
    expect(second.exitCode).toBeNull();
    await expect(
      stat(join(neutronMutationStateDir, "marker")),
    ).resolves.toMatchObject({ size: 5 });
  });

  it("fails closed when the Desktop durable-state path is a regular file", async () => {
    const directory = await mkdtemp(join(tmpdir(), "intentloomd-bad-state-"));
    const tokenFile = join(directory, "token");
    await writeFile(tokenFile, "d".repeat(32));
    await chmod(tokenFile, 0o600);
    const asFile = join(directory, "not-a-directory");
    await writeFile(asFile, "nope\n");
    const child = spawn(
      process.execPath,
      [
        resolve("packages/daemon/dist/intentloomd.cjs"),
        ...desktopOwnedDaemonLaunchArgs({
          endpoint: join(directory, "daemon.sock"),
          tokenFile,
          catalogRoot: resolve("catalog"),
          neutronMutationStateDir: asFile,
        }),
      ],
      { stdio: ["ignore", "ignore", "pipe"] },
    );
    children.push(child);
    let stderr = "";
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    const code = await new Promise<number | null>((resolveExit) =>
      child.once("exit", (exitCode) => resolveExit(exitCode)),
    );
    expect(code).toBe(2);
    expect(stderr).toContain("neutron mutation state path is not a directory");
    expect(stderr).not.toContain("d".repeat(32));
  });

  it("removes the endpoint when SIGTERM arrives in the post-bind startup window", async () => {
    const directory = await mkdtemp(join(tmpdir(), "intentloomd-signal-"));
    const preload = join(directory, "listen-gate.cjs");
    await writeFile(preload, listenGatePreload);
    const tokenFile = join(directory, "token");
    await writeFile(tokenFile, "d".repeat(32));
    await chmod(tokenFile, 0o600);
    const endpoint = join(directory, "daemon.sock");
    const neutronMutationStateDir = join(directory, "neutron-mutation-state");
    await mkdir(neutronMutationStateDir, { recursive: true, mode: 0o700 });
    const launchArgs = desktopOwnedDaemonLaunchArgs({
      endpoint,
      tokenFile,
      catalogRoot: resolve("catalog"),
      neutronMutationStateDir,
    });
    const first = spawn(
      process.execPath,
      [
        "--require",
        preload,
        resolve("packages/daemon/dist/intentloomd.cjs"),
        ...launchArgs,
      ],
      {
        stdio: ["ignore", "ignore", "pipe", "pipe", "pipe"],
        env: { ...process.env, INTENTLOOM_DAEMON_LISTEN_GATE: "1" },
      },
    );
    children.push(first);
    let stderr = "";
    first.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    const ready = first.stdio[3];
    const release = first.stdio[4];
    if (
      ready == null ||
      release == null ||
      typeof ready === "number" ||
      typeof release === "number"
    ) {
      throw new Error("listen gate pipes were not created");
    }
    try {
      await readGateReady(ready, first, () => stderr);
      expect(statSync(endpoint).isSocket()).toBe(true);
      first.kill("SIGTERM");
      release.write("g");
      await waitForExit(first);
      await expect(stat(endpoint)).rejects.toThrow("ENOENT");
    } finally {
      try {
        release.write("g");
      } catch {
        // The child may already have read the release byte or exited.
      }
      if (first.exitCode === null && first.signalCode === null) {
        first.kill("SIGKILL");
      }
    }
    const second = spawn(
      process.execPath,
      [resolve("packages/daemon/dist/intentloomd.cjs"), ...launchArgs],
      { stdio: ["ignore", "ignore", "pipe"] },
    );
    children.push(second);
    await waitForSocket(endpoint);
    expect(second.exitCode).toBeNull();
    expect(statSync(endpoint).isSocket()).toBe(true);
  });
});

describe("local daemon listen shutdown", () => {
  it("runs beforeListen before the endpoint is bound", async () => {
    const directory = await mkdtemp(join(tmpdir(), "intentloomd-before-"));
    const endpoint = daemonEndpoint(directory);
    let missingDuringHook = process.platform === "win32";
    const daemon = await startLocalDaemon({
      endpoint,
      sessionToken: "d".repeat(32),
      beforeListen(instance) {
        expect(instance.endpoint).toBe(endpoint);
        if (process.platform === "win32") return;
        missingDuringHook = endpointMissing(endpoint);
      },
    });
    expect(missingDuringHook).toBe(true);
    const bound = process.platform === "win32" || statSync(endpoint).isSocket();
    expect(bound).toBe(true);
    await daemon.close();
    const removed = process.platform === "win32" || endpointMissing(endpoint);
    expect(removed).toBe(true);
  });

  it("does not bind when close starts inside beforeListen", async () => {
    const directory = await mkdtemp(join(tmpdir(), "intentloomd-preclose-"));
    const endpoint = daemonEndpoint(directory);
    const daemon = await startLocalDaemon({
      endpoint,
      sessionToken: "d".repeat(32),
      beforeListen(instance) {
        void instance.close();
      },
    });
    const absent = process.platform === "win32" || endpointMissing(endpoint);
    expect(absent).toBe(true);
    await expect(daemon.close()).resolves.toBeUndefined();
  });
});

function endpointMissing(endpoint: string): boolean {
  try {
    statSync(endpoint);
    return false;
  } catch (error) {
    return error instanceof Error && "code" in error && error.code === "ENOENT";
  }
}

function readGateReady(
  ready: NodeJS.ReadableStream,
  child: ChildProcess,
  stderr: () => string,
): Promise<void> {
  return new Promise((resolveReady, reject) => {
    let text = "";
    const onData = (chunk: Buffer) => {
      text += chunk.toString("utf8");
      if (!text.includes("ready")) return;
      ready.off("data", onData);
      child.off("exit", onExit);
      resolveReady();
    };
    const onExit = (code: number | null, signal: NodeJS.Signals | null) => {
      ready.off("data", onData);
      reject(
        new Error(
          `daemon exited before the listen gate (${String(code ?? signal)}): ${stderr()}`,
        ),
      );
    };
    ready.on("data", onData);
    child.once("exit", onExit);
  });
}
