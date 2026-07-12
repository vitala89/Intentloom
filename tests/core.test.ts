import { describe, expect, it } from "vitest";
import { normalizeOutputPath } from "@aif/core";

describe("output path safety", () => {
  it("rejects a traversal attempt", () => {
    expect(() => normalizeOutputPath("../.env")).toThrow(
      "escapes the project root",
    );
  });
});
