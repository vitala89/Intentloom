import { describe, expect, it } from "vitest";
import { findMarkdownLinkTargets } from "../packages/validator/src/markdown-links.js";

// Reference implementation being replaced: /\]\(([^)\s]+)(?:\s[^)]*)?\)/gu.
// Kept here only to prove behavioral equivalence on well-formed input; it is
// the polynomial pattern (CodeQL js/polynomial-redos) findMarkdownLinkTargets
// replaces, so it is never exercised on the pathological cases below.
function referenceRegexMatch(body: string): string[] {
  return Array.from(
    body.matchAll(/\]\(([^)\s]+)(?:\s[^)]*)?\)/gu),
    (match) => match[1]!,
  );
}

describe("findMarkdownLinkTargets", () => {
  const equivalenceCases: Array<[string, string]> = [
    ["no links", "no links here"],
    ["simple link", "[a](b)"],
    ["trailing space before close paren", "[a](b )"],
    ["multiple spaces before close paren", "[a](b   )"],
    ["link with title", '[a](b "title")'],
    ["link with multi-space title", '[a](b   "title with spaces")'],
    ["empty target", "[a]()"],
    ["whitespace-only target", "[a](  )"],
    ["adjacent links", "[a](b)(c)"],
    ["two separate links", "[a](b) [c](d)"],
    ["nested-looking brackets", "[a](b [c](d))"],
    ["unterminated, no space", "unterminated [a](b"],
    ["unterminated, one space", "unterminated [a](b "],
    ["unterminated, many spaces", "unterminated [a](b   "],
  ];

  for (const [label, input] of equivalenceCases) {
    it(`matches the reference regex: ${label}`, () => {
      expect(findMarkdownLinkTargets(input)).toEqual(
        referenceRegexMatch(input),
      );
    });
  }

  it("stays linear time on the exact CodeQL js/polynomial-redos attack shape", () => {
    // CodeQL's reported attacker string: '](' followed by many repetitions
    // of '](!' with no closing paren anywhere.
    const pathological = "](" + "](!".repeat(50_000);
    const start = performance.now();
    const targets = findMarkdownLinkTargets(pathological);
    const elapsedMs = performance.now() - start;

    expect(targets).toEqual([]);
    expect(elapsedMs).toBeLessThan(1_000);
  });

  it("stays linear time when no closing paren exists at all", () => {
    const pathological = "[x](" + " ".repeat(200_000);
    const start = performance.now();
    const targets = findMarkdownLinkTargets(pathological);
    const elapsedMs = performance.now() - start;

    expect(targets).toEqual([]);
    expect(elapsedMs).toBeLessThan(1_000);
  });
});
