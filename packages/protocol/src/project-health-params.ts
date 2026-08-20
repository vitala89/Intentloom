import { ProtocolValidationError } from "./protocol-validation-error.js";

function stringValue(value: unknown, field: string): string {
  if (typeof value === "string" && value.length > 0) return value;
  throw new ProtocolValidationError(
    -32602,
    `${field} must be a non-empty string`,
  );
}

function optionalString(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "string" && value.length > 0) return value;
  throw new ProtocolValidationError(
    -32602,
    "profile must be a non-empty string",
  );
}

function optionalStringArray(value: unknown): readonly string[] | undefined {
  if (value === undefined) return undefined;
  if (Array.isArray(value) && value.every((entry) => typeof entry === "string"))
    return value;
  throw new ProtocolValidationError(
    -32602,
    "adapters must be an array of strings",
  );
}

export function projectHealthParams(params: Record<string, unknown>): {
  readonly root: string;
  readonly profile?: string;
  readonly adapters?: readonly string[];
} {
  const resolved: {
    root: string;
    profile?: string;
    adapters?: readonly string[];
  } = {
    root: stringValue(params.root, "root"),
  };
  const profile = optionalString(params.profile);
  if (profile !== undefined) resolved.profile = profile;
  const adapters = optionalStringArray(params.adapters);
  if (adapters !== undefined) resolved.adapters = adapters;
  return resolved;
}
