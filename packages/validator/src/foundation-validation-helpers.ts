export function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function assertStr(v: unknown, f: string): string {
  if (typeof v !== "string" || !v.trim())
    throw new Error(
      `Invalid foundation field '${f}': expected non-empty string`,
    );
  return v;
}

export function assertNum(v: unknown, f: string): number {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0)
    throw new Error(
      `Invalid foundation field '${f}': expected non-negative number`,
    );
  return v;
}

export function assertArr(v: unknown, f: string): unknown[] {
  if (!Array.isArray(v)) throw new Error(`Invalid ${f}: expected array`);
  return v;
}
