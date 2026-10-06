import {
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  NEUTRON_READ_ONLY_TOOLS,
  PROTOCOL_VERSION,
  WORKSPACE_DAEMON_REQUEST_METHODS,
} from "@intentloom/protocol";
import { nodeFileSystem } from "../packages/application/src/index.js";
import type { FileSystem } from "../packages/application/src/index.js";
import {
  decodeDurableTransactionRecord,
  encodeDurableTransactionRecord,
} from "../packages/application/src/neutron-mutation-apply-durable-record.js";
import { buildNeutronMutationApplyResult } from "../packages/application/src/neutron-mutation-apply-result.js";
import { fingerprintNeutronProjectRoot } from "../packages/application/src/neutron-session-fingerprint.js";
import { approveAndApplyNeutronGraphMutation } from "../packages/application/src/neutron-scheduler.js";
import { readNeutronMutationStatus } from "../packages/application/src/neutron-mutation-status-read.js";
import { inspectNeutronMutationUndoCurrent } from "../packages/application/src/neutron-mutation-undo-current.js";
import { preflightNeutronMutationUndo } from "../packages/application/src/neutron-mutation-undo-preflight.js";
import { retryAppliedNeutronMutationVerification } from "../packages/application/src/neutron-mutation-verification-retry-run.js";
import {
  NEUTRON_MUTATION_APPROVAL_INTENT_ACTION,
  NEUTRON_MUTATION_APPROVAL_INTENT_SCHEMA_URN,
} from "../packages/protocol/src/neutron-mutation-approval-intent.js";
import {
  NEUTRON_MUTATION_UNDO_AUTHORITY_KEYS,
  NEUTRON_MUTATION_UNDO_INTENT_SCHEMA_URN,
  parseNeutronMutationUndoIntent,
} from "../packages/protocol/src/neutron-mutation-undo.js";
import { NEUTRON_MUTATION_VERIFICATION_RETRY_SCHEMA_URN } from "../packages/protocol/src/neutron-mutation-verification-retry-rpc.js";
import {
  REVIEW_GRAPH_ID,
  materializeReviewBundle,
  reviewCandidate,
  reviewProject,
} from "./neutron-mutation-review-support.js";
import {
  slice5Session,
  SLICE5_NOW,
} from "./neutron-mutation-slice5-support.js";

const CREATED = "export const created = 1;\n";
const FORBIDDEN_CALLS = [
  "executeApprovedApplyPlan",
  "executeTrustedDeclaredPathApply",
  "synchronizeGeneratedFiles",
  "applyApprovedNeutronMutation",
  "approveAndApplyNeutronGraphMutation",
  "issueNeutronMutationApproval",
  "executeTurn",
] as const;

