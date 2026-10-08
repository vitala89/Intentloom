import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { checksum } from "@intentloom/core";
import {
  NEUTRON_READ_ONLY_TOOLS,
  PROTOCOL_VERSION,
} from "@intentloom/protocol";
import { NEUTRON_MUTATION_REVIEW_MAX_FILE_CONTENT_BYTES } from "../packages/protocol/src/neutron-mutation-review-artifact.js";
import { nodeFileSystem } from "../packages/application/src/index.js";
import type { FileSystem } from "../packages/application/src/index.js";
import {
  decodeDurableTransactionRecord,
  encodeDurableTransactionRecord,
} from "../packages/application/src/neutron-mutation-apply-durable-record.js";
import { approveAndApplyNeutronGraphMutation } from "../packages/application/src/neutron-scheduler.js";
import { readNeutronMutationStatus } from "../packages/application/src/neutron-mutation-status-read.js";
import { prepareHostUndoSnapshot } from "../packages/application/src/neutron-mutation-undo-snapshot-capture.js";
import {
  encodeUndoSnapshotManifest,
  NEUTRON_MUTATION_UNDO_SNAPSHOT_SCHEMA_URN,
  restorationClaim,
  sealUndoSnapshotManifest,
  undoSnapshotGatePath,
  undoSnapshotManifestPath,
  undoSnapshotPayloadPath,
} from "../packages/application/src/neutron-mutation-undo-snapshot-manifest.js";
import {
  persistPreparedUndoSnapshot,
  readUndoSnapshotManifest,
  readUndoSnapshotPayload,
  UndoSnapshotStoreError,
} from "../packages/application/src/neutron-mutation-undo-snapshot-store.js";
import { preflightNeutronMutationUndo } from "../packages/application/src/neutron-mutation-undo-preflight.js";
import { retryAppliedNeutronMutationVerification } from "../packages/application/src/neutron-mutation-verification-retry-run.js";
import {
  NEUTRON_MUTATION_APPROVAL_INTENT_ACTION,
  NEUTRON_MUTATION_APPROVAL_INTENT_SCHEMA_URN,
} from "../packages/protocol/src/neutron-mutation-approval-intent.js";
import { NEUTRON_MUTATION_UNDO_INTENT_SCHEMA_URN } from "../packages/protocol/src/neutron-mutation-undo.js";
import { NEUTRON_MUTATION_VERIFICATION_RETRY_SCHEMA_URN } from "../packages/protocol/src/neutron-mutation-verification-retry-rpc.js";
import { compareNeutronMutationPaths } from "../packages/validator/src/neutron-mutation-canonical.js";
import { digestGeneratedFileContent } from "../packages/validator/src/neutron-mutation-review-digest.js";
import { listRegisteredNeutronTools } from "../packages/application/src/neutron-tool-registry.js";
import {
  REVIEW_GRAPH_ID,
  materializeReviewBundle,
  reviewCandidate,
  reviewProject,
} from "./neutron-mutation-review-support.js";
import {
  SLICE5_CONTENT_A,
  SLICE5_CONTENT_Z,
  slice5Session,
  SLICE5_NOW,
} from "./neutron-mutation-slice5-support.js";
import { fingerprintNeutronProjectRoot } from "../packages/application/src/neutron-session-fingerprint.js";

const CREATED = "export const created = 1;\n";
const OLD_A = "old a\n";

