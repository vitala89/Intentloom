import { createHash } from "node:crypto";
import { inspectProject, nodeFileSystem, type FileSystem } from "./index.js";

export async function fingerprintNeutronProjectRoot(
  root: string,
  fs: FileSystem = nodeFileSystem,
): Promise<string> {
  const inspected = await inspectProject(root, fs);
  return createHash("sha256").update(JSON.stringify(inspected)).digest("hex");
}
