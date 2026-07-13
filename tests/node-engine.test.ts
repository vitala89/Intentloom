import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const packageFiles = [
  "package.json",
  "packages/adapters/package.json",
  "packages/cli/package.json",
  "packages/core/package.json",
  "packages/validator/package.json",
];

describe("Node engine contract", () => {
  it.each(packageFiles)("declares Node 22 in %s", (path) => {
    const pkg = JSON.parse(readFileSync(resolve(path), "utf8"));
    expect(pkg.engines).toEqual({ node: ">=22" });
  });

  it("bundles the packed CLI for the declared minimum", () => {
    expect(readFileSync(resolve("scripts/build-cli.mjs"), "utf8")).toContain(
      'target: "node22"',
    );
  });

  it("runs the suite on a supported runtime", () => {
    expect(Number.parseInt(process.versions.node, 10)).toBeGreaterThanOrEqual(
      22,
    );
  });
});
