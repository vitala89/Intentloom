import { createHash } from "node:crypto";

export function stringValue(value: unknown, max: number): string | undefined {
  return typeof value === "string" && value.length > 0
    ? value.slice(0, max)
    : undefined;
}

export function identifier(value: unknown, max: number): string | undefined {
  if (typeof value === "number" && Number.isSafeInteger(value))
    return String(value);
  return stringValue(value, max);
}

export function timestamp(value: unknown): number | null {
  if (typeof value === "number" && Number.isSafeInteger(value)) return value;
  if (typeof value !== "string") return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : Math.trunc(parsed / 1000);
}

export function sourceId(
  record: Record<string, unknown>,
  index: number,
  max: number,
): string {
  const explicit = identifier(record.id ?? record.iid ?? record.number, max);
  if (explicit) return explicit;
  return (
    createHash("sha256")
      .update(JSON.stringify(record).slice(0, max * 4))
      .digest("hex")
      .slice(0, 16) + `-${index}`
  );
}

export function commitIds(
  record: Record<string, unknown>,
  max: number,
): string[] {
  const candidates = [
    record.commitId,
    record.sha,
    record.mergeCommitSha,
    record.id,
  ];
  return candidates
    .map((value) => stringValue(value, max))
    .filter((value): value is string => Boolean(value));
}
