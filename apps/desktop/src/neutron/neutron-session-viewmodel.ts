import type {
  NeutronAdapterCapability,
  NeutronErrorCode,
  NeutronReadOnlyTool,
  NeutronRuntimeSession,
  NeutronSessionViewmodel,
  NeutronSessionViewmodelPayload,
} from "@intentloom/protocol";
import {
  NEUTRON_ADAPTER_CAPABILITY_SCHEMA_URN,
  NEUTRON_ERROR_CODES,
  NEUTRON_READ_ONLY_TOOLS,
  NEUTRON_RUNTIME_SESSION_SCHEMA_URN,
  NEUTRON_SESSION_STATES,
} from "@intentloom/protocol";
import { DesktopBridgeError } from "../desktop-client.js";
import {
  parseNeutronContextSummary,
  parseNeutronToolActivity,
} from "./neutron-activity-viewmodel.js";

export type NeutronUiPhase =
  "idle" | "connecting" | "submitting" | "cancelling";

export type NeutronSurfaceKind =
  "empty" | "ready" | "runtime-error" | "infrastructure-error";

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new DesktopBridgeError(
      `${field} is missing from the Neutron viewmodel`,
      "bounded_validation_failed",
    );
  }
  return value;
}

function optionalString(value: unknown, field: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") {
    throw new DesktopBridgeError(
      `${field} must be a string`,
      "bounded_validation_failed",
    );
  }
  return value;
}

export function parseNeutronDesktopViewmodel(
  payload: NeutronSessionViewmodelPayload,
): NeutronSessionViewmodel {
  const record = payload as unknown as Record<string, unknown>;
  const sessionRaw = record.session;
  const adapterRaw = record.adapter;
  if (
    typeof sessionRaw !== "object" ||
    sessionRaw === null ||
    typeof adapterRaw !== "object" ||
    adapterRaw === null
  ) {
    throw new DesktopBridgeError(
      "Neutron viewmodel is missing session or adapter",
      "bounded_validation_failed",
    );
  }
  const sessionRecord = sessionRaw as Record<string, unknown>;
  const adapterRecord = adapterRaw as Record<string, unknown>;
  if (sessionRecord.mutationAllowed !== false) {
    throw new DesktopBridgeError(
      "Neutron session mutationAllowed must be false",
      "bounded_validation_failed",
    );
  }
  if (
    typeof sessionRecord.state !== "string" ||
    !(NEUTRON_SESSION_STATES as readonly string[]).includes(sessionRecord.state)
  ) {
    throw new DesktopBridgeError(
      "Neutron session state is invalid",
      "bounded_validation_failed",
    );
  }
  const session: NeutronRuntimeSession = {
    schemaVersion: NEUTRON_RUNTIME_SESSION_SCHEMA_URN,
    sessionId: requiredString(sessionRecord.sessionId, "sessionId"),
    root: requiredString(sessionRecord.root, "root"),
    projectId: requiredString(sessionRecord.projectId, "projectId"),
    state: sessionRecord.state as NeutronRuntimeSession["state"],
    mutationAllowed: false,
    createdAt: requiredString(sessionRecord.createdAt, "createdAt"),
  };
  const providerKind = adapterRecord.providerKind;
  if (
    providerKind !== "deterministic-test" &&
    providerKind !== "unconfigured" &&
    providerKind !== "ollama"
  ) {
    throw new DesktopBridgeError(
      "Neutron adapter providerKind is invalid",
      "bounded_validation_failed",
    );
  }
  const adapter: NeutronAdapterCapability = {
    schemaVersion: NEUTRON_ADAPTER_CAPABILITY_SCHEMA_URN,
    providerKind,
    modelId: requiredString(adapterRecord.modelId, "modelId"),
    supportsStreaming: adapterRecord.supportsStreaming === true,
    supportsToolCalls: adapterRecord.supportsToolCalls === true,
    networkMode:
      adapterRecord.networkMode === "explicit-egress"
        ? "explicit-egress"
        : "offline",
    dataHandling:
      adapterRecord.dataHandling === "retained" ? "retained" : "ephemeral",
    credentialIsolation: "outside-project-metadata",
  };
  const toolName = record.toolName;
  const errorCode = record.errorCode;
  return {
    session,
    adapter,
    prompt: optionalString(record.prompt, "prompt"),
    responseText: optionalString(record.responseText, "responseText"),
    toolName:
      typeof toolName === "string" &&
      (NEUTRON_READ_ONLY_TOOLS as readonly string[]).includes(toolName)
        ? (toolName as NeutronReadOnlyTool)
        : null,
    errorCode:
      typeof errorCode === "string" &&
      (NEUTRON_ERROR_CODES as readonly string[]).includes(errorCode)
        ? (errorCode as NeutronErrorCode)
        : null,
    errorMessage: optionalString(record.errorMessage, "errorMessage"),
    projectFingerprintBefore: optionalString(
      record.projectFingerprintBefore,
      "projectFingerprintBefore",
    ),
    projectFingerprintAfter: optionalString(
      record.projectFingerprintAfter,
      "projectFingerprintAfter",
    ),
    cancellationAcknowledged: record.cancellationAcknowledged === true,
    contextSummary: parseNeutronContextSummary(record.contextSummary),
    toolActivity: parseNeutronToolActivity(record.toolActivity),
  };
}

export function classifyNeutronInfrastructureError(error: {
  readonly code?: string;
  readonly message: string;
}): boolean {
  const code = error.code ?? "";
  return (
    code === "disconnected" ||
    code === "protocol_incompatible" ||
    code === "invalid_root" ||
    code === "authentication_failed" ||
    code === "native_bridge_unavailable" ||
    error.message.includes("adapter-unconfigured") ||
    error.message.includes("not configured") ||
    error.message.includes("protocol")
  );
}

export function neutronSurfaceKind(input: {
  readonly viewmodel: NeutronSessionViewmodel | null;
  readonly infrastructureError: string | null;
}): NeutronSurfaceKind {
  if (input.infrastructureError !== null) return "infrastructure-error";
  if (input.viewmodel === null) return "empty";
  if (
    input.viewmodel.session.state === "failed" ||
    input.viewmodel.errorCode !== null
  ) {
    return "runtime-error";
  }
  return "ready";
}

export function authoritativeSessionFromModelText(
  viewmodel: NeutronSessionViewmodel,
): NeutronSessionViewmodel {
  return viewmodel;
}
