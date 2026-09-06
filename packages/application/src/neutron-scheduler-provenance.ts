import { checksum } from "@intentloom/core";
import type { AgentRoleCapabilities } from "../../protocol/src/index.js";
import type {
  NeutronAdapterCapability,
  NeutronTaskNode,
  NeutronTaskState,
  NeutronToolEnvelope,
  NeutronUsageBudget,
} from "../../protocol/src/neutron-runtime.js";
import type { AssembleNeutronContextResult } from "./neutron-context-assembly.js";
import type { NeutronNodeExecutionFailure } from "./neutron-node-errors.js";
import type { NeutronNodeExecutionSuccess } from "./neutron-node-execution.js";
import type { NeutronAttemptEvidence } from "./neutron-scheduler-attempt.js";
import type { NeutronReadyNodeOutcome } from "./neutron-scheduler-wave-types.js";
import type { NeutronNodeSchedulingClassification } from "./neutron-scheduler-select.js";
import {
  compareNeutronTaskIds,
  sortNeutronTaskIds,
} from "./neutron-scheduler-sort.js";

export interface NeutronGraphContextEvidence {
  readonly sourceIds: readonly string[];
  readonly sources: readonly {
    readonly sourceId: string;
    readonly kind: string;
    readonly trustClass: string;
    readonly provenance: string;
    readonly contentDigest?: string;
    readonly path?: string;
  }[];
  readonly warnings: readonly string[];
  readonly excludedSecretLikePaths: readonly string[];
}

export interface NeutronGraphToolEvidence {
  readonly toolName: string;
  readonly invocationId: string;
  readonly ok: boolean;
  readonly errorCode: string | null;
  readonly payloadDigest: string | null;
}

export interface NeutronGraphNodeRecord {
  readonly taskId: string;
  readonly parentId: string | null;
  readonly dependencies: readonly string[];
  readonly role: string;
  readonly requestedCapabilities: readonly string[];
  readonly effectiveCapabilities: AgentRoleCapabilities | null;
  readonly allowedTools: readonly string[];
  readonly state: NeutronTaskState;
  readonly executed: boolean;
  readonly authoritativeAttempt: number | null;
  readonly leaseIds: readonly string[];
  readonly attempts: readonly NeutronAttemptEvidence[];
  readonly outputDigest: string | null;
  readonly mutationAttempted: false;
  readonly error: NeutronNodeExecutionFailure | null;
  readonly context: NeutronGraphContextEvidence | null;
  readonly tools: readonly NeutronGraphToolEvidence[];
  readonly adapter: Pick<
    NeutronAdapterCapability,
    "providerKind" | "modelId"
  > | null;
  readonly usage?: NeutronUsageBudget;
  readonly blockingDependencyIds: readonly string[];
  readonly blockReasons: readonly string[];
  readonly startedAt?: number;
  readonly completedAt?: number;
}

export function buildNeutronGraphNodeRecord(input: {
  readonly node: NeutronTaskNode;
  readonly outcome?: NeutronReadyNodeOutcome;
  readonly classification?: NeutronNodeSchedulingClassification;
}): NeutronGraphNodeRecord {
  const attempts = sortedAttempts(input.outcome);
  const authoritative = authoritativeAttempt(attempts);
  const execution = successExecution(input.outcome);
  const scheduled = overlayState(input.node, input.classification, execution);
  return {
    adapter: adapterEvidence(execution),
    allowedTools: execution?.capabilities.allowedTools ?? [],
    attempts,
    authoritativeAttempt: authoritative?.attempt ?? null,
    blockingDependencyIds: input.classification?.blockingDependencyIds ?? [],
    blockReasons: input.classification?.reasons ?? [],
    context: contextEvidence(execution?.context),
    dependencies: sortNeutronTaskIds(input.node.dependencies),
    effectiveCapabilities: execution?.capabilities ?? null,
    error: finalError(input.outcome, authoritative, execution),
    executed: input.outcome?.executed === true,
    leaseIds: attempts.map((attempt) => attempt.leaseId),
    mutationAttempted: false,
    outputDigest: authoritativeOutput(authoritative, execution),
    parentId: input.node.parentId,
    requestedCapabilities: [...input.node.requiredCapabilities].sort(
      compareNeutronTaskIds,
    ),
    role: input.node.role,
    state: scheduled,
    taskId: input.node.taskId,
    tools: toolEvidence(execution?.tool),
    ...(authoritative === undefined
      ? {}
      : {
          completedAt: authoritative.completedAt,
          startedAt: authoritative.startedAt,
        }),
    ...(authoritative?.usage === undefined
      ? {}
      : { usage: authoritative.usage }),
  };
}

