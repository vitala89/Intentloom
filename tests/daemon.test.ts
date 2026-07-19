import { createConnection } from "node:net";
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
});
