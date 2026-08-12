import { createConnection } from "node:net";
import { randomUUID } from "node:crypto";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import {
  getFeatureIntentFixture,
  loadFeatureIntentFixtureCatalog,
} from "@intentloom/application";
import {
  FEATURE_INTENT_WORKSPACE_ANALYZE_METHOD,
  FEATURE_INTENT_WORKSPACE_PREPARE_METHOD,
  createFeatureIntentWorkspaceAnalyzeRequest,
  createFeatureIntentWorkspacePrepareRequest,
} from "@intentloom/protocol";
import {
  handleFeatureIntentWorkspaceAnalyze,
  handleFeatureIntentWorkspacePrepare,
} from "../packages/daemon/src/feature-intent-handlers.js";
import { startLocalDaemon } from "../packages/daemon/src/index.js";

const catalog = loadFeatureIntentFixtureCatalog();
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
    ? `\\\\.\\pipe\\intentloom-feature-intent-${process.pid}-${randomUUID()}`
    : join(directory, "daemon.sock");
}

describe("Engineering Workspace W10 Core: feature intent daemon RPC", () => {
  it("handles workspace prepare via daemon RPC", async () => {
    const fixture = getFeatureIntentFixture(
      catalog,
      "feature-fixture-tauri-window",
    );
    const projectRoot = await mkdtemp(
      join(tmpdir(), "intentloom-feature-intent-root-"),
    );
    await writeFixtureTree(projectRoot, fixture.initialTree);

    const directory = await mkdtemp(
      join(tmpdir(), "intentloom-feature-intent-endpoint-"),
    );
    const token = "f".repeat(32);
    const daemon = await startLocalDaemon({
      endpoint: daemonEndpoint(directory),
      sessionToken: token,
      enforceCanonicalRoots: false,
      featureIntentWorkspacePrepare: handleFeatureIntentWorkspacePrepare,
      featureIntentWorkspaceAnalyze: handleFeatureIntentWorkspaceAnalyze,
    });
    daemons.push(daemon);

    const request = createFeatureIntentWorkspacePrepareRequest(
      1,
      projectRoot,
      fixture.title,
      fixture.summary,
      "fixture-project",
    );
    expect(request.method).toBe(FEATURE_INTENT_WORKSPACE_PREPARE_METHOD);

    const response = await rawRequest(daemon.endpoint, request, token);
    const viewmodel = responseViewmodel(response);
    expect(viewmodel.specializedPackIds).toEqual(
      expect.arrayContaining(["pack-tauri-desktop"]),
    );
    expect(viewmodel.mutationAllowed).toBe(false);

    await rm(projectRoot, { recursive: true, force: true });
    await rm(directory, { recursive: true, force: true });
  });

  it("returns analyze impact through handler on disk fixture", async () => {
    const fixture = getFeatureIntentFixture(
      catalog,
      "feature-fixture-generic-logging",
    );
    const projectRoot = await mkdtemp(
      join(tmpdir(), "intentloom-feature-intent-generic-"),
    );
    await writeFixtureTree(projectRoot, fixture.initialTree);

    const request = createFeatureIntentWorkspaceAnalyzeRequest(
      2,
      projectRoot,
      fixture.title,
      fixture.summary,
    );
    expect(request.method).toBe(FEATURE_INTENT_WORKSPACE_ANALYZE_METHOD);
    const payload = await handleFeatureIntentWorkspaceAnalyze({
      ...request,
      params: { ...request.params, root: projectRoot },
    });
    expect(payload.viewmodel.title).toBe("Add structured logging");
    expect(payload.viewmodel.mutationAllowed).toBe(false);

    await rm(projectRoot, { recursive: true, force: true });
  });
});
