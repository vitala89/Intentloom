import { describe, expect, it } from "vitest";
import { normalizeStoredPath, storedPathCollisionKey } from "@intentloom/core";

describe("portable stored paths", () => {
  it("normalizes relative Windows separators and Unicode to stored form", () => {
    expect(normalizeStoredPath("docs\\Cafe\u0301\\guide.md")).toBe(
      "docs/Caf\u00e9/guide.md",
    );
  });

  it.each([
    ["drive absolute backslashes", "C:\\project\\file.md"],
    ["drive absolute slashes", "C:/project/file.md"],
    ["lowercase drive absolute", "c:\\project\\file.md"],
    ["different drive", "D:\\project\\file.md"],
    ["drive relative", "C:folder\\file.md"],
    ["UNC", "\\\\server\\share\\project\\file.md"],
    ["extended drive", "\\\\?\\C:\\project\\file.md"],
    ["root relative", "\\folder\\file.md"],
    ["POSIX absolute", "/project/file.md"],
    ["parent traversal", "docs/../private.md"],
    ["reserved CON", "docs/CON"],
    ["reserved PRN extension", "docs/prn.txt"],
    ["reserved AUX", "AUX/readme.md"],
    ["reserved NUL", "nul"],
    ["reserved COM1", "docs/COM1.md"],
    ["reserved LPT1", "docs/lpt1"],
    ["trailing space", "docs/name /file.md"],
    ["trailing dot", "docs/name./file.md"],
    ["invalid colon", "docs/name:file.md"],
    ["invalid wildcard", "docs/name?.md"],
    ["control character", "docs/name\u0001.md"],
  ])("rejects Windows-unsafe %s paths", (_name, candidate) => {
    expect(() => normalizeStoredPath(candidate)).toThrow(
      "stored path must be safe and project-relative",
    );
  });

  it.each([
    ["mixed separators", "docs\\nested/file.md", "docs/nested/file.md"],
    ["dot segments", "./docs/./file.md", "docs/file.md"],
    ["repeated separators", "docs//nested///file.md", "docs/nested/file.md"],
    ["spaces", "docs/team guide/file name.md", "docs/team guide/file name.md"],
    [
      "long paths",
      `${"segment/".repeat(40)}file.md`,
      `${"segment/".repeat(40)}file.md`,
    ],
  ])("normalizes safe %s", (_name, candidate, expected) => {
    expect(normalizeStoredPath(candidate)).toBe(expected);
  });

  it.each([
    ["separator", "Docs\\Guide.md", "docs/guide.md"],
    ["case", "AGENTS.md", "agents.MD"],
    ["Unicode", "docs/Cafe\u0301.md", "docs/CAF\u00c9.md"],
  ])(
    "uses one Windows collision key for %s equivalents",
    (_name, left, right) => {
      expect(storedPathCollisionKey(left)).toBe(storedPathCollisionKey(right));
    },
  );
});
