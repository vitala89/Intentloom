import { mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  NEUTRON_MUTATION_STATUS_GET_METHOD,
  NEUTRON_MUTATION_STATUS_SCHEMA_URN,
  PROTOCOL_VERSION,
  WORKSPACE_DAEMON_REQUEST_METHODS,
  parseNeutronMutationStatusQuery,
  parseWorkspaceDaemonRequest,
} from "@intentloom/protocol";
import { nodeFileSystem } from "../packages/application/src/index.js";
import { acquireNeutronMutationApplyLock } from "../packages/application/src/neutron-mutation-apply-durable-lock.js";
import { createPersistentNeutronMutationApprovalStore } from "../packages/application/src/neutron-mutation-apply-durable-store.js";
import type { ModelAdapter } from "../packages/application/src/model-adapter.js";
import { NEUTRON_MUTATION_PROPOSAL_CAPABILITY } from "../packages/application/src/neutron-mutation-proposal-capability.js";
import { createNeutronSessionRuntime } from "../packages/application/src/neutron-session-runtime.js";
import { fingerprintNeutronProjectRoot } from "../packages/application/src/neutron-session-fingerprint.js";
import { approveAndApplyNeutronGraphMutation } from "../packages/application/src/neutron-scheduler.js";
import { NeutronMutationStatusReadCancelled } from "../packages/application/src/neutron-mutation-status-read.js";
import { rememberNeutronMutationStatus } from "../packages/application/src/neutron-mutation-status-index.js";
import { publicNeutronMutationStatus } from "../packages/application/src/neutron-mutation-status-public.js";
import { NEUTRON_READ_ONLY_TOOLS } from "../packages/protocol/src/neutron-runtime.js";
import {
  NEUTRON_MUTATION_APPROVAL_INTENT_ACTION,
  NEUTRON_MUTATION_APPROVAL_INTENT_SCHEMA_URN,
} from "../packages/protocol/src/neutron-mutation-approval-intent.js";
import { NEUTRON_MUTATION_APPLY_RESULT_SCHEMA_URN } from "../packages/protocol/src/neutron-mutation-apply.js";
import { expectedNeutronMutationApprovalToken } from "../packages/validator/src/neutron-mutation-digest.js";
import { neutronSessionCapabilities as daemonCapabilities } from "../packages/daemon/src/neutron-session-handlers.js";
import { bindNeutronSessionHandlers as bindDaemonHandlers } from "../packages/daemon/src/neutron-session-handlers.js";
import {
  REVIEW_GRAPH_ID,
  SLICE5_CONTENT_A,
  SLICE5_NOW,
  materializeReviewBundle,
  reviewProject,
} from "./neutron-mutation-review-support.js";
import {
  slice5CandidateOutput,
  slice5Node,
  slice5Session,
} from "./neutron-mutation-slice5-support.js";

const DIGEST = `sha256:${"ab".repeat(32)}`;
const SPOOF_KEYS = [
  "approvalToken",
  "approval",
  "approved",
  "authorized",
  "mutationAllowed",
  "grantedApprovals",
  "changedPaths",
  "planDigest",
  "reviewArtifactDigest",
  "proposedContent",
  "previousContent",
  "currentContent",
  "files",
  "durableStateDirectory",
  "state",
] as const;

