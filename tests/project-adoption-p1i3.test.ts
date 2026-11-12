import { describe, expect, it } from "vitest";
import { deterministicId } from "@intentloom/core/adoption";
import type { AdoptionPlan } from "@intentloom/core/adoption";
import {
  adoptProject,
  applyProjectAdoption,
  createMemoryFileSystem,
  planProjectAdoption,
  type FileSystem,
} from "../packages/application/src/index.js";
import type { TransactionResult } from "../packages/application/src/generated-file/transaction-contracts.js";
import { mapAdoptionTransactionOutcome } from "../packages/application/src/project-adoption/generated-file-adoption-outcome.js";
import {
  ownershipClassForPath,
  roleCandidatesForPath,
} from "../packages/application/src/project-adoption/governance-adoption-artifacts.js";

const options = {
  root: "/project",
  profile: "generic",
  adapters: ["codex"] as const,
};

const agentEntrypoint =
  "# Agent Entrypoint\n\nStart here for repository instructions and workflows.\n";

function failedTransaction(
  diagnostics: readonly string[],
  rollbackFailures: readonly string[] = [],
  postWriteCode?: TransactionResult["postWriteValidation"],
): TransactionResult {
  return {
    changes: [],
    diagnostics,
    status: "failed",
    failedStage: "manifest-finalize",
    rollbackAttempted: true,
    rollbackCompleted: rollbackFailures.length === 0,
    rollbackFailures,
    createdFiles: [],
    updatedFiles: [],
    unchangedFiles: [],
    manifestUpdated: false,
    sourceMapUpdated: false,
    consistencyValidated: false,
    cleanupCompleted: false,
    ...(postWriteCode === undefined
      ? {}
      : { postWriteValidation: postWriteCode }),
  };
}

describe("P1I.3 generated-file adoption behavior", () => {
  it("keeps a dry run from writing and blocks duplicate documents until one is selected", async () => {
    const fs = createMemoryFileSystem({
      "/project/ARCHITECTURE.md": "primary\n",
      "/project/docs/architecture-overview.md": "secondary\n",
    });
    const before = [...fs.files.entries()];
    const blocked = await adoptProject({ ...options, dryRun: true }, fs);
    expect([...fs.files.entries()]).toEqual(before);
    expect(blocked.applicationStatus).toBe("not-requested");
    expect(blocked.applied).toBe(false);
    expect(blocked.transactionOutcome).toBeNull();
    const ambiguous = blocked.items.filter(
      (item) => item.action === "manual-decision-required",
    );
    expect(ambiguous.map((item) => item.path).sort()).toEqual([
      "ARCHITECTURE.md",
      "docs/architecture-overview.md",
    ]);

    const selected = await adoptProject(
      {
        ...options,
        dryRun: true,
        documentationMappings: [
          {
            source: "ARCHITECTURE.md",
            destination: "ARCHITECTURE.md",
          },
        ],
      },
      fs,
    );
    expect(
      selected.items.find((item) => item.path === "ARCHITECTURE.md")?.action,
    ).toBe("map-existing-aif-compatible-document");
    expect(
      selected.items.find(
        (item) => item.path === "docs/architecture-overview.md",
      )?.action,
    ).toBe("skip");
    expect(selected.items.some((item) => item.manualDecisionRequired)).toBe(
      false,
    );
    expect([...fs.files.entries()]).toEqual(before);
  });

  it("sanitizes unsafe transaction diagnostics and drops invalid rollback paths", () => {
    const mapped = mapAdoptionTransactionOutcome(
      failedTransaction(
        [
          "Unsafe diagnostic text",
          "transaction-rollback-incomplete",
          "injected:stage",
        ],
        ["../escape", "AGENTS.md", "/tmp/x", ""],
        {
          status: "invalid",
          code: "source-map-json-malformed",
          affectedPaths: [],
          affectedIdentifiers: [],
        },
      ),
    );
    expect(mapped.applied).toBe(false);
    expect(mapped.applicationStatus).toBe("failed-incomplete");
    expect(mapped.transactionOutcome).toMatchObject({
      status: "failed",
      failedStage: "manifest-finalize",
      errorCode: "source-map-json-malformed",
      rollbackCompleted: false,
      rollbackFailures: ["AGENTS.md"],
      diagnostics: [
        "injected:stage",
        "transaction-failed",
        "transaction-rollback-incomplete",
      ],
    });

    const fallback = mapAdoptionTransactionOutcome(
      failedTransaction(["transaction-rollback-incomplete"]),
    );
    expect(fallback.transactionOutcome.errorCode).toBe("transaction-failed");
    expect(fallback.applicationStatus).toBe("failed-restored");
  });

  it("preserves rollback status through the public adoption write path", async () => {
    const restored = await adoptProject(options, createMemoryFileSystem(), {
      failAt: "manifest-finalize",
    });
    expect(restored.applied).toBe(false);
    expect(restored.applicationStatus).toBe("failed-restored");
    expect(restored.transactionOutcome?.errorCode).toBe(
      "injected:manifest-finalize",
    );

    const incomplete = await adoptProject(options, createMemoryFileSystem(), {
      failAt: "manifest-finalize",
      rollbackFailPaths: [".aif/config.yaml"],
    });
    expect(incomplete.applicationStatus).toBe("failed-incomplete");
    expect(incomplete.transactionOutcome?.rollbackFailures).toContain(
      ".aif/config.yaml",
    );

    const unsafe = await adoptProject(options, createMemoryFileSystem(), {
      corruptAfterFinalization() {
        throw new Error("Unsafe diagnostic text");
      },
    });
    expect(unsafe.transactionOutcome?.diagnostics).toContain(
      "transaction-failed",
    );
    expect(unsafe.transactionOutcome?.diagnostics.join(" ")).not.toContain(
      "Unsafe",
    );
  });
});

