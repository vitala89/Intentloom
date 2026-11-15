import { dirname, relative } from "node:path";
import {
  validateProfileDefinition,
  type ProfileDefinition,
} from "@intentloom/protocol";
import { nodeFileSystem, type FileSystem } from "../host-file-system.js";
import { inside } from "../project-path.js";

export async function createProfile(
  input: unknown,
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<ProfileDefinition> {
  const profile = validateProfileDefinition(input);
  const path = inside(
    options.root,
    `.aif/memory/profiles/${profile.name}.json`,
  );
  const dir = dirname(path);
  if (!(await fs.exists(dir))) {
    await fs.mkdir(dir);
  }
  await fs.write(path, `${JSON.stringify(profile, null, 2)}\n`);
  return profile;
}

export async function getProfile(
  name: string,
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<ProfileDefinition | null> {
  const path = inside(options.root, `.aif/memory/profiles/${name}.json`);
  if (!(await fs.exists(path))) return null;
  try {
    const content = await fs.read(path);
    return validateProfileDefinition(JSON.parse(content));
  } catch {
    return null;
  }
}

export async function listProfiles(
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<readonly ProfileDefinition[]> {
  const root = options.root;
  const allPaths = await fs.list(root);
  const results: ProfileDefinition[] = [];

  for (const rawPath of allPaths) {
    const rel = rawPath.startsWith(root) ? relative(root, rawPath) : rawPath;
    const normalized = rel.replaceAll("\\", "/");
    if (
      !normalized.startsWith(".aif/memory/profiles/") ||
      !normalized.endsWith(".json")
    )
      continue;

    const fullPath = rawPath.startsWith(root)
      ? rawPath
      : inside(root, normalized);
    try {
      const content = await fs.read(fullPath);
      const prof = validateProfileDefinition(JSON.parse(content));
      results.push(prof);
    } catch {
      // Ignore invalid profile files
    }
  }

  return results.sort((l, r) => l.name.localeCompare(r.name));
}
