import { createConnection } from "node:net";
import { randomUUID } from "node:crypto";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import {
  BOUNDED_EXECUTION_PLAN_APPROVAL,
  getBoundedExecutionFixture,
  loadBoundedExecutionFixtureCatalog,
} from "@intentloom/application";
import {
  BOUNDED_EXECUTION_WORKSPACE_EXECUTE_METHOD,
  BOUNDED_EXECUTION_WORKSPACE_PREPARE_METHOD,
  createBoundedExecutionWorkspaceExecuteRequest,
  createBoundedExecutionWorkspacePrepareRequest,
} from "@intentloom/protocol";
import {
  handleBoundedExecutionWorkspaceExecute,
  handleBoundedExecutionWorkspacePrepare,
} from "../packages/daemon/src/bounded-execution-handlers.js";
import { startLocalDaemon } from "../packages/daemon/src/index.js";

const catalog = loadBoundedExecutionFixtureCatalog();
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
    ? `\\\\.\\pipe\\intentloom-bounded-execution-${process.pid}-${randomUUID()}`
    : join(directory, "daemon.sock");
}

describe("Engineering Workspace W11 Core: bounded execution daemon RPC", () => {
  it("handles workspace prepare via daemon RPC as read-only blocked", async () => {
    const fixture = getBoundedExecutionFixture(
      catalog,
      "bounded-fixture-blocked-unapproved",
    );
    const projectRoot = await mkdtemp(
      join(tmpdir(), "intentloom-bounded-execution-root-"),
    );
    await writeFixtureTree(projectRoot, fixture.initialTree);

    const directory = await mkdtemp(
      join(tmpdir(), "intentloom-bounded-execution-endpoint-"),
    );
    const token = "f".repeat(32);
    const daemon = await startLocalDaemon({
      endpoint: daemonEndpoint(directory),
      sessionToken: token,
      enforceCanonicalRoots: false,
      boundedExecutionWorkspacePrepare: handleBoundedExecutionWorkspacePrepare,
      boundedExecutionWorkspaceExecute: handleBoundedExecutionWorkspaceExecute,
    });
    daemons.push(daemon);

    const request = createBoundedExecutionWorkspacePrepareRequest(1, {
      root: projectRoot,
      title: fixture.title,
      summary: fixture.summary,
      projectId: "fixture-project",
    });
    expect(request.method).toBe(BOUNDED_EXECUTION_WORKSPACE_PREPARE_METHOD);

    const response = await rawRequest(daemon.endpoint, request, token);
    const viewmodel = responseViewmodel(response);
    expect(viewmodel.executionGate).toBe("w11-blocked");
    expect(viewmodel.mutationAllowed).toBe(false);

    await rm(projectRoot, { recursive: true, force: true });
    await rm(directory, { recursive: true, force: true });
  });

  it("executes a bounded task through the handler without widening network", async () => {
    const fixture = getBoundedExecutionFixture(
      catalog,
      "bounded-fixture-ready-logging",
    );
    const projectRoot = await mkdtemp(
      join(tmpdir(), "intentloom-bounded-execution-ready-"),
    );
    await writeFixtureTree(projectRoot, fixture.initialTree);

    const request = createBoundedExecutionWorkspaceExecuteRequest(2, {
      root: projectRoot,
      title: fixture.title,
      summary: fixture.summary,
      planApproval: BOUNDED_EXECUTION_PLAN_APPROVAL,
      requestedAllowedPaths: ["."],
      proposedPaths: ["src/bounded-task-evidence.txt"],
      applyRequested: false,
    });
    expect(request.method).toBe(BOUNDED_EXECUTION_WORKSPACE_EXECUTE_METHOD);
    const payload = await handleBoundedExecutionWorkspaceExecute({
      ...request,
      params: { ...request.params, root: projectRoot },
    });
    expect(payload.viewmodel.executionGate).toBe("verified");
    expect(payload.viewmodel.mutationAllowed).toBe(false);
    expect(payload.viewmodel.networkAccess).toBe(false);

    await rm(projectRoot, { recursive: true, force: true });
  });
});