describe("trusted undo snapshot persistence", () => {
  it("stores exact updated bytes and omits unchanged paths", async () => {
    const ready = await prepared();
    const transactionId = await applied(ready);
    const manifest = await readUndoSnapshotManifest(
      ready.durable,
      transactionId,
    );
    expect(manifest?.state).toBe("applied-source");
    expect(manifest?.files.map((file) => file.path)).toEqual(["src/a.ts"]);
    const payloadDigest = manifest?.files[0]?.payloadDigest;
    expect(payloadDigest).toEqual(digestGeneratedFileContent(OLD_A));
    expect(
      await readUndoSnapshotPayload({
        directory: ready.durable,
        payloadDigest: payloadDigest ?? "",
        transactionId,
      }),
    ).toBe(OLD_A);
    expect(await readFile(join(ready.root, "src/a.ts"), "utf8")).toBe(
      SLICE5_CONTENT_A,
    );
    expect(JSON.stringify(manifest)).not.toContain(OLD_A);
    const record = JSON.parse(
      await readFile(await approvalFile(ready.durable), "utf8"),
    ) as { undoRestoration?: { manifestDigest: string } };
    expect(record.undoRestoration?.manifestDigest).toBe(
      manifest?.manifestDigest,
    );
    expect(JSON.stringify(record)).not.toContain(OLD_A);
  });

  it("records created absence without a payload body", async () => {
    const ready = await prepared(nodeFileSystem, true);
    const transactionId = await applied(ready);
    const manifest = await readUndoSnapshotManifest(
      ready.durable,
      transactionId,
    );
    expect(manifest?.files).toEqual([
      expect.objectContaining({
        effect: "remove-created",
        existedBefore: false,
        path: "src/created.ts",
        payloadDigest: null,
        preApplyDigest: null,
      }),
    ]);
    expect(
      await readUndoSnapshotPayload({
        directory: ready.durable,
        payloadDigest: "sha256:" + "ab".repeat(32),
        transactionId,
      }),
    ).toBeUndefined();
  });

  it("requires every source in a mixed transaction", async () => {
    const ready = await prepared(
      nodeFileSystem,
      false,
      reviewCandidate([
        { path: "src/a.ts", content: SLICE5_CONTENT_A },
        { path: "src/created.ts", content: CREATED },
      ]),
    );
    const transactionId = await applied(ready);
    const eligible = await run(ready, transactionId);
    expect(eligible).toMatchObject({
      approvalReusable: false,
      createdPathCount: 1,
      executionAuthorized: false,
      outcome: "eligible",
      updatedPathCount: 1,
    });
    const effects = (eligible.paths ?? []).map((path) => path.effect);
    effects.sort();
    expect(effects).toEqual(["remove-created", "restore-updated"]);
    const manifest = await readUndoSnapshotManifest(
      ready.durable,
      transactionId,
    );
    const updated = manifest?.files.find((file) => file.path === "src/a.ts");
    await rm(
      undoSnapshotPayloadPath(
        ready.durable,
        transactionId,
        updated?.payloadDigest ?? "",
      ),
    );
    const blocked = await run(ready, transactionId);
    expect(blocked.outcome).toBe("integrity-failure");
    expect(blocked.paths).toBeUndefined();
    expect(blocked.historicalApplied).toBe(true);
  });

  it("does not write the project when snapshot persistence fails", async () => {
    const writes = { count: 0 };
    const ready = await prepared(countingFs(writes));
    const result = await approve(ready, { undoSnapshotFault: "persist" });
    expect(result.applied).toBe(false);
    expect(result.failureCode).toBe("restoration-snapshot-failed");
    expect(writes.count).toBe(0);
    expect(await readFile(join(ready.root, "src/a.ts"), "utf8")).toBe(OLD_A);
  });

  it("does not write the project when snapshot validation fails", async () => {
    const writes = { count: 0 };
    const ready = await prepared(countingFs(writes));
    const result = await approve(ready, { undoSnapshotFault: "validate" });
    expect(result.applied).toBe(false);
    expect(result.failureCode).toBe("restoration-snapshot-failed");
    expect(writes.count).toBe(0);
    expect(await readFile(join(ready.root, "src/a.ts"), "utf8")).toBe(OLD_A);
  });

  it("fails closed when the file changes after capture", async () => {
    const writes = { count: 0 };
    const ready = await prepared(countingFs(writes));
    ready.fs = {
      ...ready.fs,
      read: async (path) => {
        const text = await nodeFileSystem.read(path);
        if (path.endsWith("src/a.ts") && (await hasManifest(ready.durable))) {
          return `${text}changed`;
        }
        return text;
      },
    };
    const result = await approve(ready);
    expect(result.applied).toBe(false);
    expect(result.failureCode).toBe("project-stale");
    expect(writes.count).toBe(0);
    expect(await readFile(join(ready.root, "src/a.ts"), "utf8")).toBe(OLD_A);
  });

  it("rejects a path that escapes the project root", async () => {
    const root = await reviewProject();
    const outside = await mkdtemp(join(tmpdir(), "neutron-undo-escape-"));
    const durable = await mkdtemp(join(tmpdir(), "neutron-undo-state-"));
    const canonical = await nodeFileSystem.realpath(root);
    const digest = `sha256:${"ab".repeat(32)}`;
    const preparedSnapshot = await prepareHostUndoSnapshot({
      directory: durable,
      fs: nodeFileSystem,
      preApplyProjectStateDigest: digest,
      record: {
        approvalDigest: digest,
        approvalId: "approval-escape",
        claimedAt: 0,
        lockKey: canonical,
        planDigest: digest,
        reviewArtifactDigest: digest,
        state: "executing",
        transactionId: "tx-escape",
        updatedAt: 0,
      },
      request: {
        approval: { approvalId: "approval-escape" },
        artifact: {
          artifactDigest: digest,
          changedPaths: ["../outside.ts"],
          fileBindings: [{ contentDigest: digest, path: "../outside.ts" }],
          planDigest: digest,
        },
        authorization: { kind: "host", mutationClass: "mutation" },
        files: [
          {
            checksum: checksum("nope\n"),
            content: "nope\n",
            path: "../outside.ts",
            sources: ["review:test"],
          },
        ],
        proposal: {
          proposalId: "proposal-escape",
          root,
          plan: { changedPaths: ["../outside.ts"], targetRoot: root },
        },
        transactionId: "tx-escape",
      } as never,
    });
    expect(preparedSnapshot.kind).toBe("failed");
    expect(await readdir(outside)).toEqual([]);
  });

  it("rejects a symlink before reading or writing it", async () => {
    const writes = { count: 0 };
    const ready = await prepared(symlinkFs(writes));
    const result = await approve(ready);
    expect(result.applied).toBe(false);
    expect(writes.count).toBe(0);
    expect(await readFile(join(ready.root, "src/a.ts"), "utf8")).toBe(OLD_A);
    await expect(
      readdir(join(ready.durable, "undo-snapshots")),
    ).rejects.toThrow("ENOENT");
  });

  it("does not snapshot hidden metadata or unapproved paths", async () => {
    const ready = await prepared();
    const transactionId = await applied(ready);
    const manifest = await readUndoSnapshotManifest(
      ready.durable,
      transactionId,
    );
    expect(manifest?.files.some((file) => file.path.includes(".aif"))).toBe(
      false,
    );
    if (manifest === undefined) throw new Error("missing manifest");
    const hidden = {
      effect: "remove-created" as const,
      existedBefore: false,
      expectedContentDigest: `sha256:${"cd".repeat(32)}`,
      path: ".aif/manifest.lock.json",
      payloadDigest: null,
      preApplyDigest: null,
    };
    const files = [...manifest.files, hidden];
    files.sort((left, right) =>
      compareNeutronMutationPaths(left.path, right.path),
    );
    const sealed = sealUndoSnapshotManifest(
      {
        ...manifest,
        changedPaths: [...manifest.changedPaths, hidden.path],
        files,
      },
      "applied-source",
    );
    await writeFile(
      undoSnapshotManifestPath(ready.durable, transactionId),
      encodeUndoSnapshotManifest(sealed),
    );
    const record = decodeDurableTransactionRecord(
      await readFile(await approvalFile(ready.durable), "utf8"),
    );
    await writeFile(
      await approvalFile(ready.durable),
      encodeDurableTransactionRecord({
        ...record,
        undoRestoration: restorationClaim(sealed.manifestDigest),
      }),
    );
    expect((await run(ready, transactionId)).outcome).toBe("integrity-failure");
  });

  it("rejects an updated file above the review byte bound", async () => {
    const huge = `${"x".repeat(NEUTRON_MUTATION_REVIEW_MAX_FILE_CONTENT_BYTES)}y`;
    const root = await reviewProject({
      "src/a.ts": huge,
      "src/z.ts": SLICE5_CONTENT_Z,
    });
    const fingerprint = await fingerprintNeutronProjectRoot(root);
    const materialized = materializeReviewBundle({
      candidate: reviewCandidate([
        { path: "src/a.ts", content: SLICE5_CONTENT_A },
      ]),
      fingerprint,
      root,
    });
    const ready = {
      durable: await mkdtemp(join(tmpdir(), "neutron-undo-bound-")),
      fingerprint,
      fs: nodeFileSystem,
      proposalId: materialized.bundle.proposal.proposalId,
      root,
      store: materialized.store,
    };
    const result = await approve(ready);
    expect(result.applied).toBe(false);
    expect(result.failureCode).toBe("restoration-snapshot-failed");
    expect(await readFile(join(root, "src/a.ts"), "utf8")).toBe(huge);
  });

  it("keeps restoration bytes out of public results and model calls", async () => {
    const ready = await prepared();
    const appliedResult = await approve(ready);
    const transactionId = appliedResult.transactionId ?? "";
    const preflight = await run(ready, transactionId);
    const status = await readNeutronMutationStatus({
      directory: ready.durable,
      ...identity(ready),
      transactionId,
    });
    for (const value of [appliedResult, preflight, status]) {
      expect(JSON.stringify(value)).not.toContain(OLD_A);
      expect(JSON.stringify(value)).not.toContain("previousContent");
    }
    const source = [
      "packages/application/src/neutron-mutation-undo-snapshot-capture.ts",
      "packages/application/src/neutron-mutation-undo-snapshot-store.ts",
      "packages/application/src/neutron-mutation-undo-snapshot-apply.ts",
      "packages/application/src/neutron-mutation-undo-preflight.ts",
    ]
      .map((path) => readFileSync(join(repoRoot(), path), "utf8"))
      .join("\n");
    expect(source).not.toContain("executeTurn");
    expect(source).not.toContain("ollama");
    expect([...NEUTRON_READ_ONLY_TOOLS]).toHaveLength(7);
    expect(listRegisteredNeutronTools()).toHaveLength(7);
    expect(slice5Session(ready.root).mutationAllowed).toBe(false);
  });
});

