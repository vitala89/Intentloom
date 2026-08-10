import { cloudInfrastructureSpecializedPack } from "./cloud-infrastructure.js";
import { desktopTauriSpecializedPack } from "./desktop-tauri.js";
import { embeddedFirmwareSpecializedPack } from "./embedded-firmware.js";
import { gameDevelopmentSpecializedPack } from "./game-development.js";
import type { FirstPartySpecializedPackEntry } from "./types.js";

export { FIRST_PARTY_PUBLISHER } from "./common.js";
export type { FirstPartySpecializedPackEntry } from "./types.js";

export const FIRST_PARTY_SPECIALIZED_PACKS: readonly FirstPartySpecializedPackEntry[] =
  [
    desktopTauriSpecializedPack,
    embeddedFirmwareSpecializedPack,
    cloudInfrastructureSpecializedPack,
    gameDevelopmentSpecializedPack,
  ];

export const FIRST_PARTY_SPECIALIZED_PACK_IDS: readonly string[] =
  FIRST_PARTY_SPECIALIZED_PACKS.map((entry) => entry.manifest.id);