describe("neutron mutation undo preflight", () => {
  it("examines a new verified update without writes and reports eligibility", async () => {
    const writes = { count: 0 };
    const ready = await prepared(countingFs(writes));
    const transactionId = await applied(ready);
    const afterApply = writes.count;
    expect(afterApply).toBeGreaterThan(0);
    const before = await readFile(await approvalFile(ready.durable), "utf8");
    const result = await run(ready, transactionId);
    expect(result).toMatchObject({
      approvalReusable: false,
      executionAuthorized: false,
      historicalApplied: true,
      outcome: "eligible",
      transactionId,
      unchangedPathCount: 1,
      updatedPathCount: 1,
    });
    expect(result.paths).toEqual([
      {
        effect: "restore-updated",
        expectedContentDigest: expect.stringMatching(/^sha256:[0-9a-f]{64}$/u),
        path: "src/a.ts",
        preApplyDigest: expect.stringMatching(/^sha256:[0-9a-f]{64}$/u),
      },
    ]);
    expect(JSON.stringify(result)).not.toContain("previousContent");
    expect(JSON.stringify(result)).not.toContain("old a");
    expect(writes.count).toBe(afterApply);
    expect(await readFile(await approvalFile(ready.durable), "utf8")).toBe(
      before,
    );
    expect(await readFile(join(ready.root, "src/a.ts"), "utf8")).not.toBe(
      "old a\n",
    );
  });

  it("rejects missing and mismatched identity", async () => {
    const ready = await prepared();
    const transactionId = await applied(ready);
    expect((await run(await prepared(), transactionId)).outcome).toBe(
      "transaction-not-found",
    );
    for (const override of [
      { root: `${ready.root}-x` },
      { sessionId: "other" },
      { projectId: "other" },
      { graphId: "other" },
      { proposalId: "other" },
    ]) {
      expect((await run(ready, transactionId, override)).outcome).toBe(
        "transaction-not-found",
      );
    }
    expect((await run(ready, "other-tx")).outcome).toBe("transaction-mismatch");
  });

  it("fails closed on corruption and non-terminal states", async () => {
    const corrupt = await prepared();
    const corruptId = await applied(corrupt);
    await writeFile(await approvalFile(corrupt.durable), "{");
    expect((await run(corrupt, corruptId)).outcome).toBe("integrity-failure");

    const claimed = await prepared();
    const claimedId = await applied(claimed);
    await rewriteState(claimed.durable, "claimed");
    expect((await run(claimed, claimedId)).outcome).toBe(
      "unsupported-transaction",
    );
    const executing = await prepared();
    const executingId = await applied(executing);
    await rewriteState(executing.durable, "executing");
    expect((await run(executing, executingId)).outcome).toBe(
      "unsupported-transaction",
    );
    const beforeWrite = await prepared();
    const beforeWriteId = await applied(beforeWrite);
    await rewriteState(beforeWrite.durable, "failed-before-write");
    expect((await run(beforeWrite, beforeWriteId)).outcome).toBe("not-applied");
    const reconciliation = await prepared();
    const reconciliationId = await applyReconciliation(reconciliation);
    expect((await run(reconciliation, reconciliationId)).outcome).toBe(
      "reconciliation-required",
    );
  });

  it("rejects caller authority, content, and rollback evidence", async () => {
    const intent = undoIntent(
      { proposalId: "proposal", root: "/tmp/project" },
      "tx",
    );
    for (const key of NEUTRON_MUTATION_UNDO_AUTHORITY_KEYS) {
      expect(() =>
        parseNeutronMutationUndoIntent({ ...intent, [key]: "spoof" }),
      ).toThrow(new RegExp(key));
    }
    const preflight = await preflightNeutronMutationUndo({
      directory: undefined,
      fs: nodeFileSystem,
      intent: {
        ...intent,
        approvalToken: "tok",
        previousContent: "secret bytes",
      },
    });
    expect(preflight).toMatchObject({
      executionAuthorized: false,
      outcome: "integrity-failure",
    });
    expect(JSON.stringify(preflight)).not.toContain("secret bytes");
  });

  it("keeps an old record readable and non-undoable", async () => {
    const ready = await prepared();
    const transactionId = await applied(ready);
    await stripVerification(ready.durable);
    const decoded = decodeDurableTransactionRecord(
      await readFile(await approvalFile(ready.durable), "utf8"),
    );
    expect(decoded.result?.applied).toBe(true);
    expect(decoded.result?.verification).toBeUndefined();
    expect((await run(ready, transactionId)).outcome).toBe(
      "undo-source-unavailable",
    );
    const status = await readNeutronMutationStatus({
      directory: ready.durable,
      ...identity(ready),
      transactionId,
    });
    expect(status).toMatchObject({ applied: true, outcome: "recorded" });
    expect(
      (
        await retryAppliedNeutronMutationVerification({
          directory: ready.durable,
          fs: ready.fs,
          query: retryQuery(ready, transactionId),
        })
      ).outcome,
    ).toBe("not-eligible");
  });

  it("marks a later edit stale and leaves updated bytes unrestored", async () => {
    const ready = await prepared();
    const transactionId = await applied(ready);
    await writeFile(join(ready.root, "src/a.ts"), "external edit\n");
    const result = await run(ready, transactionId);
    expect(result.outcome).toBe("stale-current-state");
    expect(result.historicalApplied).toBe(true);
    expect(await readFile(join(ready.root, "src/a.ts"), "utf8")).toBe(
      "external edit\n",
    );
  });

  it("allows a verified create only while current bytes still match", async () => {
    const writes = { count: 0 };
    const ready = await prepared(countingFs(writes), true);
    const transactionId = await applied(ready);
    const afterApply = writes.count;
    const before = await readFile(await approvalFile(ready.durable), "utf8");
    const eligible = await run(ready, transactionId);
    expect(eligible).toMatchObject({
      approvalReusable: false,
      createdPathCount: 1,
      executionAuthorized: false,
      historicalApplied: true,
      outcome: "eligible",
      updatedPathCount: 0,
    });
    expect(eligible.paths).toEqual([
      {
        effect: "remove-created",
        expectedContentDigest: expect.stringMatching(/^sha256:[0-9a-f]{64}$/u),
        path: "src/created.ts",
      },
    ]);
    expect(JSON.stringify(eligible)).not.toContain(".aif/");
    expect(await readFile(join(ready.root, "src/created.ts"), "utf8")).toBe(
      CREATED,
    );
    await writeFile(join(ready.root, "src/created.ts"), "changed\n");
    expect((await run(ready, transactionId)).outcome).toBe(
      "stale-current-state",
    );
    await rm(join(ready.root, "src/created.ts"));
    expect((await run(ready, transactionId)).outcome).toBe(
      "stale-current-state",
    );
    expect(afterApply).toBeGreaterThan(0);
    expect(writes.count).toBe(afterApply);
    expect(await readFile(await approvalFile(ready.durable), "utf8")).toBe(
      before,
    );
  });

  it("fails closed on symlink escape, root escape, and hidden widening", async () => {
    const ready = await prepared(nodeFileSystem, true);
    const transactionId = await applied(ready);
    const outside = await mkdtemp(join(tmpdir(), "neutron-undo-outside-"));
    const escaped = join(outside, "secret.txt");
    await writeFile(escaped, "secret\n");
    await rm(join(ready.root, "src/created.ts"));
    await symlink(escaped, join(ready.root, "src/created.ts"));
    expect((await run(ready, transactionId)).outcome).toBe("integrity-failure");
    expect(await readFile(escaped, "utf8")).toBe("secret\n");

    const lexical = await inspectNeutronMutationUndoCurrent({
      fs: nodeFileSystem,
      inspection: {
        createdPaths: ["../outside.ts"],
        createsProvenAbsent: true,
        expectedDigests: new Map([
          ["../outside.ts", `sha256:${"ab".repeat(32)}`],
        ]),
        unchangedPaths: [],
        updatedPaths: [],
        verified: true,
      },
      root: ready.root,
    });
    expect(lexical).toBe("escape");

    await widenCreatedPath(ready.durable, ".aif/manifest.lock.json");
    const widened = await run(ready, transactionId);
    expect(widened.outcome).toBe("integrity-failure");
    expect(widened.paths).toBeUndefined();
    expect(JSON.stringify(widened)).not.toContain("manifest.lock");
  });

  it("leaves verification retry and status recovery working", async () => {
    const ready = await prepared();
    const transactionId = await applied(ready);
    expect((await run(ready, transactionId)).historicalApplied).toBe(true);
    const status = await readNeutronMutationStatus({
      directory: ready.durable,
      ...identity(ready),
      transactionId,
    });
    expect(status).toMatchObject({
      applied: true,
      outcome: "recorded",
      transactionState: "applied",
    });
    expect(
      (
        await retryAppliedNeutronMutationVerification({
          directory: ready.durable,
          fs: ready.fs,
          query: retryQuery(ready, transactionId),
        })
      ).outcome,
    ).toBe("not-eligible");
    const decoded = decodeDurableTransactionRecord(
      await readFile(await approvalFile(ready.durable), "utf8"),
    );
    expect(decoded.state).toBe("applied");
    expect(decoded.result?.applied).toBe(true);
  });

  it("does not call the model, Apply, or a project write API", () => {
    const source = undoSource();
    for (const name of FORBIDDEN_CALLS) expect(source).not.toContain(name);
    const repo = repoRoot();
    const jsonrpc = readFileSync(
      join(repo, "packages/protocol/src/jsonrpc.ts"),
      "utf8",
    );
    expect(jsonrpc).not.toContain("mutation.undo");
    expect(WORKSPACE_DAEMON_REQUEST_METHODS.join("\n")).not.toContain(
      "mutation.undo",
    );
    expect([...NEUTRON_READ_ONLY_TOOLS]).toEqual([
      "inspect",
      "doctor",
      "memorySearch",
      "timeline",
      "conformance",
      "securityAudit",
      "projectDiff",
    ]);
    expect(slice5Session("/tmp/project").mutationAllowed).toBe(false);
    const allowlist = readFileSync(
      join(repo, "apps/desktop/src-tauri/src/method_allowlist.rs"),
      "utf8",
    );
    expect(allowlist).not.toContain("mutation.undo");
    const control = readFileSync(
      join(repo, "apps/desktop/src/neutron/NeutronApproveApplyControl.tsx"),
      "utf8",
    );
    expect(control).not.toContain("Undo");
  });
});

