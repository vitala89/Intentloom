import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  inspectProject,
  nodeFileSystem,
} from "../packages/application/src/index.js";
import { fingerprintNeutronProjectRoot } from "../packages/application/src/neutron-session-fingerprint.js";
import {
  reviewProject,
  reviewProjectUnderSymlinkParent,
} from "./neutron-mutation-review-support.js";

describe("fingerprintNeutronProjectRoot", () => {
  it("returns the same digest for repeated scans of an unchanged project", async () => {
    const root = await reviewProject();
    const first = await fingerprintNeutronProjectRoot(root);
    const second = await fingerprintNeutronProjectRoot(root);
    expect(first).toBe(second);
    expect(first).toMatch(/^[0-9a-f]{64}$/u);
  });

  it("changes when an inspection-visible project file is added", async () => {
    const root = await reviewProject();
    const before = await fingerprintNeutronProjectRoot(root);
    await writeFile(join(root, "CLAUDE.md"), "adapter instruction\n");
    expect(await fingerprintNeutronProjectRoot(root)).not.toBe(before);
  });

  it("is independent of symlink-parent vs realpath spelling", async () => {
    const { root, realRoot } = await reviewProjectUnderSymlinkParent();
    expect(root).not.toBe(realRoot);
    const inspected = JSON.stringify(
      await inspectProject(root, nodeFileSystem),
    );
    expect(inspected.includes("\\")).toBe(false);
    expect(inspected.includes(root)).toBe(false);
    expect(inspected.includes(realRoot)).toBe(false);
    expect(await fingerprintNeutronProjectRoot(root)).toBe(
      await fingerprintNeutronProjectRoot(realRoot),
    );
  });
});
