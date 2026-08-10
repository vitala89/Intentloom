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

export const cloudInfrastructureSpecializedPack: FirstPartySpecializedPackEntry =
  {
    fixtureProfileId: "cloud-terraform",
    manifest: {
      schemaVersion: QUALITY_SPECIALIZED_PACK_SCHEMA_URN,
      id: "pack-cloud-terraform",
      version: "1.0.0",
      name: "Cloud Infrastructure and Terraform Pack",
      publisher: FIRST_PARTY_PUBLISHER,
      targetDisciplineIds: [
        "discipline-devops-sre",
        "discipline-platform-engineering",
      ],
      providedArchitectureStrategies: [
        "gitops-reconciliation",
        "environment-overlays",
      ],
      providedRuleIds: [
        "CLD-001-least-privilege-iam",
        "CLD-002-state-backend-isolation",
      ],
      requiredTooling: ["terraform", "tflint"],
      permissionsRequired: [],
      conflicts: [],
      dependencies: [],
    },
    detectionRule: {
      schemaVersion: QUALITY_SPECIALIZED_PACK_DETECTION_RULE_SCHEMA_URN,
      packId: "pack-cloud-terraform",
      signals: [
        {
          pathPattern: ".terraform/",
          matchKind: "contains",
          label: "terraform-cache",
        },
        {
          pathPattern: "main.tf",
          matchKind: "suffix",
          label: "terraform-root-module",
        },
      ],
    },
    aliases: [
      {
        schemaVersion: QUALITY_DISCIPLINE_ALIAS_SCHEMA_URN,
        aliasId: "alias-cloud-engineer",
        humanTitle: "Cloud Engineer",
        targetDisciplineId: "discipline-devops-sre",
        createdAt: FIRST_PARTY_ALIAS_CREATED_AT,
      },
    ],
  };