describe("Desktop mutation D5 status recovery", () => {
  it("recovers applied status after the response is discarded and the host restarts", async () => {
    const ready = await prepared();
    const applied = await approve(ready);
    expect(applied.applied).toBe(true);
    expect(applied.verificationStatus).toBe("verified");
    const before = await readFile(join(ready.root, "src/a.ts"), "utf8");
    const recovered = await recover(ready);
    expect(recovered).toMatchObject({
      applied: true,
      outcome: "recorded",
      proposalId: ready.proposalId,
      transactionState: "applied",
      verificationStatus: "verified",
    });
    expect(recovered.applied).toBe(true);
    expect(recovered.verificationStatus).not.toBeUndefined();
    expect(await readFile(join(ready.root, "src/a.ts"), "utf8")).toBe(before);
    expect(before).toBe(SLICE5_CONTENT_A);
    const blocked = await approveAndApplyNeutronGraphMutation({
      ...hostInput(ready.root, ready.fingerprint, ready.durable, undefined),
      intent: intent(ready.root, ready.proposalId),
    });
    expect(blocked.approvalOutcome).toBe("review-unavailable");
    expect(await readFile(join(ready.root, "src/a.ts"), "utf8")).toBe(before);
  });

  it("keeps applied true when verification failed and does not retry Apply", async () => {
    const ready = await prepared();
    const failed = await approveAndApplyNeutronGraphMutation({
      ...hostInput(ready.root, ready.fingerprint, ready.durable, ready.store),
      afterWriteBeforeVerification: async () => {
        await writeFile(join(ready.root, "src/a.ts"), "tampered\n");
      },
      intent: intent(ready.root, ready.proposalId),
    });
    expect(failed.applied).toBe(true);
    expect(failed.verificationStatus).toBe("verification-failed");
    const status = await recover(ready);
    expect(status.applied).toBe(true);
    expect(status.verificationStatus).toBe("verification-failed");
    expect(status.transactionState).toBe("applied");
    expect(await readFile(join(ready.root, "src/a.ts"), "utf8")).toBe(
      "tampered\n",
    );
  });

  it("reports a durable pre-write failure without writing", async () => {
    const ready = await prepared();
    const canonical = await nodeFileSystem.realpath(ready.root);
    await acquireNeutronMutationApplyLock({
      canonicalRoot: canonical,
      durableStateDirectory: ready.durable,
      transactionId: "other-transaction",
    });
    const blocked = await approve(ready);
    expect(blocked.failureCode).toBe("lock-conflict");
    expect(blocked.applied).toBe(false);
    const status = await recover(ready);
    expect(status).toMatchObject({
      applied: false,
      failureCode: "lock-conflict",
      outcome: "recorded",
      transactionState: "failed-before-write",
    });
    expect(await readFile(join(ready.root, "src/a.ts"), "utf8")).toBe(
      "old a\n",
    );
  });

  it("preserves reconciliation-required after restart", async () => {
    const ready = await prepared();
    const failed = await approveAndApplyNeutronGraphMutation({
      ...hostInput(ready.root, ready.fingerprint, ready.durable, ready.store),
      failAt: "post-write-consistency",
      intent: intent(ready.root, ready.proposalId),
      rollbackFailPaths: ["src/a.ts"],
    });
    expect(failed.reconciliationRequired).toBe(true);
    expect(failed.applied).toBe(false);
    const status = await recover(ready);
    expect(status.reconciliationRequired).toBe(true);
    expect(status.applied).toBe(false);
    expect(status.transactionState).toBe("failed-needs-reconciliation");
    expect(status.failureCode).toBe("rollback-incomplete");
  });

  it("returns unknown for a missing record and does not write", async () => {
    const ready = await prepared();
    const before = await readFile(join(ready.root, "src/a.ts"), "utf8");
    const status = await recover(ready);
    expect(status.outcome).toBe("unknown");
    expect(status).not.toHaveProperty("applied");
    expect(await readFile(join(ready.root, "src/a.ts"), "utf8")).toBe(before);
  });

  it("rejects the wrong root, project, session, graph, and proposal", async () => {
    const ready = await prepared();
    await approve(ready);
    const runtime = restarted(ready.durable);
    const base = query(ready);
    expect(
      (
        await runtime.getNeutronMutationStatus({
          ...base,
          root: `${ready.root}-other`,
        })
      ).outcome,
    ).toBe("unknown");
    expect(
      (
        await runtime.getNeutronMutationStatus({
          ...base,
          projectId: "other-project",
        })
      ).outcome,
    ).toBe("unknown");
    expect(
      (
        await runtime.getNeutronMutationStatus({
          ...base,
          sessionId: "other-session",
        })
      ).outcome,
    ).toBe("unknown");
    expect(
      (
        await runtime.getNeutronMutationStatus({
          ...base,
          graphId: "other-graph",
        })
      ).outcome,
    ).toBe("unknown");
    expect(
      (
        await runtime.getNeutronMutationStatus({
          ...base,
          proposalId: "other-proposal",
        })
      ).outcome,
    ).toBe("unknown");
    expect(await readFile(join(ready.root, "src/a.ts"), "utf8")).toBe(
      SLICE5_CONTENT_A,
    );
  });

  it("rejects a live session bound to the wrong root, project, or graph", async () => {
    const ready = await prepared();
    const calls = { turns: 0 };
    const runtime = createNeutronSessionRuntime({
      createAdapter: () => countingAdapter(calls),
      durableStateDirectory: ready.durable,
      now: () => new Date(SLICE5_NOW),
      sessionProposalCapabilities: [NEUTRON_MUTATION_PROPOSAL_CAPABILITY],
    });
    const created = await runtime.create({
      projectId: "project-slice5",
      root: ready.root,
    });
    const executed = await runtime.executeGraph({
      nodes: [slice5Node("task-build", { state: "ready" })],
      projectId: "project-slice5",
      root: ready.root,
      sessionId: created.session.sessionId,
    });
    const graphId = executed.graphSnapshot?.graphId ?? REVIEW_GRAPH_ID;
    const bound = {
      ...query(ready),
      graphId,
      projectId: "project-slice5",
      sessionId: created.session.sessionId,
    };
    expect(
      (
        await runtime.getNeutronMutationStatus({
          ...bound,
          root: `${ready.root}-other`,
        })
      ).outcome,
    ).toBe("root-mismatch");
    expect(
      (
        await runtime.getNeutronMutationStatus({
          ...bound,
          projectId: "other-project",
        })
      ).outcome,
    ).toBe("project-mismatch");
    expect(
      (
        await runtime.getNeutronMutationStatus({
          ...bound,
          graphId: "other-graph",
        })
      ).outcome,
    ).toBe("graph-mismatch");
    expect(
      (
        await runtime.getNeutronMutationStatus({
          ...bound,
          sessionId: "other-session",
        })
      ).outcome,
    ).toBe("unknown");
  });

  it("rejects spoofed authority, digests, and bodies", () => {
    const readyQuery = {
      graphId: REVIEW_GRAPH_ID,
      projectId: "project-slice5",
      proposalId: "proposal-1",
      protocolVersion: PROTOCOL_VERSION,
      root: "/tmp/project",
      schemaVersion: NEUTRON_MUTATION_STATUS_SCHEMA_URN,
      sessionId: "session-1",
    };
    for (const key of SPOOF_KEYS) {
      expect(() =>
        parseNeutronMutationStatusQuery({
          ...readyQuery,
          [key]: key === "changedPaths" ? ["src/evil.ts"] : "spoofed",
        }),
      ).toThrow(new RegExp(key));
    }
    expect(() =>
      parseNeutronMutationStatusQuery({ ...readyQuery, unexpected: true }),
    ).toThrow(/unexpected/);
  });

  it("fails closed when the index or transaction record is corrupt", async () => {
    const ready = await prepared();
    await approve(ready);
    const index = await indexFile(ready.durable);
    const original = await readFile(index, "utf8");
    await writeFile(index, "{");
    await expect(recover(ready)).rejects.toThrow(/durable-status-corrupt/);
    await writeFile(index, original);
    const approval = await approvalFile(ready.durable);
    await writeFile(approval, "{");
    await expect(recover(ready)).rejects.toThrow(/durable-status-corrupt/);
  });

  it("does not call a model, Apply, or change bytes while reading status", async () => {
    const ready = await prepared();
    await approve(ready);
    const calls = { turns: 0 };
    const runtime = createNeutronSessionRuntime({
      createAdapter: () => {
        calls.turns += 1;
        return countingAdapter(calls);
      },
      durableStateDirectory: ready.durable,
    });
    const before = await readFile(join(ready.root, "src/a.ts"), "utf8");
    const status = await runtime.getNeutronMutationStatus(query(ready));
    expect(calls.turns).toBe(0);
    expect(status.applied).toBe(true);
    expect(await readFile(join(ready.root, "src/a.ts"), "utf8")).toBe(before);
    expect(statusSource()).not.toContain("approveAndApplyNeutronGraphMutation");
    expect(statusSource()).not.toContain("applyApprovedNeutronGraphMutation");
    expect(statusSource()).not.toContain("applyApprovedNeutronMutation");
    expect(statusSource()).not.toContain("executeApprovedApplyPlan");
  });

  it("omits the raw token and source bodies", async () => {
    const ready = await prepared();
    await approve(ready);
    const status = await recover(ready);
    const encoded = JSON.stringify(status);
    expect(encoded).not.toContain(tokenFor(ready));
    expect(encoded).not.toContain("approvalToken");
    expect(encoded).not.toContain(SLICE5_CONTENT_A.trim());
    expect(encoded).not.toContain("old a");
    expect(encoded).not.toContain("previousContent");
    expect(encoded).not.toContain("proposedContent");
    expect(status).not.toHaveProperty("verification");
    const index = await readFile(await indexFile(ready.durable), "utf8");
    expect(index).not.toContain(tokenFor(ready));
    expect(index).not.toContain(SLICE5_CONTENT_A.trim());
    expect(index).not.toContain("approvalToken");
  });

  it("serves concurrent reads without mutating project bytes", async () => {
    const ready = await prepared();
    await approve(ready);
    const runtime = restarted(ready.durable);
    const before = await readFile(join(ready.root, "src/a.ts"), "utf8");
    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        runtime.getNeutronMutationStatus(query(ready)),
      ),
    );
    expect(
      results.every(
        (item) =>
          item.applied === true && item.verificationStatus === "verified",
      ),
    ).toBe(true);
    expect(await readFile(join(ready.root, "src/a.ts"), "utf8")).toBe(before);
  });

  it("keeps one status identity when two applies race", async () => {
    const ready = await prepared();
    const [left, right] = await Promise.all([approve(ready), approve(ready)]);
    const appliedCount = [left, right].filter(
      (item) => item.applied === true,
    ).length;
    expect(appliedCount).toBe(1);
    const status = await recover(ready);
    expect(status.outcome).toBe("recorded");
    expect(status.applied).toBe(true);
    expect(await proposalIndexCount(ready.durable)).toBe(1);
    expect(await readFile(join(ready.root, "src/a.ts"), "utf8")).toBe(
      SLICE5_CONTENT_A,
    );
  });

  it("keeps historical verification after a later external edit", async () => {
    const ready = await prepared();
    await approve(ready);
    await writeFile(join(ready.root, "src/a.ts"), "external edit\n");
    const status = await recover(ready);
    expect(status.applied).toBe(true);
    expect(status.verificationStatus).toBe("verified");
    expect(await readFile(join(ready.root, "src/a.ts"), "utf8")).toBe(
      "external edit\n",
    );
  });

  it("cancels only the status read", async () => {
    const ready = await prepared();
    await approve(ready);
    const before = await readFile(await approvalFile(ready.durable), "utf8");
    const controller = new AbortController();
    controller.abort();
    await expect(
      restarted(ready.durable).getNeutronMutationStatus(
        query(ready),
        controller.signal,
      ),
    ).rejects.toBeInstanceOf(NeutronMutationStatusReadCancelled);
    expect(await readFile(await approvalFile(ready.durable), "utf8")).toBe(
      before,
    );
  });

  it("reports a claimed transaction as in progress", async () => {
    const directory = await mkdtemp(join(tmpdir(), "neutron-d5-claim-"));
    const identity = {
      graphId: REVIEW_GRAPH_ID,
      projectId: "project-slice5",
      proposalId: "proposal-claimed",
      root: "/tmp/neutron-d5",
      sessionId: "session-slice5",
    };
    const store = createPersistentNeutronMutationApprovalStore({ directory });
    await store.claim({
      approvalDigest: DIGEST,
      approvalId: "approval-claimed",
      claimedAt: SLICE5_NOW,
      lockKey: identity.root,
      planDigest: DIGEST,
      reviewArtifactDigest: DIGEST,
      state: "claimed",
      transactionId: "transaction-claimed",
      updatedAt: SLICE5_NOW,
    });
    await rememberNeutronMutationStatus({
      approvalId: "approval-claimed",
      directory,
      identity,
      transactionId: "transaction-claimed",
    });
    const runtime = restarted(directory);
    const status = await runtime.getNeutronMutationStatus({
      ...identity,
      protocolVersion: PROTOCOL_VERSION,
      schemaVersion: NEUTRON_MUTATION_STATUS_SCHEMA_URN,
    });
    expect(status).toMatchObject({
      applied: false,
      outcome: "recorded",
      transactionState: "claimed",
    });
    expect(status.verificationStatus).toBeUndefined();
  });

  it("passes verification-incomplete through without clearing applied", () => {
    const status = publicNeutronMutationStatus({
      proposalId: "proposal-1",
      record: {
        approvalDigest: DIGEST,
        approvalId: "approval-1",
        claimedAt: 1,
        lockKey: "/tmp/project",
        planDigest: DIGEST,
        reviewArtifactDigest: DIGEST,
        state: "applied",
        transactionId: "transaction-1",
        updatedAt: 2,
        result: {
          applied: true,
          approvalId: "approval-1",
          changedPaths: ["src/a.ts"],
          createdPaths: [],
          diagnostics: ["verification-incomplete"],
          planDigest: DIGEST,
          reconciliationRequired: true,
          reviewArtifactDigest: DIGEST,
          rollbackCompleted: true,
          schemaVersion: NEUTRON_MUTATION_APPLY_RESULT_SCHEMA_URN,
          status: "applied",
          transactionId: "transaction-1",
          unchangedPaths: [],
          updatedPaths: ["src/a.ts"],
          verificationStatus: "verification-incomplete",
        },
      },
    });
    expect(status.applied).toBe(true);
    expect(status.verificationStatus).toBe("verification-incomplete");
    expect(status.reconciliationRequired).toBe(true);
  });

  it("narrows on transactionId and does not treat it as authority", async () => {
    const ready = await prepared();
    const applied = await approve(ready);
    const match = await restarted(ready.durable).getNeutronMutationStatus({
      ...query(ready),
      transactionId: applied.transactionId,
    });
    expect(match.applied).toBe(true);
    const missed = await restarted(ready.durable).getNeutronMutationStatus({
      ...query(ready),
      transactionId: "other-transaction",
    });
    expect(missed.outcome).toBe("transaction-mismatch");
    expect(missed).not.toHaveProperty("applied");
  });

  it("publishes a read-only status method and leaves N4 unchanged", () => {
    expect(WORKSPACE_DAEMON_REQUEST_METHODS).toContain(
      NEUTRON_MUTATION_STATUS_GET_METHOD,
    );
    expect(
      parseWorkspaceDaemonRequest(
        {
          id: 1,
          jsonrpc: "2.0",
          method: NEUTRON_MUTATION_STATUS_GET_METHOD,
          params: query({
            proposalId: "proposal-1",
            root: "/tmp/project",
          } as Awaited<ReturnType<typeof prepared>>),
        },
        1,
      )?.method,
    ).toBe(NEUTRON_MUTATION_STATUS_GET_METHOD);
    expect([...NEUTRON_READ_ONLY_TOOLS]).toEqual([
      "inspect",
      "doctor",
      "memorySearch",
      "timeline",
      "conformance",
      "securityAudit",
      "projectDiff",
    ]);
    const handlers = bindDaemonHandlers(
      createNeutronSessionRuntime({
        createAdapter: () => null,
        durableStateDirectory: "/tmp/intentloom-d5-capability",
      }),
    );
    expect(
      daemonCapabilities(handlers).find(
        (item) => item.method === NEUTRON_MUTATION_STATUS_GET_METHOD,
      )?.classification,
    ).toBe("read-only");
    const session = slice5Session("/tmp/project");
    expect(session.mutationAllowed).toBe(false);
    const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
    const allowlist = readFileSync(
      join(repo, "apps/desktop/src-tauri/src/method_allowlist.rs"),
      "utf8",
    );
    const neutronMethods = allowlist.slice(
      allowlist.indexOf("pub fn is_neutron_method"),
      allowlist.indexOf("pub fn is_neutron_mutation_review_list_method"),
    );
    expect(neutronMethods).not.toContain("status.get");
    expect(
      readFileSync(join(repo, "apps/desktop/src-tauri/src/main.rs"), "utf8"),
    ).toContain("get_neutron_mutation_status");
  });
});

