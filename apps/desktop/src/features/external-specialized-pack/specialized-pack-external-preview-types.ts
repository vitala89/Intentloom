export type ExternalSpecializedPackPreviewSurfaceState =
  | "idle"
  | "loading-preview"
  | "ready-for-review"
  | "rejected"
  | "error"
  | "disconnected"
  | "cancelled"
  | "stale-root";

export interface ExternalSpecializedPackPreviewInput {
  readonly manifestJson: string;
  readonly sourceKind: string;
  readonly sourceLocator: string;
  readonly sourcePin: string;
  readonly sourceDigest: string;
  readonly declaredPublisher: string;
  readonly declaredLicense: string;
}

export const EMPTY_EXTERNAL_SPECIALIZED_PACK_PREVIEW_INPUT: ExternalSpecializedPackPreviewInput =
  {
    manifestJson: "",
    sourceKind: "local",
    sourceLocator: "./packs/example.json",
    sourcePin: "local-v1",
    sourceDigest: "",
    declaredPublisher: "",
    declaredLicense: "MIT",
  };

export function shouldClearExternalSpecializedPackPreview(
  selectedRoot: string | null,
  previewRoot: string | null,
): boolean {
  return selectedRoot !== previewRoot;
}

export function externalSpecializedPackPreviewStatusLabel(
  status: ExternalSpecializedPackPreviewSurfaceState,
): string {
  switch (status) {
    case "idle":
      return "Awaiting manifest";
    case "loading-preview":
      return "Loading preview";
    case "ready-for-review":
      return "Ready for review";
    case "rejected":
      return "Rejected";
    case "error":
      return "Preview unavailable";
    case "disconnected":
      return "Daemon unavailable";
    case "cancelled":
      return "Cancelled";
    case "stale-root":
      return "Project root changed";
  }
}
