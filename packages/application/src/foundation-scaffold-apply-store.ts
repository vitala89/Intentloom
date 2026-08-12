import type { ScaffoldResult } from "@intentloom/protocol";

const results = new Map<string, ScaffoldResult>();

function key(workshopId: string, planId: string): string {
  return `${workshopId}::${planId}`;
}

export function getFoundationScaffoldApplyResult(
  workshopId: string,
  planId: string,
): ScaffoldResult | undefined {
  return results.get(key(workshopId, planId));
}

export function setFoundationScaffoldApplyResult(
  workshopId: string,
  planId: string,
  result: ScaffoldResult,
): ScaffoldResult {
  results.set(key(workshopId, planId), result);
  return result;
}

export function clearFoundationScaffoldApplyResults(): void {
  results.clear();
}
