import { createHash } from "node:crypto";
import type { AdoptionPreviewItem } from "@intentloom/protocol";

export function computeExistingProjectAdoptionPreviewIdentity(input: {
  readonly root: string;
  readonly projectId: string;
  readonly items: readonly Pick<
    AdoptionPreviewItem,
    | "path"
    | "action"
    | "currentClassification"
    | "proposedClassification"
    | "manualDecisionRequired"
  >[];
}): string {
  const lines = input.items
    .map((item) =>
      [
        item.path,
        item.action,
        item.currentClassification,
        item.proposedClassification,
        item.manualDecisionRequired ? "1" : "0",
      ].join("\0"),
    )
    .sort((left, right) => left.localeCompare(right));
  return createHash("sha256")
    .update(`${input.root}\n${input.projectId}\n${lines.join("\n")}`)
    .digest("hex");
}
