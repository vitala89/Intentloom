import { createConnection } from "node:net";
import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import * as application from "../packages/application/src/index.js";
import * as protocol from "../packages/protocol/src/index.js";
import * as qualityHandlers from "../packages/daemon/src/engineering-quality-handlers.js";
import { startLocalDaemon } from "../packages/daemon/src/index.js";

const daemons: { close(): Promise<void> }[] = [];

afterEach(async () => {
  await Promise.all(daemons.splice(0).map((daemon) => daemon.close()));
});

function rawRequest(
  endpoint: string,
  request: object,
  token: string,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const socket = createConnection(endpoint);
    let output = "";
    socket.once("connect", () =>
      socket.write(`${JSON.stringify({ token, request })}\n`),
    );
    socket.on("data", (chunk) => (output += chunk.toString()));
    socket.once("error", reject);
    socket.once("end", () => resolve(JSON.parse(output)));
  });
}

function responseViewmodel(value: unknown): Record<string, unknown> {
  const payload = (value as { result?: { viewmodel?: unknown } }).result
    ?.viewmodel;
  if (payload === null || typeof payload !== "object" || Array.isArray(payload))
    throw new Error("daemon viewmodel is not an object");
  return payload as Record<string, unknown>;
}

async function fixtureRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "intentloom-quality-daemon-"));
  await mkdir(join(root, "packages", "lib"), { recursive: true });
  await Promise.all([
    writeFile(
      join(root, "package.json"),
      JSON.stringify({
        name: "fixture-root",
        dependencies: { "fixture-lib": "workspace:*" },
      }),
    ),
    writeFile(
      join(root, "packages/lib/package.json"),
      JSON.stringify({ name: "fixture-lib" }),
    ),
  ]);
  return root;
}

function daemonEndpoint(directory: string): string {
  return process.platform === "win32"
    ? `\\\\.\\pipe\\intentloom-quality-${process.pid}-${randomUUID()}`
    : join(directory, "daemon.sock");
}

async function startQualityDaemon(root: string) {
  const directory = await mkdtemp(
    join(tmpdir(), "intentloom-quality-endpoint-"),
  );
  const token = "q".repeat(32);
  const daemon = await startLocalDaemon({
    endpoint: daemonEndpoint(directory),
    sessionToken: token,
    enforceCanonicalRoots: true,
    qualityStandards: (request) =>
      qualityHandlers.handleQualityStandards(request, root),
    qualityCatalog: (request) =>
      qualityHandlers.handleQualityCatalog(request, root),
    qualityCheckers: (request) =>
      qualityHandlers.handleQualityCheckers(request, root),
    qualityGraph: (request) =>
      qualityHandlers.handleQualityGraph(request, root),
  });
  daemons.push({
    async close() {
      await daemon.close();
      await Promise.all([
        rm(directory, { recursive: true, force: true }),
        rm(root, { recursive: true, force: true }),
      ]);
    },
  });
  return { endpoint: daemon.endpoint, token };
}

const qualityCases = [
  [
    "standards",
    protocol.createQualityStandardsRequest,
    () =>
      application.buildQualityStandardsViewModel({
        policy: application.getEffectiveEngineeringQualityPolicy(),
      }),
  ],
  [
    "catalog",
    protocol.createQualityCatalogRequest,
    () =>
      application.buildQualityCatalogViewModel(
        application.FIRST_PARTY_CATALOG_ENTRIES,
      ),
  ],
  [
    "checkers",
    protocol.createQualityCheckersRequest,
    () =>
      application.buildQualityCheckersViewModel({
        adapters: application.QUALITY_CHECKER_ADAPTERS,
      }),
  ],
  [
    "graph",
    protocol.createQualityGraphRequest,
    async (root: string) =>
      application.buildQualityGraphViewModel({
        snapshot: await application.loadQualityGraphSnapshot(
          root,
          application.nodeFileSystem,
        ),
      }),
  ],
] as const;

describe("daemon Engineering Quality surface", () => {
  it("advertises four read-only quality capabilities", async () => {
    const root = await fixtureRoot();
    const daemon = await startQualityDaemon(root);
    const response = await rawRequest(
      daemon.endpoint,
      protocol.createDaemonInfoRequest("quality-info"),
      daemon.token,
    );
    expect(response).toMatchObject({
      result: { compatibility: { status: "compatible" } },
    });
    const capabilities = (
      response as {
        result: { capabilities: { method: string; classification: string }[] };
      }
    ).result.capabilities;
    expect(
      capabilities
        .filter(({ method }) => method.startsWith("intentloom.quality."))
        .map(({ method, operation, classification }) => [
          method,
          operation,
          classification,
        ]),
    ).toEqual([
      [protocol.QUALITY_STANDARDS_METHOD, "quality.standards", "read-only"],
      [protocol.QUALITY_CATALOG_METHOD, "quality.catalog", "read-only"],
      [protocol.QUALITY_CHECKERS_METHOD, "quality.checkers", "read-only"],
      [protocol.QUALITY_GRAPH_METHOD, "quality.graph", "read-only"],
    ]);
  });

  it.each(qualityCases)(
    "returns CLI-equivalent %s viewmodel",
    async (_name, createRequest, expectedBuilder) => {
      const root = await fixtureRoot();
      const daemon = await startQualityDaemon(root);
      const expected = await expectedBuilder(root);
      const response = await rawRequest(
        daemon.endpoint,
        createRequest(_name, root),
        daemon.token,
      );
      expect(responseViewmodel(response)).toEqual(expected);
    },
  );

  it.each(qualityCases)(
    "rejects invalid roots for %s",
    async (_name, createRequest) => {
      const root = await fixtureRoot();
      const daemon = await startQualityDaemon(root);
      for (const invalidRoot of [join(root, "missing"), "relative-root"]) {
        const response = await rawRequest(
          daemon.endpoint,
          createRequest(_name, invalidRoot),
          daemon.token,
        );
        expect(response).toMatchObject({
          error: { data: { clientErrorCode: "invalid_root" } },
        });
      }
    },
  );
});
