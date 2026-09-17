import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { nodeFileSystem } from "../packages/application/src/index.js";
import {
  createMemoryNeutronGraphMutationPayloadStore,
  NEUTRON_MUTATION_PROPOSAL_CAPABILITY,
} from "../packages/application/src/neutron-scheduler.js";
import { executeStoredNeutronGraph } from "../packages/application/src/neutron-session-graph.js";
import { fingerprintNeutronProjectRoot } from "../packages/application/src/neutron-session-fingerprint.js";
import { neutronAdapterCapability } from "../packages/application/src/neutron-session-runtime-helpers.js";
import type { StoredNeutronSession } from "../packages/application/src/neutron-session-turn.js";
import type { ModelAdapter } from "../packages/application/src/model-adapter.js";
import { NEUTRON_READ_ONLY_TOOLS } from "../packages/protocol/src/neutron-runtime.js";
import type {
  ModelTurnRequest,
  ModelTurnResult,
} from "../packages/protocol/src/model-adapter.js";
import { NeutronN2Error } from "../packages/validator/src/neutron-runtime-n2.js";
import { validateModelAdapterCapabilities } from "../packages/validator/src/model-adapter.js";
import {
  slice5CandidateOutput,
  slice5Caps,
  slice5Node,
  slice5Session,
} from "./neutron-mutation-slice5-support.js";

function promptAdapter(root: string): ModelAdapter {
  return {
    getCapabilities: () =>
      validateModelAdapterCapabilities({
        maxContextTokens: 8192,
        maxOutputTokens: 1024,
        modelId: "fixture-slice51-cap",
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
  const root = await mkdtemp(join(tmpdir(), "neutron-slice51-cap-"));
  await mkdir(join(root, "src"), { recursive: true });
  await writeFile(join(root, "src/a.ts"), "old a\n");
  await writeFile(join(root, "src/z.ts"), "old z\n");
  await writeFile(join(root, "package.json"), '{"name":"slice51"}\n');
  await writeFile(join(root, "README.md"), "safe\n");
  return root;
}

function storedSession(
  root: string,
  adapter: ModelAdapter,
): StoredNeutronSession {
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
    session: slice5Session(root),
    toolActivity: [],
    toolName: null,
  };
}

const ALLOWED = {
  capabilities: slice5Caps(),
  sessionProposalCapabilities: [NEUTRON_MUTATION_PROPOSAL_CAPABILITY],
  profileProposalCapabilities: [
    "inspect",
    NEUTRON_MUTATION_PROPOSAL_CAPABILITY,
  ],
  capabilityCeiling: ["inspect", NEUTRON_MUTATION_PROPOSAL_CAPABILITY],
} as const;

async function executeProposalGraph(
  root: string,
  nodes: ReturnType<typeof slice5Node>[],
  permission: {
    readonly sessionProposalCapabilities?: readonly string[];
    readonly profileProposalCapabilities?: readonly string[];
    readonly capabilityCeiling?: readonly string[];
  },
) {
  const adapter = promptAdapter(root);
  const store = createMemoryNeutronGraphMutationPayloadStore();
  const completed = await executeStoredNeutronGraph({
    adapter,
    capabilities: ALLOWED.capabilities,
    fingerprint: () => fingerprintNeutronProjectRoot(root),
    fs: nodeFileSystem,
    mutationPayloadStore: store,
    nodes,
    signal: new AbortController().signal,
    stored: storedSession(root, adapter),
    ...permission,
  });
  return { completed, store };
}

describe("Neutron mutation Slice 5.1 proposal capability integration", () => {
  it("materializes when session, profile, and ceiling grants intersect", async () => {
    const root = await prepareProject();
    const { completed, store } = await executeProposalGraph(
      root,
      [slice5Node("task-build", { state: "ready" })],
      ALLOWED,
    );
    expect(completed.graphSnapshot?.status).toBe("completed");
    expect(completed.mutationProposalSource).toBe("authoritative");
    expect(completed.mutationProposal?.plan.projectStateDigest).toBe(
      `sha256:${await fingerprintNeutronProjectRoot(root)}`,
    );
    expect(store.list()).toHaveLength(1);
    expect(completed.session.mutationAllowed).toBe(false);
    expect(completed.graphSnapshot?.mutationAttempted).toBe(false);
    expect(
      completed.graphSnapshot?.nodes.find(
        (node) => node.taskId === "task-build",
      )?.allowedTools,
    ).toEqual(["inspect"]);
    expect(NEUTRON_READ_ONLY_TOOLS).toHaveLength(7);
    expect(NEUTRON_READ_ONLY_TOOLS).not.toContain(
      NEUTRON_MUTATION_PROPOSAL_CAPABILITY,
    );
  });

  it("does not deny when profile and ceiling layers are unconfigured", async () => {
    const root = await prepareProject();
    const { completed, store } = await executeProposalGraph(
      root,
      [slice5Node("task-build", { state: "ready" })],
      {
        sessionProposalCapabilities: [NEUTRON_MUTATION_PROPOSAL_CAPABILITY],
      },
    );
    expect(completed.mutationProposalSource).toBe("authoritative");
    expect(store.list()).toHaveLength(1);
  });

  it("denies authoritative materialization when profile omits proposal capability", async () => {
    const root = await prepareProject();
    const { completed, store } = await executeProposalGraph(
      root,
      [slice5Node("task-build", { state: "ready" })],
      {
        ...ALLOWED,
        profileProposalCapabilities: ["inspect"],
      },
    );
    expect(completed.mutationProposal).toBeNull();
    expect(completed.mutationProposalSource).not.toBe("authoritative");
    expect(store.list()).toEqual([]);
  });

  it("denies authoritative materialization when ceiling omits proposal capability", async () => {
    const root = await prepareProject();
    const { completed, store } = await executeProposalGraph(
      root,
      [slice5Node("task-build", { state: "ready" })],
      {
        ...ALLOWED,
        capabilityCeiling: ["inspect"],
      },
    );
    expect(completed.mutationProposal).toBeNull();
    expect(store.list()).toEqual([]);
  });

  it("does not let a child widen parent proposal capability", async () => {
    const root = await prepareProject();
    const { completed, store } = await executeProposalGraph(
      root,
      [
        slice5Node("task-parent", {
          expectedOutput: "Inspect the project",
          requiredCapabilities: ["inspect"],
          role: "context-scout",
          state: "ready",
        }),
        slice5Node("task-child", {
          parentId: "task-parent",
          state: "ready",
        }),
      ],
      ALLOWED,
    );
    expect(completed.mutationProposal).toBeNull();
    expect(store.list()).toEqual([]);
    expect(
      completed.storedGraph?.outcomes.some(
        (outcome) => outcome.taskId === "task-child" && outcome.executed,
      ),
    ).toBe(true);
  });
});
