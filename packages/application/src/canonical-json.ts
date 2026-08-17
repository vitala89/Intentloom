export type JsonParseResult =
  { readonly ok: true; readonly value: unknown } | { readonly ok: false };

export function parseJsonDocument(text: string): JsonParseResult {
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false };
  }
}

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "boolean")
    return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value))
      throw new Error("value contains a non-finite number");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value !== "object")
    throw new Error("value contains an unsupported type");
  const object = value as Record<string, unknown>;
  const keys = sortedKeys(Object.keys(object));
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`)
    .join(",")}}`;
}

function sortedKeys(values: readonly string[]): string[] {
  const result: string[] = [];
  for (const value of values) {
    let index = 0;
    while (index < result.length && result[index]!.localeCompare(value) <= 0)
      index += 1;
    result.splice(index, 0, value);
  }
  return result;
}
