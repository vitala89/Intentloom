import { createConnection } from "node:net";
import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import * as application from "@intentloom/application";
import * as protocol from "@intentloom/protocol";
import * as specializedHandlers from "../packages/daemon/src/specialized-pack-handlers.js";
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
  const root = await mkdtemp(join(tmpdir(), "intentloom-specialized-daemon-"));
  await mkdir(join(root, "apps", "desktop", "src-tauri"), { recursive: true });
  await writeFile(join(root, "apps", "desktop", "src-tauri", "Cargo.toml"), "");
  return root;
}

function daemonEndpoint(directory: string): string {
  return process.platform === "win32"
    ? `\\\\.\\pipe\\intentloom-specialized-${process.pid}-${randomUUID()}`
    : join(directory, "daemon.sock");
}

async function startSpecializedDaemon(root: string) {
  const directory = await mkdtemp(
    join(tmpdir(), "intentloom-specialized-endpoint-"),
  );
  const token = "s".repeat(32);
  const daemon = await startLocalDaemon({
    endpoint: daemonEndpoint(directory),
    sessionToken: token,
    enforceCanonicalRoots: true,
    specializedPacksCatalog: (request) =>
      specializedHandlers.handleSpecializedPacksCatalog(request, root),
    specializedPacksDetect: (request) =>
      specializedHandlers.handleSpecializedPacksDetect(request, root),
    specializedPacksChecks: (request) =>
      specializedHandlers.handleSpecializedPacksChecks(request, root),
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

describe("daemon Specialized Engineering Packs surface", () => {
  it("returns CLI-equivalent catalog and detect viewmodels", async () => {
    const root = await fixtureRoot();
    const daemon = await startSpecializedDaemon(root);
    const catalog = validateCatalogViewmodel(
      responseViewmodel(
        await rawRequest(
          daemon.endpoint,
          protocol.createSpecializedPacksCatalogRequest("catalog", root),
          daemon.token,
        ),
      ),
    );
    expect(catalog.totalEntries).toBe(4);

    const detect = responseViewmodel(
      await rawRequest(
        daemon.endpoint,
        protocol.createSpecializedPacksDetectRequest("detect", root),
        daemon.token,
      ),
    );
    expect(detect.compatiblePackIds).toContain("pack-tauri-desktop");
    expect(detect).toEqual(
      application.buildSpecializedPackDetectionViewModel(
        application.resolveFirstPartySpecializedPackDetection({
          projectPaths: await application.nodeFileSystem.list(root),
          entries: application.getFirstPartySpecializedPackEntries(),
        }),
      ),
    );

    const checks = responseViewmodel(
      await rawRequest(
        daemon.endpoint,
        protocol.createSpecializedPacksChecksRequest("checks", root),
        daemon.token,
      ),
    );
    expect(checks).toEqual(
      application.buildSpecializedPackChecksViewModel(
        application.resolveFirstPartySpecializedPackChecks({
          projectPaths: await application.nodeFileSystem.list(root),
          entries: application.getFirstPartySpecializedPackEntries(),
        }),
      ),
    );
  });

  it("rejects a non-absolute checks root at the configured-root boundary", async () => {
    const root = await fixtureRoot();
    const daemon = await startSpecializedDaemon(root);
    const response = await rawRequest(
      daemon.endpoint,
      protocol.createSpecializedPacksChecksRequest("relative", "project"),
      daemon.token,
    );
    expect(response).toMatchObject({
      error: { code: -32602 },
    });
  });
});

function validateCatalogViewmodel(value: Record<string, unknown>): {
  totalEntries: number;
} {
  return value as { totalEntries: number };
}