async function prepared() {
  const root = await reviewProject();
  const fingerprint = await fingerprintNeutronProjectRoot(root);
  const materialized = materializeReviewBundle({ fingerprint, root });
  return {
    durable: await mkdtemp(join(tmpdir(), "neutron-d5-state-")),
    fingerprint,
    proposalDigest: materialized.bundle.proposal.proposalDigest,
    proposalId: materialized.bundle.proposal.proposalId,
    root,
    store: materialized.store,
  };
}

function hostInput(
  root: string,
  fingerprint: string,
  durable: string,
  store: ReturnType<typeof materializeReviewBundle>["store"] | undefined,
) {
  return {
    currentProjectFingerprint: fingerprint,
    durableStateDirectory: durable,
    fs: nodeFileSystem,
    graphStale: {
      baseline: { projectFingerprint: fingerprint },
      current: { projectFingerprint: fingerprint },
    },
    now: SLICE5_NOW,
    session: slice5Session(root),
    store,
  };
}

function approve(ready: Awaited<ReturnType<typeof prepared>>) {
  return approveAndApplyNeutronGraphMutation({
    ...hostInput(ready.root, ready.fingerprint, ready.durable, ready.store),
    intent: intent(ready.root, ready.proposalId),
  });
}

function intent(root: string, proposalId: string) {
  const session = slice5Session(root);
  return {
    action: NEUTRON_MUTATION_APPROVAL_INTENT_ACTION,
    graphId: REVIEW_GRAPH_ID,
    projectId: session.projectId,
    proposalId,
    protocolVersion: PROTOCOL_VERSION,
    root,
    schemaVersion: NEUTRON_MUTATION_APPROVAL_INTENT_SCHEMA_URN,
    sessionId: session.sessionId,
  };
}