describe("undo snapshot durability", () => {
  it("reloads the same bytes and binding after a new read", async () => {
    const ready = await prepared();
    const transactionId = await applied(ready);
    const first = await readUndoSnapshotManifest(ready.durable, transactionId);
    const second = await readUndoSnapshotManifest(ready.durable, transactionId);
    expect(second).toEqual(first);
    expect(second).toMatchObject({
      approvalId: expect.any(String),
      lockKey: expect.any(String),
      planDigest: expect.any(String),
      preApplyProjectStateDigest: expect.any(String),
      proposalId: ready.proposalId,
      reviewArtifactDigest: expect.any(String),
      root: ready.root,
      schemaVersion: NEUTRON_MUTATION_UNDO_SNAPSHOT_SCHEMA_URN,
      state: "applied-source",
      transactionId,
    });
    expect(
      await readUndoSnapshotPayload({
        directory: ready.durable,
        payloadDigest: second?.files[0]?.payloadDigest ?? "",
        transactionId,
      }),
    ).toBe(OLD_A);
  });

  it("fails closed on corrupt manifest, payload, swap, and missing payload", async () => {
    const manifestCase = await prepared();
    const manifestId = await applied(manifestCase);
    await writeFile(
      undoSnapshotManifestPath(manifestCase.durable, manifestId),
      "{",
    );
    expect((await run(manifestCase, manifestId)).outcome).toBe(
      "integrity-failure",
    );

    const payloadCase = await prepared();
    const payloadId = await applied(payloadCase);
    const payloadManifest = await readUndoSnapshotManifest(
      payloadCase.durable,
      payloadId,
    );
    await writeFile(
      undoSnapshotPayloadPath(
        payloadCase.durable,
        payloadId,
        payloadManifest?.files[0]?.payloadDigest ?? "",
      ),
      "corrupt\n",
    );
    expect((await run(payloadCase, payloadId)).outcome).toBe(
      "integrity-failure",
    );

    const left = await prepared();
    const rightRoot = await reviewProject({
      "src/a.ts": "old b\n",
      "src/z.ts": SLICE5_CONTENT_Z,
    });
    const rightFingerprint = await fingerprintNeutronProjectRoot(rightRoot);
    const rightBundle = materializeReviewBundle({
      fingerprint: rightFingerprint,
      root: rightRoot,
    });
    const right = {
      durable: await mkdtemp(join(tmpdir(), "neutron-undo-swap-")),
      fingerprint: rightFingerprint,
      fs: nodeFileSystem,
      proposalId: rightBundle.bundle.proposal.proposalId,
      root: rightRoot,
      store: rightBundle.store,
    };
    const leftId = await applied(left);
    const rightId = await applied(right);
    const leftManifest = await readUndoSnapshotManifest(left.durable, leftId);
    const rightManifest = await readUndoSnapshotManifest(
      right.durable,
      rightId,
    );
    await writeFile(
      undoSnapshotPayloadPath(
        right.durable,
        rightId,
        rightManifest?.files[0]?.payloadDigest ?? "",
      ),
      await readFile(
        undoSnapshotPayloadPath(
          left.durable,
          leftId,
          leftManifest?.files[0]?.payloadDigest ?? "",
        ),
      ),
    );
    expect((await run(right, rightId)).outcome).toBe("integrity-failure");

    const missing = await prepared();
    const missingId = await applied(missing);
    const missingManifest = await readUndoSnapshotManifest(
      missing.durable,
      missingId,
    );
    await rm(
      undoSnapshotPayloadPath(
        missing.durable,
        missingId,
        missingManifest?.files[0]?.payloadDigest ?? "",
      ),
    );
    expect((await run(missing, missingId)).outcome).toBe("integrity-failure");
  });

  it("refuses a second writer and a held gate", async () => {
    const directory = await mkdtemp(join(tmpdir(), "neutron-undo-store-"));
    const digest = digestGeneratedFileContent(OLD_A);
    const draft = snapshotDraft("tx-store", digest);
    const first = await persistPreparedUndoSnapshot({
      directory,
      draft,
      payloads: new Map([[digest, OLD_A]]),
    });
    await expect(
      persistPreparedUndoSnapshot({
        directory,
        draft: snapshotDraft("tx-store", digestGeneratedFileContent("other\n")),
        payloads: new Map([[digestGeneratedFileContent("other\n"), "other\n"]]),
      }),
    ).rejects.toBeInstanceOf(UndoSnapshotStoreError);
    expect(
      await readUndoSnapshotPayload({
        directory,
        payloadDigest: digest,
        transactionId: "tx-store",
      }),
    ).toBe(OLD_A);
    expect(first.state).toBe("prepared");
    await mkdir(undoSnapshotGatePath(directory, "tx-gate"));
    await expect(
      persistPreparedUndoSnapshot({
        directory,
        draft: snapshotDraft("tx-gate", digest),
        payloads: new Map([[digest, OLD_A]]),
      }),
    ).rejects.toBeInstanceOf(UndoSnapshotStoreError);
    expect(
      await readUndoSnapshotManifest(directory, "tx-gate"),
    ).toBeUndefined();
  });

  it("rejects a truncated manifest and keeps a pre-U2 record unavailable", async () => {
    const ready = await prepared();
    const transactionId = await applied(ready);
    const raw = await readFile(
      undoSnapshotManifestPath(ready.durable, transactionId),
      "utf8",
    );
    await writeFile(
      undoSnapshotManifestPath(ready.durable, transactionId),
      raw.slice(0, 24),
    );
    expect((await run(ready, transactionId)).outcome).toBe("integrity-failure");

    const historical = await prepared();
    const historicalId = await applied(historical);
    const file = await approvalFile(historical.durable);
    const record = decodeDurableTransactionRecord(await readFile(file, "utf8"));
    const { undoRestoration: _ignored, ...legacy } = record;
    await writeFile(file, encodeDurableTransactionRecord(legacy));
    await rm(join(historical.durable, "undo-snapshots"), { recursive: true });
    const preflight = await run(historical, historicalId);
    expect(preflight).toMatchObject({
      approvalReusable: false,
      executionAuthorized: false,
      historicalApplied: true,
      outcome: "undo-source-unavailable",
    });
    const status = await readNeutronMutationStatus({
      directory: historical.durable,
      ...identity(historical),
      transactionId: historicalId,
    });
    expect(status).toMatchObject({ applied: true, outcome: "recorded" });
    expect(
      (
        await retryAppliedNeutronMutationVerification({
          directory: historical.durable,
          fs: historical.fs,
          query: retryQuery(historical, historicalId),
        })
      ).outcome,
    ).toBe("not-eligible");
  });
});

