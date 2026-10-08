import type {
  AdoptionPreviewItem,
  ExistingProjectAdoptionPlanViewModel,
} from "@intentloom/protocol";

export const ADOPTION_PLAN_GROUP_IDS = [
  "requires-decision",
  "planned-metadata",
  "generated-guidance",
  "existing-files",
  "skipped",
  "other",
] as const;

export type AdoptionPlanGroupId = (typeof ADOPTION_PLAN_GROUP_IDS)[number];

export interface AdoptionPlanGroup {
  readonly id: AdoptionPlanGroupId;
  readonly heading: string;
  readonly items: readonly AdoptionPreviewItem[];
}

const GROUP_HEADINGS: Record<AdoptionPlanGroupId, string> = {
  "requires-decision": "Requires attention",
  "planned-metadata": "Planned Intentloom metadata",
  "generated-guidance": "Generated agent and provider guidance",
  "existing-files": "Existing project files",
  skipped: "Skipped files",
  other: "Other planned items",
};

export function classifyAdoptionPlanItem(
  item: AdoptionPreviewItem,
): AdoptionPlanGroupId {
  if (
    item.manualDecisionRequired ||
    item.action === "conflict" ||
    item.action === "manual-decision-required"
  ) {
    return "requires-decision";
  }
  if (
    item.action === "create" &&
    (item.path.startsWith(".aif/") ||
      item.proposedClassification === "aif-metadata")
  ) {
    return "planned-metadata";
  }
  if (item.action === "generated-candidate" || item.action === "create") {
    return "generated-guidance";
  }
  if (
    item.action === "map-existing-project-owned" ||
    item.action === "map-existing-aif-compatible-document"
  ) {
    return "existing-files";
  }
  if (item.action === "skip" || item.action === "unsupported") {
    return "skipped";
  }
  return "other";
}

export function groupAdoptionPlanItems(
  items: readonly AdoptionPreviewItem[],
): readonly AdoptionPlanGroup[] {
  const buckets = new Map<AdoptionPlanGroupId, AdoptionPreviewItem[]>();
  for (const id of ADOPTION_PLAN_GROUP_IDS) {
    buckets.set(id, []);
  }
  for (const item of items) {
    buckets.get(classifyAdoptionPlanItem(item))?.push(item);
  }
  return ADOPTION_PLAN_GROUP_IDS.flatMap((id) => {
    const grouped = buckets.get(id) ?? [];
    if (grouped.length === 0) return [];
    return [{ id, heading: GROUP_HEADINGS[id], items: grouped }];
  });
}

export function adoptionPreviewHasManualDecisions(
  plan: ExistingProjectAdoptionPlanViewModel,
): boolean {
  return plan.items.some((item) => item.manualDecisionRequired);
}
