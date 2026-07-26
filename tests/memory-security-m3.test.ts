import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  acceptPersistentMemory,
  createMemoryFileSystem,
  proposePersistentMemory,
  renderPersistentMemoryContext,
  searchPersistentMemory,
} from "@intentloom/application";
import { runCli } from "../packages/cli/src/command.js";
import { validateSemanticRankingConfig } from "@intentloom/protocol";

describe("Memory & Security Candidate M3", () => {
  it("retrieves accepted project memory deterministically and renders portable context", async () => {
    const fs = createMemoryFileSystem();
    const options = { root: "/project", projectId: "p" };
    await proposePersistentMemory(
      {
        id: "decision",
        projectId: "p",
        classification: "accepted-decision",
        content: "Use deterministic local retrieval",
        provenance: "user",
      },
      options,
      fs,
    );
    await acceptPersistentMemory(
      "decision",
      { approvedBy: "maintainer", evidence: "review" },
      options,
      fs,
    );
    const result = await searchPersistentMemory(
      "deterministic retrieval",
      options,
      fs,
    );
    expect(result.items.map((item) => item.id)).toEqual(["decision"]);
    const rendered = await renderPersistentMemoryContext(
      "codex",
      "retrieval",
      options,
      fs,
    );
    expect(rendered.itemIds).toEqual(["decision"]);
    expect(rendered.content).toContain("deterministic local retrieval");
  });

  it("rejects external semantic providers without complete disclosure and approval", () => {
    expect(() =>
      validateSemanticRankingConfig({
        schemaVersion: "1",
        enabled: true,
        provider: "external-provider",
      }),
    ).toThrow("external provider requires");
    expect(
      validateSemanticRankingConfig({
        schemaVersion: "1",
        enabled: true,
        provider: "external-provider",
        model: "embedding-model",
        networkDestination: "https://example.invalid",
        dataScope: "accepted project records",
        retentionPolicy: "no retention",
        externalProviderApproved: true,
      }).externalProviderApproved,
    ).toBe(true);
  });

  it("rebuilds and clears derived index through CLI without deleting memory", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project";
    await proposePersistentMemory(
      {
        id: "decision",
        projectId: "p",
        classification: "working-context",
        content: "local index",
        provenance: "user",
      },
      { root, projectId: "p" },
      fs,
    );
    await acceptPersistentMemory(
      "decision",
      { approvedBy: "maintainer", evidence: "review" },
      { root },
      fs,
    );
    const dependencies = { catalogRoot: resolve("catalog"), fileSystem: fs };
    expect(
      await runCli(
        ["memory", "index", "--root", root, "--project-id", "p"],
        dependencies,
        { stdout: () => undefined, stderr: () => undefined },
      ),
    ).toBe(0);
    expect(await fs.exists(`${root}/.aif/memory/index.json`)).toBe(true);
    expect(
      await runCli(
        ["memory", "index", "--root", root, "--clear"],
        dependencies,
        { stdout: () => undefined, stderr: () => undefined },
      ),
    ).toBe(0);
    expect(await fs.exists(`${root}/.aif/memory/items/decision.json`)).toBe(
      true,
    );
  });
});
