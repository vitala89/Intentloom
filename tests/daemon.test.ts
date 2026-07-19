import { createConnection, createServer } from "node:net";
import { mkdtemp, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createDoctorRequest } from "../packages/protocol/src/index.js";
import {
  startLocalDaemon,
  type LocalDaemon,
} from "../packages/daemon/src/index.js";

const daemons: LocalDaemon[] = [];
afterEach(async () => {
  await Promise.all(daemons.splice(0).map((daemon) => daemon.close()));
});

async function request(endpoint: string, token: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const socket = createConnection(endpoint);
    let output = "";
    socket.on("connect", () =>
      socket.write(
        `${JSON.stringify({ token, request: createDoctorRequest(1, { root: "/project", profile: "generic", adapters: ["codex"] }) })}\n`,
      ),
    );
    socket.on("data", (chunk: Buffer) => {
      output += chunk.toString("utf8");
    });
    socket.on("end", () => resolve(JSON.parse(output)));
    socket.on("error", reject);
  });
}

async function rawRequest(endpoint: string, payload: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const socket = createConnection(endpoint);
    let output = "";
    socket.on("connect", () => socket.write(`${payload}\n`));
    socket.on("data", (chunk: Buffer) => {
      output += chunk.toString("utf8");
    });
    socket.on("end", () => resolve(JSON.parse(output)));
    socket.on("error", reject);
  });
}

function sendRequest(
  endpoint: string,
  token: string,
): {
  readonly output: Promise<unknown>;
} {
  let resolveOutput: (value: unknown) => void;
  let rejectOutput: (error: Error) => void;
  const output = new Promise<unknown>((resolve, reject) => {
    resolveOutput = resolve;
    rejectOutput = reject;
  });
  const socket = createConnection(endpoint);
  let response = "";
  socket.on("connect", () =>
    socket.write(
      `${JSON.stringify({
        token,
        request: createDoctorRequest(1, {
          root: "/project",
          profile: "generic",
          adapters: [],
        }),
      })}\n`,
    ),
  );
  socket.on("data", (chunk: Buffer) => {
    response += chunk.toString("utf8");
  });
  socket.on("end", () => {
    try {
      resolveOutput!(JSON.parse(response));
    } catch (error) {
      rejectOutput!(
        error instanceof Error ? error : new Error("invalid response"),
      );
    }
  });
  socket.on("error", (error) => rejectOutput!(error));
  return { output };
}

