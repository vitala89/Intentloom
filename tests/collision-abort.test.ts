import { describe, expect, it } from "vitest";
import { findDestinationCollisions } from "@intentloom/cli";

describe("destination collision planning", () => {
  it("reports case-only collisions independently of input order", () => {
    const inputs = [
      { path: "AGENTS.md", sources: ["adapter:codex"] },
      { path: "agents.md", sources: ["adapter:cursor"] },
    ];
    const forward = findDestinationCollisions(inputs);
    const reverse = findDestinationCollisions([...inputs].reverse());
    expect(forward).toEqual(reverse);
    expect(forward).toEqual([
      {
        code: "destination-collision",
        key: "agents.md",
        paths: ["AGENTS.md", "agents.md"],
        sources: ["adapter:codex", "adapter:cursor"],
      },
    ]);
  });

  it.each([
    ["case-only", "AGENTS.md", "agents.md"],
    ["nested case-only", "Docs/Rules.md", "docs/rules.md"],
    ["mixed separators", "docs\\rules.md", "docs/rules.md"],
    ["leading dot", "./AGENTS.md", "AGENTS.md"],
    ["dot segments", "docs/../AGENTS.md", "AGENTS.md"],
    ["NFC Unicode", "Cafe\u0301.md", "Caf\u00e9.md"],
    ["manifest metadata", ".AIF/MANIFEST.LOCK.JSON", ".aif/manifest.lock.json"],
    ["source-map metadata", ".AIF/SOURCE-MAP.JSON", ".aif/source-map.json"],
  ])("reports %s collision with complete provenance", (_name, left, right) => {
    const collision = findDestinationCollisions([
      { path: left, sources: ["source:left"] },
      { path: right, sources: ["source:right"] },
    ])[0];
    expect(collision?.code).toBe("destination-collision");
    expect(collision?.paths).toEqual([left, right].sort());
    expect(collision?.sources).toEqual(["source:left", "source:right"]);
  });

  it("reports three colliding sources independently of ordering", () => {
    const inputs = ["AGENTS.md", "agents.md", "Agents.md"].map((path) => ({
      path,
      sources: [`source:${path}`],
    }));
    expect(findDestinationCollisions(inputs)).toEqual(
      findDestinationCollisions([...inputs].reverse()),
    );
    expect(findDestinationCollisions(inputs)[0]?.sources).toHaveLength(3);
  });
});
