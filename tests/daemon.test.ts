import { createConnection, createServer } from "node:net";
import {
  mkdtemp,
  mkdir,
  lstat,
  readFile,
  readdir,
  readlink,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createDoctorRequest } from "../packages/protocol/src/index.js";
import {
  doctorProject,
  initProject,
  nodeFileSystem,
} from "../packages/application/src/index.js";
import {
  startLocalDaemon,
  type LocalDaemon,
} from "../packages/daemon/src/index.js";
import { runCli } from "../packages/cli/src/command.js";

const daemons: LocalDaemon[] = [];
afterEach(async () => {
  await Promise.all(daemons.splice(0).map((daemon) => daemon.close()));
});

async function request(
  endpoint: string,
  token: string,
  root = "/project",
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const socket = createConnection(endpoint);
    let output = "";
    socket.on("connect", () =>
      socket.write(
        `${JSON.stringify({ token, request: createDoctorRequest(1, { root, profile: "generic", adapters: ["codex"] }) })}\n`,
      ),
    );
    socket.on("data", (chunk: Buffer) => {
      output += chunk.toString("utf8");
    });
    socket.on("end", () => resolve(JSON.parse(output)));
    socket.on("error", reject);
  });
}

async function snapshot(root: string): Promise<readonly [string, string][]> {
  const entries = (await readdir(root, { recursive: true })).sort();
  return Promise.all(
    entries.map(async (entry) => {
      const path = join(root, entry);
      const metadata = await lstat(path);
      if (metadata.isSymbolicLink())
        return [entry, `symlink:${await readlink(path)}`] as const;
      if (metadata.isDirectory()) return [entry, "directory"] as const;
      return [entry, await readFile(path, "utf8")] as const;
    }),
  );
}