function query(ready: { readonly root: string; readonly proposalId: string }) {
  const session = slice5Session(ready.root);
  return {
    graphId: REVIEW_GRAPH_ID,
    projectId: session.projectId,
    proposalId: ready.proposalId,
    protocolVersion: PROTOCOL_VERSION,
    root: ready.root,
    schemaVersion: NEUTRON_MUTATION_STATUS_SCHEMA_URN,
    sessionId: session.sessionId,
  };
}

function restarted(directory: string) {
  return createNeutronSessionRuntime({
    createAdapter: () => null,
    durableStateDirectory: directory,
    now: () => new Date(SLICE5_NOW),
  });
}

function recover(ready: Awaited<ReturnType<typeof prepared>>) {
  return restarted(ready.durable).getNeutronMutationStatus(query(ready));
}

function tokenFor(ready: { readonly proposalDigest: string }): string {
  return expectedNeutronMutationApprovalToken(ready.proposalDigest);
}

async function indexFile(directory: string): Promise<string> {
  const names = await readdir(join(directory, "proposal-index"));
  const file = names.find((name) => name.endsWith(".json"));
  if (file === undefined) throw new Error("missing status index");
  return join(directory, "proposal-index", file);
}

async function approvalFile(directory: string): Promise<string> {
  const names = await readdir(join(directory, "approvals"));
  const file = names.find((name) => name.endsWith(".json"));
  if (file === undefined) throw new Error("missing approval record");
  return join(directory, "approvals", file);
}

