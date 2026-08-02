import { createHash } from "node:crypto";

export const MAX_PROVIDER_PAGES = 10;

export function trimTrailingSlashes(value: string): string {
  let end = value.length;
  while (end > 0 && value.charCodeAt(end - 1) === 47) end -= 1;
  return value.slice(0, end);
}

export function isRateLimited(response: Response): boolean {
  if (response.status === 429 || response.status === 403) return true;
  if (response.headers.has("retry-after")) return true;
  const remainingHeader = response.headers.get("x-ratelimit-remaining");
  if (remainingHeader === null) return false;
  const remaining = Number(remainingHeader);
  return Number.isFinite(remaining) && remaining < 10;
}

export function githubNextUrl(response: Response): string | undefined {
  const link = response.headers.get("link");
  if (!link) return undefined;
  for (const part of link.split(",")) {
    const segments = part.split(";");
    const target = segments[0]?.trim();
    const isNext = segments.some((segment) => segment.trim() === 'rel="next"');
    if (isNext && target?.startsWith("<") && target.endsWith(">"))
      return target.slice(1, -1);
  }
  return undefined;
}

export function gitlabNextUrl(
  currentUrl: string,
  response: Response,
): string | undefined {
  const nextPage = response.headers.get("x-next-page")?.trim();
  if (!nextPage) return undefined;
  const url = new URL(currentUrl);
  url.searchParams.set("page", nextPage);
  return url.toString();
}

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
