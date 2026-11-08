import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as application from "@intentloom/application";
import {
  applySkillMutationPlan,
  createMemoryFileSystem,
  createSkillProposal,
  inspectProceduralMemory,
  listProceduralMemorySummary,
  prepareSkillMutationPlan,
  rankProceduralMemory,
  rollbackSkill,
  updateSkillProposalState,
  validateSkillExtensionLock,
  type FileSystem,
} from "@intentloom/application";
import type { SkillEvaluationResult } from "@intentloom/protocol";
import {
  applicationCycles,
  relativeSpecifiers,
} from "./application-source-cycles.js";

const skillOperationNames = [
  "parseSkillProgressive",
  "discoverSkills",
  "getSkillAtLevel",
  "createSkillProposal",
  "listSkillProposals",
  "getSkillProposal",
  "updateSkillProposalState",
  "rollbackSkill",
  "evaluateSkillProposal",
  "listSkillEvaluations",
  "getSkillEvaluation",
  "validateSkillExtensionLock",
  "listProceduralMemorySummary",
  "inspectProceduralMemory",
  "prepareSkillMutationPlan",
  "applySkillMutationPlan",
] as const;

const applicationExportKeys = [
  ".",
  "./model-adapter",
  "./ollama-model-adapter",
  "./neutron-runtime",
  "./neutron-n2",
  "./neutron-context-assembly",
  "./neutron-n4",
  "./neutron-scheduler",
  "./neutron-graph-mutation",
  "./neutron-session",
  "./engineering-assessment",
  "./engineering-quality",
];

const outsideComponents = [
  "host-file-system.ts",
  "skills/skill-progressive-parse.ts",
  "skills/skill-discovery.ts",
  "skills/skill-proposal-store.ts",
  "skills/skill-evaluation.ts",
  "skills/skill-mutation.ts",
  "skills/skill-procedural-memory.ts",
  "agent-session/agent-session.ts",
  "memory/persistent-memory-store.ts",
  "memory/persistent-memory-lifecycle.ts",
  "memory/persistent-memory-retrieval.ts",
];

function proposalInput(
  id: string,
  overrides: Record<string, unknown> = {},
): Parameters<typeof createSkillProposal>[0] {
  return {
    id,
    name: `${id}-name`,
    version: "1.0.0",
    sourceTaskIds: ["task-1"],
    observedPattern: "Repeated procedure",
    confidence: 0.8,
    uncertainty: "Low",
    requestedCapabilities: ["read"],
    supportedProfiles: ["api"],
    validationExpectations: ["Tests pass"],
    privacyImpact: "None",
    trustClass: "agent-generated",
    content: "abcd",
    ...overrides,
  };
}

