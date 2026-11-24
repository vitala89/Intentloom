import { relative } from "node:path";
import {
  validateSecurityFinding,
  type SecurityFinding,
} from "@intentloom/protocol";
import type { FileSystem } from "../host-file-system.js";

export async function scanMcpCategory(
  root: string,
  now: string,
  nextFindingId: () => string,
  fs: FileSystem,
): Promise<SecurityFinding[]> {
  const rawFindings: SecurityFinding[] = [];
  const files = await fs.list(root);
  for (const rawPath of files) {
    const normalized = rawPath.replaceAll("\\", "/");
    if (normalized.includes(".aif/mcp/") && normalized.endsWith(".json")) {
      try {
        const content = JSON.parse(await fs.read(rawPath));
        if (content.allowGenericShell === true) {
          const rel = rawPath.startsWith(root)
            ? relative(root, rawPath)
            : rawPath;
          rawFindings.push(
            validateSecurityFinding({
              schemaVersion: "1",
              id: nextFindingId(),
              ruleId: "mcp/unrestricted-shell-permission",
              title:
                "MCP server configuration enables generic shell capability",
              severity: "critical",
              state: "open",
              category: "mcp",
              description: `MCP server config ${rel} allows generic shell execution`,
              scanner: "built-in:mcp-adapter",
              evidence: [{ path: rel }],
              trustClass: "verified-evidence",
              createdAt: now,
              updatedAt: now,
            }),
          );
        }
      } catch {
        // ignore malformed mcp configs
      }
    }
  }
  return rawFindings;
}
