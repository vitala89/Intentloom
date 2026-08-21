import type { ExtensionHealthFinding } from "@intentloom/protocol";

export const SPECIALIZED_PACK_LOCK_INVALID = "specialized-pack-lock-invalid";
export const SPECIALIZED_PACK_PIN_INVALID = "specialized-pack-pin-invalid";
export const SPECIALIZED_PACK_INTEGRITY_INVALID =
  "specialized-pack-integrity-invalid";
export const SPECIALIZED_PACK_TRUST_INVALID = "specialized-pack-trust-invalid";
export const SPECIALIZED_PACK_MANIFEST_MISSING =
  "specialized-pack-manifest-missing";
export const SPECIALIZED_PACK_MANIFEST_DIGEST_MISMATCH =
  "specialized-pack-manifest-digest-mismatch";
export const SPECIALIZED_PACK_MANIFEST_IDENTITY_MISMATCH =
  "specialized-pack-manifest-identity-mismatch";

const SEVERITY_RANK: Record<ExtensionHealthFinding["severity"], number> = {
  error: 0,
  warning: 1,
  info: 2,
};

export function specializedPackFinding(
  extensionId: string,
  code: string,
  severity: ExtensionHealthFinding["severity"],
  path: string,
  message: string,
  remediation: string,
): ExtensionHealthFinding {
  return { extensionId, code, severity, path, message, remediation };
}

export function compareSpecializedPackFindings(
  left: ExtensionHealthFinding,
  right: ExtensionHealthFinding,
): number {
  const severity = SEVERITY_RANK[left.severity] - SEVERITY_RANK[right.severity];
  if (severity !== 0) return severity;
  const code = left.code.localeCompare(right.code);
  if (code !== 0) return code;
  const pack = left.extensionId.localeCompare(right.extensionId);
  if (pack !== 0) return pack;
  return left.path.localeCompare(right.path);
}

export function isSpecializedPackSecurityFinding(code: string): boolean {
  return (
    code.startsWith("specialized-pack-") &&
    code !== SPECIALIZED_PACK_MANIFEST_MISSING
  );
}
