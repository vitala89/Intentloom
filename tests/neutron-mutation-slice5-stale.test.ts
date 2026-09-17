import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { nodeFileSystem } from "../packages/application/src/index.js";
import { hostNeutronGraphMutationProposalId } from "../packages/application/src/neutron-graph-mutation-identity.js";
import { createMemoryNeutronMutationApprovalStore } from "../packages/application/src/neutron-mutation-apply-store.js";
import { digestNeutronNodeOutput } from "../packages/application/src/neutron-node-result.js";
import {
  applyApprovedNeutronGraphMutation,
  assertNeutronGraphMutationMaterializationCurrent,
  collectNeutronGraphMutationCandidates,
  createMemoryNeutronGraphMutationPayloadStore,
  materializeNeutronGraphMutationReview,
  NEUTRON_MUTATION_PROPOSAL_CAPABILITY,
  neutronGraphMutationMaterializationIsCurrent,
} from "../packages/application/src/neutron-scheduler.js";
import { executeStoredNeutronGraph } from "../packages/application/src/neutron-session-graph.js";
import { fingerprintNeutronProjectRoot } from "../packages/application/src/neutron-session-fingerprint.js";
import { neutronAdapterCapability } from "../packages/application/src/neutron-session-runtime-helpers.js";
import type { StoredNeutronSession } from "../packages/application/src/neutron-session-turn.js";
import type { ModelAdapter } from "../packages/application/src/model-adapter.js";
import { NEUTRON_MUTATION_CLASS } from "../packages/protocol/src/neutron-mutation.js";
import type {
  ModelTurnRequest,
  ModelTurnResult,
} from "../packages/protocol/src/model-adapter.js";
import { NeutronN2Error } from "../packages/validator/src/neutron-runtime-n2.js";
import { validateModelAdapterCapabilities } from "../packages/validator/src/model-adapter.js";
import {
  SLICE5_CONTENT_A,
  SLICE5_FINGERPRINT,
  SLICE5_NOW,
  slice5CandidateOutput,
  slice5Caps,
  slice5Graph,
  slice5Node,
  slice5Outcome,
  slice5Session,
} from "./neutron-mutation-slice5-support.js";

const FINGERPRINT_B =
  "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

class ScriptedAdapter implements ModelAdapter {
  private readonly steps: ModelTurnResult[];

  constructor(steps: ModelTurnResult[]) {
    this.steps = [...steps];
  }

  getCapabilities() {
    return validateModelAdapterCapabilities({
      maxContextTokens: 8192,
      maxOutputTokens: 1024,
      modelId: "fixture-slice51",
      providerKind: "ollama",
      supportsStreaming: false,
      supportsToolCalls: true,
      supportsVision: false,
    });
  }

  async executeTurn(
    request: ModelTurnRequest,
    options: { signal?: AbortSignal } = {},
  ): Promise<ModelTurnResult> {
    if (options.signal?.aborted === true) {
      throw new NeutronN2Error(
        "cancelled",
        "Model turn execution was cancelled",
      );
    }
    const next = this.steps.shift();
    if (next === undefined) throw new Error("unexpected extra model turn");
    return { ...next, sessionId: request.sessionId };
  }
}

function inspectThenCandidate(
  sessionId: string,
  root: string,
): ScriptedAdapter {
  return new ScriptedAdapter([
    {
      diagnostics: ["slice51"],
      responseText: "",
      schemaVersion: 1,
      sessionId,
      stopReason: "tool_call",
      toolCalls: [
        {
          argumentsJson: JSON.stringify({ root }),
          id: "call-inspect",
          name: "inspect",
        },
      ],
      usage: { inputTokens: 4, outputTokens: 2, totalTokens: 6 },
    },
    {
      diagnostics: ["slice51"],
      responseText: slice5CandidateOutput(),
      schemaVersion: 1,
      sessionId,
      stopReason: "stop",
      toolCalls: [],
      usage: { inputTokens: 4, outputTokens: 2, totalTokens: 6 },
    },
  ]);
}

