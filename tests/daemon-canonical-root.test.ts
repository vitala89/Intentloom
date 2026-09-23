import { mkdtemp, realpath, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  canonicalProjectRoot,
  resolveDaemonProjectRoot,
} from "../packages/daemon/src/daemon-canonical-root.js";

async function projectUnderSymlinkParent(): Promise<{
  readonly root: string;
  readonly realRoot: string;
}> {
  const realParent = await mkdtemp(join(tmpdir(), "daemon-root-real-"));
  const linkParent = `${realParent}-link`;
  await symlink(
    realParent,
    linkParent,
    process.platform === "win32" ? "junction" : "dir",
  );
  const root = await mkdtemp(join(linkParent, "proj-"));
  return { realRoot: await realpath(root), root };
}

describe("resolveDaemonProjectRoot", () => {
  it("keeps the client root when canonical roots are explicitly disabled", async () => {
    const { root, realRoot } = await projectUnderSymlinkParent();
    expect(root).not.toBe(realRoot);
    expect(await resolveDaemonProjectRoot(root, false)).toBe(root);
    expect(await canonicalProjectRoot(root)).toBe(realRoot);
  });

  it("canonicalizes when enforcement is enabled or omitted", async () => {
    const { root, realRoot } = await projectUnderSymlinkParent();
    expect(await resolveDaemonProjectRoot(root, true)).toBe(realRoot);
    expect(await resolveDaemonProjectRoot(root, undefined)).toBe(realRoot);
  });
});
