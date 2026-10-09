import { mkdtemp, readFile, realpath, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  NEUTRON_MUTATION_APPROVE_AND_APPLY_METHOD,
  PROTOCOL_VERSION,
  WORKSPACE_DAEMON_REQUEST_METHODS,
  parseNeutronMutationApproveAndApplyParams,
  parseWorkspaceDaemonRequest,
} from "@intentloom/protocol";
import { nodeFileSystem } from "../packages/application/src/index.js";
import { acquireNeutronMutationApplyLock } from "../packages/application/src/neutron/mutation/apply/neutron-mutation-apply-durable-lock.js";
import { neutronMutationApplyLeaksToken } from "../packages/application/src/neutron/mutation/apply/neutron-mutation-apply-result.js";
import type { ModelAdapter } from "../packages/application/src/model-adapter.js";
import { NEUTRON_MUTATION_PROPOSAL_CAPABILITY } from "../packages/application/src/neutron/mutation/proposal/neutron-mutation-proposal-capability.js";
import { createNeutronSessionRuntime } from "../packages/application/src/neutron/session/neutron-session-runtime.js";
import { fingerprintNeutronProjectRoot } from "../packages/application/src/neutron/neutron-session-fingerprint.js";
import { approveAndApplyNeutronGraphMutation } from "../packages/application/src/neutron/neutron-scheduler.js";
import { NEUTRON_READ_ONLY_TOOLS } from "../packages/protocol/src/neutron-runtime.js";
import {
  NEUTRON_MUTATION_APPROVAL_INTENT_ACTION,
  NEUTRON_MUTATION_APPROVAL_INTENT_SCHEMA_URN,
} from "../packages/protocol/src/neutron-mutation-approval-intent.js";
import { expectedNeutronMutationApprovalToken } from "../packages/validator/src/neutron-mutation-digest.js";
import { validateNeutronRuntimeSession } from "../packages/validator/src/neutron-runtime.js";
import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  REVIEW_GRAPH_ID,
  SLICE5_CONTENT_A,
  SLICE5_NOW,
  materializeReviewBundle,
  reviewProject,
} from "./neutron-mutation-review-support.js";
import {
  slice5Candidate,
  slice5CandidateOutput,
  slice5Node,
  slice5Session,
} from "./neutron-mutation-slice5-support.js";
import { bindNeutronSessionHandlers as bindDaemonHandlers } from "../packages/daemon/src/neutron-session-handlers.js";
import { neutronSessionCapabilities as daemonCapabilities } from "../packages/daemon/src/neutron-session-handlers.js";

const SPOOF_KEYS = [
  "approvalToken",
  "approvalId",
  "proposalDigest",
  "reviewArtifactDigest",
  "contentDigest",
  "planDigest",
  "projectStateDigest",
  "changedPaths",
  "proposedContent",
  "previousContent",
  "mutationClass",
  "expiresAt",
  "issuer",
  "source",
  "authorized",
  "approved",
  "mutationAllowed",
  "grantedApprovals",
  "filesToApply",
] as const;