function promptAdapter(root: string): ModelAdapter {
  return {
    getCapabilities: () =>
      validateModelAdapterCapabilities({
        maxContextTokens: 8192,
        maxOutputTokens: 1024,
        modelId: "fixture-slice51-wave",
        providerKind: "ollama",
        supportsStreaming: false,
        supportsToolCalls: true,
        supportsVision: false,
      }),
    async executeTurn(
      request: ModelTurnRequest,
      options: { signal?: AbortSignal } = {},
    ): Promise<ModelTurnResult> {
      if (options.signal?.aborted === true) {
        throw new NeutronN2Error(
          "cancelled",
          "Model turn execution was cancelled",
        );
      }
      const sawTool = request.messages.some(
        (message) => message.role === "tool",
      );
      const wantsProposal = request.messages.some(
        (message) =>
          message.role === "user" && message.content.includes("Propose exact"),
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
              argumentsJson: JSON.stringify({ root }),
              id: "call-inspect",
              name: "inspect",
            },
          ],
          usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
        };
      }
      return {
        diagnostics: [],
        responseText: wantsProposal
          ? slice5CandidateOutput()
          : "Inspection complete",
        schemaVersion: 1,
        sessionId: request.sessionId,
        stopReason: "stop",
        toolCalls: [],
        usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
      };
    },
  };
}

async function prepareProject(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "neutron-slice51-"));
  await mkdir(join(root, "src"), { recursive: true });
  await mkdir(join(root, "docs/specs"), { recursive: true });
  await writeFile(join(root, "src/a.ts"), "old a\n");
  await writeFile(join(root, "src/z.ts"), "old z\n");
  await writeFile(join(root, "package.json"), '{"name":"slice51"}\n');
  await writeFile(join(root, "README.md"), "safe\n");
  await writeFile(join(root, "docs/specs/SPEC.md"), "# Intent\n");
  return root;
}

function storedSession(
  root: string,
  adapter: ModelAdapter,
): StoredNeutronSession {
  const session = slice5Session(root);
  return {
    adapter: neutronAdapterCapability(adapter),
    contextSummary: null,
    errorCode: null,
    errorMessage: null,
    graphSnapshot: null,
    mutationProposal: null,
    projectFingerprintAfter: null,
    projectFingerprintBefore: null,
    prompt: null,
    responseText: null,
    session,
    toolActivity: [],
    toolName: null,
  };
}

function candidateRecordAtA() {
  return collectNeutronGraphMutationCandidates({
    currentProjectFingerprint: SLICE5_FINGERPRINT,
    graph: slice5Graph([slice5Node("task-build")]),
    graphId: "graph-slice5",
    outcomes: [
      slice5Outcome({
        output: slice5CandidateOutput(),
        taskId: "task-build",
      }),
    ],
    permission: {
      sessionProposalCapabilities: [NEUTRON_MUTATION_PROPOSAL_CAPABILITY],
    },
    session: slice5Session(),
    stale: null,
  })[0]!;
}

