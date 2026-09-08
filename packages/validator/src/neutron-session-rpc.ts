import {
  type NeutronSessionViewmodel,
  type NeutronSessionViewmodelPayload,
} from "../../protocol/src/neutron-session-rpc.js";
import {
  validateNeutronAdapterCapability,
  validateNeutronRuntimeSession,
} from "./neutron-runtime.js";
import { validateNeutronN2AdapterCapability } from "./neutron-runtime-n2.js";
import { isObject } from "./neutron-runtime-helpers.js";
import {
  NEUTRON_ERROR_CODES,
  NEUTRON_READ_ONLY_TOOLS,
  type NeutronErrorCode,
  type NeutronReadOnlyTool,
} from "../../protocol/src/neutron-runtime.js";

function optionalString(value: unknown, field: string): string | null {
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new Error(`${field} must be a string or null`);
  }
  return value;
}

function optionalErrorCode(value: unknown): NeutronErrorCode | null {
  if (value === null) return null;
  if (
    typeof value !== "string" ||
    !(NEUTRON_ERROR_CODES as readonly string[]).includes(value)
  ) {
    throw new Error("viewmodel.errorCode is invalid");
  }
  return value as NeutronErrorCode;
}

function optionalToolName(value: unknown): NeutronReadOnlyTool | null {
  if (value === null) return null;
  if (
    typeof value !== "string" ||
    !(NEUTRON_READ_ONLY_TOOLS as readonly string[]).includes(value)
  ) {
    throw new Error("viewmodel.toolName is invalid");
  }
  return value as NeutronReadOnlyTool;
}

function validateAdapter(value: unknown) {
  try {
    return validateNeutronN2AdapterCapability(value);
  } catch {
    return validateNeutronAdapterCapability(value);
  }
}

export function validateNeutronSessionViewmodel(
  value: unknown,
): NeutronSessionViewmodel {
  if (!isObject(value)) {
    throw new Error("neutron session viewmodel must be an object");
  }
  const session = validateNeutronRuntimeSession(value.session);
  if (session.mutationAllowed !== false) {
    throw new Error("viewmodel.session.mutationAllowed must be false");
  }
  return {
    session,
    adapter: validateAdapter(value.adapter),
    prompt: optionalString(value.prompt, "prompt"),
    responseText: optionalString(value.responseText, "responseText"),
    toolName: optionalToolName(value.toolName),
    errorCode: optionalErrorCode(value.errorCode),
    errorMessage: optionalString(value.errorMessage, "errorMessage"),
    projectFingerprintBefore: optionalString(
      value.projectFingerprintBefore,
      "projectFingerprintBefore",
    ),
    projectFingerprintAfter: optionalString(
      value.projectFingerprintAfter,
      "projectFingerprintAfter",
    ),
    cancellationAcknowledged: value.cancellationAcknowledged === true,
  };
}

export function toNeutronSessionViewmodelPayload(
  viewmodel: NeutronSessionViewmodel,
): NeutronSessionViewmodelPayload {
  return viewmodel;
}