describe("undo snapshot apply regression", () => {
  it("rolls back a failed apply and does not make it undo-eligible", async () => {
    const ready = await prepared();
    const result = await approve(ready, { failAt: "post-write-consistency" });
    expect(result.applied).toBe(false);
    expect(await readFile(join(ready.root, "src/a.ts"), "utf8")).toBe(OLD_A);
    expect((await run(ready, result.transactionId ?? "")).outcome).toBe(
      "reconciliation-required",
    );
  });

  it("keeps a new verified create eligible without execution authority", async () => {
    const ready = await prepared(nodeFileSystem, true);
    const transactionId = await applied(ready);
    const result = await run(ready, transactionId);
    expect(result).toMatchObject({
      approvalReusable: false,
      executionAuthorized: false,
      historicalApplied: true,
      outcome: "eligible",
    });
    expect(result.paths?.[0]?.effect).toBe("remove-created");
    expect(JSON.stringify(result)).not.toContain(CREATED);
  });
});

function repoRoot(): string {
  return join(import.meta.dirname, "..");
}

function countingFs(writes: { count: number }): FileSystem {
  return {
    ...nodeFileSystem,
    mkdir: async (path) => {
      writes.count += 1;
      await nodeFileSystem.mkdir(path);
    },
    remove: async (path) => {
      writes.count += 1;
      await nodeFileSystem.remove(path);
    },
    write: async (path, content) => {
      writes.count += 1;
      await nodeFileSystem.write(path, content);
    },
  };
}

