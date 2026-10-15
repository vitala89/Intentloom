import type { FeatureIntent } from "@intentloom/protocol";
import { FEATURE_INTENT_SCHEMA_URN } from "@intentloom/protocol";
import { validateFeatureIntent } from "@intentloom/validator";

export interface CreateFeatureIntentOptions {
  readonly title: string;
  readonly summary: string;
  readonly now?: () => number;
}

function isAsciiAlphanumeric(char: string): boolean {
  const code = char.charCodeAt(0);
  return (
    (code >= 48 && code <= 57) ||
    (code >= 97 && code <= 122) ||
    (code >= 65 && code <= 90)
  );
}

function slug(value: string): string {
  const parts: string[] = [];
  let current = "";
  for (const char of value.toLowerCase()) {
    if (isAsciiAlphanumeric(char)) {
      current += char;
      continue;
    }
    if (current.length > 0) {
      parts.push(current);
      current = "";
    }
  }
  if (current.length > 0) parts.push(current);
  const normalized = parts.join("-").slice(0, 48);
  return normalized.length > 0 ? normalized : "feature";
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
