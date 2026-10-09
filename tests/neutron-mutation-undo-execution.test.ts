import {
  mkdtemp,
  readdir,
  readFile,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  NEUTRON_READ_ONLY_TOOLS,
  PROTOCOL_VERSION,
} from "@intentloom/protocol";
import { nodeFileSystem } from "../packages/application/src/index.js";
import type { FileSystem } from "../packages/application/src/index.js";
import {
  decodeDurableTransactionRecord,
  encodeDurableTransactionRecord,
} from "../packages/application/src/neutron/mutation/apply/neutron-mutation-apply-durable-record.js";
import {
  acquireNeutronMutationApplyLock,
  releaseNeutronMutationApplyLock,
} from "../packages/application/src/neutron/mutation/apply/neutron-mutation-apply-durable-lock.js";
import { approveAndApplyNeutronGraphMutation } from "../packages/application/src/neutron/neutron-scheduler.js";
import { canonicalizeNeutronMutationRoot } from "../packages/application/src/neutron/mutation/apply/neutron-mutation-containment.js";
import { readNeutronMutationStatus } from "../packages/application/src/neutron/mutation/status/neutron-mutation-status-read.js";
import {
  isHostUndoApproval,
  issueHostUndoApproval,
} from "../packages/application/src/neutron/mutation/undo/neutron-mutation-undo-approval.js";
import {
  approveAndUndoNeutronMutation,
  readNeutronMutationUndoExecution,
} from "../packages/application/src/neutron/mutation/undo/neutron-mutation-undo-run.js";
import { preflightNeutronMutationUndo } from "../packages/application/src/neutron/mutation/undo/neutron-mutation-undo-preflight.js";
import {
  undoSnapshotManifestPath,
  undoSnapshotPayloadPath,
} from "../packages/application/src/neutron/mutation/undo/neutron-mutation-undo-snapshot-manifest.js";
import { readUndoSnapshotManifest } from "../packages/application/src/neutron/mutation/undo/neutron-mutation-undo-snapshot-store.js";
import { retryAppliedNeutronMutationVerification } from "../packages/application/src/neutron/mutation/verification/neutron-mutation-verification-retry-run.js";
import { listRegisteredNeutronTools } from "../packages/application/src/neutron/tools/neutron-tool-registry.js";
import {
  NEUTRON_MUTATION_APPROVAL_INTENT_ACTION,
  NEUTRON_MUTATION_APPROVAL_INTENT_SCHEMA_URN,
} from "../packages/protocol/src/neutron/mutation/approval/neutron-mutation-approval-intent.js";
import { NEUTRON_MUTATION_UNDO_INTENT_SCHEMA_URN } from "../packages/protocol/src/neutron/mutation/undo/neutron-mutation-undo.js";
import {
  NEUTRON_MUTATION_UNDO_REQUEST_ACTION,
  NEUTRON_MUTATION_UNDO_REQUEST_SCHEMA_URN,
} from "../packages/protocol/src/neutron/mutation/undo/neutron-mutation-undo-request.js";
import { NEUTRON_MUTATION_CLASS } from "../packages/protocol/src/neutron/mutation/neutron-mutation.js";
import { NEUTRON_MUTATION_VERIFICATION_RETRY_SCHEMA_URN } from "../packages/protocol/src/neutron/mutation/verification/neutron-mutation-verification-retry-rpc.js";
import {
  REVIEW_GRAPH_ID,
  materializeReviewBundle,
  reviewCandidate,
  reviewProject,
} from "./neutron-mutation-review-support.js";
import {
  SLICE5_CONTENT_A,
  SLICE5_CONTENT_Z,
  SLICE5_NOW,
  slice5Session,
} from "./neutron-mutation-slice5-support.js";
import { fingerprintNeutronProjectRoot } from "../packages/application/src/neutron/neutron-session-fingerprint.js";

const CREATED = "export const created = 1;\n";
const OLD_A = "old a\n";

