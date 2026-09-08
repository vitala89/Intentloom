import { relative } from "node:path";
import { normalizeStoredPath } from "@intentloom/core";
import { NEUTRON_TURN_SECRET_PATH_LIMIT } from "../../protocol/src/neutron-session-activity.js";
import type { FileSystem } from "./index.js";

const SECRET_NAME_PATTERN =
  /(?:^|\/)(?:\.env(?:\..+)?|credentials\.json|id_rsa|id_ed25519)$/u;
const SECRET_EXTENSION_PATTERN = /\.(?:pem|key)$/u;

export function isSecretLikeRelativePath(path: string): boolean {
  return SECRET_NAME_PATTERN.test(path) || SECRET_EXTENSION_PATTERN.test(path);
}

export async function listExcludedSecretLikePaths(
  root: string,
  fs: FileSystem,
): Promise<readonly string[]> {
  const rawList = await fs.list(root);
  const paths: string[] = [];
  const seen = new Set<string>();
  for (const rawPath of rawList) {
    if (paths.length >= NEUTRON_TURN_SECRET_PATH_LIMIT) break;
    const relativePath = rawPath.startsWith(root)
      ? relative(root, rawPath).replaceAll("\\", "/")
      : rawPath.replaceAll("\\", "/");
    if (!isSecretLikeRelativePath(relativePath)) continue;
    let normalized: string;
    try {
      normalized = normalizeStoredPath(relativePath);
    } catch {
      continue;
    }
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    paths.push(normalized);
  }
  return paths;
}
