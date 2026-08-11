import type { FoundationWorkshopState } from "@intentloom/protocol";
import { validateFoundationWorkshopState } from "@intentloom/validator";

const workshops = new Map<string, FoundationWorkshopState>();

export function clearFoundationWorkshopStore(): void {
  workshops.clear();
}

export function registerFoundationWorkshop(
  workshop: FoundationWorkshopState,
): FoundationWorkshopState {
  const validated = validateFoundationWorkshopState(workshop);
  workshops.set(validated.id, validated);
  return validated;
}

export function getFoundationWorkshopStoreEntry(
  workshopId: string,
): FoundationWorkshopState | undefined {
  return workshops.get(workshopId);
}

export function updateFoundationWorkshopStoreEntry(
  workshop: FoundationWorkshopState,
): FoundationWorkshopState {
  const validated = validateFoundationWorkshopState(workshop);
  if (!workshops.has(validated.id)) {
    throw new Error(`unknown foundation workshop '${validated.id}'`);
  }
  workshops.set(validated.id, validated);
  return validated;
}

export function deleteFoundationWorkshopStoreEntry(
  workshopId: string,
): FoundationWorkshopState {
  const existing = workshops.get(workshopId);
  if (existing === undefined) {
    throw new Error(`unknown foundation workshop '${workshopId}'`);
  }
  workshops.delete(workshopId);
  return existing;
}

export function listFoundationWorkshopStoreIds(): readonly string[] {
  return [...workshops.keys()];
}

export function seedFoundationWorkshopStore(
  entries: readonly FoundationWorkshopState[],
): void {
  for (const entry of entries) {
    registerFoundationWorkshop(entry);
  }
}