describe("Neutron Desktop D4 approve and apply", () => {
  it("applies the exact reviewed bytes and keeps applied distinct from verified", async () => {
    const ready = await prepared();
    const result = await approve(ready);
    expect(result.stage).toBe("apply");
    expect(result.applied).toBe(true);
    expect(result.verificationStatus).toBe("verified");
    expect(result.status).toBe("applied");
    expect(await readFile(join(ready.root, "src/a.ts"), "utf8")).toBe(
      SLICE5_CONTENT_A,
    );
    expect(result).not.toHaveProperty("approvalToken");
    expect(neutronMutationApplyLeaksToken(result, tokenFor(ready))).toBe(false);
  });

  it("binds the explicit proposal and ignores renderer bytes", async () => {
    const root = await reviewProject();
    const raw = await fingerprintNeutronProjectRoot(root);
    const first = materializeReviewBundle({ fingerprint: raw, root });
    const second = materializeReviewBundle({
      candidate: slice5Candidate("export const b = 2;\n"),
      fingerprint: raw,
      root,
      store: first.store,
      taskId: "task-other",
    });
    const durable = await durableDir();
    const result = await approveAndApplyNeutronGraphMutation({
      ...hostInput(root, raw, durable, second.store),
      intent: intent(root, second.bundle.proposal.proposalId, {
        proposedContent: "renderer bytes",
      }),
    });
    expect(result.stage).toBe("approval-rejected");
    expect(await readFile(join(root, "src/a.ts"), "utf8")).toBe("old a\n");
    const applied = await approveAndApplyNeutronGraphMutation({
      ...hostInput(root, raw, durable, second.store),
      intent: intent(root, second.bundle.proposal.proposalId),
    });
    expect(applied.proposalId).toBe(second.bundle.proposal.proposalId);
    expect(applied.proposalId).not.toBe(first.bundle.proposal.proposalId);
    expect(await readFile(join(root, "src/a.ts"), "utf8")).toBe(
      "export const b = 2;\n",
    );
  });

  it("rejects spoofed authority fields before any write", async () => {
    const ready = await prepared();
    for (const key of SPOOF_KEYS) {
      const params = {
        ...intent(ready.root, ready.proposalId),
        [key]: key === "changedPaths" ? ["src/evil.ts"] : "spoofed",
      };
      expect(() => parseNeutronMutationApproveAndApplyParams(params)).toThrow(
        new RegExp(key),
      );
    }
    expect(await readFile(join(ready.root, "src/a.ts"), "utf8")).toBe(
      "old a\n",
    );
  });

  it("rejects a stale project before write and does not open a reuse path", async () => {
    const ready = await prepared();
    const staleFingerprint = `${ready.fingerprint}ff`;
    const result = await approveAndApplyNeutronGraphMutation({
      ...hostInput(ready.root, staleFingerprint, ready.durable, ready.store),
      intent: intent(ready.root, ready.proposalId),
    });
    expect(result).toMatchObject({
      approvalOutcome: "stale",
      stage: "approval-rejected",
    });
    expect(result).not.toHaveProperty("applied");
    const again = await approveAndApplyNeutronGraphMutation({
      ...hostInput(ready.root, staleFingerprint, ready.durable, ready.store),
      intent: intent(ready.root, ready.proposalId),
    });
    expect(again.approvalOutcome).toBe("stale");
    expect(await readFile(join(ready.root, "src/a.ts"), "utf8")).toBe(
      "old a\n",
    );
  });

  it("revalidates project state immediately before the first write", async () => {
    const ready = await prepared();
    const stale = await approveAndApplyNeutronGraphMutation({
      ...hostInput(ready.root, ready.fingerprint, ready.durable, ready.store),
      evaluateProjectStateDigest: async () => `sha256:${ready.fingerprint}ff`,
      intent: intent(ready.root, ready.proposalId),
    });
    expect(stale.stage).toBe("apply");
    expect(stale.applied).toBe(false);
    expect(stale.failureCode).toBe("project-stale");
    expect(await readFile(join(ready.root, "src/a.ts"), "utf8")).toBe(
      "old a\n",
    );
    const second = await approve(ready);
    expect(second.applied).toBe(false);
    expect(second.failureCode).toBe("approval-consumed");
    expect(await readFile(join(ready.root, "src/a.ts"), "utf8")).toBe(
      "old a\n",
    );
  });

  it("rejects expired, cancelled, and missing payloads", async () => {
    const expired = await prepared({ expiresAt: SLICE5_NOW + 1_000 });
    const expiredResult = await approveAndApplyNeutronGraphMutation({
      ...hostInput(
        expired.root,
        expired.fingerprint,
        expired.durable,
        expired.store,
      ),
      intent: intent(expired.root, expired.proposalId),
      now: SLICE5_NOW + 2_000,
    });
    expect(expiredResult.approvalOutcome).toBe("expired");
    const cancelled = await prepared();
    const cancelledResult = await approveAndApplyNeutronGraphMutation({
      ...hostInput(
        cancelled.root,
        cancelled.fingerprint,
        cancelled.durable,
        cancelled.store,
      ),
      intent: intent(cancelled.root, cancelled.proposalId),
      session: validateNeutronRuntimeSession({
        ...slice5Session(cancelled.root),
        state: "cancelled",
      }),
    });
    expect(cancelledResult.approvalOutcome).toBe("cancelled");
    const missing = await prepared();
    const unavailable = await approveAndApplyNeutronGraphMutation({
      ...hostInput(
        missing.root,
        missing.fingerprint,
        missing.durable,
        undefined,
      ),
      intent: intent(missing.root, missing.proposalId),
    });
    expect(unavailable.approvalOutcome).toBe("review-unavailable");
    const unknown = await approveAndApplyNeutronGraphMutation({
      ...hostInput(
        missing.root,
        missing.fingerprint,
        missing.durable,
        missing.store,
      ),
      intent: intent(missing.root, "proposal-missing"),
    });
    expect(unknown.approvalOutcome).toBe("proposal-not-found");
    expect(await readFile(join(missing.root, "src/a.ts"), "utf8")).toBe(
      "old a\n",
    );
  });

  it("does not write a second time for a duplicate request", async () => {
    const ready = await prepared();
    const first = await approve(ready);
    expect(first.applied).toBe(true);
    await writeFile(join(ready.root, "src/a.ts"), "after-apply\n");
    const second = await approve(ready);
    expect(second.applied).toBe(true);
    expect(await readFile(join(ready.root, "src/a.ts"), "utf8")).toBe(
      "after-apply\n",
    );
  });

  it("requires the host durable directory and reuses the durable lock", async () => {
    const ready = await prepared();
    const missing = await approveAndApplyNeutronGraphMutation({
      ...hostInput(ready.root, ready.fingerprint, undefined, ready.store),
      intent: intent(ready.root, ready.proposalId),
    });
    expect(missing.approvalOutcome).toBe("durable-state-unavailable");
    expect(await readFile(join(ready.root, "src/a.ts"), "utf8")).toBe(
      "old a\n",
    );
    const canonical = await realpath(ready.root);
    const held = await acquireNeutronMutationApplyLock({
      canonicalRoot: canonical,
      durableStateDirectory: ready.durable,
      transactionId: "other-transaction",
    });
    expect(held.ok).toBe(true);
    const blocked = await approve(ready);
    expect(blocked.failureCode).toBe("lock-conflict");
    expect(blocked.applied).toBe(false);
    expect(await readFile(join(ready.root, "src/a.ts"), "utf8")).toBe(
      "old a\n",
    );
  });

  it("lets only one concurrent caller own the shared durable directory", async () => {
    const ready = await prepared();
    const [left, right] = await Promise.all([approve(ready), approve(ready)]);
    const appliedCount = [left, right].filter(
      (result) => result.applied === true && result.status === "applied",
    ).length;
    expect(appliedCount).toBe(1);
    expect(await readFile(join(ready.root, "src/a.ts"), "utf8")).toBe(
      SLICE5_CONTENT_A,
    );
  });

  it("does not call a model while approving and applying", async () => {
    const root = await reviewProject();
    const durable = await durableDir();
    const calls = { adapters: 0, turns: 0 };
    const runtime = createNeutronSessionRuntime({
      createAdapter: () => {
        calls.adapters += 1;
        return countingAdapter(calls);
      },
      durableStateDirectory: durable,
      now: () => new Date(SLICE5_NOW),
      sessionProposalCapabilities: [NEUTRON_MUTATION_PROPOSAL_CAPABILITY],
    });
    const created = await runtime.create({
      projectId: "project-slice5",
      root,
    });
    const executed = await runtime.executeGraph({
      nodes: [slice5Node("task-build", { state: "ready" })],
      projectId: "project-slice5",
      root,
      sessionId: created.session.sessionId,
    });
    const turnsAfterGraph = calls.turns;
    const proposalId = executed.mutationProposal?.proposalId;
    const graphId = executed.graphSnapshot?.graphId;
    expect(executed.session.mutationAllowed).toBe(false);
    const result = await runtime.approveAndApplyNeutronMutation(
      intent(root, proposalId!, {
        graphId,
        projectId: "project-slice5",
        sessionId: created.session.sessionId,
      }),
    );
    expect(calls.turns).toBe(turnsAfterGraph);
    expect(result.applied).toBe(true);
    expect(result.verificationStatus).toBe("verified");
    expect(JSON.stringify(result)).not.toContain("approvalToken");
    expect(await readFile(join(root, "src/a.ts"), "utf8")).toBe(
      SLICE5_CONTENT_A,
    );
  });

  it("does not re-apply when verification fails after the write", async () => {
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
    expect(failed.status).not.toBe("rejected");
    const again = await approve(ready);
    expect(await readFile(join(ready.root, "src/a.ts"), "utf8")).toBe(
      "tampered\n",
    );
    expect(again.applied).toBe(true);
  });

  it("fails closed when the authoritative payload is gone after a restart", async () => {
    const ready = await prepared();
    expect((await approve(ready)).applied).toBe(true);
    await writeFile(join(ready.root, "src/a.ts"), "kept\n");
    const restarted = await approveAndApplyNeutronGraphMutation({
      ...hostInput(ready.root, ready.fingerprint, ready.durable, undefined),
      intent: intent(ready.root, ready.proposalId),
    });
    expect(restarted.approvalOutcome).toBe("review-unavailable");
    expect(await readFile(join(ready.root, "src/a.ts"), "utf8")).toBe("kept\n");
  });

  it("publishes only the combined method and keeps N4 unchanged", () => {
    expect(WORKSPACE_DAEMON_REQUEST_METHODS).toContain(
      NEUTRON_MUTATION_APPROVE_AND_APPLY_METHOD,
    );
    expect(WORKSPACE_DAEMON_REQUEST_METHODS).not.toContain(
      "intentloom.neutron.mutation.approve.v1",
    );
    expect(WORKSPACE_DAEMON_REQUEST_METHODS).toContain(
      "intentloom.neutron.mutation.status.get.v1",
    );
    expect(
      parseWorkspaceDaemonRequest(
        {
          id: 1,
          jsonrpc: "2.0",
          method: "intentloom.neutron.mutation.approve.v1",
          params: { protocolVersion: PROTOCOL_VERSION },
        },
        1,
      ),
    ).toBeNull();
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
        durableStateDirectory: "/tmp/intentloom-d4-capability",
      }),
    );
    const capabilities = daemonCapabilities(handlers);
    expect(
      capabilities.find(
        (item) => item.method === NEUTRON_MUTATION_APPROVE_AND_APPLY_METHOD,
      )?.classification,
    ).toBe("mutating");
    expect(
      capabilities.some((item) => item.method.includes("approve.v1")),
    ).toBe(false);
  });

  it("does not expose the mutation through the generic neutron command", () => {
    const root = join(dirname(fileURLToPath(import.meta.url)), "..");
    const allowlist = readFileSync(
      join(root, "apps/desktop/src-tauri/src/method_allowlist.rs"),
      "utf8",
    );
    const commands = readFileSync(
      join(root, "apps/desktop/src-tauri/src/neutron_approve_apply.rs"),
      "utf8",
    );
    const main = readFileSync(
      join(root, "apps/desktop/src-tauri/src/main.rs"),
      "utf8",
    );
    const client = readFileSync(
      join(root, "apps/desktop/src/desktop-client-neutron-approve-apply.ts"),
      "utf8",
    );
    const neutronMethods = allowlist.slice(
      allowlist.indexOf("pub fn is_neutron_method"),
      allowlist.indexOf("pub fn is_neutron_mutation_review_list_method"),
    );
    expect(neutronMethods).not.toContain("approveAndApply");
    expect(allowlist).toContain(
      'method == "intentloom.neutron.mutation.approveAndApply.v1"',
    );
    expect(commands).toContain("approve_and_apply_neutron_mutation");
    expect(commands).toContain("is_neutron_mutation_approve_and_apply_method");
    expect(main).toContain("approve_and_apply_neutron_mutation");
    expect(client).toContain("approve_and_apply_neutron_mutation");
    expect(client).not.toContain("invoke_neutron_request");
    expect(client).not.toContain("approvalToken");
  });
});

async function prepared(input: { readonly expiresAt?: number } = {}) {
  const root = await reviewProject();
  const fingerprint = await fingerprintNeutronProjectRoot(root);
  const materialized = materializeReviewBundle({
    fingerprint,
    root,
    ...(input.expiresAt === undefined ? {} : { expiresAt: input.expiresAt }),
  });
  return {
    durable: await durableDir(),
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
  durable: string | undefined,
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

function intent(
  root: string,
  proposalId: string,
  extras: Record<string, unknown> = {},
) {
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
    ...extras,
  };
}

function tokenFor(ready: { readonly proposalDigest: string }): string {
  return expectedNeutronMutationApprovalToken(ready.proposalDigest);
}

async function durableDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), "neutron-d4-state-"));
}

function countingAdapter(calls: { turns: number }): ModelAdapter {
  return {
    getCapabilities: () => ({
      maxContextTokens: 1024,
      maxOutputTokens: 256,
      modelId: "fixture-d4",
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
