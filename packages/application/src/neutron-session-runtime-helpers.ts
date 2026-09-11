import {
  NEUTRON_ADAPTER_CAPABILITY_SCHEMA_URN,
  type NeutronAdapterCapability,
  type NeutronSessionState,
} from "../../protocol/src/neutron-runtime.js";
import type { NeutronSessionViewmodel } from "../../protocol/src/neutron-session-rpc.js";
import { validateNeutronN2AdapterCapability } from "../../validator/src/neutron-runtime-n2.js";
import type { ModelAdapter } from "./model-adapter.js";
import { NeutronSessionOperationError } from "./neutron-session-errors.js";
import type { StoredNeutronSession } from "./neutron-session-turn.js";

export const TERMINAL_NEUTRON_SESSION_STATES: readonly NeutronSessionState[] = [
  "cancelled",
  "timed-out",
  "failed",
  "completed",
];

export function createNeutronDeferred(): {
  readonly promise: Promise<void>;
  readonly resolve: () => void;
} {
  const box: { resolve?: () => void } = {};
  const promise = new Promise<void>((done) => {
    box.resolve = done;
  });
  return {
    promise,
    resolve: () => {
      box.resolve?.();
    },
  };
}

export function emptyNeutronSessionView(
  stored: StoredNeutronSession,
): NeutronSessionViewmodel {
  return {
    session: stored.session,
    adapter: stored.adapter,
    prompt: stored.prompt,
    responseText: stored.responseText,
    toolName: stored.toolName,
    errorCode: stored.errorCode,
    errorMessage: stored.errorMessage,
    projectFingerprintBefore: stored.projectFingerprintBefore,
    projectFingerprintAfter: stored.projectFingerprintAfter,
    cancellationAcknowledged: false,
    contextSummary: stored.contextSummary,
    toolActivity: stored.toolActivity,
    graphSnapshot: stored.graphSnapshot,
  };
}

export function neutronAdapterCapability(
  adapter: ModelAdapter,
): NeutronAdapterCapability {
  const caps = adapter.getCapabilities();
  if (caps.providerKind === "ollama") {
    return validateNeutronN2AdapterCapability({
      schemaVersion: NEUTRON_ADAPTER_CAPABILITY_SCHEMA_URN,
      providerKind: "ollama",
      modelId: caps.modelId,
      supportsStreaming: false,
      supportsToolCalls: caps.supportsToolCalls,
      networkMode: "explicit-egress",
      dataHandling: "ephemeral",
      credentialIsolation: "outside-project-metadata",
    });
  }
  if (caps.providerKind !== "deterministic-test") {
    throw new NeutronSessionOperationError(
      "adapter-unconfigured",
      "Neutron provider is not configured",
    );
  }
  return {
    schemaVersion: NEUTRON_ADAPTER_CAPABILITY_SCHEMA_URN,
    providerKind: "deterministic-test",
    modelId: caps.modelId,
    supportsStreaming: false,
    supportsToolCalls: caps.supportsToolCalls,
    networkMode: "offline",
    dataHandling: "ephemeral",
    credentialIsolation: "outside-project-metadata",
  };
}