function evaluationRecord(
  id: string,
  overrides: Partial<SkillEvaluationResult> = {},
): SkillEvaluationResult {
  return {
    schemaVersion: "1",
    id,
    skillId: "alpha-name",
    proposalId: "alpha",
    outcome: "passed",
    passed: true,
    contextCost: 1,
    toolSelectionScore: 1,
    capabilityScore: 1,
    securityPass: true,
    details: ["Security checks passed"],
    provenance: {
      runtime: "node-v22",
      provider: "local-evaluator",
      model: "eval-gate-v1",
      environment: "test-harness",
    },
    evaluatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function storeEvaluation(
  fs: ReturnType<typeof createMemoryFileSystem>,
  record: SkillEvaluationResult,
): void {
  fs.files.set(
    `/project/.aif/memory/evaluations/${record.id}.json`,
    `${JSON.stringify(record, null, 2)}\n`,
  );
}

describe("P1H.3c procedural memory extraction", () => {
  it("keeps the sixteen skill names on the package root and adds no skills export key", () => {
    for (const name of skillOperationNames) {
      expect(typeof application[name]).toBe("function");
    }
    expect(updateSkillProposalState.length).toBe(3);
    expect(rollbackSkill.length).toBe(2);
    expect(prepareSkillMutationPlan.length).toBe(1);
    expect(applySkillMutationPlan.length).toBe(2);
    expect(validateSkillExtensionLock.length).toBe(1);
    expect(listProceduralMemorySummary.length).toBe(1);
    expect(inspectProceduralMemory.length).toBe(1);
    expect(rankProceduralMemory.length).toBe(2);
    const packageJson = JSON.parse(
      readFileSync("packages/application/package.json", "utf8"),
    ) as { exports: Record<string, string> };
    expect(Object.keys(packageJson.exports)).toEqual(applicationExportKeys);
    expect(packageJson.exports).not.toHaveProperty("./skills");
    expect(existsSync("packages/application/src/skills/index.ts")).toBe(false);
  });

  it("summarizes proposal counts, pass rate, and extension-lock status without writing", async () => {
    const fs = createMemoryFileSystem();
    expect(await listProceduralMemorySummary({ root: "/project" }, fs)).toEqual(
      {
        totalProposals: 0,
        proposalCountsByState: {},
        totalEvaluations: 0,
        evaluationPassRate: 100,
        activeSkillsCount: 0,
        extensionLockStatus: "unverified",
      },
    );
    expect(fs.files.has("/project/.aif/memory/lock.json")).toBe(false);

    await createSkillProposal(
      proposalInput("approved", { state: "approved" }),
      { root: "/project" },
      fs,
    );
    await createSkillProposal(
      proposalInput("active", { state: "active" }),
      { root: "/project" },
      fs,
    );
    await createSkillProposal(
      proposalInput("proposed"),
      { root: "/project" },
      fs,
    );
    storeEvaluation(
      fs,
      evaluationRecord("pass-one", { proposalId: "approved" }),
    );
    storeEvaluation(
      fs,
      evaluationRecord("fail-one", {
        proposalId: "active",
        outcome: "unsafe",
        passed: false,
        securityPass: false,
      }),
    );
    storeEvaluation(
      fs,
      evaluationRecord("fail-two", {
        proposalId: "proposed",
        outcome: "ambiguous",
        passed: false,
        securityPass: true,
      }),
    );

    const summary = await listProceduralMemorySummary({ root: "/project" }, fs);
    expect(summary.totalProposals).toBe(3);
    expect(summary.proposalCountsByState).toEqual({
      approved: 1,
      active: 1,
      proposed: 1,
    });
    expect(summary.activeSkillsCount).toBe(2);
    expect(summary.totalEvaluations).toBe(3);
    expect(summary.evaluationPassRate).toBe(33);
    expect(summary.extensionLockStatus).toBe("unverified");

    await fs.write(
      "/project/.aif/memory/lock.json",
      JSON.stringify({ ok: true }),
    );
    expect(await validateSkillExtensionLock({ root: "/project" }, fs)).toBe(
      "clean",
    );
    await fs.write("/project/.aif/memory/lock.json", "{");
    expect(await validateSkillExtensionLock({ root: "/project" }, fs)).toBe(
      "corrupted",
    );
    const unreadable: FileSystem = {
      ...fs,
      async read(path) {
        if (path.endsWith("/lock.json")) throw new Error("read failed");
        return fs.read(path);
      },
    };
    expect(
      await validateSkillExtensionLock({ root: "/project" }, unreadable),
    ).toBe("corrupted");
    expect(await validateSkillExtensionLock({ root: "/empty" }, fs)).not.toBe(
      "stale",
    );
  });

  it("reports the existing inspection issues and evaluation match", async () => {
    const fs = createMemoryFileSystem();
    await createSkillProposal(
      proposalInput("newer", {
        state: "active",
        updatedAt: "2026-03-01T00:00:00.000Z",
      }),
      { root: "/project" },
      fs,
    );
    await createSkillProposal(
      proposalInput("older", {
        state: "approved",
        updatedAt: "2026-01-01T00:00:00.000Z",
      }),
      { root: "/project" },
      fs,
    );
    await createSkillProposal(
      proposalInput("draft", {
        state: "proposed",
        updatedAt: "2026-02-01T00:00:00.000Z",
      }),
      { root: "/project" },
      fs,
    );
    storeEvaluation(
      fs,
      evaluationRecord("older-pass", {
        proposalId: "older",
        skillId: "older-name",
        evaluatedAt: "2026-01-01T00:00:00.000Z",
      }),
    );
    storeEvaluation(
      fs,
      evaluationRecord("older-fail", {
        proposalId: "older",
        skillId: "older-name",
        evaluatedAt: "2026-04-01T00:00:00.000Z",
        outcome: "unsafe",
        passed: false,
        securityPass: false,
      }),
    );
    storeEvaluation(
      fs,
      evaluationRecord("id-only", {
        proposalId: "someone-else",
        skillId: "newer",
        evaluatedAt: "2026-05-01T00:00:00.000Z",
      }),
    );

    const before = [...fs.files.keys()];
    const inspection = await inspectProceduralMemory({ root: "/project" }, fs);
    expect([...fs.files.keys()]).toEqual(before);
    expect(inspection.issues).toEqual([
      "Extension lock file .aif/memory/lock.json is missing",
      "Proposal [newer] (newer-name) is active but has no evaluations",
      "Proposal [older] (older-name) is approved but latest evaluation failed",
    ]);

    await fs.write("/project/.aif/memory/lock.json", "{");
    const corrupted = await inspectProceduralMemory({ root: "/project" }, fs);
    expect(corrupted.issues[0]).toBe(
      "Extension lock file .aif/memory/lock.json is corrupted",
    );
  });

  it("keeps rankProceduralMemory on the barrel list imports", async () => {
    const fs = createMemoryFileSystem();
    await createSkillProposal(
      proposalInput("ranked", {
        name: "jwt-verifier",
        observedPattern: "Checks bearer tokens",
        content: "jwt signature",
      }),
      { root: "/project" },
      fs,
    );
    const ranked = await rankProceduralMemory("jwt", { root: "/project" }, fs);
    expect(ranked.items.some((item) => item.id === "ranked")).toBe(true);
    expect(typeof application.getSemanticRankingConfig).toBe("function");
    expect(typeof application.updateSemanticRankingConfig).toBe("function");
  });

  it("keeps the new modules outside the recorded source cycles", () => {
    const importComponents = applicationCycles(false);
    const reexportComponents = applicationCycles(true);
    expect(importComponents.map((component) => component.length)).toEqual([
      3, 3,
    ]);
    expect(reexportComponents.map((component) => component.length)).toEqual([
      4, 29, 3,
    ]);
    expect(importComponents[0]).toEqual([
      "approved-apply-baseline.ts",
      "generated-file-sync-declared.ts",
      "index.ts",
    ]);
    const members = new Set(
      [...importComponents, ...reexportComponents].flat(),
    );
    for (const file of outsideComponents) {
      expect(members.has(file)).toBe(false);
    }

    const mutationSpecs = relativeSpecifiers("skills/skill-mutation.ts", true);
    expect(mutationSpecs).toContain("./skill-proposal-store.js");
    expect(mutationSpecs).toContain("./skill-evaluation.js");
    expect(mutationSpecs).not.toContain("./skill-procedural-memory.js");
    expect(mutationSpecs).not.toContain("../index.js");

    const memorySpecs = relativeSpecifiers(
      "skills/skill-procedural-memory.ts",
      true,
    );
    expect(memorySpecs).toContain("./skill-proposal-store.js");
    expect(memorySpecs).toContain("./skill-evaluation.js");
    expect(memorySpecs).not.toContain("./skill-mutation.js");
    expect(memorySpecs).not.toContain("../index.js");

    const storeSpecs = relativeSpecifiers(
      "skills/skill-proposal-store.ts",
      true,
    );
    expect(storeSpecs).not.toContain("./skill-evaluation.js");
    expect(storeSpecs).not.toContain("./skill-mutation.js");
    const evaluationSpecs = relativeSpecifiers(
      "skills/skill-evaluation.ts",
      true,
    );
    expect(evaluationSpecs).not.toContain("./skill-mutation.js");
    expect(evaluationSpecs).not.toContain("../index.js");

    const indexImports = relativeSpecifiers("index.ts", false);
    expect(indexImports).toContain("./skills/skill-proposal-store.js");
    expect(indexImports).toContain("./skills/skill-evaluation.js");
    expect(indexImports).not.toContain("./skills/skill-mutation.js");
    const indexReexports = relativeSpecifiers("index.ts", true);
    expect(indexReexports).toContain("./skills/skill-mutation.js");
    expect(indexReexports).toContain("./skills/skill-procedural-memory.js");
  });
});