describe("host-authorized undo transaction", () => {
  it.each([
    ["approvalToken", "approved:sha256:" + "ab".repeat(32)],
    ["approval", { approvalId: "apply-approval" }],
    ["approvalId", "apply-approval"],
    ["previousContent", OLD_A],
    ["proposedContent", SLICE5_CONTENT_A],
    ["paths", ["src/a.ts"]],
    ["changedPaths", ["src/a.ts"]],
    ["snapshotPath", "/tmp/undo-snapshots/secret"],
    ["manifestDigest", "sha256:" + "cd".repeat(32)],
    ["preApplyDigest", "sha256:" + "cd".repeat(32)],
    ["expectedContentDigest", "sha256:" + "cd".repeat(32)],
    ["mutationAllowed", true],
    ["planDigest", "sha256:" + "cd".repeat(32)],
    ["reviewArtifactDigest", "sha256:" + "cd".repeat(32)],
    ["rollbackEvidence", { files: [] }],
  ] as const)("rejects caller %s", async (key, value) => {
    const ready = await appliedReady();
    const result = await undo(ready, {
      intent: { ...request(ready), [key]: value },
    });
    expect(result.outcome).toBe("intent-rejected");
    expect(result.undone).toBe(false);
    expect(result.verified).toBe(false);
    expect(ready.writes.count).toBe(0);
    expect(await readFile(join(ready.root, "src/a.ts"), "utf8")).toBe(
      SLICE5_CONTENT_A,
    );
  });

  it("rejects an Apply mutation class as Undo approval", () => {
    const issued = issueHostUndoApproval({
      originalTransactionId: "original",
      undoTransactionId: "undo",
      root: "/tmp/project",
      projectId: "project",
      sessionId: "session",
      graphId: "graph",
      proposalId: "proposal",
      pathSetDigest: "sha256:" + "ab".repeat(32),
      snapshotManifestDigest: "sha256:" + "cd".repeat(32),
      expectedContentDigests: [
        { path: "src/a.ts", digest: "sha256:" + "11".repeat(32) },
      ],
      restorationPayloadDigests: [{ path: "src/a.ts", payloadDigest: null }],
      now: SLICE5_NOW,
    });
    expect(issued.mutationClass).toBe("undo");
    expect(issued.mutationClass).not.toBe(NEUTRON_MUTATION_CLASS);
    expect(isHostUndoApproval(issued, SLICE5_NOW)).toBe(true);
    expect(
      isHostUndoApproval(
        { ...issued, mutationClass: NEUTRON_MUTATION_CLASS },
        SLICE5_NOW,
      ),
    ).toBe(false);
    expect(JSON.stringify(issued.approvalToken)).toContain("approved:");
  });

  it.each([
    ["root", "/tmp/other-root"],
    ["sessionId", "other-session"],
    ["projectId", "other-project"],
    ["graphId", "other-graph"],
    ["proposalId", "other-proposal"],
    ["transactionId", "other-transaction"],
  ] as const)("rejects the wrong %s", async (field, value) => {
    const ready = await appliedReady();
    const result = await undo(ready, {
      intent: { ...request(ready), [field]: value },
    });
    expect(result.undone).toBe(false);
    expect(["transaction-not-found", "transaction-mismatch"]).toContain(
      result.outcome,
    );
    expect(ready.writes.count).toBe(0);
    expect(await readFile(join(ready.root, "src/a.ts"), "utf8")).toBe(
      SLICE5_CONTENT_A,
    );
  });

  it("keeps a pre-U2 transaction non-undoable", async () => {
    const ready = await appliedReady();
    const file = await approvalFile(ready.durable);
    const record = decodeDurableTransactionRecord(await readFile(file, "utf8"));
    const { undoRestoration: _ignored, ...legacy } = record;
    await writeFile(file, encodeDurableTransactionRecord(legacy));
    await rm(join(ready.durable, "undo-snapshots"), { recursive: true });
    ready.writes.count = 0;
    const result = await undo(ready);
    expect(result.outcome).toBe("undo-source-unavailable");
    expect(result.undone).toBe(false);
    expect(ready.writes.count).toBe(0);
    expect(await readFile(join(ready.root, "src/a.ts"), "utf8")).toBe(
      SLICE5_CONTENT_A,
    );
  });

  it("does not delete a pre-U2 created file", async () => {
    const ready = await appliedReady(nodeFileSystem, true);
    const file = await approvalFile(ready.durable);
    const record = decodeDurableTransactionRecord(await readFile(file, "utf8"));
    const { undoRestoration: _ignored, ...legacy } = record;
    await writeFile(file, encodeDurableTransactionRecord(legacy));
    await rm(join(ready.durable, "undo-snapshots"), { recursive: true });
    ready.writes.count = 0;
    const result = await undo(ready);
    expect(result.undone).toBe(false);
    expect(ready.writes.count).toBe(0);
    expect(await readFile(join(ready.root, "src/created.ts"), "utf8")).toBe(
      CREATED,
    );
  });

  it("rejects a missing, corrupt, or cross-transaction snapshot", async () => {
    const missing = await appliedReady();
    await rm(join(missing.durable, "undo-snapshots"), { recursive: true });
    expect((await undo(missing)).outcome).toBe("integrity-failure");
    expect(missing.writes.count).toBe(0);

    const corrupt = await appliedReady();
    await writeFile(
      undoSnapshotManifestPath(corrupt.durable, corrupt.transactionId),
      "{",
    );
    expect((await undo(corrupt)).outcome).toBe("integrity-failure");
    expect(await readFile(join(corrupt.root, "src/a.ts"), "utf8")).toBe(
      SLICE5_CONTENT_A,
    );

    const payload = await appliedReady();
    const manifest = await readUndoSnapshotManifest(
      payload.durable,
      payload.transactionId,
    );
    await writeFile(
      undoSnapshotPayloadPath(
        payload.durable,
        payload.transactionId,
        manifest?.files[0]?.payloadDigest ?? "",
      ),
      "tampered\n",
    );
    expect((await undo(payload)).outcome).toBe("integrity-failure");
    expect(payload.writes.count).toBe(0);

    const left = await appliedReady();
    const right = await appliedReady();
    await writeFile(
      undoSnapshotManifestPath(right.durable, right.transactionId),
      await readFile(
        undoSnapshotManifestPath(left.durable, left.transactionId),
      ),
    );
    expect((await undo(right)).outcome).toBe("integrity-failure");
    expect(await readFile(join(right.root, "src/a.ts"), "utf8")).toBe(
      SLICE5_CONTENT_A,
    );
  });

  it("rejects an incomplete or widened mixed snapshot", async () => {
    const ready = await appliedReady(
      nodeFileSystem,
      false,
      reviewCandidate([
        { path: "src/a.ts", content: SLICE5_CONTENT_A },
        { path: "src/created.ts", content: CREATED },
      ]),
    );
    const manifest = await readUndoSnapshotManifest(
      ready.durable,
      ready.transactionId,
    );
    const updated = manifest?.files.find(
      (file) => file.effect === "restore-updated",
    );
    await rm(
      undoSnapshotPayloadPath(
        ready.durable,
        ready.transactionId,
        updated?.payloadDigest ?? "",
      ),
    );
    expect((await undo(ready)).outcome).toBe("integrity-failure");
    expect(ready.writes.count).toBe(0);
    expect(await readFile(join(ready.root, "src/created.ts"), "utf8")).toBe(
      CREATED,
    );

    const extra = await appliedReady();
    const home = join(extra.durable, "undo-snapshots");
    const entries = await readdir(home);
    const folder = entries.find((entry) => !entry.endsWith(".gate"));
    await writeFile(join(home, folder ?? "", "payloads", "extra"), "nope");
    expect((await undo(extra)).outcome).toBe("integrity-failure");
    expect(extra.writes.count).toBe(0);
  });

  it("blocks an externally edited or missing path without writing", async () => {
    const edited = await appliedReady();
    await writeFile(join(edited.root, "src/a.ts"), "external\n");
    expect((await undo(edited)).outcome).toBe("stale-current-state");
    expect(edited.writes.count).toBe(0);
    expect(await readFile(join(edited.root, "src/a.ts"), "utf8")).toBe(
      "external\n",
    );

    const created = await appliedReady(nodeFileSystem, true);
    await writeFile(join(created.root, "src/created.ts"), "external created\n");
    expect((await undo(created)).outcome).toBe("stale-current-state");
    expect(created.writes.count).toBe(0);

    const missing = await appliedReady(nodeFileSystem, true);
    await rm(join(missing.root, "src/created.ts"));
    expect((await undo(missing)).outcome).toBe("stale-current-state");
    expect(missing.writes.count).toBe(0);
    await expect(stat(join(missing.root, "src/created.ts"))).rejects.toThrow(
      "ENOENT",
    );
  });

  it("blocks a symlink replacement and a root escape", async () => {
    const linked = await appliedReady();
    await rm(join(linked.root, "src/a.ts"));
    await symlink(join(linked.root, "src/z.ts"), join(linked.root, "src/a.ts"));
    const linkResult = await undo(linked);
    expect(linkResult.undone).toBe(false);
    expect(linked.writes.count).toBe(0);
    expect(await readFile(join(linked.root, "src/z.ts"), "utf8")).toBe(
      SLICE5_CONTENT_Z,
    );

    const escaped = await appliedReady();
    const outside = join(tmpdir(), `undo-outside-${escaped.transactionId}`);
    await writeFile(outside, "outside\n");
    await rm(join(escaped.root, "src/a.ts"));
    await symlink(outside, join(escaped.root, "src/a.ts"));
    const escapeResult = await undo(escaped);
    expect(escapeResult.undone).toBe(false);
    expect(escaped.writes.count).toBe(0);
    expect(await readFile(outside, "utf8")).toBe("outside\n");
  });

  it("blocks a change that lands after preflight and before the write", async () => {
    const ready = await appliedReady();
    const result = await undo(ready, {
      beforeMutation: async () => {
        await writeFile(join(ready.root, "src/a.ts"), "raced\n");
      },
    });
    expect(result.outcome).toBe("stale-current-state");
    expect(result.undone).toBe(false);
    expect(ready.writes.count).toBe(0);
    expect(await readFile(join(ready.root, "src/a.ts"), "utf8")).toBe(
      "raced\n",
    );
  });

  it("restores updated bytes and removes a created file", async () => {
    const updated = await appliedReady();
    const restored = await undo(updated);
    expect(restored).toMatchObject({
      historicalApplied: true,
      outcome: "undone",
      undone: true,
      verification: "pending",
      verified: false,
    });
    expect(restored.reconciliationRequired).toBe(false);
    expect(await readFile(join(updated.root, "src/a.ts"), "utf8")).toBe(OLD_A);
    expect(await readFile(join(updated.root, "src/z.ts"), "utf8")).toBe(
      SLICE5_CONTENT_Z,
    );
    expect(JSON.stringify(restored)).not.toContain(OLD_A);
    expect(JSON.stringify(restored)).not.toContain("approved:");
    expect(JSON.stringify(restored)).not.toContain("undo-snapshots");

    const created = await appliedReady(nodeFileSystem, true);
    await writeFile(join(created.root, "notes.txt"), "keep\n");
    const removed = await undo(created);
    expect(removed.outcome).toBe("undone");
    await expect(stat(join(created.root, "src/created.ts"))).rejects.toThrow(
      "ENOENT",
    );
    expect(await stat(join(created.root, "src"))).toMatchObject({
      isDirectory: expect.any(Function),
    });
    expect((await stat(join(created.root, "src"))).isDirectory()).toBe(true);
    expect(await readFile(join(created.root, "notes.txt"), "utf8")).toBe(
      "keep\n",
    );
  });

  it("undoes a mixed transaction without removing the parent directory", async () => {
    const ready = await appliedReady(
      nodeFileSystem,
      false,
      reviewCandidate([
        { path: "src/a.ts", content: SLICE5_CONTENT_A },
        { path: "nested/created.ts", content: CREATED },
      ]),
    );
    const before = await readFile(await approvalFile(ready.durable), "utf8");
    const manifestBefore = await readFile(
      undoSnapshotManifestPath(ready.durable, ready.transactionId),
      "utf8",
    );
    const result = await undo(ready);
    expect(result.outcome).toBe("undone");
    expect(result.createdPathCount).toBe(1);
    expect(result.updatedPathCount).toBe(1);
    expect(await readFile(join(ready.root, "src/a.ts"), "utf8")).toBe(OLD_A);
    await expect(stat(join(ready.root, "nested/created.ts"))).rejects.toThrow(
      "ENOENT",
    );
    expect((await stat(join(ready.root, "nested"))).isDirectory()).toBe(true);
    expect(await readFile(join(ready.root, "src/z.ts"), "utf8")).toBe(
      SLICE5_CONTENT_Z,
    );
    expect(await readFile(await approvalFile(ready.durable), "utf8")).toBe(
      before,
    );
    expect(
      await readFile(
        undoSnapshotManifestPath(ready.durable, ready.transactionId),
        "utf8",
      ),
    ).toBe(manifestBefore);
    const record = decodeDurableTransactionRecord(before);
    expect(record.state).toBe("applied");
    expect(record.result?.applied).toBe(true);
  });

  it("fails before the first write with no project change", async () => {
    const ready = await appliedReady();
    const result = await undo(ready, { failAt: "before-write" });
    expect(result.outcome).toBe("failed-before-write");
    expect(result.undone).toBe(false);
    expect(ready.writes.count).toBe(0);
    expect(await readFile(join(ready.root, "src/a.ts"), "utf8")).toBe(
      SLICE5_CONTENT_A,
    );
    ready.writes.count = 0;
    const retried = await undo(ready);
    expect(retried.outcome).toBe("undone");
    expect(await readFile(join(ready.root, "src/a.ts"), "utf8")).toBe(OLD_A);
  });

  it("rolls a partial undo back to the applied bytes", async () => {
    const ready = await appliedReady(
      nodeFileSystem,
      false,
      reviewCandidate([
        { path: "src/a.ts", content: SLICE5_CONTENT_A },
        { path: "src/created.ts", content: CREATED },
      ]),
    );
    const result = await undo(ready, { failAt: "after-first-mutation" });
    expect(result.outcome).toBe("transaction-failed");
    expect(result.undone).toBe(false);
    expect(result.reconciliationRequired).toBe(false);
    expect(await readFile(join(ready.root, "src/a.ts"), "utf8")).toBe(
      SLICE5_CONTENT_A,
    );
    expect(await readFile(join(ready.root, "src/created.ts"), "utf8")).toBe(
      CREATED,
    );
  });

  it("requires reconciliation when undo rollback cannot finish", async () => {
    const ready = await appliedReady();
    const failed = await undo(ready, { failAt: "rollback" });
    expect(failed).toMatchObject({
      outcome: "reconciliation-required",
      reconciliationRequired: true,
      undone: false,
      verified: false,
    });
    ready.writes.count = 0;
    const again = await undo(ready);
    expect(again.outcome).toBe("reconciliation-required");
    expect(again.undone).toBe(false);
    expect(ready.writes.count).toBe(0);
  });

  it("replays one undo across a repeated call and a restart lookup", async () => {
    const ready = await appliedReady();
    const first = await undo(ready);
    expect(first.outcome).toBe("undone");
    const writesAfter = ready.writes.count;
    const second = await undo(ready);
    expect(second.outcome).toBe("replay");
    expect(second.undoTransactionId).toBe(first.undoTransactionId);
    expect(second.verified).toBe(false);
    expect(ready.writes.count).toBe(writesAfter);
    const status = await readNeutronMutationUndoExecution({
      directory: ready.durable,
      intent: request(ready),
    });
    expect(status.outcome).toBe("undone");
    expect(status.undone).toBe(true);
    expect(status.verified).toBe(false);
    expect(ready.writes.count).toBe(writesAfter);
    expect(await readFile(join(ready.root, "src/a.ts"), "utf8")).toBe(OLD_A);
  });

  it("lets only one of two callers undo the same transaction", async () => {
    const ready = await appliedReady();
    const [left, right] = await Promise.all([undo(ready), undo(ready)]);
    const outcomes = [left.outcome, right.outcome].toSorted();
    expect(outcomes.filter((outcome) => outcome === "undone")).toHaveLength(1);
    expect(outcomes.some((outcome) => outcome === "undone")).toBe(true);
    expect(ready.writes.count).toBe(1);
    expect(await readFile(join(ready.root, "src/a.ts"), "utf8")).toBe(OLD_A);
    ready.writes.count = 0;
    const replayed = await undo(ready);
    expect(replayed.outcome).toBe("replay");
    expect(ready.writes.count).toBe(0);
  });

  it("does not reuse undo authority for a different original transaction", async () => {
    const first = await appliedReady();
    const second = await appliedReady();
    expect((await undo(first)).outcome).toBe("undone");
    expect(await readFile(join(second.root, "src/a.ts"), "utf8")).toBe(
      SLICE5_CONTENT_A,
    );
    expect((await undo(second)).outcome).toBe("undone");
    expect(await readFile(join(second.root, "src/a.ts"), "utf8")).toBe(OLD_A);
    expect(await readFile(join(first.root, "src/a.ts"), "utf8")).toBe(OLD_A);
  });

  it("blocks undo while another mutation holds the project lock", async () => {
    const ready = await appliedReady();
    const canonical = await canonicalizeNeutronMutationRoot(
      ready.root,
      nodeFileSystem,
    );
    const lock = await acquireNeutronMutationApplyLock({
      canonicalRoot: canonical ?? "",
      transactionId: "other-mutation",
      durableStateDirectory: ready.durable,
    });
    expect(lock.ok).toBe(true);
    const blocked = await undo(ready);
    expect(blocked.outcome).toBe("project-locked");
    expect(blocked.undone).toBe(false);
    expect(ready.writes.count).toBe(0);
    expect(await readFile(join(ready.root, "src/a.ts"), "utf8")).toBe(
      SLICE5_CONTENT_A,
    );
    if (lock.ok) {
      await releaseNeutronMutationApplyLock({
        key: lock.key,
        transactionId: "other-mutation",
        durableStateDirectory: ready.durable,
      });
    }
    expect((await undo(ready)).outcome).toBe("undone");
  });

  it("keeps Apply, preflight, verification retry, and N4 unchanged", async () => {
    const ready = await appliedReady();
    const preview = await preflightNeutronMutationUndo({
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
        transactionId: ready.transactionId,
      },
    });
    expect(preview).toMatchObject({
      approvalReusable: false,
      executionAuthorized: false,
      outcome: "eligible",
    });
    const status = await readNeutronMutationStatus({
      directory: ready.durable,
      graphId: REVIEW_GRAPH_ID,
      projectId: slice5Session(ready.root).projectId,
      proposalId: ready.proposalId,
      root: ready.root,
      sessionId: slice5Session(ready.root).sessionId,
      transactionId: ready.transactionId,
    });
    expect(status).toMatchObject({ applied: true, outcome: "recorded" });
    const undone = await undo(ready);
    expect(undone.verified).toBe(false);
    expect(undone.verification).toBe("pending");
    const record = decodeDurableTransactionRecord(
      await readFile(await approvalFile(ready.durable), "utf8"),
    );
    expect(record.result?.applied).toBe(true);
    expect(record.result?.verification?.status).toBe("verified");
    expect(
      (
        await retryAppliedNeutronMutationVerification({
          directory: ready.durable,
          fs: ready.fs,
          query: {
            graphId: REVIEW_GRAPH_ID,
            projectId: slice5Session(ready.root).projectId,
            proposalId: ready.proposalId,
            protocolVersion: PROTOCOL_VERSION,
            root: ready.root,
            schemaVersion: NEUTRON_MUTATION_VERIFICATION_RETRY_SCHEMA_URN,
            sessionId: slice5Session(ready.root).sessionId,
            transactionId: ready.transactionId,
          },
        })
      ).outcome,
    ).toBe("not-eligible");
    expect([...NEUTRON_READ_ONLY_TOOLS]).toEqual([
      "inspect",
      "doctor",
      "memorySearch",
      "timeline",
      "conformance",
      "securityAudit",
      "projectDiff",
    ]);
    expect(listRegisteredNeutronTools()).toHaveLength(7);
    expect(slice5Session(ready.root).mutationAllowed).toBe(false);
  });

  it("rolls back a failed apply without making that failure an undo", async () => {
    const ready = await prepared();
    const failed = await approve(ready, { failAt: "post-write-consistency" });
    expect(failed.applied).toBe(false);
    expect(await readFile(join(ready.root, "src/a.ts"), "utf8")).toBe(OLD_A);
    const writes = { count: 0 };
    ready.fs = countingFs(writes);
    const result = await undo({
      ...ready,
      transactionId: failed.transactionId ?? "",
      writes,
    });
    expect(result.undone).toBe(false);
    expect(writes.count).toBe(0);
    expect(await readFile(join(ready.root, "src/a.ts"), "utf8")).toBe(OLD_A);
  });
});

