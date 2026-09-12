import { DesktopBridgeError } from "../desktop-client.js";

export function failGraphParse(message: string): never {
  throw new DesktopBridgeError(message, "bounded_validation_failed");
}

export function requiredGraphString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    failGraphParse(`${field} is missing from the Neutron graph snapshot`);
  }
  return value;
}

export function requiredGraphInt(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    failGraphParse(`${field} must be a non-negative integer`);
  }
  return value;
}

export function requiredGraphBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") failGraphParse(`${field} must be a boolean`);
  return value;
}

export function requireGraphFalse(value: unknown, field: string): false {
  if (value !== false) failGraphParse(`${field} must be false`);
  return false;
}

export function graphStrings(value: unknown, field: string): readonly string[] {
  if (!Array.isArray(value)) failGraphParse(`${field} must be an array`);
  return value.map((item, index) =>
    requiredGraphString(item, `${field}[${index}]`),
  );
}

export function boundedGraphStrings(
  value: unknown,
  field: string,
  limit: number,
): readonly string[] {
  const items = graphStrings(value, field);
  if (items.length > limit) {
    failGraphParse(`${field} exceeds ${limit} entries`);
  }
  return items;
}

export function oneOfGraph<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string,
): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    failGraphParse(`${field} is invalid`);
  }
  return value as T;
}
