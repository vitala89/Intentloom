import { createConnection } from "node:net";
import { randomUUID } from "node:crypto";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import {
  getExistingProjectFixture,
  loadExistingProjectFixtureCatalog,
} from "@intentloom/application";
import {
  EXISTING_PROJECT_WORKSPACE_PREPARE_METHOD,
  createExistingProjectWorkspacePrepareRequest,
} from "@intentloom/protocol";
import { handleExistingProjectWorkspacePrepare } from "../packages/daemon/src/existing-project-handlers.js";
import { startLocalDaemon } from "../packages/daemon/src/index.js";

const catalog = loadExistingProjectFixtureCatalog();
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
    ? `\\\\.\\pipe\\intentloom-existing-${process.pid}-${randomUUID()}`
    : join(directory, "daemon.sock");
}

describe("Engineering Workspace W9 Core: existing project daemon RPC", () => {
  it("handles workspace prepare via daemon RPC", async () => {
    const fixture = getExistingProjectFixture(
      catalog,
      "existing-fixture-tauri-detected",
    );
    const projectRoot = await mkdtemp(
      join(tmpdir(), "intentloom-existing-project-root-"),
    );
    await writeFixtureTree(projectRoot, fixture.initialTree);

    const directory = await mkdtemp(
      join(tmpdir(), "intentloom-existing-project-endpoint-"),
    );
    const token = "e".repeat(32);
    const daemon = await startLocalDaemon({
      endpoint: daemonEndpoint(directory),
      sessionToken: token,
      enforceCanonicalRoots: false,
      existingProjectWorkspacePrepare: handleExistingProjectWorkspacePrepare,
    });
    daemons.push(daemon);

    const request = createExistingProjectWorkspacePrepareRequest(
      1,
      projectRoot,
      "fixture-project",
      "standard",
    );
    expect(request.method).toBe(EXISTING_PROJECT_WORKSPACE_PREPARE_METHOD);

    const response = await rawRequest(daemon.endpoint, request, token);
    const viewmodel = responseViewmodel(response);
    expect(viewmodel.specializedCandidateCount).toBe(1);

    await rm(projectRoot, { recursive: true, force: true });
    await rm(directory, { recursive: true, force: true });
  });

  it("returns generic overview through handler on disk fixture", async () => {
    const fixture = getExistingProjectFixture(
      catalog,
      "existing-fixture-generic-uninitialized",
    );
    const projectRoot = await mkdtemp(
      join(tmpdir(), "intentloom-existing-generic-root-"),
    );
    await writeFixtureTree(projectRoot, fixture.initialTree);

    const request = createExistingProjectWorkspacePrepareRequest(
      2,
      projectRoot,
      undefined,
      "standard",
    );
    const payload = await handleExistingProjectWorkspacePrepare({
      ...request,
      params: { ...request.params, root: projectRoot },
    });
    expect(payload.viewmodel.profile).toBe("generic");
    expect(payload.viewmodel.readiness).toBe("not-initialized");

    await rm(projectRoot, { recursive: true, force: true });
  });
});
