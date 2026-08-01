import { describe, expect, it } from "vitest";
import { parseSkillProgressive } from "@intentloom/application";

describe("parseSkillProgressive", () => {
  it("extracts inputs, exact outputs, and trigger sections", () => {
    const content = [
      "---",
      "name: example",
      "---",
      "## Trigger",
      "",
      "Use when testing.",
      "",
      "## Inputs",
      "",
      "- first input",
      "- second input",
      "",
      "## Exact outputs",
      "",
      "- an output line",
      "",
      "## Stop conditions",
      "",
      "Stop when done.",
      "",
    ].join("\n");

    const { contract } = parseSkillProgressive("example", content);

    expect(contract.triggers).toEqual(["Use when testing."]);
    expect(contract.inputs.map((i) => i.name)).toEqual(["first", "second"]);
    expect(contract.outputs.map((o) => o.description)).toEqual([
      "an output line",
    ]);
  });

  it("handles CRLF line endings the same as LF", () => {
    const content = [
      "## Trigger",
      "",
      "Use on Windows.",
      "",
      "## Inputs",
      "",
      "- crlf input",
      "",
    ].join("\r\n");

    const { contract } = parseSkillProgressive("example", content);

    expect(contract.triggers).toEqual(["Use on Windows."]);
    expect(contract.inputs.map((i) => i.name)).toEqual(["crlf"]);
  });

  it("leaves a section empty when the header is absent", () => {
    const content = "## Inputs\n\n- only input\n";

    const { contract } = parseSkillProgressive("example", content);

    expect(contract.triggers).toEqual([]);
    expect(contract.outputs).toEqual([]);
    expect(contract.inputs.map((i) => i.name)).toEqual(["only"]);
  });

  it("captures a section that runs to the end of the body", () => {
    const content = "## Trigger\n\nUse until the end, no more headers follow.";

    const { contract } = parseSkillProgressive("example", content);

    expect(contract.triggers).toEqual([
      "Use until the end, no more headers follow.",
    ]);
  });

  it("stays linear time on a large body with no matching header", () => {
    // Regression test for CodeQL js/polynomial-redos: many newlines with no
    // following `## ` header used to force quadratic backtracking in the
    // lookahead-based regex this replaced.
    const pathological = "## Inputs\n" + "x".repeat(1) + "\n".repeat(200_000);

    const start = performance.now();
    const { contract } = parseSkillProgressive("example", pathological);
    const elapsedMs = performance.now() - start;

    expect(contract.inputs).toEqual([]);
    expect(elapsedMs).toBeLessThan(1_000);
  });
});
