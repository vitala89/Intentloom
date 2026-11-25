import { inside } from "../project-path.js";
import {
  validateSecurityFinding,
  type SecurityFinding,
} from "@intentloom/protocol";
import type { FileSystem } from "../host-file-system.js";

export async function scanDependencyCategory(
  root: string,
  now: string,
  nextFindingId: () => string,
  fs: FileSystem,
): Promise<SecurityFinding[]> {
  const rawFindings: SecurityFinding[] = [];
  const pkgPath = inside(root, "package.json");
  if (await fs.exists(pkgPath)) {
    try {
      const content = JSON.parse(await fs.read(pkgPath));
      const deps = {
        ...content.dependencies,
        ...content.devDependencies,
      };
      for (const [name, version] of Object.entries(deps)) {
        if (
          typeof version === "string" &&
          (version === "*" || version === "latest" || version.startsWith(">="))
        ) {
          rawFindings.push(
            validateSecurityFinding({
              schemaVersion: "1",
              id: nextFindingId(),
              ruleId: "dep/unpinned-wildcard",
              title: `Unpinned dependency version for ${name}`,
              severity: "medium",
              state: "open",
              category: "dependency",
              description: `Dependency ${name} uses floating version specifier ${version}`,
              scanner: "built-in:dependency-adapter",
              evidence: [{ path: "package.json" }],
              trustClass: "verified-evidence",
              createdAt: now,
              updatedAt: now,
            }),
          );
        }
      }
    } catch {
      // ignore malformed package.json
    }
  }
  return rawFindings;
}
