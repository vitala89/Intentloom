import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PROTOCOL_VERSION,
  WORKSPACE_DAEMON_REQUEST_METHODS,
  parseWorkspaceDaemonRequest,
} from "@intentloom/protocol";
import {
  NEUTRON_MUTATION_APPROVAL_INTENT_ACTION,
  NEUTRON_MUTATION_APPROVAL_INTENT_SCHEMA_URN,
  NEUTRON_MUTATION_CLASS,
} from "../packages/protocol/src/neutron-mutation.js";
import { NEUTRON_READ_ONLY_TOOLS } from "../packages/protocol/src/neutron-runtime.js";
import type { ModelAdapter } from "../packages/application/src/model-adapter.js";
import { nodeFileSystem } from "../packages/application/src/index.js";
import { createMemoryNeutronMutationApprovalStore } from "../packages/application/src/neutron-mutation-apply-store.js";
import { neutronMutationApplyLeaksToken } from "../packages/application/src/neutron-mutation-apply-result.js";
import { createNeutronSessionRuntime } from "../packages/application/src/neutron-session-runtime.js";
import { NEUTRON_MUTATION_PROPOSAL_CAPABILITY } from "../packages/application/src/neutron-mutation-proposal-capability.js";
import { fingerprintNeutronProjectRoot } from "../packages/application/src/neutron-session-fingerprint.js";
import {
  NEUTRON_MUTATION_APPROVAL_MAX_LIFETIME_MS,
  NEUTRON_MUTATION_HOST_APPROVING_ACTOR,
  applyApprovedNeutronGraphMutation,
  createMemoryNeutronGraphMutationPayloadStore,
  issueNeutronMutationApprovalFromIntent,
  publicNeutronMutationApprovalIssueFacts,
  type IssueNeutronMutationApprovalResult,
  type NeutronMutationApprovalIssueOutcome,
} from "../packages/application/src/neutron-scheduler.js";
import type { NeutronGraphMutationReviewBundle } from "../packages/application/src/neutron-graph-mutation-store.js";
import type { NeutronRuntimeSession } from "../packages/protocol/src/neutron-runtime.js";
import { validateNeutronMutationApprovalIntent } from "../packages/validator/src/neutron-mutation.js";
import { expectedNeutronMutationApprovalToken } from "../packages/validator/src/neutron-mutation-digest.js";
import { validateNeutronRuntimeSession } from "../packages/validator/src/neutron-runtime.js";
import {
  REVIEW_GRAPH_ID,
  SLICE5_CONTENT_A,
  SLICE5_FINGERPRINT,
  SLICE5_NOW,
  materializeReviewBundle,
  reviewProject,
} from "./neutron-mutation-review-support.js";
import {
  slice5CandidateOutput,
  slice5Node,
  slice5Session,
} from "./neutron-mutation-slice5-support.js";

const ATTACKER_CONTENT = "attacker content";
const ATTACKER_TOKEN = "approved:attacker-token";

const SPOOFED_FIELDS = {
  approvalToken: ATTACKER_TOKEN,
  approvalDigest: `sha256:${"ab".repeat(32)}`,
  proposalDigest: `sha256:${"cd".repeat(32)}`,
  reviewArtifactDigest: `sha256:${"ef".repeat(32)}`,
  projectStateDigest: `sha256:${"11".repeat(32)}`,
  planDigest: `sha256:${"22".repeat(32)}`,
  grantedApprovals: ["atomic-commit-approval"],
  approved: true,
  mutationAllowed: true,
  authorized: true,
  files: [{ path: "src/a.ts", content: ATTACKER_CONTENT }],
  proposedContent: ATTACKER_CONTENT,
  currentContent: ATTACKER_CONTENT,
  previousContent: "secret-before",
  changedPaths: ["src/evil.ts"],
  expiresAt: SLICE5_NOW + 9_999_999,
  expiry: SLICE5_NOW + 9_999_999,
  approvalValidUntil: SLICE5_NOW + 9_999_999,
  mutationClass: "shell",
  approvingActor: "renderer",
  approvalSource: "renderer",
  taskId: "task-spoofed",
} as const;