async function applicationDoctor(
  request: ReturnType<typeof createDoctorRequest>,
) {
  const report = await doctorProject(
    {
      root: request.params.root,
      profile: request.params.profile,
      adapters: request.params.adapters as never,
      catalogRoot: resolve("catalog"),
    },
    nodeFileSystem,
  );
  return {
    findings: report.findings.map(
      ({ code, severity, category, path, message }) => ({
        code,
        severity,
        category,
        path,
        message,
      }),
    ),
    diagnostics: report.diagnostics,
    exitCode: report.findings.some((finding) => finding.severity === "error")
      ? (3 as const)
      : (0 as const),
  };
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

  it("drops connections above the configured concurrency limit", async () => {
    const directory = await mkdtemp(join(tmpdir(), "intentloomd-"));
    const daemon = await startLocalDaemon({
      endpoint: join(directory, "daemon.sock"),
      sessionToken: "l".repeat(32),
      maxConnections: 1,
      doctor: async () => ({ findings: [], diagnostics: [], exitCode: 0 }),
    });
    daemons.push(daemon);
    const first = createConnection(daemon.endpoint);
    await new Promise<void>((resolve, reject) => {
      first.once("connect", resolve);
      first.once("error", reject);
    });
    const second = createConnection(daemon.endpoint);
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("connection limit did not close peer")),
        500,
      );
      const done = () => {
        clearTimeout(timeout);
        resolve();
      };
      second.once("close", done);
      second.once("error", done);
    });
    first.destroy();
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

  it("runs doctor read-only for initialized, invalid, and symlinked projects", async () => {
    const parent = await mkdtemp(join(tmpdir(), "intentloomd-read-only-"));
    const initialized = join(parent, "initialized");
    const invalid = join(parent, "invalid");
    const symlinked = join(parent, "symlinked");
    const external = join(parent, "external");
    await mkdir(initialized);
    await initProject(
      {
        root: initialized,
        profile: "generic",
        adapters: ["codex"],
        catalogRoot: resolve("catalog"),
      },
      nodeFileSystem,
    );
    await mkdir(join(invalid, ".aif"), { recursive: true });
    await writeFile(join(invalid, ".aif", "config.yaml"), "profile: [");
    await mkdir(symlinked);
    await mkdir(external);
    await symlink(external, join(symlinked, ".aif"));
    const daemon = await startLocalDaemon({
      endpoint: join(parent, "daemon.sock"),
      sessionToken: "j".repeat(32),
      doctor: applicationDoctor,
    });
    daemons.push(daemon);

    for (const root of [initialized, invalid, symlinked]) {
      const before = await snapshot(root);
      await expect(
        request(daemon.endpoint, "j".repeat(32), root),
      ).resolves.toMatchObject({
        result: expect.any(Object),
      });
      expect(await snapshot(root)).toEqual(before);
    }
    expect(await readdir(external)).toEqual([]);
  });

  it("keeps direct and daemon doctor results equivalent", async () => {
    const parent = await mkdtemp(join(tmpdir(), "intentloomd-cli-"));
    const root = join(parent, "project");
    const endpoint = join(parent, "daemon.sock");
    const tokenFile = join(parent, "token");
    const token = "m".repeat(32);
    await mkdir(root);
    await writeFile(tokenFile, token, { mode: 0o600 });
    await initProject(
      {
        root,
        profile: "generic",
        adapters: ["codex"],
        catalogRoot: resolve("catalog"),
      },
      nodeFileSystem,
    );
    const before = await snapshot(root);
    const daemon = await startLocalDaemon({
      endpoint,
      sessionToken: token,
      doctor: applicationDoctor,
    });
    daemons.push(daemon);
    const direct: string[] = [];
    const remote: string[] = [];
    const dependencies = { catalogRoot: resolve("catalog") };
    const directExit = await runCli(
      ["doctor", "--root", root, "--json"],
      dependencies,
      { stdout: (message) => direct.push(message), stderr: () => undefined },
    );
    const daemonExit = await runCli(
      [
        "doctor",
        "--root",
        root,
        "--json",
        "--daemon-endpoint",
        endpoint,
        "--daemon-token-file",
        tokenFile,
      ],
      dependencies,
      { stdout: (message) => remote.push(message), stderr: () => undefined },
    );
    const directResult = JSON.parse(direct[0]!) as {
      findings: unknown;
      diagnostics: unknown;
    };
    const daemonResult = JSON.parse(remote[0]!) as {
      findings: unknown;
      diagnostics: unknown;
    };
    expect(daemonExit).toBe(directExit);
    expect(daemonResult).toEqual({
      protocolVersion: 1,
      findings: (directResult.findings as Array<Record<string, unknown>>).map(
        ({ code, severity, category, path, message }) => ({
          code,
          severity,
          category,
          path,
          message,
        }),
      ),
      diagnostics: directResult.diagnostics,
      exitCode: directExit,
    });
    expect(await snapshot(root)).toEqual(before);
  });

  it("fails safely when the daemon token does not authenticate", async () => {
    const parent = await mkdtemp(join(tmpdir(), "intentloomd-cli-token-"));
    const root = join(parent, "project");
    const endpoint = join(parent, "daemon.sock");
    const tokenFile = join(parent, "token");
    await mkdir(root);
    await writeFile(tokenFile, "w".repeat(32), { mode: 0o600 });
    const daemon = await startLocalDaemon({
      endpoint,
      sessionToken: "n".repeat(32),
      doctor: applicationDoctor,
    });
    daemons.push(daemon);
    const errors: string[] = [];
    await expect(
      runCli(
        [
          "doctor",
          "--root",
          root,
          "--daemon-endpoint",
          endpoint,
          "--daemon-token-file",
          tokenFile,
        ],
        { catalogRoot: resolve("catalog") },
        { stdout: () => undefined, stderr: (message) => errors.push(message) },
      ),
    ).resolves.toBe(2);
    expect(errors).toEqual(["daemon returned an invalid response"]);
  });

  it("requires explicit paired doctor daemon options", async () => {
    const errors: string[] = [];
    await expect(
      runCli(
        ["doctor", "--daemon-endpoint", "/tmp/intentloomd.sock"],
        { catalogRoot: resolve("catalog") },
        { stdout: () => undefined, stderr: (message) => errors.push(message) },
      ),
    ).resolves.toBe(2);
    expect(errors).toEqual([
      "--daemon-endpoint and --daemon-token-file must be used together",
    ]);
  });
});

describe.skipIf(process.platform !== "win32")("Windows local daemon", () => {
  it("serves doctor over a named pipe and releases it on shutdown", async () => {
    const endpoint = `\\\\.\\pipe\\intentloomd-${process.pid}-${Date.now()}`;
    const daemon = await startLocalDaemon({
      endpoint,
      sessionToken: "k".repeat(32),
      doctor: async () => ({ findings: [], diagnostics: [], exitCode: 0 }),
    });
    daemons.push(daemon);
    await expect(request(endpoint, "k".repeat(32))).resolves.toMatchObject({
      result: { exitCode: 0, findings: [] },
    });
    await daemon.close();
    await expect(request(endpoint, "k".repeat(32))).rejects.toThrow();
  });
});