describe.skipIf(process.platform === "win32")("local daemon", () => {
  it("requires a session token and returns a doctor response", async () => {
    const directory = await mkdtemp(join(tmpdir(), "intentloomd-"));
    const endpoint = join(directory, "daemon.sock");
    const daemon = await startLocalDaemon({
      endpoint,
      sessionToken: "a".repeat(32),
      doctor: async () => ({ findings: [], diagnostics: [], exitCode: 0 }),
    });
    daemons.push(daemon);

    await expect(request(endpoint, "wrong-token")).resolves.toMatchObject({
      error: { code: -32600, message: "authentication failed" },
    });
    await expect(request(endpoint, "a".repeat(32))).resolves.toMatchObject({
      result: { exitCode: 0, findings: [] },
    });
  });

  it("rejects missing, relative, and non-IPC endpoints", async () => {
    const doctor = async () => ({ findings: [], diagnostics: [], exitCode: 0 });
    await expect(
      startLocalDaemon({ endpoint: "", sessionToken: "a".repeat(32), doctor }),
    ).rejects.toThrow("endpoint must be an absolute local IPC path");
    await expect(
      startLocalDaemon({
        endpoint: "daemon.sock",
        sessionToken: "a".repeat(32),
        doctor,
      }),
    ).rejects.toThrow("endpoint must be an absolute local IPC path");
  });

  it("removes only its owned Unix socket during shutdown", async () => {
    const directory = await mkdtemp(join(tmpdir(), "intentloomd-"));
    const endpoint = join(directory, "daemon.sock");
    const daemon = await startLocalDaemon({
      endpoint,
      sessionToken: "b".repeat(32),
      doctor: async () => ({ findings: [], diagnostics: [], exitCode: 0 }),
    });
    await stat(endpoint);
    await daemon.close();
    await expect(stat(endpoint)).rejects.toThrow();
  });

  it("rejects malformed protocol input without invoking the handler", async () => {
    const directory = await mkdtemp(join(tmpdir(), "intentloomd-"));
    const daemon = await startLocalDaemon({
      endpoint: join(directory, "daemon.sock"),
      sessionToken: "c".repeat(32),
      doctor: async () => {
        throw new Error("must not run");
      },
    });
    daemons.push(daemon);
    await expect(
      rawRequest(
        daemon.endpoint,
        JSON.stringify({
          token: "c".repeat(32),
          request: { jsonrpc: "2.0", id: 1, method: "unknown", params: {} },
        }),
      ),
    ).resolves.toMatchObject({
      error: { code: -32601 },
    });
  });

  it("processes only the first request on a connection", async () => {
    const directory = await mkdtemp(join(tmpdir(), "intentloomd-"));
    let calls = 0;
    const daemon = await startLocalDaemon({
      endpoint: join(directory, "daemon.sock"),
      sessionToken: "f".repeat(32),
      doctor: async () => {
        calls += 1;
        return { findings: [], diagnostics: [], exitCode: 0 };
      },
    });
    daemons.push(daemon);
    const payload = JSON.stringify({
      token: "f".repeat(32),
      request: createDoctorRequest(1, {
        root: "/project",
        profile: "generic",
        adapters: [],
      }),
    });
    await expect(
      rawRequest(daemon.endpoint, `${payload}\n${payload}`),
    ).resolves.toMatchObject({ id: 1, result: { exitCode: 0 } });
    expect(calls).toBe(1);
  });

  it("rejects oversized messages before invoking the handler", async () => {
    const directory = await mkdtemp(join(tmpdir(), "intentloomd-"));
    const daemon = await startLocalDaemon({
      endpoint: join(directory, "daemon.sock"),
      sessionToken: "d".repeat(32),
      doctor: async () => {
        throw new Error("must not run");
      },
    });
    daemons.push(daemon);
    await expect(
      rawRequest(daemon.endpoint, "x".repeat(1024 * 1024 + 1)),
    ).resolves.toMatchObject({
      error: { code: -32600, message: "message too large" },
    });
  });

  it("fails safely when its endpoint is already in use", async () => {
    const directory = await mkdtemp(join(tmpdir(), "intentloomd-"));
    const endpoint = join(directory, "daemon.sock");
    const occupied = createServer();
    await new Promise<void>((resolve) => occupied.listen(endpoint, resolve));
    try {
      await expect(
        startLocalDaemon({
          endpoint,
          sessionToken: "e".repeat(32),
          doctor: async () => ({ findings: [], diagnostics: [], exitCode: 0 }),
        }),
      ).rejects.toThrow();
      await stat(endpoint);
    } finally {
      await new Promise<void>((resolve, reject) =>
        occupied.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });

  it("closes idle connections at the configured request deadline", async () => {
    const directory = await mkdtemp(join(tmpdir(), "intentloomd-"));
    const daemon = await startLocalDaemon({
      endpoint: join(directory, "daemon.sock"),
      sessionToken: "g".repeat(32),
      requestTimeoutMs: 20,
      doctor: async () => ({ findings: [], diagnostics: [], exitCode: 0 }),
    });
    daemons.push(daemon);
    const socket = createConnection(daemon.endpoint);
    await new Promise<void>((resolve, reject) => {
      socket.on("close", () => resolve());
      socket.on("error", reject);
    });
  });

  it("drains an active request before shutdown", async () => {
    const directory = await mkdtemp(join(tmpdir(), "intentloomd-"));
    let release: (() => void) | undefined;
    let markStarted: (() => void) | undefined;
    const started = new Promise<void>((resolve) => {
      markStarted = resolve;
    });
    const daemon = await startLocalDaemon({
      endpoint: join(directory, "daemon.sock"),
      sessionToken: "h".repeat(32),
      shutdownTimeoutMs: 100,
      doctor: async () => {
        markStarted!();
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return { findings: [], diagnostics: [], exitCode: 0 };
      },
    });
    const request = sendRequest(daemon.endpoint, "h".repeat(32));
    await started;
    const closing = daemon.close();
    let closed = false;
    void closing.then(() => {
      closed = true;
    });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(closed).toBe(false);
    release!();
    await expect(request.output).resolves.toMatchObject({
      result: { exitCode: 0 },
    });
    await expect(closing).resolves.toBeUndefined();
  });

  it("forces shutdown after the configured drain deadline", async () => {
    const directory = await mkdtemp(join(tmpdir(), "intentloomd-"));
    let markStarted: (() => void) | undefined;
    const started = new Promise<void>((resolve) => {
      markStarted = resolve;
    });
    const daemon = await startLocalDaemon({
      endpoint: join(directory, "daemon.sock"),
      sessionToken: "i".repeat(32),
      shutdownTimeoutMs: 20,
      doctor: async () => {
        markStarted!();
        await new Promise<void>(() => undefined);
        return { findings: [], diagnostics: [], exitCode: 0 };
      },
    });
    const request = sendRequest(daemon.endpoint, "i".repeat(32));
    await started;
    await expect(daemon.close()).resolves.toBeUndefined();
    await expect(request.output).rejects.toThrow();
  });
});
