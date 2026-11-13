import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as application from "@intentloom/application";
import {
  createMemoryFileSystem,
  createSkillProposal,
  evaluateSkillProposal,
  getSkillEvaluation,
  getSkillProposal,
  listSkillEvaluations,
  listSkillProposals,
  rollbackSkill,
  updateSkillProposalState,
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
  "project-path.ts",
  "skill-markdown.ts",
  "skills/skill-progressive-parse.ts",
  "skills/skill-discovery.ts",
  "skills/skill-proposal-store.ts",
  "skills/skill-evaluation.ts",
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

function comparableEvaluation({
  id: _id,
  evaluatedAt: _evaluatedAt,
  ...rest
}: SkillEvaluationResult): Omit<SkillEvaluationResult, "id" | "evaluatedAt"> {
  return rest;
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

describe("P1H.3b skill proposal store and evaluation extraction", () => {
  it("keeps the sixteen skill names on the package root and adds no skills export key", () => {
    for (const name of skillOperationNames) {
      expect(typeof application[name]).toBe("function");
    }
    const packageJson = JSON.parse(
      readFileSync("packages/application/package.json", "utf8"),
    ) as { exports: Record<string, string> };
    expect(Object.keys(packageJson.exports)).toEqual(applicationExportKeys);
    expect(packageJson.exports).not.toHaveProperty("./skills");
    expect(existsSync("packages/application/src/skills/index.ts")).toBe(false);
  });

  it("preserves proposal defaults, optional fields, serialization, and overwrite", async () => {
    const fs = createMemoryFileSystem();
    const created = await createSkillProposal(
      proposalInput("prop-default", {
        licenseNotice: "MIT",
        approvalEvidence: "kept on create",
        previousVersion: "0.9.0",
      }),
      { root: "/project" },
      fs,
    );

    expect(created.state).toBe("proposed");
    expect(created.schemaVersion).toBe("1");
    expect(created.createdAt).toBe(created.updatedAt);
    expect(created.licenseNotice).toBe("MIT");
    expect(created.approvalEvidence).toBe("kept on create");
    expect(created.previousVersion).toBe("0.9.0");
    expect(
      fs.files.get("/project/.aif/memory/proposals/prop-default.json"),
    ).toBe(`${JSON.stringify(created, null, 2)}\n`);

    const approved = await createSkillProposal(
      proposalInput("prop-approved", { state: "approved" }),
      { root: "/project" },
      fs,
    );
    expect(approved.state).toBe("approved");
    expect(await listSkillEvaluations({ root: "/project" }, fs)).toEqual([]);

    const replaced = await createSkillProposal(
      proposalInput("prop-default", { content: "replaced" }),
      { root: "/project" },
      fs,
    );
    expect(replaced.content).toBe("replaced");
    expect(
      (await listSkillProposals({ root: "/project" }, fs)).map(
        (proposal) => proposal.id,
      ),
    ).toEqual(["prop-default", "prop-approved"]);
  });

  it("returns null for missing, corrupt, and invalid proposals and filters the list", async () => {
    const fs = createMemoryFileSystem({
      "/project/.aif/memory/proposals/broken.json": "{",
      "/project/.aif/memory/proposals/invalid.json": JSON.stringify({
        id: "invalid",
      }),
      "/project/.aif/memory/proposals/note.txt": "skip",
      "/project/.aif/other/skip.json": "{}",
    });
    await createSkillProposal(
      proposalInput("older", {
        state: "proposed",
        trustClass: "agent-generated",
        updatedAt: "2026-01-01T00:00:00.000Z",
      }),
      { root: "/project" },
      fs,
    );
    await createSkillProposal(
      proposalInput("newer", {
        state: "approved",
        trustClass: "verified-evidence",
        updatedAt: "2026-03-01T00:00:00.000Z",
      }),
      { root: "/project" },
      fs,
    );
    await createSkillProposal(
      proposalInput("middle", {
        state: "proposed",
        trustClass: "verified-evidence",
        updatedAt: "2026-02-01T00:00:00.000Z",
      }),
      { root: "/project" },
      fs,
    );

    expect(
      await getSkillProposal("missing", { root: "/project" }, fs),
    ).toBeNull();
    expect(
      await getSkillProposal("broken", { root: "/project" }, fs),
    ).toBeNull();
    expect(
      await getSkillProposal("invalid", { root: "/project" }, fs),
    ).toBeNull();
    expect(
      (await listSkillProposals({ root: "/project" }, fs)).map(
        (proposal) => proposal.id,
      ),
    ).toEqual(["newer", "middle", "older"]);
    expect(
      (
        await listSkillProposals({ root: "/project", state: "proposed" }, fs)
      ).map((proposal) => proposal.id),
    ).toEqual(["middle", "older"]);
    expect(
      (
        await listSkillProposals(
          { root: "/project", trustClass: "verified-evidence" },
          fs,
        )
      ).map((proposal) => proposal.id),
    ).toEqual(["newer", "middle"]);

    const relativeFs = {
      ...fs,
      async list(root: string) {
        return (await fs.list(root)).map((path) =>
          path.startsWith(`${root}/`)
            ? path.slice(root.length + 1).replaceAll("/", "\\")
            : path,
        );
      },
    };
    expect(
      (await listSkillProposals({ root: "/project" }, relativeFs)).map(
        (proposal) => proposal.id,
      ),
    ).toEqual(["newer", "middle", "older"]);
  });

  it("rejects a proposal or evaluation id that resolves outside the root", async () => {
    const fs = createMemoryFileSystem();
    const outsideId = "../../../../outside";
    await expect(
      getSkillProposal(outsideId, { root: "/project" }, fs),
    ).rejects.toThrow("path traversal:");
    await expect(
      createSkillProposal(proposalInput(outsideId), { root: "/project" }, fs),
    ).rejects.toThrow("path traversal:");
    await expect(
      getSkillEvaluation(outsideId, { root: "/project" }, fs),
    ).rejects.toThrow("path traversal:");
  });

  it("keeps evaluation heuristics, ignored caseId, and persisted records", async () => {
    const fs = createMemoryFileSystem();
    await createSkillProposal(proposalInput("safe"), { root: "/project" }, fs);
    await createSkillProposal(
      proposalInput("revised", { previousVersion: "0.1.0", content: "abcd" }),
      { root: "/project" },
      fs,
    );
    await createSkillProposal(
      proposalInput("blank", { content: "   " }),
      { root: "/project" },
      fs,
    );
    await createSkillProposal(
      proposalInput("unsafe", { content: "run rm -rf /tmp" }),
      { root: "/project" },
      fs,
    );

    const passed = await evaluateSkillProposal(
      "safe",
      { root: "/project", caseId: "case-ignored" },
      fs,
    );
    expect(passed.outcome).toBe("passed");
    expect(passed.passed).toBe(true);
    expect(passed.securityPass).toBe(true);
    expect(passed.contextCost).toBe(1);
    expect(passed.toolSelectionScore).toBe(1);
    expect(passed.capabilityScore).toBe(1);
    expect(passed.skillId).toBe("safe-name");
    expect(passed.proposalId).toBe("safe");
    expect(passed.details).toEqual([
      "Security checks passed",
      "Execution contract verified",
    ]);
    expect(passed.provenance).toEqual({
      runtime: "node-v22",
      provider: "local-evaluator",
      model: "eval-gate-v1",
      environment: "test-harness",
    });
    expect(passed).not.toHaveProperty("caseId");
    const stored = [...fs.files.entries()].find(([path]) =>
      path.endsWith(`/${passed.id}.json`),
    );
    expect(stored?.[1]).toBe(`${JSON.stringify(passed, null, 2)}\n`);

    const passedAgain = await evaluateSkillProposal(
      "safe",
      { root: "/project" },
      fs,
    );
    expect(comparableEvaluation(passed)).toEqual(
      comparableEvaluation(passedAgain),
    );

    expect(
      (await evaluateSkillProposal("revised", { root: "/project" }, fs))
        .outcome,
    ).toBe("improved");
    const empty = await evaluateSkillProposal(
      "blank",
      { root: "/project" },
      fs,
    );
    expect(empty.outcome).toBe("unsupported");
    expect(empty.passed).toBe(false);
    expect(empty.securityPass).toBe(true);
    expect(empty.details).toEqual(["Proposal content is empty"]);
    const unsafe = await evaluateSkillProposal(
      "unsafe",
      { root: "/project" },
      fs,
    );
    expect(unsafe.outcome).toBe("unsafe");
    expect(unsafe.passed).toBe(false);
    expect(unsafe.securityPass).toBe(false);
    expect(unsafe.toolSelectionScore).toBe(0);
    expect(unsafe.capabilityScore).toBe(0);

    await expect(
      evaluateSkillProposal("missing", { root: "/project" }, fs),
    ).rejects.toThrow("Skill proposal not found: missing");
  });

  it("filters and sorts evaluation records and returns null for bad reads", async () => {
    const older = evaluationRecord("eval-older", {
      evaluatedAt: "2026-01-01T00:00:00.000Z",
      outcome: "passed",
      skillId: "alpha-name",
      proposalId: "alpha",
    });
    const newer = evaluationRecord("eval-newer", {
      evaluatedAt: "2026-02-01T00:00:00.000Z",
      outcome: "improved",
      skillId: "beta-name",
      proposalId: "beta",
    });
    const fs = createMemoryFileSystem({
      "/project/.aif/memory/evaluations/eval-older.json": `${JSON.stringify(older, null, 2)}\n`,
      "/project/.aif/memory/evaluations/eval-newer.json": `${JSON.stringify(newer, null, 2)}\n`,
      "/project/.aif/memory/evaluations/broken.json": "{",
      "/project/.aif/memory/evaluations/invalid.json": JSON.stringify({
        id: "invalid",
      }),
      "/project/.aif/memory/evaluations/note.txt": "skip",
      "/project/.aif/memory/other/skip.json": "{}",
    });

    expect(
      (await listSkillEvaluations({ root: "/project" }, fs)).map(
        (result) => result.id,
      ),
    ).toEqual(["eval-newer", "eval-older"]);
    expect(
      (
        await listSkillEvaluations({ root: "/project", outcome: "passed" }, fs)
      ).map((result) => result.id),
    ).toEqual(["eval-older"]);
    expect(
      (
        await listSkillEvaluations(
          { root: "/project", skillId: "alpha-name" },
          fs,
        )
      ).map((result) => result.id),
    ).toEqual(["eval-older"]);
    expect(
      (
        await listSkillEvaluations({ root: "/project", skillId: "beta" }, fs)
      ).map((result) => result.id),
    ).toEqual(["eval-newer"]);
    expect(
      await getSkillEvaluation("missing", { root: "/project" }, fs),
    ).toBeNull();
    expect(
      await getSkillEvaluation("broken", { root: "/project" }, fs),
    ).toBeNull();
    expect(
      await getSkillEvaluation("invalid", { root: "/project" }, fs),
    ).toBeNull();
    expect(
      (await getSkillEvaluation("eval-newer", { root: "/project" }, fs))
        ?.outcome,
    ).toBe("improved");
  });

  it("keeps the barrel approval gate and rollback behavior", async () => {
    const fs = createMemoryFileSystem();
    await createSkillProposal(proposalInput("gated"), { root: "/project" }, fs);

    await expect(
      updateSkillProposalState(
        "gated",
        "approved",
        { root: "/project", approvalEvidence: "Reviewed" },
        fs,
      ),
    ).rejects.toThrow(
      "Activation blocked: skill proposal gated has no evaluation records",
    );

    await expect(
      updateSkillProposalState("gated", "active", { root: "/project" }, fs),
    ).rejects.toThrow(
      "Transitioning proposal gated to active requires non-empty approvalEvidence",
    );

    const bypassed = await updateSkillProposalState(
      "gated",
      "approved",
      {
        root: "/project",
        approvalEvidence: "Reviewed",
        bypassEvaluationGate: true,
      },
      fs,
    );
    expect(bypassed.state).toBe("approved");

    await createSkillProposal(
      proposalInput("checked"),
      { root: "/project" },
      fs,
    );
    await evaluateSkillProposal("checked", { root: "/project" }, fs);
    const approved = await updateSkillProposalState(
      "checked",
      "approved",
      { root: "/project", approvalEvidence: "Evaluation accepted" },
      fs,
    );
    expect(approved.state).toBe("approved");
    expect(approved.approvalEvidence).toBe("Evaluation accepted");

    const rolledBack = await rollbackSkill("checked", { root: "/project" }, fs);
    expect(rolledBack.state).toBe("rolled-back");
    expect(rolledBack.approvalEvidence).toBe("Evaluation accepted");
  });

  it("keeps proposal and evaluation modules outside the recorded source cycles", () => {
    const importComponents = applicationCycles(false);
    const reexportComponents = applicationCycles(true);
    expect(importComponents.map((component) => component.length)).toEqual([3]);
    expect(reexportComponents.map((component) => component.length)).toEqual([
      4, 27, 3,
    ]);
    expect(importComponents).toEqual([
      [
        "neutron/mutation/apply/neutron-mutation-apply-durable-record.ts",
        "neutron/mutation/apply/neutron-mutation-apply-store.ts",
        "neutron/mutation/verification/neutron-mutation-verification-retry-eligibility.ts",
      ],
    ]);
    expect(reexportComponents[1]).toEqual([
      "approved-apply-engine.ts",
      "bounded-execution-apply.ts",
      "bounded-execution-w11.ts",
      "bounded-execution-workspace-cli.ts",
      "bounded-execution-workspace.ts",
      "engineering-quality-entry.ts",
      "engineering-quality/cli-specialized-packs-external.ts",
      "engineering-quality/index.ts",
      "engineering-quality/specialized-pack-external-apply.ts",
      "engineering-quality/specialized-pack-external-viewmodel.ts",
      "existing-project-adoption-apply-gates.ts",
      "existing-project-adoption-apply-health.ts",
      "existing-project-adoption-apply.ts",
      "existing-project-adoption-approval.ts",
      "existing-project-adoption-decisions.ts",
      "existing-project-adoption-plan.ts",
      "existing-project-adoption-prepared-plan-revalidate.ts",
      "existing-project-adoption-prepared-plan.ts",
      "existing-project-w9.ts",
      "existing-project-workspace-cli.ts",
      "existing-project-workspace.ts",
      "foundation-flow.ts",
      "harness/harness-benchmark-sample.ts",
      "harness/harness-benchmark.ts",
      "harness/harness.ts",
      "inception-flow.ts",
      "index.ts",
    ]);
    const members = new Set(
      [...importComponents, ...reexportComponents].flat(),
    );
    for (const file of outsideComponents) {
      expect(members.has(file)).toBe(false);
    }

    const storeSpecs = relativeSpecifiers(
      "skills/skill-proposal-store.ts",
      true,
    );
    expect(storeSpecs).not.toContain("./skill-evaluation.js");
    expect(storeSpecs).not.toContain("../index.js");
    const evaluationSpecs = relativeSpecifiers(
      "skills/skill-evaluation.ts",
      true,
    );
    expect(evaluationSpecs).toContain("./skill-proposal-store.js");
    expect(evaluationSpecs).not.toContain("../index.js");
    const indexImports = relativeSpecifiers("index.ts", false);
    expect(indexImports).toContain("./skills/skill-proposal-store.js");
    expect(indexImports).toContain("./skills/skill-evaluation.js");
  });
});
