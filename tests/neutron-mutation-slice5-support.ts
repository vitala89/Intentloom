import { checksum } from "@intentloom/core";
import {
  NEUTRON_MUTATION_PROPOSAL_CANDIDATE_SCHEMA_URN,
  type NeutronMutationProposalCandidate,
} from "../packages/protocol/src/neutron-mutation-proposal-candidate.js";
import {
  NEUTRON_RUNTIME_SESSION_SCHEMA_URN,
  NEUTRON_SUBAGENT_RESULT_SCHEMA_URN,
  NEUTRON_TASK_GRAPH_SCHEMA_URN,
  type NeutronRuntimeSession,
  type NeutronTaskGraph,
  type NeutronTaskNode,
} from "../packages/protocol/src/neutron-runtime.js";
import type { AgentRoleCapabilities } from "../packages/protocol/src/index.js";
import type { NeutronNodeExecutionSuccess } from "../packages/application/src/neutron-node-execution.js";
import { digestNeutronNodeOutput } from "../packages/application/src/neutron-node-result.js";
import type { NeutronAttemptEvidence } from "../packages/application/src/neutron-scheduler-attempt.js";
import type { NeutronReadyNodeOutcome } from "../packages/application/src/neutron-scheduler-wave-types.js";
import { validateNeutronRuntimeSession } from "../packages/validator/src/neutron-runtime.js";

export const SLICE5_ROOT = "/tmp/neutron-slice5-project";
export const SLICE5_FINGERPRINT =
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
export const SLICE5_SESSION = "session-slice5";
export const SLICE5_PROJECT = "project-slice5";
export const SLICE5_CONTENT_A = "export const a = 1;\n";
export const SLICE5_CONTENT_Z = "export const z = 2;\n";
export const SLICE5_NOW = 1_750_000_000_000;

export function slice5Caps(
  allowedTools: readonly string[] = ["inspect"],
): AgentRoleCapabilities {
  return {
    allowNetwork: false,
    allowedPaths: [],
    allowedTools,
    maxBudget: 100,
    readOnly: true,
  };
}

export function slice5Session(root = SLICE5_ROOT): NeutronRuntimeSession {
  return validateNeutronRuntimeSession({
    createdAt: "2026-09-17T00:00:00.000Z",
    mutationAllowed: false,
    projectId: SLICE5_PROJECT,
    root,
    schemaVersion: NEUTRON_RUNTIME_SESSION_SCHEMA_URN,
    sessionId: SLICE5_SESSION,
    state: "planning",
  });
}

export function slice5Candidate(
  contentA = SLICE5_CONTENT_A,
): NeutronMutationProposalCandidate {
  return {
    schemaVersion: NEUTRON_MUTATION_PROPOSAL_CANDIDATE_SCHEMA_URN,
    files: [
      { path: "src/a.ts", content: contentA },
      { path: "src/z.ts", content: SLICE5_CONTENT_Z },
    ],
  };
}

export function slice5CandidateOutput(contentA = SLICE5_CONTENT_A): string {
  return JSON.stringify(slice5Candidate(contentA));
}

export function slice5Node(
  taskId: string,
  overrides: Partial<NeutronTaskNode> = {},
): NeutronTaskNode {
  return {
    dependencies: [],
    expectedOutput: "Propose exact file changes",
    parentId: null,
    requiredCapabilities: ["inspect", "mutation-proposal"],
    role: "feature-builder",
    state: "completed",
    taskId,
    ...overrides,
  };
}

export function slice5Graph(
  nodes: NeutronTaskNode[],
  root = SLICE5_ROOT,
): NeutronTaskGraph {
  return {
    nodes,
    root,
    schemaVersion: NEUTRON_TASK_GRAPH_SCHEMA_URN,
    sessionId: SLICE5_SESSION,
  };
}

export function slice5Execution(input: {
  readonly taskId: string;
  readonly output: string;
  readonly attempt?: number;
  readonly state?: NeutronNodeExecutionSuccess["node"]["state"];
  readonly fingerprint?: string;
  readonly role?: string;
  readonly root?: string;
}): NeutronNodeExecutionSuccess {
  const fingerprint = input.fingerprint ?? SLICE5_FINGERPRINT;
  const state = input.state ?? "completed";
  return {
    adapter: { modelId: "fixture-slice5", providerKind: "ollama" },
    attempt: input.attempt ?? 1,
    capabilities: slice5Caps(),
    error: null,
    executed: true,
    graph: slice5Graph([slice5Node(input.taskId)], input.root),
    node: slice5Node(input.taskId, { state, role: input.role }),
    output: input.output,
    parentId: null,
    projectFingerprintAfter: fingerprint,
    projectFingerprintBefore: fingerprint,
    role: input.role ?? "feature-builder",
    subagent: {
      mutationAttempted: false,
      outputDigest: digestNeutronNodeOutput(input.output),
      root: input.root ?? SLICE5_ROOT,
      schemaVersion: NEUTRON_SUBAGENT_RESULT_SCHEMA_URN,
      sessionId: SLICE5_SESSION,
      status: state === "completed" ? "completed" : "failed",
      taskId: input.taskId,
    },
  };
}

export function slice5Outcome(input: {
  readonly taskId: string;
  readonly output: string;
  readonly attempts?: readonly NeutronAttemptEvidence[];
  readonly execution?: NeutronNodeExecutionSuccess;
}): NeutronReadyNodeOutcome {
  const execution =
    input.execution ??
    slice5Execution({ output: input.output, taskId: input.taskId });
  return {
    admitted: true,
    attempts: input.attempts ?? [
      {
        attempt: execution.attempt,
        completedAt: SLICE5_NOW,
        error: null,
        leaseId: `lease-${input.taskId}-${String(execution.attempt)}`,
        startedAt: SLICE5_NOW,
        state: "completed",
      },
    ],
    error: null,
    executed: true,
    execution,
    lease: {
      acquiredAt: SLICE5_NOW,
      attempt: execution.attempt,
      expiresAt: SLICE5_NOW + 60_000,
      leaseId: `lease-${input.taskId}-${String(execution.attempt)}`,
      ownerId: "scheduler:session-slice5",
      renewedAt: SLICE5_NOW,
      sessionId: SLICE5_SESSION,
      status: "active",
      taskId: input.taskId,
    },
    taskId: input.taskId,
  };
}

export function slice5Checksum(content: string): string {
  return checksum(content);
}
