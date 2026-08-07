import { createConnection, createServer } from "node:net";
import {
  mkdtemp,
  mkdir,
  lstat,
  readFile,
  readdir,
  readlink,
  realpath,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  createDoctorRequest,
  createProjectDiffRequest,
  createProjectTimelineRequest,
  createInspectRequest,
  createSecurityAuditRequest,
  createMemorySearchRequest,
  createMemoryEvaluationsListRequest,
  createEngineeringConformanceRequest,
  createWorkflowVariantSummaryRequest,
  createWorkflowDurationSummaryRequest,
  createConformanceTrendSummaryRequest,
  createWorkflowRepetitionSummaryRequest,
  createWorkflowTransitionIntervalsRequest,
  createSessionGetRequest,
} from "../packages/protocol/src/index.js";
import {
  doctorProject,
  initProject,
  nodeFileSystem,
  evaluateProjectEngineeringConformance,
  summarizeProjectWorkflowVariants,
  summarizeProjectWorkflowDurations,
  summarizeProjectConformanceTrend,
  summarizeProjectWorkflowRepetitions,
  summarizeProjectWorkflowTransitionIntervals,
} from "../packages/application/src/index.js";
import {
  DaemonClientError,
  requestDaemonDiff,
  requestDaemonInfo,
  requestDaemonInspect,
  requestDaemonDoctor,
  requestDaemonTimeline,
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
  return new Promise((resolveRequest, reject) => {
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
    socket.on("end", () => resolveRequest(JSON.parse(output)));
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
  doctorRequest: ReturnType<typeof createDoctorRequest>,
) {
  const report = await doctorProject(
    {
      root: doctorRequest.params.root,
      profile: doctorRequest.params.profile,
      adapters: doctorRequest.params.adapters as never,
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
  return new Promise((resolveRequest, reject) => {
    const socket = createConnection(endpoint);
    let output = "";
    socket.on("connect", () => socket.write(`${payload}\n`));
    socket.on("data", (chunk: Buffer) => {
      output += chunk.toString("utf8");
    });
    socket.on("end", () => resolveRequest(JSON.parse(output)));
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
  const output = new Promise<unknown>((resolveOutputExecutor, reject) => {
    resolveOutput = resolveOutputExecutor;
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

const doctor = async () => ({ findings: [], diagnostics: [], exitCode: 0 });

describe.skipIf(process.platform === "win32")("local daemon", () => {
  it("discovers the daemon version, bounded limits, and enabled capabilities", async () => {
    const directory = await mkdtemp(join(tmpdir(), "intentloomd-"));
    const endpoint = join(directory, "daemon.sock");
    const daemon = await startLocalDaemon({
      endpoint,
      sessionToken: "c".repeat(32),
      daemonVersion: "0.6.0-test",
      doctor: async () => ({ findings: [], diagnostics: [], exitCode: 0 }),
    });
    daemons.push(daemon);

    await expect(
      requestDaemonInfo({
        endpoint,
        sessionToken: "c".repeat(32),
      }),
    ).resolves.toMatchObject({
      daemonVersion: "0.6.0-test",
      compatibility: {
        status: "compatible",
        clientProtocolVersion: 1,
        daemonProtocolVersion: 1,
      },
      capabilities: [
        {
          method: "intentloom.daemon.info.v1",
          operation: "daemon.info",
          classification: "read-only",
        },
        {
          method: "intentloom.project.doctor.v1",
          operation: "project.doctor",
          classification: "read-only",
        },
      ],
      limits: {
        maxMessageBytes: 1024 * 1024,
        maxResponseBytes: 1024 * 1024,
        maxConnections: 16,
        requestTimeoutMs: 30_000,
      },
    });
    await expect(
      requestDaemonInfo({
        endpoint,
        sessionToken: "c".repeat(32),
        clientProtocolVersion: 2,
      }),
    ).resolves.toMatchObject({
      compatibility: {
        status: "incompatible",
        clientProtocolVersion: 2,
        daemonProtocolVersion: 1,
      },
    });
  });

  it("returns a structured authentication error from the typed client", async () => {
    const directory = await mkdtemp(join(tmpdir(), "intentloomd-"));
    const endpoint = join(directory, "daemon.sock");
    const daemon = await startLocalDaemon({
      endpoint,
      sessionToken: "d".repeat(32),
    });
    daemons.push(daemon);

    await expect(
      requestDaemonInfo({ endpoint, sessionToken: "wrong".repeat(8) }),
    ).rejects.toMatchObject<DaemonClientError>({
      code: "authentication_failed",
      message: "authentication failed",
      retryable: false,
    });
  });

  it("invokes typed Inspect and Doctor clients through the shared transport", async () => {
    const parent = await mkdtemp(join(tmpdir(), "intentloomd-inspect-"));
    const root = join(parent, "project");
    const endpoint = join(parent, "daemon.sock");
    await mkdir(root);
    const canonicalRoot = await realpath(root);
    const daemon = await startLocalDaemon({
      endpoint,
      sessionToken: "i".repeat(32),
      enforceCanonicalRoots: true,
      inspect: async (inspectRequest) => ({
        projectId: "project-local",
        root: inspectRequest.params.root,
      }),
      doctor: async () => ({ findings: [], diagnostics: [], exitCode: 0 }),
      diff: async (diffRequest) => ({
        operationVersion: 1,
        root: diffRequest.params.root,
        changes: [],
        diagnostics: [],
      }),
      timeline: async (timelineRequest) => ({
        operationVersion: 1,
        root: timelineRequest.params.root,
        caseType: "release",
        caseId: timelineRequest.params.caseId,
        quality: "complete",
        events: [],
        findings: [],
        diagnostics: [],
      }),
    });
    daemons.push(daemon);

    await expect(
      requestDaemonInspect({
        endpoint,
        sessionToken: "i".repeat(32),
        root,
      }),
    ).resolves.toEqual({
      protocolVersion: 1,
      projectId: "project-local",
      root: canonicalRoot,
    });
    await expect(
      requestDaemonDoctor({
        endpoint,
        sessionToken: "i".repeat(32),
        request: createDoctorRequest(1, {
          root,
          profile: "generic",
          adapters: [],
        }),
      }),
    ).resolves.toMatchObject({
      protocolVersion: 1,
      findings: [],
      diagnostics: [],
      exitCode: 0,
    });
    await expect(
      requestDaemonDoctor({
        endpoint,
        sessionToken: "wrong".repeat(8),
        request: createDoctorRequest(2, {
          root,
          profile: "generic",
          adapters: [],
        }),
      }),
    ).rejects.toMatchObject<DaemonClientError>({
      code: "authentication_failed",
      retryable: false,
    });
    const info = await requestDaemonInfo({
      endpoint,
      sessionToken: "i".repeat(32),
    });
    expect(info.capabilities.map(({ method }) => method)).toEqual([
      "intentloom.daemon.info.v1",
      "intentloom.project.doctor.v1",
      "intentloom.project.inspect.v1",
      "intentloom.project.diff.v1",
      "intentloom.project.timeline.v1",
    ]);
  });

  it("invokes typed Diff and root-bound Timeline operations through local IPC", async () => {
    const parent = await mkdtemp(join(tmpdir(), "intentloomd-project-"));
    const root = join(parent, "project");
    const endpoint = join(parent, "daemon.sock");
    await mkdir(root);
    const canonicalRoot = await realpath(root);
    const daemon = await startLocalDaemon({
      endpoint,
      sessionToken: "g".repeat(32),
      enforceCanonicalRoots: true,
      diff: async (diffRequest) => ({
        operationVersion: 1,
        root: diffRequest.params.root,
        changes: [
          {
            path: ".aif/config.yaml",
            kind: "create",
            reason: "configuration is missing",
          },
        ],
        diagnostics: [],
      }),
      timeline: async (timelineRequest) => ({
        operationVersion: 1,
        root: timelineRequest.params.root,
        caseType: "release",
        caseId: timelineRequest.params.caseId,
        quality: "complete",
        events: [],
        findings: [],
        diagnostics: [],
      }),
    });
    daemons.push(daemon);

    await expect(
      requestDaemonDiff({
        endpoint,
        sessionToken: "g".repeat(32),
        root,
        profile: "generic",
        adapters: ["codex"],
      }),
    ).resolves.toMatchObject({
      root: canonicalRoot,
      changes: [{ path: ".aif/config.yaml", kind: "create" }],
    });
    await expect(
      requestDaemonTimeline({
        endpoint,
        sessionToken: "g".repeat(32),
        root,
        caseId: "release:test",
      }),
    ).resolves.toMatchObject({
      root: canonicalRoot,
      caseId: "release:test",
      quality: "complete",
    });
    expect(
      createProjectDiffRequest(1, {
        root,
        profile: "generic",
        adapters: ["codex"],
      }).method,
    ).toBe("intentloom.project.diff.v1");
    expect(
      createProjectTimelineRequest(1, { root, caseId: "release:test" }).method,
    ).toBe("intentloom.project.timeline.v1");
  });

  it("rejects a symlink project root with an explicit stale-root error", async () => {
    const parent = await mkdtemp(join(tmpdir(), "intentloomd-root-"));
    const target = join(parent, "target");
    const root = join(parent, "project");
    const endpoint = join(parent, "daemon.sock");
    await mkdir(target);
    await symlink(target, root);
    const daemon = await startLocalDaemon({
      endpoint,
      sessionToken: "h".repeat(32),
      enforceCanonicalRoots: true,
      timeline: async () => ({
        operationVersion: 1,
        root: target,
        caseType: "release",
        caseId: "release:test",
        quality: "complete",
        events: [],
        findings: [],
        diagnostics: [],
      }),
    });
    daemons.push(daemon);

    await expect(
      requestDaemonTimeline({
        endpoint,
        sessionToken: "h".repeat(32),
        root,
        caseId: "release:test",
      }),
    ).rejects.toMatchObject<DaemonClientError>({
      code: "stale_root",
      message: "project root is a symbolic link and is not stable",
    });
  });

  it("reports cancellation before opening a daemon request", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      requestDaemonInfo({
        endpoint: join(tmpdir(), "not-running.sock"),
        sessionToken: "e".repeat(32),
        signal: controller.signal,
      }),
    ).rejects.toMatchObject<DaemonClientError>({
      code: "cancelled",
      retryable: false,
    });
  });

  it("cancels an in-flight read-only transport without pretending to cancel the operation", async () => {
    const parent = await mkdtemp(join(tmpdir(), "intentloomd-cancel-"));
    const root = join(parent, "project");
    const endpoint = join(parent, "daemon.sock");
    await mkdir(root);
    let completed = false;
    const controller = new AbortController();
    const daemon = await startLocalDaemon({
      endpoint,
      sessionToken: "j".repeat(32),
      enforceCanonicalRoots: true,
      timeline: async (timelineRequest) => {
        setTimeout(() => controller.abort(), 5);
        await new Promise((resolveDelay) => setTimeout(resolveDelay, 50));
        completed = true;
        return {
          operationVersion: 1,
          root: timelineRequest.params.root,
          caseType: "release",
          caseId: timelineRequest.params.caseId,
          quality: "complete",
          events: [],
          findings: [],
          diagnostics: [],
        };
      },
    });
    daemons.push(daemon);
    const timelineRequest = requestDaemonTimeline({
      endpoint,
      sessionToken: "j".repeat(32),
      root,
      caseId: "release:cancel",
      signal: controller.signal,
    });

    await expect(timelineRequest).rejects.toMatchObject<DaemonClientError>({
      code: "cancelled",
      retryable: false,
    });
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 75));
    expect(completed).toBe(true);
  });

  it("labels disabled methods as unsupported capabilities on the wire", async () => {
    const directory = await mkdtemp(join(tmpdir(), "intentloomd-"));
    const endpoint = join(directory, "daemon.sock");
    const daemon = await startLocalDaemon({
      endpoint,
      sessionToken: "f".repeat(32),
      doctor: async () => ({ findings: [], diagnostics: [], exitCode: 0 }),
    });
    daemons.push(daemon);

    await expect(
      rawRequest(
        endpoint,
        JSON.stringify({
          token: "f".repeat(32),
          request: createInspectRequest(1, { root: "/project" }),
        }),
      ),
    ).resolves.toMatchObject({
      error: {
        code: -32601,
        data: { clientErrorCode: "unsupported_capability" },
      },
    });
  });

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
    await expect(stat(endpoint)).rejects.toThrow("ENOENT");
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
    await new Promise<void>((resolveListening) =>
      occupied.listen(endpoint, resolveListening),
    );
    try {
      await expect(
        startLocalDaemon({
          endpoint,
          sessionToken: "e".repeat(32),
          doctor: async () => ({ findings: [], diagnostics: [], exitCode: 0 }),
        }),
      ).rejects.toThrow("EADDRINUSE");
      await stat(endpoint);
    } finally {
      await new Promise<void>((resolveClosed, reject) =>
        occupied.close((error) => (error ? reject(error) : resolveClosed())),
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
    await new Promise<void>((resolveClosed, reject) => {
      socket.on("close", () => resolveClosed());
      socket.on("error", reject);
    });
    expect(socket.destroyed).toBe(true);
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
    await new Promise<void>((resolveConnected, reject) => {
      first.once("connect", resolveConnected);
      first.once("error", reject);
    });
    const second = createConnection(daemon.endpoint);
    await new Promise<void>((resolveClosed, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("connection limit did not close peer")),
        500,
      );
      const done = () => {
        clearTimeout(timeout);
        resolveClosed();
      };
      second.once("close", done);
      second.once("error", done);
    });
    expect(second.destroyed).toBe(true);
    first.destroy();
  });

  it("drains an active request before shutdown", async () => {
    const directory = await mkdtemp(join(tmpdir(), "intentloomd-"));
    let release: (() => void) | undefined;
    let markStarted: (() => void) | undefined;
    const started = new Promise<void>((resolveStarted) => {
      markStarted = resolveStarted;
    });
    const daemon = await startLocalDaemon({
      endpoint: join(directory, "daemon.sock"),
      sessionToken: "h".repeat(32),
      shutdownTimeoutMs: 100,
      doctor: async () => {
        markStarted!();
        await new Promise<void>((resolveRelease) => {
          release = resolveRelease;
        });
        return { findings: [], diagnostics: [], exitCode: 0 };
      },
    });
    const pendingRequest = sendRequest(daemon.endpoint, "h".repeat(32));
    await started;
    const closing = daemon.close();
    let closed = false;
    void closing.then(() => {
      closed = true;
    });
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 10));
    expect(closed).toBe(false);
    release!();
    await expect(pendingRequest.output).resolves.toMatchObject({
      result: { exitCode: 0 },
    });
    await expect(closing).resolves.toBeUndefined();
  });

  it("forces shutdown after the configured drain deadline", async () => {
    const directory = await mkdtemp(join(tmpdir(), "intentloomd-"));
    let markStarted: (() => void) | undefined;
    const started = new Promise<void>((resolveStarted) => {
      markStarted = resolveStarted;
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
    const pendingRequest = sendRequest(daemon.endpoint, "i".repeat(32));
    await started;
    await expect(daemon.close()).resolves.toBeUndefined();
    await expect(pendingRequest.output).rejects.toThrow(
      "Unexpected end of JSON input",
    );
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
    expect(errors).toEqual(["authentication failed"]);
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

  it("serves inspect, securityAudit, memorySearch, and sessionGet requests over local IPC socket", async () => {
    const parent = await mkdtemp(join(tmpdir(), "intentloomd-multi-op-"));
    const root = join(parent, "project");
    const endpoint = join(parent, "daemon.sock");
    const token = "x".repeat(32);
    await mkdir(root);

    const daemon = await startLocalDaemon({
      endpoint,
      sessionToken: token,
      inspect: async (req) => ({
        projectId: "p-inspect",
        root: req.params.root,
      }),
      securityAudit: async (req) => ({
        report: {
          schemaVersion: "1",
          projectId: req.params.projectId,
          healthScore: 100,
          invariantChecks: [],
          auditHash: "00".repeat(32),
          auditedAt: new Date().toISOString(),
        },
      }),
      memorySearch: async (req) => ({
        query: req.params.query,
        items: [],
      }),
      memoryEvaluationsList: async () => ({
        evaluations: [],
      }),
      engineeringConformance: async (req) => ({
        report: evaluateProjectEngineeringConformance({
          root: req.params.root,
          timeline: req.params.timeline,
          policy: req.params.policy,
        }),
      }),
      workflowVariantSummary: async (req) => ({
        report: summarizeProjectWorkflowVariants(req.params.timelines),
      }),
      workflowDurationSummary: async (req) => ({
        report: summarizeProjectWorkflowDurations(req.params.timelines),
      }),
      conformanceTrendSummary: async (req) => ({
        report: summarizeProjectConformanceTrend(req.params.reports),
      }),
      workflowRepetitionSummary: async (req) => ({
        report: summarizeProjectWorkflowRepetitions(req.params.timelines),
      }),
      workflowTransitionIntervals: async (req) => ({
        report: summarizeProjectWorkflowTransitionIntervals(
          req.params.timelines,
        ),
      }),
      sessionGet: async () => ({
        session: null,
      }),
    });
    daemons.push(daemon);

    const sendReq = (payload: unknown) =>
      new Promise<unknown>((res, rej) => {
        const socket = createConnection(endpoint);
        let out = "";
        socket.on("connect", () =>
          socket.write(`${JSON.stringify({ token, request: payload })}\n`),
        );
        socket.on("data", (chunk: Buffer) => {
          out += chunk.toString("utf8");
        });
        socket.on("end", () => res(JSON.parse(out)));
        socket.on("error", rej);
      });

    const inspectRes = (await sendReq(createInspectRequest(1, { root }))) as {
      result: { projectId: string };
    };
    expect(inspectRes.result.projectId).toBe("p-inspect");

    const auditRes = (await sendReq(
      createSecurityAuditRequest(2, { root, projectId: "p1" }),
    )) as { result: { report: { healthScore: number } } };
    expect(auditRes.result.report.healthScore).toBe(100);

    const memRes = (await sendReq(
      createMemorySearchRequest(3, { root, query: "pattern" }),
    )) as { result: { query: string } };
    expect(memRes.result.query).toBe("pattern");

    const evaluationRes = (await sendReq(
      createMemoryEvaluationsListRequest(5, { root, outcome: "passed" }),
    )) as { result: { evaluations: unknown[] } };
    expect(evaluationRes.result.evaluations).toEqual([]);

    const conformanceRes = (await sendReq(
      createEngineeringConformanceRequest(6, {
        root,
        timeline: {
          caseType: "release",
          caseId: "release:1",
          events: [
            {
              activity: "release.published",
              source: "local-fixture",
              sourceId: "release:1",
            },
          ],
        },
        policy: {
          schemaVersion: "1",
          policyId: "policy:release",
          rules: [
            {
              ruleId: "require-release",
              caseType: "release",
              severity: "error",
              title: "Release evidence",
              condition: {
                type: "required-activity",
                activity: "release.published",
              },
            },
          ],
        },
      }),
    )) as { result: { report: { summary: { passed: number } } } };
    expect(conformanceRes.result.report.summary.passed).toBe(1);

    const variantsRes = (await sendReq(
      createWorkflowVariantSummaryRequest(7, {
        timelines: [
          {
            caseType: "release",
            caseId: "release:1",
            events: [],
          },
          {
            caseType: "release",
            caseId: "release:2",
            events: [],
          },
        ],
      }),
    )) as { result: { report: { timelineCount: number } } };
    expect(variantsRes.result.report.timelineCount).toBe(2);

    const durationRes = (await sendReq(
      createWorkflowDurationSummaryRequest(8, {
        timelines: [
          {
            caseType: "release",
            caseId: "release:1",
            events: [
              {
                activity: "release.started",
                source: "fixture",
                sourceId: "1",
                timestamp: "2026-07-26T00:00:00.000Z",
              },
              {
                activity: "release.finished",
                source: "fixture",
                sourceId: "2",
                timestamp: "2026-07-26T00:01:00.000Z",
              },
            ],
          },
          { caseType: "release", caseId: "release:2", events: [] },
        ],
      }),
    )) as { result: { report: { observableCaseCount: number } } };
    expect(durationRes.result.report.observableCaseCount).toBe(1);

    const trendRes = (await sendReq(
      createConformanceTrendSummaryRequest(9, {
        reports: [
          {
            operationVersion: 1,
            policyId: "policy:release-v1",
            evaluatedAt: "2026-07-26T00:00:00.000Z",
            caseType: "release",
            caseId: "release:1",
            summary: {
              totalRules: 0,
              passed: 0,
              violations: 0,
              missingEvidence: 0,
              ambiguousEvidence: 0,
              unsupported: 0,
            },
            findings: [],
          },
          {
            operationVersion: 1,
            policyId: "policy:release-v1",
            evaluatedAt: "2026-07-27T00:00:00.000Z",
            caseType: "release",
            caseId: "release:2",
            summary: {
              totalRules: 0,
              passed: 0,
              violations: 0,
              missingEvidence: 0,
              ambiguousEvidence: 0,
              unsupported: 0,
            },
            findings: [],
          },
        ],
      }),
    )) as { result: { report: { reportCount: number } } };
    expect(trendRes.result.report.reportCount).toBe(2);

    const repetitionRes = (await sendReq(
      createWorkflowRepetitionSummaryRequest(10, {
        timelines: [
          {
            caseType: "release",
            caseId: "release:1",
            events: [
              { activity: "checks.failed", source: "fixture", sourceId: "1" },
              { activity: "checks.failed", source: "fixture", sourceId: "2" },
            ],
          },
          {
            caseType: "release",
            caseId: "release:2",
            events: [
              { activity: "checks.failed", source: "fixture", sourceId: "3" },
              { activity: "checks.failed", source: "fixture", sourceId: "4" },
            ],
          },
        ],
      }),
    )) as { result: { report: { repeatedActivities: unknown[] } } };
    expect(repetitionRes.result.report.repeatedActivities).toHaveLength(1);

    const transitionRes = (await sendReq(
      createWorkflowTransitionIntervalsRequest(11, {
        timelines: [
          {
            caseType: "release",
            caseId: "release:1",
            events: [
              {
                activity: "release.started",
                source: "fixture",
                sourceId: "7",
                timestamp: "2026-07-26T00:00:00.000Z",
              },
              {
                activity: "release.published",
                source: "fixture",
                sourceId: "8",
                timestamp: "2026-07-26T00:02:00.000Z",
              },
            ],
          },
          {
            caseType: "release",
            caseId: "release:2",
            events: [],
          },
        ],
      }),
    )) as {
      result: {
        report: {
          observableIntervalCount: number;
          transitions: { elapsedMinutes: { median: number } }[];
        };
      };
    };
    expect(transitionRes.result.report.observableIntervalCount).toBe(1);
    expect(
      transitionRes.result.report.transitions[0]?.elapsedMinutes.median,
    ).toBe(2);

    const sessionRes = (await sendReq(
      createSessionGetRequest(4, { root, sessionId: "s1" }),
    )) as { result: { session: null } };
    expect(sessionRes.result.session).toBeNull();
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
    await expect(request(endpoint, "k".repeat(32))).rejects.toThrow("ENOENT");
  });
});