function repoRoot(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "..");
}

function undoSource(): string {
  return [
    "packages/application/src/neutron-mutation-undo-preflight.ts",
    "packages/application/src/neutron-mutation-undo-eligibility.ts",
    "packages/application/src/neutron-mutation-undo-current.ts",
    "packages/protocol/src/neutron-mutation-undo.ts",
    "packages/protocol/src/neutron-mutation-undo-result.ts",
  ]
    .map((path) => readFileSync(join(repoRoot(), path), "utf8"))
    .join("\n");
}

async function prepared(fs: FileSystem = nodeFileSystem, create = false) {
  const root = await reviewProject();
  const fingerprint = await fingerprintNeutronProjectRoot(root);
  const materialized = materializeReviewBundle({
    fingerprint,
    root,
    ...(create
      ? {
          candidate: reviewCandidate([
            { path: "src/created.ts", content: CREATED },
          ]),
        }
      : {}),
  });
  return {
    durable: await mkdtemp(join(tmpdir(), "neutron-undo-")),
    fingerprint,
    fs,
    proposalId: materialized.bundle.proposal.proposalId,
    root,
    store: materialized.store,
  };
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

type Ready = Awaited<ReturnType<typeof prepared>>;

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

function approve(ready: Ready) {
  return approveAndApplyNeutronGraphMutation({
    ...hostInput(ready),
    intent: approvalIntent(ready),
  });
}

function applyReconciliation(ready: Ready) {
  return approveAndApplyNeutronGraphMutation({
    ...hostInput(ready),
    failAt: "post-write-consistency",
    intent: approvalIntent(ready),
    rollbackFailPaths: ["src/a.ts"],
  }).then((result) => result.transactionId);
}

async function applied(ready: Ready): Promise<string> {
  const result = await approve(ready);
  expect(result.applied).toBe(true);
  expect(result.transactionId).toEqual(expect.any(String));
  return result.transactionId ?? "";
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

function undoIntent(
  ready: { readonly proposalId: string; readonly root: string },
  transactionId: string,
  override: Partial<{
    graphId: string;
    projectId: string;
    proposalId: string;
    root: string;
    sessionId: string;
  }> = {},
) {
  const session = slice5Session(ready.root);
  return {
    graphId: override.graphId ?? REVIEW_GRAPH_ID,
    projectId: override.projectId ?? session.projectId,
    proposalId: override.proposalId ?? ready.proposalId,
    protocolVersion: PROTOCOL_VERSION,
    root: override.root ?? ready.root,
    schemaVersion: NEUTRON_MUTATION_UNDO_INTENT_SCHEMA_URN,
    sessionId: override.sessionId ?? session.sessionId,
    transactionId,
  };
}

function run(
  ready: Ready,
  transactionId: string,
  override?: Parameters<typeof undoIntent>[2],
) {
  return preflightNeutronMutationUndo({
    directory: ready.durable,
    fs: ready.fs,
    intent: undoIntent(ready, transactionId, override),
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

async function rewriteState(
  directory: string,
  state: "claimed" | "executing" | "failed-before-write",
): Promise<void> {
  const file = await approvalFile(directory);
  const record = decodeDurableTransactionRecord(await readFile(file, "utf8"));
  await writeFile(file, encodeDurableTransactionRecord({ ...record, state }));
}

async function stripVerification(directory: string): Promise<void> {
  const file = await approvalFile(directory);
  const record = decodeDurableTransactionRecord(await readFile(file, "utf8"));
  const result = record.result;
  if (result === undefined) throw new Error("missing apply result");
  await writeFile(
    file,
    encodeDurableTransactionRecord({
      ...record,
      result: buildNeutronMutationApplyResult({
        applied: result.applied,
        approvalId: result.approvalId,
        changedPaths: result.changedPaths,
        createdPaths: result.createdPaths,
        planDigest: result.planDigest,
        reconciliationRequired: false,
        reviewArtifactDigest: result.reviewArtifactDigest,
        rollbackCompleted: result.rollbackCompleted,
        status: result.status,
        transactionId: result.transactionId,
        unchangedPaths: result.unchangedPaths,
        updatedPaths: result.updatedPaths,
        diagnostics: result.diagnostics,
      }),
    }),
  );
}

async function widenCreatedPath(
  directory: string,
  path: string,
): Promise<void> {
  const file = await approvalFile(directory);
  const record = decodeDurableTransactionRecord(await readFile(file, "utf8"));
  const result = record.result;
  if (result === undefined || result.verification === undefined) {
    throw new Error("missing verification");
  }
  await writeFile(
    file,
    encodeDurableTransactionRecord({
      ...record,
      result: buildNeutronMutationApplyResult({
        applied: result.applied,
        approvalId: result.approvalId,
        changedPaths: result.changedPaths,
        createdPaths: [...result.createdPaths, path],
        diagnostics: result.diagnostics,
        planDigest: result.planDigest,
        reconciliationRequired: result.reconciliationRequired,
        reviewArtifactDigest: result.reviewArtifactDigest,
        rollbackCompleted: result.rollbackCompleted,
        status: result.status,
        transactionId: result.transactionId,
        unchangedPaths: result.unchangedPaths,
        updatedPaths: result.updatedPaths,
        verification: result.verification,
      }),
    }),
  );
}

async function approvalFile(directory: string): Promise<string> {
  const names = await readdir(join(directory, "approvals"));
  const file = names.find((name) => name.endsWith(".json"));
  if (file === undefined) throw new Error("missing approval record");
  return join(directory, "approvals", file);
}
