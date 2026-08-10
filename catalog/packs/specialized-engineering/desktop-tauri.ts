import {
  QUALITY_DISCIPLINE_ALIAS_SCHEMA_URN,
  QUALITY_SPECIALIZED_PACK_DETECTION_RULE_SCHEMA_URN,
  QUALITY_SPECIALIZED_PACK_SCHEMA_URN,
} from "@intentloom/protocol";
import {
  FIRST_PARTY_ALIAS_CREATED_AT,
  FIRST_PARTY_PUBLISHER,
} from "./common.js";
import type { FirstPartySpecializedPackEntry } from "./types.js";

export const desktopTauriSpecializedPack: FirstPartySpecializedPackEntry = {
  fixtureProfileId: "desktop-tauri",
  manifest: {
    schemaVersion: QUALITY_SPECIALIZED_PACK_SCHEMA_URN,
    id: "pack-tauri-desktop",
    version: "1.0.0",
    name: "Tauri Desktop Pack",
    publisher: FIRST_PARTY_PUBLISHER,
    targetDisciplineIds: ["discipline-desktop"],
    providedArchitectureStrategies: ["tauri-rust-hal", "native-ipc-bridge"],
    providedRuleIds: [
      "DESK-001-ipc-capability-review",
      "DESK-002-native-dialog-threading",
    ],
    requiredTooling: ["cargo", "rustfmt", "clippy"],
    permissionsRequired: [],
    conflicts: [],
    dependencies: [],
  },
  detectionRule: {
    schemaVersion: QUALITY_SPECIALIZED_PACK_DETECTION_RULE_SCHEMA_URN,
    packId: "pack-tauri-desktop",
    signals: [
      {
        pathPattern: "src-tauri/Cargo.toml",
        matchKind: "contains",
        label: "tauri-cargo-manifest",
      },
      {
        pathPattern: "apps/desktop/",
        matchKind: "contains",
        label: "desktop-app-root",
      },
    ],
    securityImpact: "review-required",
  },
  aliases: [
    {
      schemaVersion: QUALITY_DISCIPLINE_ALIAS_SCHEMA_URN,
      aliasId: "alias-desktop-platform-engineer",
      humanTitle: "Desktop Platform Engineer",
      targetDisciplineId: "discipline-desktop",
      createdAt: FIRST_PARTY_ALIAS_CREATED_AT,
    },
  ],
};