describe("Neutron mutation D3 approval intent", () => {
  it("rejects authority-bearing fields and does not treat intent as approval", () => {
    const root = "/tmp/neutron-d3-intent";
    const intent = approvalIntent(root, "proposal-1");
    expect(validateNeutronMutationApprovalIntent(intent).action).toBe(
      "request-host-approval",
    );
    expect(intent).not.toHaveProperty("approved");
    expect(intent).not.toHaveProperty("approvalToken");
    for (const [key, value] of Object.entries(SPOOFED_FIELDS)) {
      const spoofed = { ...intent, [key]: value };
      expect(() => validateNeutronMutationApprovalIntent(spoofed)).toThrow(
        new RegExp(`must not include ${key}`),
      );
      const issued = issueFor(root, undefined, "proposal-1", {
        intent: spoofed,
      });
      expectDenied(issued, "intent-rejected");
      expect(JSON.stringify(issued)).not.toContain(ATTACKER_TOKEN);
      expect(JSON.stringify(issued)).not.toContain(ATTACKER_CONTENT);
    }
  });

  it("issues approval only for the exact authoritative proposal", () => {
    const root = "/tmp/neutron-d3-happy";
    const { bundle, store } = materializeReviewBundle({ root });
    const issued = issueFor(root, store, bundle.proposal.proposalId);
    expect(issued.issued).toBe(true);
    if (!issued.issued) return;
    expect(issued.approval.proposalId).toBe(bundle.proposal.proposalId);
    expect(issued.approval.proposalDigest).toBe(bundle.proposal.proposalDigest);
    expect(issued.approval.planDigest).toBe(bundle.proposal.plan.planDigest);
    expect(issued.approval.projectStateDigest).toBe(
      bundle.proposal.plan.projectStateDigest,
    );
    expect(issued.approval.reviewArtifactDigest).toBe(
      bundle.artifact.artifactDigest,
    );
    expect(issued.approval.changedPaths).toEqual([
      ...bundle.artifact.changedPaths,
    ]);
    expect(issued.approval.mutationClass).toBe(NEUTRON_MUTATION_CLASS);
    expect(issued.approval.approvalSource).toBe("local-interactive");
    expect(issued.approval.approvingActor).toBe(
      NEUTRON_MUTATION_HOST_APPROVING_ACTOR,
    );
    expect(issued.approval.approvalToken).toBe(
      expectedNeutronMutationApprovalToken(bundle.proposal.proposalDigest),
    );
    expect(issued.approval.approvalToken).not.toBe(ATTACKER_TOKEN);
    expect(issued.approval.approvalValidUntil).toBe(
      SLICE5_NOW + NEUTRON_MUTATION_APPROVAL_MAX_LIFETIME_MS,
    );
    expect(issued.approval.root).toBe(bundle.proposal.root);
    expect(issued.approval.sessionId).toBe(bundle.proposal.sessionId);
    expect(issued.approval.projectId).toBe(bundle.proposal.projectId);
    expect(issued.approval.graphId).toBe(bundle.evidence.graphId);
    const published = publicNeutronMutationApprovalIssueFacts(issued);
    expect(JSON.stringify(published)).not.toContain(
      issued.approval.approvalToken,
    );
    expect(published).not.toHaveProperty("approvalToken");
    expect(store.list()).toHaveLength(1);
  });

  it("binds the shorter plan expiry and does not extend it", () => {
    const root = "/tmp/neutron-d3-expiry-bound";
    const expiresAt = SLICE5_NOW + 60_000;
    const { bundle, store } = materializeReviewBundle({ expiresAt, root });
    const issued = issueFor(root, store, bundle.proposal.proposalId);
    expect(issued.issued).toBe(true);
    if (!issued.issued) return;
    expect(issued.approval.approvalValidUntil).toBe(expiresAt);
    expect(issued.approval.approvalValidUntil).toBeLessThan(
      SLICE5_NOW + NEUTRON_MUTATION_APPROVAL_MAX_LIFETIME_MS,
    );
  });

  it("selects proposal B when two authoritative proposals are stored", () => {
    const root = "/tmp/neutron-d3-multi";
    const first = materializeReviewBundle({ root, taskId: "task-build" });
    const second = materializeReviewBundle({
      root,
      store: first.store,
      taskId: "task-other",
    });
    expect(first.bundle.proposal.proposalId).not.toBe(
      second.bundle.proposal.proposalId,
    );
    const issued = issueFor(
      root,
      first.store,
      second.bundle.proposal.proposalId,
    );
    expect(issued.issued).toBe(true);
    if (!issued.issued) return;
    expect(issued.approval.proposalId).toBe(second.bundle.proposal.proposalId);
    expect(issued.approval.proposalDigest).toBe(
      second.bundle.proposal.proposalDigest,
    );
    expect(issued.approval.proposalDigest).not.toBe(
      first.bundle.proposal.proposalDigest,
    );
    expect(issued.approval.reviewArtifactDigest).toBe(
      second.bundle.artifact.artifactDigest,
    );
    expect(first.store.list()).toHaveLength(2);
  });

  it("fails closed for missing, preview, stale, expired, and cancelled reviews", () => {
    const root = "/tmp/neutron-d3-closed";
    const { bundle, store } = materializeReviewBundle({ root });
    expectDenied(
      issueFor(root, store, "proposal-missing"),
      "proposal-not-found",
    );
    expectDenied(
      issueFor(root, undefined, bundle.proposal.proposalId),
      "review-unavailable",
    );
    expectDenied(
      issueNeutronMutationApprovalFromIntent({
        currentProjectFingerprint: SLICE5_FINGERPRINT,
        intent: approvalIntent(root, bundle.proposal.proposalId),
        now: SLICE5_NOW,
        previewProposal: bundle.proposal,
        previewSource: "preview",
        session: slice5Session(root),
        store: undefined,
      }),
      "preview-not-authoritative",
    );
    const previewStore = createMemoryNeutronGraphMutationPayloadStore();
    previewStore.put({
      ...bundle,
      evidence: { ...bundle.evidence, source: "preview" },
    } as NeutronGraphMutationReviewBundle);
    expectDenied(
      issueFor(root, previewStore, bundle.proposal.proposalId),
      "preview-not-authoritative",
    );
    expect(previewStore.list()).toHaveLength(1);
    expectDenied(
      issueFor(root, store, bundle.proposal.proposalId, {
        currentProjectFingerprint:
          "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      }),
      "stale",
    );
    expect(store.get(bundle.proposal.proposalId)?.proposal.proposalDigest).toBe(
      bundle.proposal.proposalDigest,
    );
    const expired = materializeReviewBundle({
      expiresAt: SLICE5_NOW,
      root,
    });
    expectDenied(
      issueFor(root, expired.store, expired.bundle.proposal.proposalId),
      "expired",
    );
    expectDenied(
      issueFor(root, store, bundle.proposal.proposalId, {
        session: sessionState(root, "cancelled"),
      }),
      "cancelled",
    );
    expectDenied(
      issueFor(root, store, bundle.proposal.proposalId, {
        session: sessionState(root, "failed"),
      }),
      "not-eligible",
    );
    expectDenied(
      issueFor(root, store, bundle.proposal.proposalId, {
        session: {
          ...slice5Session(root),
          mutationAllowed: true,
        } as NeutronRuntimeSession,
      }),
      "not-eligible",
    );
  });

  it("fails closed on scope mismatch and payload tamper", () => {
    const root = "/tmp/neutron-d3-scope";
    const { bundle, store } = materializeReviewBundle({ root });
    const proposalId = bundle.proposal.proposalId;
    expectDenied(
      issueFor(root, store, proposalId, {
        intent: approvalIntent(root, proposalId, {
          sessionId: "session-other",
        }),
      }),
      "session-mismatch",
    );
    expectDenied(
      issueFor(root, store, proposalId, {
        intent: approvalIntent(root, proposalId, {
          projectId: "project-other",
        }),
      }),
      "project-mismatch",
    );
    expectDenied(
      issueFor(root, store, proposalId, {
        intent: approvalIntent(root, proposalId, { root: "/tmp/other-root" }),
      }),
      "root-mismatch",
    );
    expectDenied(
      issueFor(root, store, proposalId, {
        intent: approvalIntent(root, proposalId, { graphId: "graph-other" }),
      }),
      "graph-mismatch",
    );
    const tampered = createMemoryNeutronGraphMutationPayloadStore();
    const inner = store.get(proposalId)!;
    tampered.put({
      ...inner,
      files: inner.files.map((file, index) =>
        index === 0 ? { ...file, content: ATTACKER_CONTENT } : file,
      ),
    });
    expectDenied(issueFor(root, tampered, proposalId), "payload-mismatch");
    expectDenied(
      issueFor(root, store, proposalId, {
        graphStale: {
          baseline: { projectFingerprint: SLICE5_FINGERPRINT },
          current: { projectFingerprint: "other-fingerprint" },
        },
      }),
      "graph-stale",
    );
    expect(store.list()).toHaveLength(1);
  });

  it("keeps duplicate intents on one approval identity without a second store", async () => {
    const root = "/tmp/neutron-d3-replay";
    const { bundle, store } = materializeReviewBundle({ root });
    const first = issueFor(root, store, bundle.proposal.proposalId);
    const second = issueFor(root, store, bundle.proposal.proposalId, {
      now: SLICE5_NOW + 5_000,
    });
    expect(first.issued).toBe(true);
    expect(second.issued).toBe(true);
    if (!first.issued || !second.issued) return;
    expect(second.approval.approvalId).toBe(first.approval.approvalId);
    expect(second.approval.approvalToken).toBe(first.approval.approvalToken);
    expect(second.approval.approvalDigest).not.toBe(
      first.approval.approvalDigest,
    );
    const approvalStore = createMemoryNeutronMutationApprovalStore();
    expect(await approvalStore.getByApproval(first.approval.approvalId)).toBe(
      undefined,
    );
    expect(store.list()).toHaveLength(1);
  });

  it("applies only through the canonical host approval on an isolated project", async () => {
    const root = await reviewProject();
    const raw = await fingerprintNeutronProjectRoot(root);
    const { bundle, store } = materializeReviewBundle({
      fingerprint: raw,
      root,
    });
    const before = await readFile(join(root, "src/a.ts"), "utf8");
    expect(before).not.toBe(ATTACKER_CONTENT);
    const denied = await applyApprovedNeutronGraphMutation({
      approval: approvalIntent(root, bundle.proposal.proposalId),
      apply: applyInput(root),
      graphStale: equalStale(raw),
      proposalId: bundle.proposal.proposalId,
      session: slice5Session(root),
      store,
    });
    expect(denied.applied).toBe(false);
    expect(await readFile(join(root, "src/a.ts"), "utf8")).toBe(before);
    const issued = issueFor(root, store, bundle.proposal.proposalId, {
      currentProjectFingerprint: raw,
    });
    const later = issueFor(root, store, bundle.proposal.proposalId, {
      currentProjectFingerprint: raw,
      now: SLICE5_NOW + 5_000,
    });
    expect(issued.issued).toBe(true);
    expect(later.issued).toBe(true);
    if (!issued.issued || !later.issued) return;
    expect(later.approval.approvalId).toBe(issued.approval.approvalId);
    expect(later.approval.approvalToken).toBe(issued.approval.approvalToken);
    const approvalStore = createMemoryNeutronMutationApprovalStore();
    const applied = await applyApprovedNeutronGraphMutation({
      approval: issued.approval,
      apply: applyInput(root, approvalStore),
      graphStale: equalStale(raw),
      proposalId: bundle.proposal.proposalId,
      session: slice5Session(root),
      store,
    });
    expect(applied.applied).toBe(true);
    expect(applied.apply?.verificationStatus).toBe("verified");
    expect(await readFile(join(root, "src/a.ts"), "utf8")).toBe(
      SLICE5_CONTENT_A,
    );
    expect(await readFile(join(root, "src/a.ts"), "utf8")).not.toBe(
      ATTACKER_CONTENT,
    );
    expect(
      neutronMutationApplyLeaksToken(applied, issued.approval.approvalToken),
    ).toBe(false);
    await writeFile(join(root, "src/a.ts"), "attacker-after\n");
    const replay = await applyApprovedNeutronGraphMutation({
      approval: later.approval,
      apply: applyInput(root, approvalStore),
      graphStale: equalStale(raw),
      proposalId: bundle.proposal.proposalId,
      session: slice5Session(root),
      store,
    });
    expect(await readFile(join(root, "src/a.ts"), "utf8")).toBe(
      "attacker-after\n",
    );
    expect(
      neutronMutationApplyLeaksToken(replay, later.approval.approvalToken),
    ).toBe(false);
    expect(JSON.stringify(replay)).not.toContain(later.approval.approvalToken);
  });

  it("does not mutate when approval is refused", async () => {
    const root = await reviewProject();
    const raw = await fingerprintNeutronProjectRoot(root);
    const { bundle, store } = materializeReviewBundle({
      fingerprint: raw,
      root,
    });
    const before = await readFile(join(root, "src/a.ts"), "utf8");
    expectDenied(
      issueFor(root, store, bundle.proposal.proposalId, {
        currentProjectFingerprint: `${raw}ff`,
      }),
      "stale",
    );
    expect(await readFile(join(root, "src/a.ts"), "utf8")).toBe(before);
  });

  it("issues from the session runtime without another model call", async () => {
    const root = await reviewProject();
    const calls = { adapters: 0, turns: 0 };
    const runtime = createNeutronSessionRuntime({
      createAdapter: () => {
        calls.adapters += 1;
        return countingAdapter(calls);
      },
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
    expect(executed.session.mutationAllowed).toBe(false);
    expect(executed.session.state).toBe("completed");
    const proposalId = executed.mutationProposal?.proposalId;
    const graphId = executed.graphSnapshot?.graphId;
    expect(proposalId).toEqual(expect.any(String));
    expect(graphId).toEqual(expect.any(String));
    const adaptersAfterGraph = calls.adapters;
    const turnsAfterGraph = calls.turns;
    const issued = await runtime.issueMutationApproval(
      approvalIntent(root, proposalId!, {
        graphId: graphId!,
        projectId: "project-slice5",
        sessionId: created.session.sessionId,
      }),
    );
    expect(issued.issued).toBe(true);
    if (!issued.issued) return;
    expect(issued.approval.proposalId).toBe(proposalId);
    expect(issued.approval.approvingActor).toBe(
      NEUTRON_MUTATION_HOST_APPROVING_ACTOR,
    );
    expect(issued.approval.graphId).toBe(graphId);
    expect(calls.adapters).toBe(adaptersAfterGraph);
    expect(calls.turns).toBe(turnsAfterGraph);
    expect(
      JSON.stringify(publicNeutronMutationApprovalIssueFacts(issued)),
    ).not.toContain(issued.approval.approvalToken);
    const restarted = createNeutronSessionRuntime({
      createAdapter: () => {
        calls.adapters += 1;
        return throwingAdapter();
      },
    });
    const missing = await restarted.issueMutationApproval(
      approvalIntent(root, proposalId!, {
        graphId: graphId!,
        projectId: "project-slice5",
        sessionId: created.session.sessionId,
      }),
    );
    expectDenied(missing, "session-mismatch");
    expect(calls.adapters).toBe(adaptersAfterGraph);
  });

  it("keeps N4 read-only and does not publish an Approve RPC", () => {
    expect([...NEUTRON_READ_ONLY_TOOLS]).toEqual([
      "inspect",
      "doctor",
      "memorySearch",
      "timeline",
      "conformance",
      "securityAudit",
      "projectDiff",
    ]);
    expect(NEUTRON_READ_ONLY_TOOLS).toHaveLength(7);
    for (const method of [
      "intentloom.neutron.mutation.approve.v1",
      "intentloom.neutron.mutation.approveAndApply.v1",
    ]) {
      expect(WORKSPACE_DAEMON_REQUEST_METHODS).not.toContain(method);
      expect(
        parseWorkspaceDaemonRequest(
          {
            id: 1,
            jsonrpc: "2.0",
            method,
            params: { protocolVersion: PROTOCOL_VERSION },
          },
          1,
        ),
      ).toBeNull();
    }
    expect(NEUTRON_MUTATION_APPROVAL_INTENT_ACTION).toBe(
      "request-host-approval",
    );
    expect(NEUTRON_MUTATION_APPROVAL_INTENT_SCHEMA_URN).toContain(
      "approval-intent",
    );
  });
});

function approvalIntent(
  root: string,
  proposalId: string,
  overrides: Record<string, unknown> = {},
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
    ...overrides,
  };
}

function issueFor(
  root: string,
  store:
    ReturnType<typeof createMemoryNeutronGraphMutationPayloadStore> | undefined,
  proposalId: string,
  extras: {
    readonly intent?: unknown;
    readonly currentProjectFingerprint?: string;
    readonly now?: number;
    readonly session?: NeutronRuntimeSession;
    readonly graphStale?: {
      readonly baseline: { readonly projectFingerprint: string };
      readonly current: { readonly projectFingerprint: string };
    };
  } = {},
): IssueNeutronMutationApprovalResult {
  return issueNeutronMutationApprovalFromIntent({
    currentProjectFingerprint:
      extras.currentProjectFingerprint ?? SLICE5_FINGERPRINT,
    intent: extras.intent ?? approvalIntent(root, proposalId),
    now: extras.now ?? SLICE5_NOW,
    session: extras.session ?? slice5Session(root),
    store,
    ...(extras.graphStale === undefined
      ? {}
      : { graphStale: extras.graphStale }),
  });
}

function expectDenied(
  result: IssueNeutronMutationApprovalResult,
  outcome: NeutronMutationApprovalIssueOutcome,
): void {
  expect(result.issued).toBe(false);
  if (result.issued) return;
  expect(result.outcome).toBe(outcome);
  expect(result).not.toHaveProperty("approval");
  expect(JSON.stringify(result)).not.toContain("approvalToken");
  expect(publicNeutronMutationApprovalIssueFacts(result)).toEqual({
    issued: false,
    outcome,
  });
}

function sessionState(
  root: string,
  state: "cancelled" | "failed",
): NeutronRuntimeSession {
  return validateNeutronRuntimeSession({
    ...slice5Session(root),
    state,
  });
}

function equalStale(fingerprint: string) {
  return {
    baseline: { projectFingerprint: fingerprint },
    current: { projectFingerprint: fingerprint },
  };
}

function applyInput(
  root: string,
  store = createMemoryNeutronMutationApprovalStore(),
) {
  return {
    actualRoot: root,
    authorization: {
      kind: "host" as const,
      mutationClass: NEUTRON_MUTATION_CLASS,
    },
    fs: nodeFileSystem,
    now: () => SLICE5_NOW,
    store,
  };
}

function countingAdapter(calls: { turns: number }): ModelAdapter {
  return {
    getCapabilities: () => ({
      maxContextTokens: 1024,
      maxOutputTokens: 256,
      modelId: "fixture-d3",
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
            {
              argumentsJson: "{}",
              id: "call-inspect",
              name: "inspect",
            },
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

function throwingAdapter(): ModelAdapter {
  return {
    getCapabilities: () => countingAdapter({ turns: 0 }).getCapabilities(),
    executeTurn: async () => {
      throw new Error("model must not be called during approval issuance");
    },
  };
}
