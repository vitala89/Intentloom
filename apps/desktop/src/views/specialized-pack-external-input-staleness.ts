import type { ExternalSpecializedPackPreviewInput } from "./specialized-pack-external-preview-types.js";

const IDENTITY_FIELDS: readonly (keyof ExternalSpecializedPackPreviewInput)[] =
  [
    "manifestJson",
    "sourceKind",
    "sourceLocator",
    "sourcePin",
    "sourceDigest",
    "declaredPublisher",
    "declaredLicense",
  ];

export function externalSpecializedPackInputsMatch(
  left: ExternalSpecializedPackPreviewInput,
  right: ExternalSpecializedPackPreviewInput,
): boolean {
  return IDENTITY_FIELDS.every((field) => left[field] === right[field]);
}

export interface ExternalSpecializedPackReviewSnapshot {
  readonly root: string;
  readonly input: ExternalSpecializedPackPreviewInput;
}

export function isExternalSpecializedPackReviewStale(options: {
  readonly snapshot: ExternalSpecializedPackReviewSnapshot | null;
  readonly root: string | null;
  readonly input: ExternalSpecializedPackPreviewInput;
}): boolean {
  if (!options.snapshot || !options.root) return true;
  if (options.snapshot.root !== options.root) return true;
  return !externalSpecializedPackInputsMatch(
    options.snapshot.input,
    options.input,
  );
}
