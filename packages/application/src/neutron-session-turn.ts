import type { AgentRoleCapabilities } from "../../protocol/src/index.js";
import type {
  NeutronErrorCode,
  NeutronReadOnlyTool,
  NeutronRuntimeSession,
  NeutronSessionState,
  NeutronToolEnvelope,
} from "../../protocol/src/neutron-runtime.js";
import type { NeutronAdapterCapability } from "../../protocol/src/neutron-runtime.js";
import type {
  NeutronTurnContextSummary,
  NeutronTurnToolActivity,
} from "../../protocol/src/neutron-session-activity.js";
import type { NeutronGraphSnapshot } from "../../protocol/src/neutron-graph.js";
import type { NeutronTaskGraph } from "../../protocol/src/neutron-runtime.js";
import type { NeutronGraphStaleBaseline } from "./neutron-scheduler-stale.js";
import type { NeutronSchedulingPlan } from "./neutron-scheduler-select.js";
import type { NeutronReadyNodeOutcome } from "./neutron-scheduler-wave-types.js";
import { validateNeutronRuntimeSession } from "../../validator/src/neutron-runtime.js";
import { NeutronN2Error } from "../../validator/src/neutron-runtime-n2.js";
import { inspectProject, type FileSystem } from "./index.js";
import type { ModelAdapter } from "./model-adapter.js";
import { runNeutronN2ReadOnlyLoop } from "./neutron-n2-loop.js";
import { NeutronSessionOperationError } from "./neutron-session-errors.js";
import {
  projectNeutronContextSummary,
  projectNeutronToolActivity,
} from "./neutron-session-activity.js";
import {
  createNeutronReadOnlyDispatch,
  routeNeutronToolInvocation,
} from "./neutron-tool-router.js";

export const NEUTRON_SESSION_READ_ONLY_CAPS: AgentRoleCapabilities = {
  readOnly: true,
  allowedPaths: [],
  allowedTools: [
    "inspect",
    "doctor",
    "memorySearch",
    "timeline",
    "conformance",
    "securityAudit",
    "projectDiff",
  ],
  maxBudget: 100_000,
  allowNetwork: false,
};

export interface StoredNeutronSession {
  session: NeutronRuntimeSession;
  adapter: NeutronAdapterCapability;
  prompt: string | null;
  responseText: string | null;
  toolName: NeutronReadOnlyTool | null;
  errorCode: NeutronErrorCode | null;
  errorMessage: string | null;
  projectFingerprintBefore: string | null;
  projectFingerprintAfter: string | null;
  contextSummary: NeutronTurnContextSummary | null;
  toolActivity: readonly NeutronTurnToolActivity[];
  graphSnapshot: NeutronGraphSnapshot | null;
  storedGraph?:
    | {
        readonly snapshot: NeutronGraphSnapshot;
        readonly graph: NeutronTaskGraph;
        readonly outcomes: readonly NeutronReadyNodeOutcome[];
        readonly plan: NeutronSchedulingPlan;
        readonly baseline: NeutronGraphStaleBaseline;
      }
    | undefined;
  inFlight?:
    | {
        readonly controller: AbortController;
        readonly done: Promise<void>;
        settle: () => void;
      }
    | undefined;
}

export async function runStoredNeutronTurn(input: {
  readonly stored: StoredNeutronSession;
  readonly root: string;
  readonly prompt: string;
  readonly adapter: ModelAdapter;
  readonly fs: FileSystem;
  readonly fingerprint: (root: string) => Promise<string>;
  readonly signal: AbortSignal;
  readonly capabilities?: AgentRoleCapabilities;
}): Promise<StoredNeutronSession> {
  const capabilities = input.capabilities ?? NEUTRON_SESSION_READ_ONLY_CAPS;
  const envelopes: NeutronToolEnvelope[] = [];
  const dispatch = createNeutronReadOnlyDispatch({
    fs: input.fs,
    inspect: (root) => inspectProject(root, input.fs),
  });
  const result = await runNeutronN2ReadOnlyLoop({
    root: input.root,
    sessionId: input.stored.session.sessionId,
    projectId: input.stored.session.projectId,
    prompt: input.prompt,
    adapter: input.adapter,
    fingerprintProject: () => input.fingerprint(input.root),
    signal: input.signal,
    createdAt: input.stored.session.createdAt,
    runTool: async (toolName, args) => {
      const routed = await routeNeutronToolInvocation({
        invocation: {
          invocationId: `n6-${input.stored.session.sessionId}-${toolName}`,
          toolName,
          root: input.root,
          sessionId: input.stored.session.sessionId,
          argumentsJson: JSON.stringify(args),
          timeoutMs: 15_000,
        },
        session: {
          ...input.stored.session,
          state: "inspecting",
        },
        capabilities,
        dispatch,
        signal: input.signal,
      });
      envelopes.push(routed.envelope);
      if (!routed.envelope.result.ok) {
        return {
          ok: false,
          errorCode: routed.envelope.result.errorCode,
        };
      }
      return JSON.parse(routed.envelope.result.payloadJson ?? "null");
    },
  });
  const lastTool = envelopes.at(-1)?.invocation.toolName ?? null;
  return {
    ...input.stored,
    session: validateNeutronRuntimeSession({
      ...result.session,
      mutationAllowed: false,
      createdAt: input.stored.session.createdAt,
    }),
    adapter: input.stored.adapter,
    prompt: input.prompt,
    responseText: result.responseText,
    toolName: lastTool,
    errorCode: null,
    errorMessage: null,
    projectFingerprintBefore: result.projectFingerprintBefore,
    projectFingerprintAfter: result.projectFingerprintAfter,
    contextSummary:
      result.contextAssembly === undefined
        ? null
        : projectNeutronContextSummary(result.contextAssembly),
    toolActivity: projectNeutronToolActivity(envelopes),
    graphSnapshot: input.stored.graphSnapshot,
    storedGraph: input.stored.storedGraph,
    inFlight: undefined,
  };
}

export function failedStoredSession(
  stored: StoredNeutronSession,
  prompt: string,
  error: unknown,
): StoredNeutronSession {
  const code: NeutronErrorCode =
    error instanceof NeutronN2Error
      ? error.code
      : error instanceof NeutronSessionOperationError
        ? error.neutronCode
        : "operation-failed";
  const state: NeutronSessionState =
    code === "cancelled"
      ? "cancelled"
      : code === "timeout"
        ? "timed-out"
        : "failed";
  return {
    ...stored,
    session: validateNeutronRuntimeSession({
      ...stored.session,
      state,
    }),
    prompt,
    responseText: null,
    toolName: null,
    errorCode: code,
    errorMessage: error instanceof Error ? error.message : String(error),
    contextSummary: null,
    toolActivity: [],
    graphSnapshot: stored.graphSnapshot,
    storedGraph: stored.storedGraph,
    inFlight: undefined,
  };
}
