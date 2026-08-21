import { createConnection } from "node:net";
import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  computeExternalSpecializedPackDigest,
  previewExternalSpecializedPack,
  registerSpecializedPackManifest,
  runSpecializedPacksExternalCliCommand,
} from "@intentloom/application";
import * as protocol from "@intentloom/protocol";
import { startLocalDaemon } from "../packages/daemon/src/index.js";
import * as externalHandlers from "../packages/daemon/src/specialized-pack-external-handlers.js";
import { workspaceDaemonCapabilities } from "../packages/daemon/src/workspace-daemon-dispatch.js";
import {
  QUALITY_PACK_ACTIVATION_SCHEMA_URN,
  QUALITY_SPECIALIZED_PACK_SCHEMA_URN,
  type QualitySpecializedPackManifest,
} from "@intentloom/protocol";

const daemons: { close(): Promise<void> }[] = [];

afterEach(async () => {
  await Promise.all(daemons.splice(0).map((daemon) => daemon.close()));
});

function externalManifest(
  overrides: Partial<QualitySpecializedPackManifest> = {},
): QualitySpecializedPackManifest {
  return {
    schemaVersion: QUALITY_SPECIALIZED_PACK_SCHEMA_URN,
    id: "pack-reviewed-org-mlops",
    version: "1.0.0",
    name: "Reviewed Org MLOps Pack",
    publisher: "Example Org",
    targetDisciplineIds: ["discipline-ml-ai"],
    providedArchitectureStrategies: ["batch-inference"],
    providedRuleIds: ["MLOPS-001-dataset-pin"],
    requiredTooling: [],
    permissionsRequired: ["project.files.read"],
    conflicts: [],
    dependencies: [],
    ...overrides,
  };
}

function sourceFor(manifest: QualitySpecializedPackManifest) {
  return {
    kind: "local" as const,
    locator: "./packs/mlops.json",
    pin: "local-v1",
    digest: computeExternalSpecializedPackDigest(manifest),
  };
}

function approvalFor(manifest = externalManifest()) {
  return {
    schemaVersion: QUALITY_PACK_ACTIVATION_SCHEMA_URN,
    decision: "approve" as const,
    reviewerId: "reviewer-ada",
    source: sourceFor(manifest),
  };
}

function previewParams(root: string, manifest = externalManifest()) {
  return {
    root,
    payload: JSON.stringify(manifest),
    source: sourceFor(manifest),
    declaredPublisher: manifest.publisher,
    declaredLicense: "MIT",
  };
}

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

function viewmodel(value: unknown): Record<string, unknown> {
  const payload = (value as { result?: { viewmodel?: unknown } }).result
    ?.viewmodel;
  if (payload === null || typeof payload !== "object" || Array.isArray(payload))
    throw new Error("daemon viewmodel is not an object");
  return payload as Record<string, unknown>;
}

function daemonEndpoint(directory: string): string {
  return process.platform === "win32"
    ? `\\\\.\\pipe\\intentloom-specialized-ext-${process.pid}-${randomUUID()}`
    : join(directory, "daemon.sock");
}

async function startExternalDaemon(root: string) {
  const directory = await mkdtemp(
    join(tmpdir(), "intentloom-specialized-ext-endpoint-"),
  );
  const token = "s".repeat(32);
  const daemon = await startLocalDaemon({
    endpoint: daemonEndpoint(directory),
    sessionToken: token,
    enforceCanonicalRoots: true,
    specializedPacksExternalPreview: (request) =>
      externalHandlers.handleSpecializedPacksExternalPreview(request, root),
    specializedPacksExternalActivate: (request) =>
      externalHandlers.handleSpecializedPacksExternalActivate(request, root),
  });
  daemons.push({
    async close() {
      await daemon.close();
      await rm(directory, { recursive: true, force: true });
    },
  });
  return { endpoint: daemon.endpoint, token };
}

