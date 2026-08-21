import type { DoctorFinding } from "@intentloom/protocol";

const EXTERNAL_SPECIALIZED_PACK_DOCTOR_CODE_PREFIX = "specialized-pack-";

export function hasExternalSpecializedPackDoctorFindings(
  findings: readonly DoctorFinding[],
): boolean {
  return findings.some((finding) =>
    finding.code.startsWith(EXTERNAL_SPECIALIZED_PACK_DOCTOR_CODE_PREFIX),
  );
}
