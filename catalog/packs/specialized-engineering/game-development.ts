import {
  FIRST_PARTY_ALIAS_CREATED_AT,
  FIRST_PARTY_PUBLISHER,
  QUALITY_DISCIPLINE_ALIAS_SCHEMA_URN,
  QUALITY_SPECIALIZED_PACK_CHECK_DEFINITION_SCHEMA_URN,
  QUALITY_SPECIALIZED_PACK_DETECTION_RULE_SCHEMA_URN,
  QUALITY_SPECIALIZED_PACK_SCHEMA_URN,
} from "./common.js";
import type { FirstPartySpecializedPackEntry } from "./types.js";

export const gameDevelopmentSpecializedPack: FirstPartySpecializedPackEntry = {
  fixtureProfileId: "game-development",
  manifest: {
    schemaVersion: QUALITY_SPECIALIZED_PACK_SCHEMA_URN,
    id: "pack-game-development",
    version: "1.0.0",
    name: "Game Development Pack",
    publisher: FIRST_PARTY_PUBLISHER,
    targetDisciplineIds: ["discipline-spatial-graphics"],
    providedArchitectureStrategies: [
      "entity-component-system",
      "deterministic-simulation",
    ],
    providedRuleIds: ["GAME-001-frame-budget", "GAME-002-save-compatibility"],
    requiredTooling: [],
    permissionsRequired: [],
    conflicts: [],
    dependencies: [],
  },
  detectionRule: {
    schemaVersion: QUALITY_SPECIALIZED_PACK_DETECTION_RULE_SCHEMA_URN,
    packId: "pack-game-development",
    signals: [
      {
        pathPattern: "project.godot",
        matchKind: "suffix",
        label: "godot-project",
      },
      {
        pathPattern: "Assets/Scripts/",
        matchKind: "contains",
        label: "unity-scripts",
      },
    ],
  },
  checkDefinitions: [
    {
      schemaVersion: QUALITY_SPECIALIZED_PACK_CHECK_DEFINITION_SCHEMA_URN,
      packId: "pack-game-development",
      ruleId: "GAME-001-frame-budget",
      kind: "path-presence",
      signals: [
        {
          pathPattern: "project.godot",
          matchKind: "suffix",
          label: "godot-project",
        },
        {
          pathPattern: "Assets/Scripts/",
          matchKind: "contains",
          label: "unity-scripts",
        },
      ],
      minimumSignalMatches: 1,
      severity: "info",
      summary: "Game project sources are present for frame budget review",
    },
    {
      schemaVersion: QUALITY_SPECIALIZED_PACK_CHECK_DEFINITION_SCHEMA_URN,
      packId: "pack-game-development",
      ruleId: "GAME-002-save-compatibility",
      kind: "path-presence",
      signals: [
        {
          pathPattern: "scenes/",
          matchKind: "contains",
          label: "game-scenes",
        },
      ],
      severity: "review",
      summary: "Game scenes are present for save compatibility review",
    },
  ],
  aliases: [
    {
      schemaVersion: QUALITY_DISCIPLINE_ALIAS_SCHEMA_URN,
      aliasId: "alias-gameplay-engineer",
      humanTitle: "Gameplay Engineer",
      targetDisciplineId: "discipline-spatial-graphics",
      createdAt: FIRST_PARTY_ALIAS_CREATED_AT,
    },
  ],
};
