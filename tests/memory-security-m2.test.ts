import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  acceptPersistentMemory,
  createMemoryFileSystem,
  exportPersistentMemory,
  forgetPersistentMemory,
  getPersistentMemoryItem,
  importPersistentMemory,
  proposePersistentMemory,
  supersedePersistentMemory,
} from "@intentloom/application";
import { validatePersistentMemoryItem } from "@intentloom/protocol";
import { runCli } from "../packages/cli/src/command.js";

describe("Memory & Security Candidate M2: Accepted persistent memory", () => {
  it("requires approval evidence before an item can be accepted", async () => {
    const fs = createMemoryFileSystem();
    const options = { root: "/project" };
    const proposed = await proposePersistentMemory(
      {
        id: "decision-1",
        projectId: "intentloom",
        classification: "accepted-decision",
        content: "Use explicit approvals. API_KEY=not-for-context",
        provenance: "agent:review",
      },
      options,
      fs,
    );
    expect(proposed.lifecycleState).toBe("proposed");
    expect(proposed.content).toContain("[REDACTED]");
    await expect(
      acceptPersistentMemory(
        "decision-1",
        { approvedBy: "maintainer", evidence: "" },
        options,
        fs,
      ),
    ).rejects.toThrow("approval.evidence must be a non-empty string");
    const accepted = await acceptPersistentMemory(
      "decision-1",
      { approvedBy: "maintainer", evidence: "ADR-0024" },
      options,
      fs,
    );
    expect(accepted.lifecycleState).toBe("accepted");
    expect(accepted.approval?.evidence).toBe("ADR-0024");
  });

  it("retains supersession and forget audit state", async () => {
    const fs = createMemoryFileSystem();
    const options = { root: "/project" };
    await proposePersistentMemory(
      {
        id: "old",
        projectId: "p",
        classification: "accepted-decision",
        content: "old",
        provenance: "user",
      },
      options,
      fs,
    );
    const old = await acceptPersistentMemory(
      "old",
      { approvedBy: "u", evidence: "review" },
      options,
      fs,
    );
    const replacement = validatePersistentMemoryItem({
      ...old,
      id: "new",
      content: "new",
      lifecycleState: "accepted",
      supersedesId: undefined,
      audit: ["proposed", "accepted"],
      updatedAt: new Date().toISOString(),
    });
    await supersedePersistentMemory("old", replacement, options, fs);
    expect(
      (await getPersistentMemoryItem("old", options, fs))?.lifecycleState,
    ).toBe("superseded");
    const forgotten = await forgetPersistentMemory("new", options, fs);
    expect(forgotten.lifecycleState).toBe("deleted");
    expect(forgotten.content).toBe("[REDACTED]");
  });

  it("exports project-scoped memory and imports it only as a proposal", async () => {
    const fs = createMemoryFileSystem();
    const options = { root: "/project" };
    await proposePersistentMemory(
      {
        id: "item",
        projectId: "p",
        classification: "working-context",
        content: "bounded",
        provenance: "agent",
      },
      options,
      fs,
    );
    const bundle = await exportPersistentMemory(
      { root: "/project", projectId: "p" },
      fs,
    );
    await expect(
      importPersistentMemory(
        bundle,
        { root: "/other", projectId: "other" },
        fs,
      ),
    ).rejects.toThrow("identity mismatch");
    const imported = await importPersistentMemory(
      bundle,
      { root: "/other", projectId: "p" },
      fs,
    );
    expect(imported[0]?.id).toBe("import-item");
    expect(imported[0]?.lifecycleState).toBe("proposed");
  });

  it("rolls back an import batch when a later record is ineligible", async () => {
    const fs = createMemoryFileSystem();
    const bundle = {
      schemaVersion: "1",
      projectId: "p",
      exportedAt: new Date().toISOString(),
      items: [
        {
          schemaVersion: "1",
          id: "valid",
          projectId: "p",
          classification: "working-context",
          lifecycleState: "proposed",
          trustClass: "agent-generated",
          content: "valid",
          provenance: "export",
          retentionState: "active",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          audit: ["proposed"],
        },
        {
          schemaVersion: "1",
          id: "forbidden",
          projectId: "p",
          classification: "canonical-intent",
          lifecycleState: "proposed",
          trustClass: "canonical-policy",
          content: "must not import",
          provenance: "export",
          retentionState: "active",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          audit: ["proposed"],
        },
      ],
    };
    await expect(
      importPersistentMemory(bundle, { root: "/target", projectId: "p" }, fs),
    ).rejects.toThrow("canonical sources");
    expect(
      await getPersistentMemoryItem("import-valid", { root: "/target" }, fs),
    ).toBeUndefined();
  });

  it("routes proposal and explicit acceptance through the CLI", async () => {
    const fs = createMemoryFileSystem();
    const root = "/cli-project";
    const output: string[] = [];
    const input = JSON.stringify({
      id: "cli-item",
      projectId: "p",
      classification: "working-context",
      content: "work",
      provenance: "cli",
    });
    expect(
      await runCli(
        ["memory", "propose", "--root", root, "--json-input", input, "--json"],
        { catalogRoot: resolve("catalog"), fileSystem: fs },
        { stdout: (line) => output.push(line), stderr: () => undefined },
      ),
    ).toBe(0);
    output.length = 0;
    expect(
      await runCli(
        [
          "memory",
          "accept",
          "--root",
          root,
          "--id",
          "cli-item",
          "--approved-by",
          "maintainer",
          "--evidence",
          "review",
          "--json",
        ],
        { catalogRoot: resolve("catalog"), fileSystem: fs },
        { stdout: (line) => output.push(line), stderr: () => undefined },
      ),
    ).toBe(0);
    expect(JSON.parse(output.join("\n")).lifecycleState).toBe("accepted");
  });
});
