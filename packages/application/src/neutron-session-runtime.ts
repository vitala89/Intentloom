import { randomUUID } from "node:crypto";
import type { AgentRoleCapabilities } from "../../protocol/src/index.js";
import {
  NEUTRON_ADAPTER_CAPABILITY_SCHEMA_URN,
  NEUTRON_RUNTIME_SESSION_SCHEMA_URN,
  type NeutronAdapterCapability,
  type NeutronSessionState,
} from "../../protocol/src/neutron-runtime.js";
import type { NeutronSessionViewmodel } from "../../protocol/src/neutron-session-rpc.js";
import { validateNeutronRuntimeSession } from "../../validator/src/neutron-runtime.js";
import { validateNeutronN2AdapterCapability } from "../../validator/src/neutron-runtime-n2.js";
import { nodeFileSystem, type FileSystem } from "./index.js";
import type { ModelAdapter } from "./model-adapter.js";
import {
  neutronBindingError,
  NeutronSessionOperationError,
  unknownNeutronSessionError,
} from "./neutron-session-errors.js";
import { fingerprintNeutronProjectRoot } from "./neutron-session-fingerprint.js";
import {
  failedStoredSession,
  runStoredNeutronTurn,
  type StoredNeutronSession,
} from "./neutron-session-turn.js";

const TERMINAL_STATES: readonly NeutronSessionState[] = [
  "cancelled",
  "timed-out",
  "failed",
  "completed",
];

function createDeferred(): {
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

export interface NeutronSessionRuntimeOptions {
  readonly createAdapter: () => ModelAdapter | null;
  readonly fs?: FileSystem;
  readonly fingerprintProject?: (root: string) => Promise<string>;
  readonly now?: () => Date;
  readonly randomId?: () => string;
  readonly capabilities?: AgentRoleCapabilities;
}

export interface NeutronSessionRuntime {
  create(input: {
    readonly root: string;
    readonly projectId?: string;
  }): Promise<NeutronSessionViewmodel>;
  get(input: {
    readonly root: string;
    readonly sessionId: string;
    readonly projectId: string;
  }): NeutronSessionViewmodel;
  cancel(input: {
    readonly root: string;
    readonly sessionId: string;
    readonly projectId: string;
  }): Promise<NeutronSessionViewmodel>;
  executeTurn(input: {
    readonly root: string;
    readonly sessionId: string;
    readonly projectId: string;
    readonly prompt: string;
  }): Promise<NeutronSessionViewmodel>;
  clear(): void;
}

function emptyView(stored: StoredNeutronSession): NeutronSessionViewmodel {
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
  };
}

function adapterCapability(adapter: ModelAdapter): NeutronAdapterCapability {
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

export function createNeutronSessionRuntime(
  options: NeutronSessionRuntimeOptions,
): NeutronSessionRuntime {
  const sessions = new Map<string, StoredNeutronSession>();
  const fs = options.fs ?? nodeFileSystem;
  const now = options.now ?? (() => new Date());
  const randomId = options.randomId ?? (() => randomUUID());
  const fingerprint =
    options.fingerprintProject ??
    ((root: string) => fingerprintNeutronProjectRoot(root, fs));

  function requireBound(input: {
    readonly root: string;
    readonly sessionId: string;
    readonly projectId: string;
  }): StoredNeutronSession {
    const stored = sessions.get(input.sessionId);
    if (stored === undefined) {
      throw unknownNeutronSessionError(input.sessionId);
    }
    if (stored.session.root !== input.root) {
      throw neutronBindingError("neutron session root does not match");
    }
    if (stored.session.projectId !== input.projectId) {
      throw neutronBindingError("neutron session projectId does not match");
    }
    return stored;
  }

  function persist(
    stored: StoredNeutronSession,
    session: StoredNeutronSession["session"],
  ): StoredNeutronSession {
    const next = { ...stored, session: validateNeutronRuntimeSession(session) };
    sessions.set(session.sessionId, next);
    return next;
  }

  return {
    async create(input) {
      const adapter = options.createAdapter();
      if (adapter === null) {
        throw new NeutronSessionOperationError(
          "adapter-unconfigured",
          "Neutron provider is not configured",
        );
      }
      const session = validateNeutronRuntimeSession({
        schemaVersion: NEUTRON_RUNTIME_SESSION_SCHEMA_URN,
        sessionId: randomId(),
        root: input.root,
        projectId: input.projectId ?? "project-local",
        state: "created",
        mutationAllowed: false,
        createdAt: now().toISOString(),
      });
      const stored: StoredNeutronSession = {
        session,
        adapter: adapterCapability(adapter),
        prompt: null,
        responseText: null,
        toolName: null,
        errorCode: null,
        errorMessage: null,
        projectFingerprintBefore: null,
        projectFingerprintAfter: null,
        contextSummary: null,
        toolActivity: [],
      };
      sessions.set(session.sessionId, stored);
      return emptyView(stored);
    },

    get(input) {
      return emptyView(requireBound(input));
    },

    async cancel(input) {
      const stored = requireBound(input);
      if (stored.inFlight !== undefined) {
        stored.inFlight.controller.abort();
        await stored.inFlight.done;
        const latest = sessions.get(input.sessionId);
        if (latest === undefined) {
          throw unknownNeutronSessionError(input.sessionId);
        }
        return { ...emptyView(latest), cancellationAcknowledged: true };
      }
      if (TERMINAL_STATES.includes(stored.session.state)) {
        return emptyView(stored);
      }
      return {
        ...emptyView(
          persist(stored, { ...stored.session, state: "cancelled" }),
        ),
        cancellationAcknowledged: true,
      };
    },

    async executeTurn(input) {
      const stored = requireBound(input);
      if (TERMINAL_STATES.includes(stored.session.state)) {
        throw neutronBindingError("neutron session is no longer active");
      }
      if (stored.inFlight !== undefined) {
        throw neutronBindingError(
          "neutron session already has an in-flight turn",
        );
      }
      const adapter = options.createAdapter();
      if (adapter === null) {
        throw new NeutronSessionOperationError(
          "adapter-unconfigured",
          "Neutron provider is not configured",
        );
      }
      const controller = new AbortController();
      const deferred = createDeferred();
      stored.inFlight = {
        controller,
        done: deferred.promise,
        settle: deferred.resolve,
      };
      persist(stored, { ...stored.session, state: "discussing" });
      try {
        const completed = await runStoredNeutronTurn({
          stored,
          root: input.root,
          prompt: input.prompt,
          adapter,
          fs,
          fingerprint,
          signal: controller.signal,
          ...(options.capabilities !== undefined
            ? { capabilities: options.capabilities }
            : {}),
        });
        sessions.set(stored.session.sessionId, completed);
        return emptyView(completed);
      } catch (error) {
        const failed = failedStoredSession(stored, input.prompt, error);
        sessions.set(stored.session.sessionId, failed);
        if (
          error instanceof NeutronSessionOperationError &&
          failed.errorCode === "adapter-unconfigured"
        ) {
          throw error;
        }
        return emptyView(failed);
      } finally {
        stored.inFlight?.settle();
        const latest = sessions.get(stored.session.sessionId);
        if (latest !== undefined) {
          latest.inFlight = undefined;
        }
      }
    },

    clear() {
      sessions.clear();
    },
  };
}
