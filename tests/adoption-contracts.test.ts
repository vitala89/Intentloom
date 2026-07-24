import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  deterministicId,
  parseAdoptionPlan,
  planGovernanceAdoption,
  stableStringify,
  type PlanGovernanceAdoptionInput,
} from "@intentloom/core/adoption";

async function applyeFixture(): Promise<PlanGovernanceAdoptionInput> {
  return JSON.parse(
    await readFile(
      resolve("tests/fixtures/adoption/applye.json"),
      "utf8",
    ),
  ) as PlanGovernanceAdoptionInput;
}

describe("portable adoption contracts", () => {
  it(
    "creates a deterministic plan for the Applye reference fixture",
    async () => {
      const fixture = await applyeFixture();
      const first = planGovernanceAdoption(fixture);
      const second = planGovernanceAdoption({
        ...fixture,
        artifacts: [...fixture.artifacts].reverse(),
      });

      expect(stableStringify(first)).toBe(stableStringify(second));
      expect(first.planId).toBe(second.planId);
      expect(parseAdoptionPlan(stableStringify(first))).toEqual(first);
    },
  );

  it("maps Applye current state without proposing PROJECT_STATE.md", async () => {
    const plan = planGovernanceAdoption(await applyeFixture());

    expect(plan.mappings).toContainEqual(
      expect.objectContaining({
        role: "operational-project-state",
        path: "docs/product/CURRENT_STATE.md",
        ownership: "project-owned",
      }),
    );
    expect(plan.operations).not.toContainEqual(
      expect.objectContaining({ path: "PROJECT_STATE.md" }),
    );
    expect(plan.operations).not.toContainEqual(
      expect.objectContaining({ kind: "create" }),
    );
  });

  it("preserves Claude instructions as a provider derivative", async () => {
    const plan = planGovernanceAdoption(await applyeFixture());

    expect(plan.mappings).toContainEqual(
      expect.objectContaining({
        role: "provider-instructions:claude",
        path: "CLAUDE.md",
        ownership: "provider-derivative",
      }),
    );
  });

  it(
    "blocks automatic apply for an ambiguous source-of-truth role",
    async () => {
      const fixture = await applyeFixture();
      const currentState = fixture.artifacts.find(
        ({ path }) => path === "docs/product/CURRENT_STATE.md",
      )!;
      const plan = planGovernanceAdoption({
        ...fixture,
        artifacts: [
          ...fixture.artifacts,
          {
            ...currentState,
            path: "PROJECT_STATE.md",
            contentHash:
              "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          },
        ],
      });

      expect(plan.automaticApplyAllowed).toBe(false);
      expect(plan.findings).toContainEqual(
        expect.objectContaining({
          code: "ambiguous-role-mapping",
          status: "ambiguous",
          paths: ["docs/product/CURRENT_STATE.md", "PROJECT_STATE.md"].sort(),
        }),
      );
      expect(plan.mappings).not.toContainEqual(
        expect.objectContaining({ role: "operational-project-state" }),
      );
    },
  );

  it("generates stable identifiers from canonical object key ordering", () => {
    expect(deterministicId("finding", { a: 1, b: 2 })).toBe(
      deterministicId("finding", { b: 2, a: 1 }),
    );
  });

  it("rejects unsafe artifact paths and invalid plan envelopes", async () => {
    const fixture = await applyeFixture();
    expect(() =>
      planGovernanceAdoption({
        ...fixture,
        artifacts: [
          {
            ...fixture.artifacts[0]!,
            path: "../AGENTS.md",
          },
        ],
      }),
    ).toThrow("stored path must be safe and project-relative");
    expect(() => parseAdoptionPlan({ schemaVersion: 2 })).toThrow(
      "schema version 1",
    );
  });
});
