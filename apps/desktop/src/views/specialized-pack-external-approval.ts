import {
  QUALITY_PACK_ACTIVATION_SCHEMA_URN,
  type ExternalQualityPackActivationApproval,
  type ExternalSpecializedPackPreviewViewModel,
} from "@intentloom/protocol";
import { DESKTOP_EXTERNAL_SPECIALIZED_PACK_REVIEWER_ID } from "./specialized-pack-external-reviewer.js";

export function buildExternalSpecializedPackActivationApproval(
  preview: ExternalSpecializedPackPreviewViewModel,
): ExternalQualityPackActivationApproval {
  return {
    schemaVersion: QUALITY_PACK_ACTIVATION_SCHEMA_URN,
    decision: "approve",
    reviewerId: DESKTOP_EXTERNAL_SPECIALIZED_PACK_REVIEWER_ID,
    source: {
      kind: preview.source.kind,
      locator: preview.source.locator,
      pin: preview.source.pin,
      digest: preview.digest,
    },
  };
}
