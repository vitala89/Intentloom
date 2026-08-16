import {
  NEUTRON_ADAPTER_CAPABILITY_SCHEMA_URN,
  type NeutronAdapterCapability,
  type NeutronErrorCode,
} from "../../protocol/src/neutron-runtime.js";
import { isObject, nonEmpty } from "./neutron-runtime-helpers.js";

export const NEUTRON_N2_LOOPBACK_HOSTS = [
  "127.0.0.1",
  "localhost",
  "::1",
] as const;
export const NEUTRON_N2_MAX_BODY_BYTES = 262_144;

export class NeutronN2Error extends Error {
  readonly code: NeutronErrorCode;

  constructor(code: NeutronErrorCode, message: string) {
    super(message);
    this.name = "NeutronN2Error";
    this.code = code;
  }
}

export function parseNeutronN2BaseUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new NeutronN2Error("validation-failed", "Ollama base URL is invalid");
  }
  if (url.username !== "" || url.password !== "") {
    throw new NeutronN2Error(
      "network-forbidden",
      "Ollama base URL must not include credentials",
    );
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new NeutronN2Error(
      "network-forbidden",
      "Ollama base URL must be http or https",
    );
  }
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (
    !NEUTRON_N2_LOOPBACK_HOSTS.includes(
      host as (typeof NEUTRON_N2_LOOPBACK_HOSTS)[number],
    )
  ) {
    throw new NeutronN2Error(
      "network-forbidden",
      "N2 Ollama host must be loopback",
    );
  }
  return url;
}

export function discloseNeutronN2Network(baseUrl: string): {
  readonly scheme: string;
  readonly host: string;
  readonly port: string;
  readonly networkMode: "explicit-egress";
} {
  const url = parseNeutronN2BaseUrl(baseUrl);
  return {
    scheme: url.protocol.replace(":", ""),
    host: url.hostname,
    port:
      url.port === "" ? (url.protocol === "https:" ? "443" : "80") : url.port,
    networkMode: "explicit-egress",
  };
}

export function validateNeutronN2AdapterCapability(
  value: unknown,
): NeutronAdapterCapability {
  if (!isObject(value)) throw new Error("adapter capability must be an object");
  if (value.schemaVersion !== NEUTRON_ADAPTER_CAPABILITY_SCHEMA_URN) {
    throw new Error("unsupported neutron adapter capability schema");
  }
  if (value.providerKind !== "ollama") {
    throw new NeutronN2Error(
      "adapter-unconfigured",
      "N2 adapter.providerKind must be ollama",
    );
  }
  if (value.networkMode !== "explicit-egress") {
    throw new NeutronN2Error(
      "network-forbidden",
      "N2 adapter.networkMode must be explicit-egress",
    );
  }
  if (value.dataHandling !== "ephemeral") {
    throw new Error("N2 adapter.dataHandling must be ephemeral");
  }
  if (value.credentialIsolation !== "outside-project-metadata") {
    throw new Error("adapter.credentialIsolation is invalid");
  }
  if (typeof value.supportsStreaming !== "boolean") {
    throw new Error("adapter.supportsStreaming must be a boolean");
  }
  if (typeof value.supportsToolCalls !== "boolean") {
    throw new Error("adapter.supportsToolCalls must be a boolean");
  }
  return {
    schemaVersion: NEUTRON_ADAPTER_CAPABILITY_SCHEMA_URN,
    providerKind: "ollama",
    modelId: nonEmpty(value.modelId, "adapter.modelId"),
    supportsStreaming: value.supportsStreaming,
    supportsToolCalls: value.supportsToolCalls,
    networkMode: "explicit-egress",
    dataHandling: "ephemeral",
    credentialIsolation: "outside-project-metadata",
  };
}