function symlinkFs(writes: { count: number }): FileSystem {
  const base = countingFs(writes);
  return {
    ...base,
    isSymbolicLink: async (path) =>
      path.endsWith("src/a.ts") || nodeFileSystem.isSymbolicLink(path),
  };
}

async function prepared(
  fs: FileSystem = nodeFileSystem,
  create = false,
  candidate = create
    ? reviewCandidate([{ path: "src/created.ts", content: CREATED }])
    : undefined,
) {
  const root = await reviewProject();
  const fingerprint = await fingerprintNeutronProjectRoot(root);
  const materialized = materializeReviewBundle({
    fingerprint,
    root,
    ...(candidate !== undefined ? { candidate } : {}),
  });
  const durable = await mkdtemp(join(tmpdir(), "neutron-undo-snap-"));
  return {
    durable,
    fingerprint,
    fs,
    proposalId: materialized.bundle.proposal.proposalId,
    root,
    store: materialized.store,
  };
}

async function hasManifest(directory: string): Promise<boolean> {
  try {
    const entries = await readdir(join(directory, "undo-snapshots"));
    for (const entry of entries) {
      if (entry.endsWith(".gate")) continue;
      try {
        await readFile(
          join(directory, "undo-snapshots", entry, "manifest.json"),
          "utf8",
        );
        return true;
      } catch {
        /* not this entry */
      }
    }
  } catch {
    return false;
  }
  return false;
}