function sortedAttempts(
  outcome: NeutronReadyNodeOutcome | undefined,
): NeutronAttemptEvidence[] {
  return [...(outcome?.attempts ?? [])].sort(
    (left, right) => left.attempt - right.attempt,
  );
}

function authoritativeAttempt(
  attempts: readonly NeutronAttemptEvidence[],
): NeutronAttemptEvidence | undefined {
  const live = attempts.filter((attempt) => attempt.state !== "stale");
  return live.at(-1);
}

function successExecution(
  outcome: NeutronReadyNodeOutcome | undefined,
): NeutronNodeExecutionSuccess | undefined {
  if (outcome === undefined || outcome.execution === null) return undefined;
  return outcome.execution.executed ? outcome.execution : undefined;
}

function overlayState(
  node: NeutronTaskNode,
  classification: NeutronNodeSchedulingClassification | undefined,
  execution: NeutronNodeExecutionSuccess | undefined,
): NeutronTaskState {
  if (execution !== undefined) return execution.node.state;
  if (classification?.classification === "blocked") return "blocked";
  return node.state;
}

function finalError(
  outcome: NeutronReadyNodeOutcome | undefined,
  authoritative: NeutronAttemptEvidence | undefined,
  execution: NeutronNodeExecutionSuccess | undefined,
): NeutronNodeExecutionFailure | null {
  if (authoritative?.error !== null && authoritative?.error !== undefined) {
    return authoritative.error;
  }
  if (execution?.error !== null && execution?.error !== undefined) {
    return execution.error;
  }
  if (outcome !== undefined && outcome.execution === null) {
    return {
      code: "operation-failed",
      message: outcome.error.message,
      stage: "scheduling",
    };
  }
  return null;
}

function authoritativeOutput(
  authoritative: NeutronAttemptEvidence | undefined,
  execution: NeutronNodeExecutionSuccess | undefined,
): string | null {
  if (authoritative === undefined || authoritative.state === "stale")
    return null;
  if (authoritative.state !== "completed") return null;
  return execution?.subagent.outputDigest ?? null;
}

function contextEvidence(
  context: AssembleNeutronContextResult | undefined,
): NeutronGraphContextEvidence | null {
  if (context === undefined) return null;
  const sources = [...context.bundle.sources]
    .sort((left, right) => compareNeutronTaskIds(left.sourceId, right.sourceId))
    .map((source) => ({
      kind: source.kind,
      provenance: source.provenance,
      sourceId: source.sourceId,
      trustClass: source.trustClass,
      ...(source.contentDigest === undefined
        ? {}
        : { contentDigest: source.contentDigest }),
      ...(source.path === undefined
        ? {}
        : { path: source.path.replaceAll("\\", "/") }),
    }));
  return {
    excludedSecretLikePaths: [...context.bundle.excludedSecretLikePaths]
      .map((path) => path.replaceAll("\\", "/"))
      .sort(compareNeutronTaskIds),
    sourceIds: sources.map((source) => source.sourceId),
    sources,
    warnings: [...context.warnings].sort(compareNeutronTaskIds),
  };
}

function toolEvidence(
  tool: NeutronToolEnvelope | undefined,
): NeutronGraphToolEvidence[] {
  if (tool === undefined) return [];
  const payload = tool.result.payloadJson;
  return [
    {
      errorCode: tool.result.errorCode,
      invocationId: tool.invocation.invocationId,
      ok: tool.result.ok,
      payloadDigest: payload === null ? null : `sha256:${checksum(payload)}`,
      toolName: tool.invocation.toolName,
    },
  ];
}

function adapterEvidence(
  execution: NeutronNodeExecutionSuccess | undefined,
): Pick<NeutronAdapterCapability, "providerKind" | "modelId"> | null {
  if (execution?.adapter === undefined) return null;
  return {
    modelId: execution.adapter.modelId,
    providerKind: execution.adapter.providerKind,
  };
}
