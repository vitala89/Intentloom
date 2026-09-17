import type { NeutronRuntimeSession } from "../../protocol/src/neutron-runtime.js";
import type { NeutronTaskGraph } from "../../protocol/src/neutron-runtime.js";
import { parseNeutronMutationProposalCandidateOutput } from "../../validator/src/neutron-mutation-proposal-candidate.js";
import type { NeutronMutationProposalCandidate } from "../../protocol/src/neutron-mutation-proposal-candidate.js";
import { neutronGraphMutationMaterializationIsCurrent } from "./neutron-graph-mutation-current.js";
import {
  neutronNodeMayPropose,
  type NeutronMutationProposalPermissionInput,
} from "./neutron-mutation-proposal-capability.js";
import { digestNeutronNodeOutput } from "./neutron-node-result.js";
import type { NeutronNodeExecutionSuccess } from "./neutron-node-execution.js";
import type { NeutronAttemptEvidence } from "./neutron-scheduler-attempt.js";
import type { NeutronGraphStaleReport } from "./neutron-scheduler-stale.js";
import { sortNeutronTaskIds } from "./neutron-scheduler-sort.js";
import type { NeutronReadyNodeOutcome } from "./neutron-scheduler-wave-types.js";

export interface NeutronGraphMutationCandidateRecord {
  readonly graphId: string;
  readonly taskId: string;
  readonly attempt: number;
  readonly outputDigest: string;
  readonly role: string;
  readonly candidate: NeutronMutationProposalCandidate;
  readonly execution: NeutronNodeExecutionSuccess;
}

export interface CollectNeutronGraphMutationCandidatesInput {
  readonly graph: NeutronTaskGraph;
  readonly session: NeutronRuntimeSession;
  readonly graphId: string;
  readonly outcomes: readonly NeutronReadyNodeOutcome[];
  readonly currentProjectFingerprint: string;
  readonly stale: NeutronGraphStaleReport | null;
  readonly permission: Omit<
    NeutronMutationProposalPermissionInput,
    "role" | "nodeRequiredCapabilities" | "parentRequiredCapabilities"
  >;
}

export function collectNeutronGraphMutationCandidates(
  input: CollectNeutronGraphMutationCandidatesInput,
): readonly NeutronGraphMutationCandidateRecord[] {
  const byTask = indexOutcomes(input.outcomes);
  const collected: NeutronGraphMutationCandidateRecord[] = [];
  for (const taskId of sortNeutronTaskIds(
    input.graph.nodes.map((node) => node.taskId),
  )) {
    const node = input.graph.nodes.find((entry) => entry.taskId === taskId);
    const outcome = byTask.get(taskId);
    if (node === undefined || outcome === undefined) continue;
    const record = candidateFromOutcome(input, node.role, node, outcome);
    if (record !== null) collected.push(record);
  }
  return collected;
}

function indexOutcomes(
  outcomes: readonly NeutronReadyNodeOutcome[],
): Map<string, NeutronReadyNodeOutcome> {
  const indexed = new Map<string, NeutronReadyNodeOutcome>();
  for (const taskId of sortNeutronTaskIds(
    outcomes.map((item) => item.taskId),
  )) {
    const matches = outcomes.filter((item) => item.taskId === taskId);
    indexed.set(taskId, matches[matches.length - 1]!);
  }
  return indexed;
}

function candidateFromOutcome(
  input: CollectNeutronGraphMutationCandidatesInput,
  role: string,
  node: CollectNeutronGraphMutationCandidatesInput["graph"]["nodes"][number],
  outcome: NeutronReadyNodeOutcome,
): NeutronGraphMutationCandidateRecord | null {
  if (outcome.execution === null || !outcome.execution.executed) return null;
  const execution = outcome.execution;
  if (execution.node.state !== "completed" || execution.error !== null) {
    return null;
  }
  if (
    execution.projectFingerprintBefore !== execution.projectFingerprintAfter
  ) {
    return null;
  }
  if (
    !neutronGraphMutationMaterializationIsCurrent({
      attemptFingerprint: execution.projectFingerprintAfter,
      currentFingerprint: input.currentProjectFingerprint,
      stale: input.stale,
    })
  ) {
    return null;
  }
  const authoritative = lastLiveAttempt(outcome.attempts);
  if (authoritative === undefined || authoritative.state !== "completed") {
    return null;
  }
  if (authoritative.attempt !== execution.attempt) return null;
  const parent = parentCapabilities(input.graph, node.parentId);
  if (
    !neutronNodeMayPropose({
      role,
      nodeRequiredCapabilities: node.requiredCapabilities,
      ...(parent === undefined ? {} : { parentRequiredCapabilities: parent }),
      ...input.permission,
    })
  ) {
    return null;
  }
  try {
    const candidate = parseNeutronMutationProposalCandidateOutput(
      execution.output,
    );
    return {
      attempt: execution.attempt,
      candidate,
      execution,
      graphId: input.graphId,
      outputDigest: digestNeutronNodeOutput(execution.output),
      role,
      taskId: node.taskId,
    };
  } catch {
    return null;
  }
}

function lastLiveAttempt(
  attempts: readonly NeutronAttemptEvidence[],
): NeutronAttemptEvidence | undefined {
  return [...attempts]
    .filter((attempt) => attempt.state !== "stale")
    .sort((left, right) => left.attempt - right.attempt)
    .at(-1);
}

function parentCapabilities(
  graph: NeutronTaskGraph,
  parentId: string | null,
): readonly string[] | undefined {
  if (parentId === null) return undefined;
  return graph.nodes.find((node) => node.taskId === parentId)
    ?.requiredCapabilities;
}
