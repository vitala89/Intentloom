import type { FeatureIntent } from "@intentloom/protocol";
import { FEATURE_INTENT_SCHEMA_URN } from "@intentloom/protocol";
import { validateFeatureIntent } from "@intentloom/validator";

export interface CreateFeatureIntentOptions {
  readonly title: string;
  readonly summary: string;
  readonly now?: () => number;
}

function slug(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized.length > 0 ? normalized.slice(0, 48) : "feature";
}

export function createFeatureIntent(
  options: CreateFeatureIntentOptions,
): FeatureIntent {
  const title = options.title.trim();
  const summary = options.summary.trim();
  if (title.length === 0) {
    throw new Error("title must be a non-empty string");
  }
  if (summary.length === 0) {
    throw new Error("summary must be a non-empty string");
  }
  const createdAt = options.now ? options.now() : Date.now();
  return validateFeatureIntent({
    schemaVersion: FEATURE_INTENT_SCHEMA_URN,
    id: `fi-${slug(title)}-${createdAt}`,
    title,
    summary,
    createdAt,
    readOnly: true,
  });
}