type Ready = Awaited<ReturnType<typeof prepared>> & {
  readonly transactionId: string;
  readonly writes: { count: number };
};

async function appliedReady(
  fs: FileSystem = nodeFileSystem,
  create = false,
  candidate = create
    ? reviewCandidate([{ path: "src/created.ts", content: CREATED }])
    : undefined,
): Promise<Ready> {
  const ready = await prepared(fs, create, candidate);
  const appliedResult = await approve(ready);
  expect(appliedResult.applied).toBe(true);
  const writes = { count: 0 };
  return {
    ...ready,
    fs: countingFs(writes),
    transactionId: appliedResult.transactionId ?? "",
    writes,
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
  const durable = await mkdirTemp();
  return {
    durable,
    fingerprint,
    fs,
    proposalId: materialized.bundle.proposal.proposalId,
    root,
    store: materialized.store,
  };
}

async function mkdirTemp(): Promise<string> {
  return mkdtemp(join(tmpdir(), "neutron-undo-exec-"));
}

function undo(
  ready: Ready,
  extra: {
    readonly intent?: unknown;
    readonly beforeMutation?: () => Promise<void>;
    readonly failAt?: "before-write" | "after-first-mutation" | "rollback";
  } = {},
) {
  return approveAndUndoNeutronMutation({
    directory: ready.durable,
    fs: ready.fs,
    intent: extra.intent ?? request(ready),
    now: SLICE5_NOW,
    ...(extra.beforeMutation === undefined
      ? {}
      : { beforeMutation: extra.beforeMutation }),
    ...(extra.failAt === undefined ? {} : { failAt: extra.failAt }),
  });
}

function request(ready: Ready) {
  const session = slice5Session(ready.root);
  return {
    action: NEUTRON_MUTATION_UNDO_REQUEST_ACTION,
    graphId: REVIEW_GRAPH_ID,
    projectId: session.projectId,
    proposalId: ready.proposalId,
    protocolVersion: PROTOCOL_VERSION,
    root: ready.root,
    schemaVersion: NEUTRON_MUTATION_UNDO_REQUEST_SCHEMA_URN,
    sessionId: session.sessionId,
    transactionId: ready.transactionId,
  };
}

function approve(
  ready: Awaited<ReturnType<typeof prepared>>,
  extra: { readonly failAt?: "post-write-consistency" } = {},
) {
  const session = slice5Session(ready.root);
  return approveAndApplyNeutronGraphMutation({
    currentProjectFingerprint: ready.fingerprint,
    durableStateDirectory: ready.durable,
    fs: ready.fs,
    graphStale: {
      baseline: { projectFingerprint: ready.fingerprint },
      current: { projectFingerprint: ready.fingerprint },
    },
    intent: {
      action: NEUTRON_MUTATION_APPROVAL_INTENT_ACTION,
      graphId: REVIEW_GRAPH_ID,
      projectId: session.projectId,
      proposalId: ready.proposalId,
      protocolVersion: PROTOCOL_VERSION,
      root: ready.root,
      schemaVersion: NEUTRON_MUTATION_APPROVAL_INTENT_SCHEMA_URN,
      sessionId: session.sessionId,
    },
    now: SLICE5_NOW,
    session,
    store: ready.store,
    ...extra,
  });
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

async function approvalFile(directory: string): Promise<string> {
  const names = await readdir(join(directory, "approvals"));
  const file = names.find((name) => name.endsWith(".json"));
  if (file === undefined) throw new Error("missing approval record");
  return join(directory, "approvals", file);
}
