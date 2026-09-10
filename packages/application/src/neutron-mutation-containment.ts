import { dirname, isAbsolute, relative, resolve } from "node:path";

export interface NeutronMutationPathFilesystem {
  exists(path: string): Promise<boolean>;
  realpath(path: string): Promise<string>;
}

export function isCanonicalPathInsideRoot(
  canonicalRoot: string,
  canonicalPath: string,
): boolean {
  const root = resolve(canonicalRoot);
  const candidate = resolve(canonicalPath);
  if (candidate === root) return true;
  const rel = relative(root, candidate);
  if (rel.length === 0) return true;
  if (isAbsolute(rel)) return false;
  const first = rel.split(/[\\/]/u)[0];
  return first !== "..";
}

export async function canonicalizeNeutronMutationRoot(
  root: string,
  fs: NeutronMutationPathFilesystem,
): Promise<string | undefined> {
  try {
    const absolute = resolve(root);
    if (!(await fs.exists(absolute))) return undefined;
    return await fs.realpath(absolute);
  } catch {
    return undefined;
  }
}

export async function assertNeutronMutationPathContained(
  canonicalRoot: string,
  relativePath: string,
  fs: NeutronMutationPathFilesystem,
): Promise<boolean> {
  try {
    return await inspectContainedPath(canonicalRoot, relativePath, fs);
  } catch {
    return false;
  }
}

async function inspectContainedPath(
  canonicalRoot: string,
  relativePath: string,
  fs: NeutronMutationPathFilesystem,
): Promise<boolean> {
  if (relativePath.length === 0 || isAbsolute(relativePath)) return false;
  if (hasTraversalSegment(relativePath)) return false;
  const lexicalTarget = resolve(canonicalRoot, relativePath);
  if (!isCanonicalPathInsideRoot(canonicalRoot, lexicalTarget)) return false;
  const ancestor = await nearestExistingAncestor(
    lexicalTarget,
    canonicalRoot,
    fs,
  );
  if (ancestor === undefined) return false;
  const canonicalAncestor = await fs.realpath(ancestor);
  if (!isCanonicalPathInsideRoot(canonicalRoot, canonicalAncestor)) {
    return false;
  }
  const remainder = relative(ancestor, lexicalTarget);
  if (remainder.length === 0) return true;
  if (isAbsolute(remainder) || hasTraversalSegment(remainder)) return false;
  const projected = resolve(canonicalAncestor, remainder);
  return isCanonicalPathInsideRoot(canonicalRoot, projected);
}

async function nearestExistingAncestor(
  absolutePath: string,
  stopAt: string,
  fs: NeutronMutationPathFilesystem,
): Promise<string | undefined> {
  let current = resolve(absolutePath);
  const stop = resolve(stopAt);
  for (let depth = 0; depth < 256; depth += 1) {
    if (await fs.exists(current)) return current;
    if (current === stop) return undefined;
    const parent = dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
  return undefined;
}

function hasTraversalSegment(relativePath: string): boolean {
  return relativePath.split(/[\\/]/u).some((segment) => segment === "..");
}
