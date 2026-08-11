import type { FoundationScaffoldPlanRecord } from "@intentloom/protocol";

const plans = new Map<string, FoundationScaffoldPlanRecord>();

function key(workshopId: string, planId: string): string {
  return `${workshopId}::${planId}`;
}

export function getFoundationScaffoldPlan(
  workshopId: string,
  planId: string,
): FoundationScaffoldPlanRecord | undefined {
  return plans.get(key(workshopId, planId));
}

export function setFoundationScaffoldPlan(
  record: FoundationScaffoldPlanRecord,
): FoundationScaffoldPlanRecord {
  plans.set(key(record.workshopId, record.plan.planId), record);
  return record;
}

export function clearFoundationScaffoldPlans(): void {
  plans.clear();
}

export function deleteFoundationScaffoldPlansForWorkshop(
  workshopId: string,
): void {
  for (const planKey of plans.keys()) {
    if (planKey.startsWith(`${workshopId}::`)) {
      plans.delete(planKey);
    }
  }
}