type Ready = Awaited<ReturnType<typeof prepared>>;

function approve(
  ready: Ready,
  extra: {
    readonly failAt?: "post-write-consistency";
    readonly undoSnapshotFault?: "persist" | "validate";
  } = {},
) {
  return approveAndApplyNeutronGraphMutation({
    ...hostInput(ready),
    ...extra,
    intent: approvalIntent(ready),
  });
}

async function applied(ready: Ready): Promise<string> {
  const result = await approve(ready);
  expect(result.applied).toBe(true);
  return result.transactionId ?? "";
}

function hostInput(ready: Ready) {
  return {
    currentProjectFingerprint: ready.fingerprint,
    durableStateDirectory: ready.durable,
    fs: ready.fs,
    graphStale: {
      baseline: { projectFingerprint: ready.fingerprint },
      current: { projectFingerprint: ready.fingerprint },
    },
    now: SLICE5_NOW,
    session: slice5Session(ready.root),
    store: ready.store,
  };
}

function approvalIntent(ready: Ready) {
  const session = slice5Session(ready.root);
  return {
    action: NEUTRON_MUTATION_APPROVAL_INTENT_ACTION,
    graphId: REVIEW_GRAPH_ID,
    projectId: session.projectId,
    proposalId: ready.proposalId,
    protocolVersion: PROTOCOL_VERSION,
    root: ready.root,
    schemaVersion: NEUTRON_MUTATION_APPROVAL_INTENT_SCHEMA_URN,
    sessionId: session.sessionId,
  };
}

