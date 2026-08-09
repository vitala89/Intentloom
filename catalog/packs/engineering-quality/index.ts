import type { EngineeringQualityPack } from "@intentloom/protocol";
import { baseQualityPack } from "./base.js";
import {
  accessibilityQualityPack,
  securitySensitiveQualityPack,
  testingQualityPack,
} from "./guidance.js";
import { rustQualityPack, tauriQualityPack } from "./native.js";
import {
  angularQualityPack,
  reactQualityPack,
  typescriptQualityPack,
} from "./web.js";

export const FIRST_PARTY_ENGINEERING_QUALITY_PACKS: readonly EngineeringQualityPack[] =
  [
    baseQualityPack,
    typescriptQualityPack,
    angularQualityPack,
    reactQualityPack,
    rustQualityPack,
    tauriQualityPack,
    testingQualityPack,
    accessibilityQualityPack,
    securitySensitiveQualityPack,
  ];
