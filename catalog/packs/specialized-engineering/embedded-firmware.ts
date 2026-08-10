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

export const embeddedFirmwareSpecializedPack: FirstPartySpecializedPackEntry = {
  fixtureProfileId: "embedded-firmware",
  manifest: {
    schemaVersion: QUALITY_SPECIALIZED_PACK_SCHEMA_URN,
    id: "pack-embedded-firmware",
    version: "1.0.0",
    name: "Embedded Firmware and RTOS Pack",
    publisher: FIRST_PARTY_PUBLISHER,
    targetDisciplineIds: ["discipline-embedded-iot"],
    providedArchitectureStrategies: [
      "hal-application-services",
      "rtos-event-loop",
    ],
    providedRuleIds: [
      "EMB-001-unsafe-hal-review",
      "EMB-002-interrupt-latency-budget",
    ],
    requiredTooling: ["arm-none-eabi-gcc", "cargo-embed"],
    permissionsRequired: ["local-hardware-device-read"],
    conflicts: [],
    dependencies: [],
  },
  detectionRule: {
    schemaVersion: QUALITY_SPECIALIZED_PACK_DETECTION_RULE_SCHEMA_URN,
    packId: "pack-embedded-firmware",
    signals: [
      {
        pathPattern: "linker/",
        matchKind: "contains",
        label: "linker-script",
      },
      {
        pathPattern: "memory.x",
        matchKind: "suffix",
        label: "memory-layout",
      },
      {
        pathPattern: "Cargo.toml",
        matchKind: "suffix",
        label: "cargo-root",
      },
    ],
    minimumSignalMatches: 2,
  },
  aliases: [
    {
      schemaVersion: QUALITY_DISCIPLINE_ALIAS_SCHEMA_URN,
      aliasId: "alias-firmware-engineer",
      humanTitle: "Firmware Engineer",
      targetDisciplineId: "discipline-embedded-iot",
      createdAt: FIRST_PARTY_ALIAS_CREATED_AT,
    },
  ],
};