function identity(ready: Ready) {
  const session = slice5Session(ready.root);
  return {
    graphId: REVIEW_GRAPH_ID,
    projectId: session.projectId,
    proposalId: ready.proposalId,
    root: ready.root,
    sessionId: session.sessionId,
  };
}

function run(ready: Ready, transactionId: string) {
  return preflightNeutronMutationUndo({
    directory: ready.durable,
    fs: nodeFileSystem,
    intent: {
      graphId: REVIEW_GRAPH_ID,
      projectId: slice5Session(ready.root).projectId,
      proposalId: ready.proposalId,
      protocolVersion: PROTOCOL_VERSION,
      root: ready.root,
      schemaVersion: NEUTRON_MUTATION_UNDO_INTENT_SCHEMA_URN,
      sessionId: slice5Session(ready.root).sessionId,
      transactionId,
    },
  });
}

function retryQuery(ready: Ready, transactionId: string) {
  const session = slice5Session(ready.root);
  return {
    graphId: REVIEW_GRAPH_ID,
    projectId: session.projectId,
    proposalId: ready.proposalId,
    protocolVersion: PROTOCOL_VERSION,
    root: ready.root,
    schemaVersion: NEUTRON_MUTATION_VERIFICATION_RETRY_SCHEMA_URN,
    sessionId: session.sessionId,
    transactionId,
  };
}

async function approvalFile(directory: string): Promise<string> {
  const names = await readdir(join(directory, "approvals"));
  const file = names.find((name) => name.endsWith(".json"));
  if (file === undefined) throw new Error("missing approval record");
  return join(directory, "approvals", file);
}

function snapshotDraft(transactionId: string, payloadDigest: string) {
  const digest = `sha256:${"11".repeat(32)}`;
  return {
    schemaVersion: NEUTRON_MUTATION_UNDO_SNAPSHOT_SCHEMA_URN,
    transactionId,
    approvalId: "approval-store",
    proposalId: "proposal-store",
    reviewArtifactDigest: digest,
    planDigest: digest,
    root: "/tmp/project",
    lockKey: "/tmp/project",
    preApplyProjectStateDigest: digest,
    changedPaths: ["src/a.ts"],
    files: [
      {
        path: "src/a.ts",
        effect: "restore-updated" as const,
        existedBefore: true,
        preApplyDigest: payloadDigest,
        expectedContentDigest: digest,
        payloadDigest,
      },
    ],
  };
}