async function proposalIndexCount(directory: string): Promise<number> {
  const names = await readdir(join(directory, "proposal-index"));
  return names.filter((name) => name.endsWith(".json")).length;
}

function statusSource(): string {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  return [
    readFileSync(
      join(root, "packages/application/src/neutron-mutation-status-read.ts"),
      "utf8",
    ),
    readFileSync(
      join(root, "packages/daemon/src/neutron-mutation-status-handlers.ts"),
      "utf8",
    ),
  ].join("\n");
}

function countingAdapter(calls: { turns: number }): ModelAdapter {
  return {
    getCapabilities: () => ({
      maxContextTokens: 1024,
      maxOutputTokens: 256,
      modelId: "fixture-d5",
      providerKind: "deterministic-test",
      supportsStreaming: false,
      supportsToolCalls: true,
      supportsVision: false,
    }),
    executeTurn: async (request) => {
      calls.turns += 1;
      const sawTool = request.messages.some(
        (message) => message.role === "tool",
      );
      if (!sawTool) {
        return {
          diagnostics: [],
          responseText: "",
          schemaVersion: 1,
          sessionId: request.sessionId,
          stopReason: "tool_call",
          toolCalls: [
            { argumentsJson: "{}", id: "call-inspect", name: "inspect" },
          ],
          usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
        };
      }
      return {
        diagnostics: [],
        responseText: slice5CandidateOutput(),
        schemaVersion: 1,
        sessionId: request.sessionId,
        stopReason: "stop",
        toolCalls: [],
        usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
      };
    },
  };
}