describe("P1I.3 governance adoption behavior", () => {
  it("classifies ownership and role candidates in the existing order", () => {
    expect(ownershipClassForPath(".aif/copilot-instructions.md")).toBe(
      "intentloom-managed",
    );
    expect(ownershipClassForPath("CLAUDE.md")).toBe("provider-derivative");
    expect(ownershipClassForPath("README.md")).toBe("project-owned");
    expect(
      roleCandidatesForPath(".cursor/copilot-instructions.md").map(
        (candidate) => candidate.role,
      ),
    ).toEqual([
      "provider-instructions:cursor",
      "provider-instructions:copilot",
    ]);
    expect(
      roleCandidatesForPath("docs/specs/ENGINEERING_PRINCIPLES.md").map(
        (candidate) => ({
          role: candidate.role,
          confidence: candidate.confidence,
          evidence: candidate.evidence,
        }),
      ),
    ).toEqual([
      {
        role: "validation-policy",
        confidence: 0.9,
        evidence: ["filename match: docs/specs/ENGINEERING_PRINCIPLES.md"],
      },
      {
        role: "durable-project-context",
        confidence: 0.8,
        evidence: ["directory pattern: specs"],
      },
    ]);
  });

  it("rejects a symbolic root and skips secret or unreadable files", async () => {
    const fs = createMemoryFileSystem({
      "/project/README.md": "readme",
      "/project/.env": "secret",
      "/project/AGENTS.md": "agents",
    });
    const symbolic: FileSystem = {
      ...fs,
      async isSymbolicLink() {
        return true;
      },
    };
    await expect(
      planProjectAdoption({ root: "/project" }, symbolic),
    ).rejects.toThrow(
      "adoption planning requires a non-symbolic explicit project root",
    );
    expect(fs.files.get("/project/.env")).toBe("secret");

    const unreadable: FileSystem = {
      ...fs,
      async read(path) {
        if (path.endsWith("AGENTS.md")) throw new Error("unreadable");
        return fs.read(path);
      },
    };
    const plan = await planProjectAdoption({ root: "/project" }, unreadable);
    expect(plan.projectId).toBe("project");
    expect(plan.packId).toBe("duty-watch");
    expect(plan.packVersion).toBe("1.0.0");
    const serialized = JSON.stringify(plan);
    expect(serialized).not.toContain(".env");
    expect(serialized).not.toContain("secret");
    expect(plan.mappings.some((mapping) => mapping.path === "AGENTS.md")).toBe(
      false,
    );
    const again = await planProjectAdoption({ root: "/project" }, unreadable);
    expect(again.repositoryHash).toBe(plan.repositoryHash);
    expect(again.planId).toBe(plan.planId);
  });

  it("checks schema, hashes, dry-run, journal identity, and best-effort rollback", async () => {
    const fs = createMemoryFileSystem({
      "/project/CURRENT_STATE.md": "current status",
    });
    const plan = await planProjectAdoption({ root: "/project" }, fs);
    const symbolic: FileSystem = {
      ...fs,
      async isSymbolicLink() {
        return true;
      },
    };
    await expect(
      applyProjectAdoption({ root: "/project", plan }, symbolic),
    ).rejects.toThrow(
      "adoption apply requires a non-symbolic explicit project root",
    );
    await expect(
      applyProjectAdoption(
        {
          root: "/project",
          plan: { ...plan, schemaVersion: 2 } as unknown as AdoptionPlan,
        },
        fs,
      ),
    ).rejects.toThrow("unsupported adoption plan schema version");
    expect(fs.files.has("/project/AGENT_START_HERE.md")).toBe(false);

    fs.files.set("/project/CURRENT_STATE.md", "changed");
    const stale = await applyProjectAdoption({ root: "/project", plan }, fs);
    expect(stale.status).toBe("stale-hash");
    expect(stale.appliedOperations).toEqual([]);
    expect(fs.files.has("/project/AGENT_START_HERE.md")).toBe(false);
    fs.files.set("/project/CURRENT_STATE.md", "current status");

    const before = new Map(fs.files);
    const dry = await applyProjectAdoption(
      { root: "/project", plan, dryRun: true },
      fs,
    );
    expect(dry).toMatchObject({
      status: "no-op",
      appliedOperations: plan.operations.map((operation) => operation.id),
      createdFiles: [],
      updatedFiles: [],
    });
    expect(fs.files).toEqual(before);

    const applied = await applyProjectAdoption({ root: "/project", plan }, fs);
    expect(applied.status).toBe("success");
    expect(fs.files.get("/project/AGENT_START_HERE.md")).toBe(agentEntrypoint);
    const journalPath = "/project/.aif/migration-journal.json";
    const journalText = fs.files.get(journalPath);
    expect(journalText).toBeTypeOf("string");
    const journal = JSON.parse(journalText ?? "[]") as {
      id: string;
      status: string;
      operationIds: string[];
    }[];
    expect(journal).toHaveLength(1);
    expect(journal[0]?.status).toBe("applied");
    expect(journal[0]?.operationIds).toEqual(applied.appliedOperations);
    expect(journal[0]?.id).toBe(
      deterministicId("journal", {
        planId: plan.planId,
        timestamp: applied.appliedOperations.join(","),
      }),
    );
    expect(journalText).toBe(JSON.stringify(journal, null, 2));
    expect(applied.journalEntryId).toBe(journal[0]?.id);

    const failing = createMemoryFileSystem({ "/project/README.md": "readme" });
    const failingPlan = await planProjectAdoption(
      { root: "/project" },
      failing,
    );
    const broken: FileSystem = {
      ...failing,
      async write(path, content) {
        if (path.endsWith("migration-journal.json"))
          throw new Error("journal failed");
        return failing.write(path, content);
      },
      async remove() {
        throw new Error("restore failed");
      },
    };
    const rolled = await applyProjectAdoption(
      { root: "/project", plan: failingPlan },
      broken,
    );
    expect(rolled).toMatchObject({
      status: "rolled-back",
      error: "journal failed",
      appliedOperations: [],
      createdFiles: [],
      updatedFiles: [],
    });
    expect(failing.files.get("/project/AGENT_START_HERE.md")).toBe(
      agentEntrypoint,
    );
  });
});