describe("daemon Specialized Engineering Packs S8d external surface", () => {
  it("registers explicit read-only preview and mutating activate capabilities", () => {
    const capabilities = workspaceDaemonCapabilities({
      specializedPacksExternalPreview: async () => ({}),
      specializedPacksExternalActivate: async () => ({}),
    });
    expect(capabilities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          method: protocol.SPECIALIZED_PACKS_EXTERNAL_PREVIEW_METHOD,
          classification: "read-only",
        }),
        expect.objectContaining({
          method: protocol.SPECIALIZED_PACKS_EXTERNAL_ACTIVATE_METHOD,
          classification: "mutating",
        }),
      ]),
    );
  });

  it("returns preview parity with CLI and rejects invalid schema, root, and bounds", async () => {
    const root = await mkdtemp(
      join(tmpdir(), "intentloom-s8d-daemon-preview-"),
    );
    await mkdir(root, { recursive: true });
    const daemon = await startExternalDaemon(root);
    const manifest = externalManifest();
    const params = previewParams(root, manifest);

    const cli = await runSpecializedPacksExternalCliCommand("preview", {
      manifestJson: params.payload,
      sourceJson: JSON.stringify(params.source),
      declaredPublisher: params.declaredPublisher,
      declaredLicense: params.declaredLicense,
      json: true,
    });
    const rpc = viewmodel(
      await rawRequest(
        daemon.endpoint,
        protocol.createSpecializedPacksExternalPreviewRequest("preview", root, {
          payload: params.payload,
          source: params.source,
          declaredPublisher: params.declaredPublisher,
          declaredLicense: params.declaredLicense,
        }),
        daemon.token,
      ),
    );
    expect(rpc).toEqual(JSON.parse(cli.stdout));

    const invalid = await rawRequest(
      daemon.endpoint,
      {
        jsonrpc: "2.0",
        id: "bad",
        method: protocol.SPECIALIZED_PACKS_EXTERNAL_PREVIEW_METHOD,
        params: {
          protocolVersion: protocol.PROTOCOL_VERSION,
          root,
          payload: params.payload,
          source: params.source,
          declaredPublisher: params.declaredPublisher,
          declaredLicense: params.declaredLicense,
          extra: true,
        },
      },
      daemon.token,
    );
    expect(invalid).toMatchObject({ error: { code: -32602 } });

    const relative = await rawRequest(
      daemon.endpoint,
      protocol.createSpecializedPacksExternalPreviewRequest(
        "relative",
        "project",
        {
          payload: params.payload,
          source: params.source,
          declaredPublisher: params.declaredPublisher,
          declaredLicense: params.declaredLicense,
        },
      ),
      daemon.token,
    );
    expect(relative).toMatchObject({ error: { code: -32602 } });

    const oversized = await rawRequest(
      daemon.endpoint,
      protocol.createSpecializedPacksExternalPreviewRequest("big", root, {
        payload: params.payload,
        source: {
          ...params.source,
          locator: `./packs/${"y".repeat(3_000)}.json`,
        },
        declaredPublisher: params.declaredPublisher,
        declaredLicense: params.declaredLicense,
      }),
      daemon.token,
    );
    expect(oversized).toMatchObject({ error: { code: -32602 } });
    await rm(root, { recursive: true, force: true });
  });

  it("activates, idempotently re-applies, conflicts, and rejects approval mismatch", async () => {
    const root = await mkdtemp(
      join(tmpdir(), "intentloom-s8d-daemon-activate-"),
    );
    await mkdir(join(root, ".aif"), { recursive: true });
    const daemon = await startExternalDaemon(root);
    const manifest = externalManifest();
    const params = previewParams(root, manifest);
    const approval = approvalFor(manifest);
    const activateRequest =
      protocol.createSpecializedPacksExternalActivateRequest("activate", root, {
        ...params,
        approval,
      });

    const applied = viewmodel(
      await rawRequest(daemon.endpoint, activateRequest, daemon.token),
    );
    expect(applied.status).toBe("applied");
    expect(applied.changedPaths).toEqual([".aif/extension-lock.json"]);

    const again = viewmodel(
      await rawRequest(daemon.endpoint, activateRequest, daemon.token),
    );
    expect(again.status).toBe("already-applied");

    const conflictApproval = {
      ...approval,
      source: { ...approval.source, pin: "local-v2" },
    };
    const conflict = viewmodel(
      await rawRequest(
        daemon.endpoint,
        protocol.createSpecializedPacksExternalActivateRequest(
          "conflict",
          root,
          {
            ...params,
            source: conflictApproval.source,
            approval: conflictApproval,
          },
        ),
        daemon.token,
      ),
    );
    expect(conflict.status).toBe("conflict");

    const denied = viewmodel(
      await rawRequest(
        daemon.endpoint,
        protocol.createSpecializedPacksExternalActivateRequest("denied", root, {
          ...params,
          approval: {
            ...approval,
            source: {
              ...approval.source,
              digest:
                "sha256:0000000000000000000000000000000000000000000000000000000000000000",
            },
          },
        }),
        daemon.token,
      ),
    );
    expect(denied.status).toBe("denied");

    await rm(root, { recursive: true, force: true });
  });

  it("matches application preview for rejected first-party collision", () => {
    const firstParty = registerSpecializedPackManifest({
      id: "pack-tauri-desktop",
      version: "1.0.0",
      name: "Desktop",
      publisher: "Intentloom First-Party",
    });
    const manifest = externalManifest({ id: firstParty.id });
    const preview = previewExternalSpecializedPack({
      payload: JSON.stringify(manifest),
      source: sourceFor(manifest),
      declaredPublisher: manifest.publisher,
      declaredLicense: "MIT",
      existingManifests: [firstParty],
    });
    expect(preview.status).toBe("rejected");
  });

  it("rejects malformed lock files and keeps path traversal locators as metadata", async () => {
    const root = await mkdtemp(join(tmpdir(), "intentloom-s8d-daemon-lock-"));
    await mkdir(join(root, ".aif"), { recursive: true });
    await import("node:fs/promises").then((fs) =>
      fs.writeFile(join(root, ".aif/extension-lock.json"), "{broken"),
    );
    const daemon = await startExternalDaemon(root);
    const manifest = externalManifest();
    const params = previewParams(root, manifest);
    const denied = viewmodel(
      await rawRequest(
        daemon.endpoint,
        protocol.createSpecializedPacksExternalActivateRequest(
          "bad-lock",
          root,
          {
            ...params,
            approval: approvalFor(manifest),
          },
        ),
        daemon.token,
      ),
    );
    expect(denied.status).toBe("denied");

    const traversalManifest = externalManifest({
      id: "pack-traversal-metadata",
    });
    const traversalSource = {
      kind: "local" as const,
      locator: "./packs/normal.json",
      pin: "local-v1",
      digest: computeExternalSpecializedPackDigest(traversalManifest),
    };
    expect(() =>
      protocol.parseDaemonRequest({
        jsonrpc: "2.0",
        id: "trav",
        method: protocol.SPECIALIZED_PACKS_EXTERNAL_PREVIEW_METHOD,
        params: {
          protocolVersion: protocol.PROTOCOL_VERSION,
          root,
          payload: JSON.stringify(traversalManifest),
          source: {
            ...traversalSource,
            locator: "../outside/pack.json",
          },
          declaredPublisher: traversalManifest.publisher,
          declaredLicense: "MIT",
        },
      }),
    ).toThrow(/repository-relative path/);
    await rm(root, { recursive: true, force: true });
  });
});
