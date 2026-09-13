import { describe, expect, it } from "vitest";
import { parseNeutronMutationChangedPaths } from "../apps/desktop/src/neutron/neutron-mutation-proposal-paths-parse.js";

describe("Neutron mutation proposal changedPaths (Desktop boundary)", () => {
  it("accepts canonical project-relative paths", () => {
    expect(parseNeutronMutationChangedPaths(["src/a.ts", "src/z.ts"])).toEqual([
      "src/a.ts",
      "src/z.ts",
    ]);
  });

  it("rejects absolute, traversal, empty, and duplicate paths", () => {
    expect(() => parseNeutronMutationChangedPaths(["/etc/passwd"])).toThrow(
      /safe project-relative path/,
    );
    expect(() => parseNeutronMutationChangedPaths(["../outside.ts"])).toThrow(
      /safe project-relative path/,
    );
    expect(() => parseNeutronMutationChangedPaths([""])).toThrow(
      /safe project-relative path/,
    );
    expect(() =>
      parseNeutronMutationChangedPaths(["src/a.ts", "src/a.ts"]),
    ).toThrow(/duplicate paths/);
  });
});
