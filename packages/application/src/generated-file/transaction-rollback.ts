import { relative, resolve } from "node:path";
import type { FileSystem } from "../host-file-system.js";

export async function rollbackOwnedGeneratedFiles(
  root: string,
  fs: FileSystem,
  backups: ReadonlyMap<string, string>,
  created: readonly string[],
  rollbackFailPaths: readonly string[] | undefined,
  cause: unknown,
): Promise<string[]> {
  const rollbackFailures: string[] = [];
  const injectedRollbackFailures = new Set(rollbackFailPaths ?? []);
  for (const [path, content] of backups) {
    const projectPath = relative(resolve(root), path).replaceAll("\\", "/");
    try {
      if (injectedRollbackFailures.has(projectPath))
        throw new Error("injected rollback failure", { cause });
      await fs.write(path, content);
    } catch {
      rollbackFailures.push(projectPath);
    }
  }
  for (const path of created) {
    const projectPath = relative(resolve(root), path).replaceAll("\\", "/");
    try {
      if (injectedRollbackFailures.has(projectPath))
        throw new Error("injected rollback failure", { cause });
      await fs.remove(path);
    } catch {
      rollbackFailures.push(projectPath);
    }
  }
  return rollbackFailures.sort();
}
