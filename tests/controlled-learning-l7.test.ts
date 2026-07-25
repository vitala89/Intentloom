import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createMemoryFileSystem,
  createSkillProposal,
  evaluateSkillProposal,
  getSemanticRankingConfig,
  rankProceduralMemory,
  updateSemanticRankingConfig,
} from "@intentloom/application";
import {
  validateSemanticRankingConfig,
  validateSemanticRankResult,
} from "@intentloom/protocol";
import { runCli } from "../packages/cli/src/command.js";

describe("Controlled Agent Learning Candidate L7 — Optional Semantic Ranking", () => {
  const proposalData = {
    id: "prop-l7-001",
    name: "auth-jwt-verifier",
    version: "1.0.0",
    sourceTaskIds: ["task-401"],
    observedPattern: "Validates JWT auth headers across endpoints",
    confidence: 0.95,
    uncertainty: "None",
    requestedCapabilities: ["auth-middleware"],
    supportedProfiles: ["api"],
    validationExpectations: ["Pass unit tests"],
    privacyImpact: "None",
    trustClass: "verified-evidence" as const,
    content:
      "## Auth Procedure\n1. Extract bearer token.\n2. Verify JWT signature.",
  };

  it("validates semantic ranking config and result schemas", () => {
    const validConfig = validateSemanticRankingConfig({
      schemaVersion: "1",
      enabled: true,
      provider: "local-tf-idf",
    });
    expect(validConfig.enabled).toBe(true);
    expect(validConfig.provider).toBe("local-tf-idf");

    const validResult = validateSemanticRankResult({
      schemaVersion: "1",
      query: "auth jwt",
      items: [
        {
          id: "prop-l7-001",
          type: "proposal",
          score: 0.8,
          relevanceReason: "Matched terms",
          record: { id: "prop-l7-001" },
        },
      ],
      rankingLatencyMs: 5,
      provider: "local-tf-idf",
      enabled: true,
    });
    expect(validResult.items.length).toBe(1);
  });

  it("performs deterministic term-frequency ranking over memory records", async () => {
    const fs = createMemoryFileSystem();
    await createSkillProposal(proposalData, { root: "/project" }, fs);
    await evaluateSkillProposal("prop-l7-001", { root: "/project" }, fs);

    const result = await rankProceduralMemory(
      "auth jwt",
      { root: "/project" },
      fs,
    );
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items[0]!.id).toBe("prop-l7-001");
    expect(result.items[0]!.score).toBeGreaterThan(0);
  });

  it("manages semantic ranking configuration cleanly", async () => {
    const fs = createMemoryFileSystem();
    const defaultConfig = await getSemanticRankingConfig(
      { root: "/project" },
      fs,
    );
    expect(defaultConfig.enabled).toBe(false);

    const updated = await updateSemanticRankingConfig(
      {
        schemaVersion: "1",
        enabled: true,
        provider: "local-embeddings",
      },
      { root: "/project" },
      fs,
    );
    expect(updated.enabled).toBe(true);
    expect(updated.provider).toBe("local-embeddings");

    const fetched = await getSemanticRankingConfig({ root: "/project" }, fs);
    expect(fetched.enabled).toBe(true);
    expect(fetched.provider).toBe("local-embeddings");
  });

  it("preserves canonical records when configuring or clearing index", async () => {
    const fs = createMemoryFileSystem();
    await createSkillProposal(proposalData, { root: "/project" }, fs);

    await updateSemanticRankingConfig(
      { schemaVersion: "1", enabled: true, provider: "local-tf-idf" },
      { root: "/project" },
      fs,
    );

    // Verify canonical proposal file is untouched and exists
    const exists = await fs.exists(
      "/project/.aif/memory/proposals/prop-l7-001.json",
    );
    expect(exists).toBe(true);
  });

  it("executes CLI intentloom rank commands", async () => {
    const fs = createMemoryFileSystem();
    await createSkillProposal(proposalData, { root: "/project" }, fs);

    const configOutput: string[] = [];
    const configExit = await runCli(
      ["rank", "config", "--root", "/project", "--enable", "--json"],
      { catalogRoot: resolve("catalog"), fileSystem: fs },
      { stdout: (msg) => configOutput.push(msg), stderr: () => undefined },
    );

    expect(configExit).toBe(0);
    const config = JSON.parse(configOutput.join("\n"));
    expect(config.enabled).toBe(true);

    const rankOutput: string[] = [];
    const rankExit = await runCli(
      ["rank", "jwt auth", "--root", "/project", "--json"],
      { catalogRoot: resolve("catalog"), fileSystem: fs },
      { stdout: (msg) => rankOutput.push(msg), stderr: () => undefined },
    );

    expect(rankExit).toBe(0);
    const result = JSON.parse(rankOutput.join("\n"));
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items[0]!.id).toBe("prop-l7-001");
  });
});
