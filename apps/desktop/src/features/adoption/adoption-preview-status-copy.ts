import type { AdoptionPreviewSurfaceState } from "./adoption-preview-controller.js";

export const ADOPTION_PREVIEW_STATUS_COPY: Record<
  Exclude<AdoptionPreviewSurfaceState, "ready" | "loading" | "empty">,
  { title: string; description: string; action: string }
> = {
  idle: {
    title: "Select a project",
    description:
      "Choose a local project root before requesting a read-only adoption preview.",
    action: "Select local project",
  },
  stale: {
    title: "Project root changed",
    description:
      "The preview no longer matches the selected canonical root. Load it again.",
    action: "Retry preview",
  },
  unsupported: {
    title: "Adoption preview unsupported",
    description:
      "This daemon cannot serve the existing-project adoption plan contract.",
    action: "Retry preview",
  },
  disconnected: {
    title: "Daemon unavailable",
    description:
      "The local daemon disconnected before the preview could load. Retry without changing the project.",
    action: "Retry preview",
  },
  "authentication-failure": {
    title: "Authentication failed",
    description:
      "The daemon rejected the preview request. Reconnect and try again. No project files were changed.",
    action: "Retry preview",
  },
  error: {
    title: "Adoption preview unavailable",
    description:
      "The read-only plan could not be loaded. Retry without applying changes.",
    action: "Retry preview",
  },
};
