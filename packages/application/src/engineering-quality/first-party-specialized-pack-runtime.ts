import { FIRST_PARTY_SPECIALIZED_PACKS } from "../../../../catalog/packs/specialized-engineering/index.js";
import type { FirstPartySpecializedPackCatalogEntry } from "./specialized-pack-catalog-engine.js";

export function getFirstPartySpecializedPackEntries(): readonly FirstPartySpecializedPackCatalogEntry[] {
  return FIRST_PARTY_SPECIALIZED_PACKS;
}
