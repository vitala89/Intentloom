import { createConnection } from "node:net";
import { randomUUID } from "node:crypto";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import {
  CONTINUOUS_LOOP_MEMORY_APPROVAL,
  getContinuousLoopFixture,
  loadContinuousLoopFixtureCatalog,
} from "@intentloom/application";
import {
  CONTINUOUS_LOOP_WORKSPACE_EXECUTE_METHOD,
  CONTINUOUS_LOOP_WORKSPACE_PREPARE_METHOD,
  createContinuousLoopWorkspaceExecuteRequest,
  createContinuousLoopWorkspacePrepareRequest,
} from "@intentloom/protocol";
import {
  handleContinuousLoopWorkspaceExecute,
  handleContinuousLoopWorkspacePrepare,
} from "../packages/daemon/src/continuous-loop-handlers.js";
import { startLocalDaemon } from "../packages/daemon/src/index.js";

const catalog = loadContinuousLoopFixtureCatalog();
const daemons: { close(): Promise<void> }[] = [];

afterEach(async () => {
  await Promise.all(daemons.splice(0).map((daemon) => daemon.close()));
});

async function writeFixtureTree(
  baseDirectory: string,
  tree: Readonly<Record<string, string>>,
): Promise<void> {
  for (const [relativePath, content] of Object.entries(tree)) {
    const absolutePath = join(baseDirectory, relativePath);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, content, "utf8");
  }
}

function rawRequest(
  endpoint: string,
  request: object,
  token: string,
): Promise<unknown> {
  return new Promise((resolvePromise, reject) => {
    const socket = createConnection(endpoint);
    let output = "";
    socket.once("connect", () =>
      socket.write(`${JSON.stringify({ token, request })}\n`),
    );
    socket.on("data", (chunk) => (output += chunk.toString()));
    socket.once("error", reject);
    socket.once("end", () => resolvePromise(JSON.parse(output)));
  });
}

function responseViewmodel(value: unknown): Record<string, unknown> {
  const payload = (value as { result?: { viewmodel?: unknown } }).result
    ?.viewmodel;
  if (payload === null || typeof payload !== "object" || Array.isArray(payload))
    throw new Error("daemon viewmodel is not an object");
  return payload as Record<string, unknown>;
}

function daemonEndpoint(directory: string): string {
  return process.platform === "win32"
    ? `\\\\.\\pipe\\il-w12-${process.pid}-${randomUUID()}`
    : join(directory, "d.sock");
}

describe("Engineering Workspace W12 Core: continuous loop daemon RPC", () => {
  it("handles workspace prepare via daemon RPC as read-only ready", async () => {
    const fixture = getContinuousLoopFixture(
      catalog,
      "loop-fixture-ready-memory",
    );
    const projectRoot = await mkdtemp(
      join(tmpdir(), "intentloom-continuous-loop-root-"),
    );
    await writeFixtureTree(projectRoot, fixture.initialTree);

    const directory = await mkdtemp(join(tmpdir(), "il-w12-ep-"));
    const token = "f".repeat(32);
    const daemon = await startLocalDaemon({
      endpoint: daemonEndpoint(directory),
      sessionToken: token,
      enforceCanonicalRoots: false,
      continuousLoopWorkspacePrepare: handleContinuousLoopWorkspacePrepare,
      continuousLoopWorkspaceExecute: handleContinuousLoopWorkspaceExecute,
    });
    daemons.push(daemon);

    const request = createContinuousLoopWorkspacePrepareRequest(1, {
      root: projectRoot,
      projectId: fixture.projectId,
      previous: fixture.previous,
      current: fixture.current,
      applyRequested: true,
      grantedApprovals: [CONTINUOUS_LOOP_MEMORY_APPROVAL],
    });
    expect(request.method).toBe(CONTINUOUS_LOOP_WORKSPACE_PREPARE_METHOD);

    const response = await rawRequest(daemon.endpoint, request, token);
    const viewmodel = responseViewmodel(response);
    expect(viewmodel.loopGate).toBe("ready");
    expect(viewmodel.mutationAllowed).toBe(false);

    await rm(projectRoot, { recursive: true, force: true });
    await rm(directory, { recursive: true, force: true });
  });

  it("executes a reviewed memory update through the handler", async () => {
    const fixture = getContinuousLoopFixture(
      catalog,
      "loop-fixture-ready-memory",
    );
    const projectRoot = await mkdtemp(
      join(tmpdir(), "intentloom-continuous-loop-ready-"),
    );
    await writeFixtureTree(projectRoot, fixture.initialTree);

    const request = createContinuousLoopWorkspaceExecuteRequest(2, {
      root: projectRoot,
      projectId: fixture.projectId,
      previous: fixture.previous,
      current: fixture.current,
      memoryContent: fixture.memoryContent,
      applyRequested: true,
      grantedApprovals: [CONTINUOUS_LOOP_MEMORY_APPROVAL],
    });
    expect(request.method).toBe(CONTINUOUS_LOOP_WORKSPACE_EXECUTE_METHOD);
    const payload = await handleContinuousLoopWorkspaceExecute({
      ...request,
      params: { ...request.params, root: projectRoot },
    });
    expect(payload.viewmodel.loopGate).toBe("accepted");
    expect(payload.viewmodel.mutationAllowed).toBe(true);
    expect(payload.viewmodel.changeKind).toBe("code");

    await rm(projectRoot, { recursive: true, force: true });
  });
});
