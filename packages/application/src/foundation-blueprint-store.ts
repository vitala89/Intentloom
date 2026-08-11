import type { FoundationBlueprintApprovalRecord } from "@intentloom/protocol";

const approvals = new Map<string, FoundationBlueprintApprovalRecord>();

export function getFoundationBlueprintApproval(
  workshopId: string,
): FoundationBlueprintApprovalRecord | undefined {
  return approvals.get(workshopId);
}

export function setFoundationBlueprintApproval(
  record: FoundationBlueprintApprovalRecord,
): FoundationBlueprintApprovalRecord {
  approvals.set(record.workshopId, record);
  return record;
}

export function clearFoundationBlueprintApprovals(): void {
  approvals.clear();
}

export function deleteFoundationBlueprintApproval(workshopId: string): void {
  approvals.delete(workshopId);
}
