import { relative } from "node:path";
import { secretLikePath } from "../project-path.js";
import {
  validateSecurityFinding,
  type SecurityFinding,
} from "@intentloom/protocol";
import type { FileSystem } from "../host-file-system.js";

export async function scanSecretCategory(
  root: string,
  now: string,
  nextFindingId: () => string,
  fs: FileSystem,
): Promise<SecurityFinding[]> {
  const rawFindings: SecurityFinding[] = [];
  const files = await fs.list(root);
  for (const rawPath of files) {
    const rel = rawPath.startsWith(root) ? relative(root, rawPath) : rawPath;
    if (
      rel.includes("node_modules") ||
      rel.startsWith(".git") ||
      rel.endsWith(".png") ||
      rel.endsWith(".jpg")
    ) {
      continue;
    }

    if (secretLikePath(rel)) {
      rawFindings.push(
        validateSecurityFinding({
          schemaVersion: "1",
          id: nextFindingId(),
          ruleId: "secret/sensitive-file-location",
          title: "Sensitive file in repository workspace",
          severity: "high",
          state: "open",
          category: "secret",
          description: `File path ${rel} matches sensitive secret filename pattern`,
          scanner: "built-in:secret-adapter",
          evidence: [{ path: secretLikePath(rel) ? "[REDACTED]" : rel }],
          trustClass: "verified-evidence",
          createdAt: now,
          updatedAt: now,
        }),
      );
    }
  }
  return rawFindings;
}
