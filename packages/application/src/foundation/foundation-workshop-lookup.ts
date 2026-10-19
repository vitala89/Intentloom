import type { FoundationWorkshopState } from "@intentloom/protocol";
import { validateFoundationWorkshopState } from "@intentloom/validator";
import { getFoundationWorkshopStoreEntry } from "./foundation-workshop-store.js";

export function getFoundationWorkshop(
  workshopId: string,
): FoundationWorkshopState {
  const workshop = getFoundationWorkshopStoreEntry(workshopId);
  if (workshop === undefined) {
    throw new Error(`unknown foundation workshop '${workshopId}'`);
  }
  return validateFoundationWorkshopState(workshop);
}