describe("Neutron mutation Slice 5.1 stale proposal rebinding", () => {
  it("rejects Candidate A materialization against project fingerprint B", () => {
    const record = candidateRecordAtA();
    expect(record.execution.projectFingerprintAfter).toBe(SLICE5_FINGERPRINT);
    expect(() =>
      materializeNeutronGraphMutationReview({
        currentProjectFingerprint: FINGERPRINT_B,
        now: () => SLICE5_NOW,
        record,
        session: slice5Session(),
        store: createMemoryNeutronGraphMutationPayloadStore(),
      }),
    ).toThrow(/stale/);
    expect(() =>
      assertNeutronGraphMutationMaterializationCurrent({
        attemptFingerprint: SLICE5_FINGERPRINT,
        currentFingerprint: FINGERPRINT_B,
        stale: null,
      }),
    ).toThrow(/stale/);
  });

  it("Candidate A cannot be materialized as proposal.projectStateDigest = B after project changes", () => {
    const record = candidateRecordAtA();
    const store = createMemoryNeutronGraphMutationPayloadStore();
    expect(record.candidate.files[0]?.content).toBe(SLICE5_CONTENT_A);
    expect(() =>
      materializeNeutronGraphMutationReview({
        currentProjectFingerprint: FINGERPRINT_B,
        now: () => SLICE5_NOW,
        record,
        session: slice5Session(),
        store,
      }),
    ).toThrow(/stale/);
    expect(store.list()).toEqual([]);
    expect(
      neutronGraphMutationMaterializationIsCurrent({
        attemptFingerprint: SLICE5_FINGERPRINT,
        currentFingerprint: FINGERPRINT_B,
        stale: null,
      }),
    ).toBe(false);
  });

  it("does not collect any wave candidate whose attempt fingerprint is no longer current", () => {
    expect(
      collectNeutronGraphMutationCandidates({
        currentProjectFingerprint: FINGERPRINT_B,
        graph: slice5Graph([
          slice5Node("task-a", {
            expectedOutput: "Inspect the project",
            requiredCapabilities: ["inspect"],
            role: "context-scout",
          }),
          slice5Node("task-b"),
        ]),
        graphId: "graph-slice5",
        outcomes: [
          slice5Outcome({
            output: "Inspection complete",
            taskId: "task-a",
          }),
          slice5Outcome({
            output: slice5CandidateOutput(),
            taskId: "task-b",
          }),
        ],
        permission: {
          sessionProposalCapabilities: [NEUTRON_MUTATION_PROPOSAL_CAPABILITY],
        },
        session: slice5Session(),
        stale: {
          accepted: false,
          kinds: ["project"],
          mismatches: [
            {
              current: FINGERPRINT_B,
              expected: SLICE5_FINGERPRINT,
              kind: "project",
            },
          ],
          rerunAttempted: false,
        },
      }),
    ).toEqual([]);
  });

  it("does not collect an authoritative candidate after project A becomes B", () => {
    expect(
      collectNeutronGraphMutationCandidates({
        currentProjectFingerprint: FINGERPRINT_B,
        graph: slice5Graph([slice5Node("task-build")]),
        graphId: "graph-slice5",
        outcomes: [
          slice5Outcome({
            output: slice5CandidateOutput(),
            taskId: "task-build",
          }),
        ],
        permission: {
          sessionProposalCapabilities: [NEUTRON_MUTATION_PROPOSAL_CAPABILITY],
        },
        session: slice5Session(),
        stale: {
          accepted: false,
          kinds: ["project"],
          mismatches: [
            {
              current: FINGERPRINT_B,
              expected: SLICE5_FINGERPRINT,
              kind: "project",
            },
          ],
          rerunAttempted: false,
        },
      }),
    ).toEqual([]);
  });

  it("refuses materialization when graph stale.accepted is false even if fingerprints match", () => {
    expect(
      neutronGraphMutationMaterializationIsCurrent({
        attemptFingerprint: SLICE5_FINGERPRINT,
        currentFingerprint: SLICE5_FINGERPRINT,
        stale: {
          accepted: false,
          kinds: ["profile"],
          mismatches: [
            {
              current: "profile-b",
              expected: "profile-a",
              kind: "profile",
            },
          ],
          rerunAttempted: false,
        },
      }),
    ).toBe(false);
  });

  it("stale candidate cannot Apply even when caller retains candidate output from A", async () => {
    const record = candidateRecordAtA();
    const store = createMemoryNeutronGraphMutationPayloadStore();
    expect(record.candidate.files[0]?.content).toBe(SLICE5_CONTENT_A);
    expect(() =>
      materializeNeutronGraphMutationReview({
        currentProjectFingerprint: FINGERPRINT_B,
        now: () => SLICE5_NOW,
        record,
        session: slice5Session(),
        stale: {
          accepted: false,
          kinds: ["project"],
          mismatches: [
            {
              current: FINGERPRINT_B,
              expected: SLICE5_FINGERPRINT,
              kind: "project",
            },
          ],
          rerunAttempted: false,
        },
        store,
      }),
    ).toThrow(/stale/);
    expect(store.list()).toEqual([]);
    const proposalId = hostNeutronGraphMutationProposalId({
      attempt: record.attempt,
      graphId: record.graphId,
      outputDigest: digestNeutronNodeOutput(record.execution.output),
      projectId: slice5Session().projectId,
      root: slice5Session().root,
      sessionId: slice5Session().sessionId,
      taskId: record.taskId,
    });
    const denied = await applyApprovedNeutronGraphMutation({
      approval: { proposalId },
      apply: {
        actualRoot: slice5Session().root,
        authorization: { kind: "host", mutationClass: NEUTRON_MUTATION_CLASS },
        fs: nodeFileSystem,
        now: () => SLICE5_NOW,
        store: createMemoryNeutronMutationApprovalStore(),
      },
      graphStale: {
        baseline: { projectFingerprint: SLICE5_FINGERPRINT },
        current: { projectFingerprint: FINGERPRINT_B },
      },
      proposalId,
      session: slice5Session(),
      store,
    });
    expect(denied.applied).toBe(false);
    expect(denied.failureCode).toBe("proposal-not-found");
    expect(denied.apply).toBeUndefined();
  });

  it("fails closed in executeStoredNeutronGraph when fingerprint A becomes B", async () => {
    const root = await prepareProject();
    const fingerprintA = await fingerprintNeutronProjectRoot(root);
    const adapter = inspectThenCandidate("session-slice5", root);
    const store = createMemoryNeutronGraphMutationPayloadStore();
    let calls = 0;
    const completed = await executeStoredNeutronGraph({
      adapter,
      capabilities: slice5Caps(),
      fingerprint: async () => {
        calls += 1;
        return calls < 6 ? fingerprintA : FINGERPRINT_B;
      },
      fs: nodeFileSystem,
      mutationPayloadStore: store,
      nodes: [slice5Node("task-build", { state: "ready" })],
      sessionProposalCapabilities: [NEUTRON_MUTATION_PROPOSAL_CAPABILITY],
      signal: new AbortController().signal,
      stored: storedSession(root, adapter),
    });
    expect(completed.graphSnapshot?.status).toBe("stale");
    expect(completed.graphSnapshot?.accepted).toBe(false);
    expect(completed.graphSnapshot?.stale?.accepted).toBe(false);
    expect(completed.graphSnapshot?.stale?.rerunAttempted).toBe(false);
    expect(completed.graphSnapshot?.stale?.kinds).toContain("project");
    expect(completed.graphSnapshot?.mutationAttempted).toBe(false);
    expect(completed.mutationProposal).toBeNull();
    expect(completed.mutationProposalSource).not.toBe("authoritative");
    expect(store.list()).toEqual([]);
    expect(completed.storedGraph?.outcomes[0]?.execution).toMatchObject({
      projectFingerprintBefore: fingerprintA,
      projectFingerprintAfter: fingerprintA,
    });
    expect(completed.mutationProposal?.plan.projectStateDigest).not.toBe(
      `sha256:${FINGERPRINT_B}`,
    );
    const denied = await applyApprovedNeutronGraphMutation({
      approval: { proposalId: "missing" },
      apply: {
        actualRoot: root,
        authorization: { kind: "host", mutationClass: NEUTRON_MUTATION_CLASS },
        fs: nodeFileSystem,
        now: () => SLICE5_NOW,
        store: createMemoryNeutronMutationApprovalStore(),
      },
      graphStale: {
        baseline: { projectFingerprint: fingerprintA },
        current: { projectFingerprint: FINGERPRINT_B },
      },
      proposalId: "missing",
      session: completed.session,
      store,
    });
    expect(denied.applied).toBe(false);
    expect(denied.failureCode).toBe("proposal-not-found");
    expect(await fingerprintNeutronProjectRoot(root)).toBe(fingerprintA);
    expect(JSON.stringify(completed.graphSnapshot)).not.toContain(
      SLICE5_CONTENT_A,
    );
    expect(calls).toBe(6);
  });

  it("does not rebind a completed wave candidate after a later project change", async () => {
    const root = await prepareProject();
    const fingerprintA = await fingerprintNeutronProjectRoot(root);
    const adapter = promptAdapter(root);
    const store = createMemoryNeutronGraphMutationPayloadStore();
    let calls = 0;
    const completed = await executeStoredNeutronGraph({
      adapter,
      capabilities: slice5Caps(),
      fingerprint: async () => {
        calls += 1;
        return calls < 10 ? fingerprintA : FINGERPRINT_B;
      },
      fs: nodeFileSystem,
      maxConcurrency: 2,
      mutationPayloadStore: store,
      nodes: [
        slice5Node("task-a", {
          expectedOutput: "Inspect the project",
          requiredCapabilities: ["inspect"],
          role: "context-scout",
          state: "ready",
        }),
        slice5Node("task-b", { state: "ready" }),
      ],
      sessionProposalCapabilities: [NEUTRON_MUTATION_PROPOSAL_CAPABILITY],
      signal: new AbortController().signal,
      stored: storedSession(root, adapter),
    });
    expect(completed.graphSnapshot?.status).toBe("stale");
    expect(completed.graphSnapshot?.stale?.accepted).toBe(false);
    expect(completed.graphSnapshot?.stale?.rerunAttempted).toBe(false);
    expect(completed.mutationProposal).toBeNull();
    expect(store.list()).toEqual([]);
    const builder = completed.storedGraph?.outcomes.find(
      (outcome) => outcome.taskId === "task-b",
    );
    expect(builder?.execution).toMatchObject({
      projectFingerprintBefore: fingerprintA,
      projectFingerprintAfter: fingerprintA,
    });
    expect(calls).toBe(10);
  });
});
