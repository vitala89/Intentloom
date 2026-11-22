import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as application from "@intentloom/application";
import {
  createMemoryFileSystem,
  createSkillProposal,
  getSemanticRankingConfig,
  rankProceduralMemory,
  updateSemanticRankingConfig,
  type FileSystem,
} from "@intentloom/application";
import {
  validateSkillEvaluationResult,
  type SkillEvaluationResult,
} from "@intentloom/protocol";
import { runCli } from "../packages/cli/src/command.js";

function fileSystem(overrides: Partial<FileSystem>): FileSystem {
  return {
    async exists() {
      return false;
    },
    async read() {
      throw new Error("read failed");
    },
    async write() {},
    async mkdir() {},
    async remove() {},
    async list() {
      return [];
    },
    async realpath(path) {
      return path;
    },
    async isSymbolicLink() {
      return false;
    },
    ...overrides,
  };
}

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
    content: "neutral body",
    ...overrides,
  };
}

function storeEvaluation(
  fs: ReturnType<typeof createMemoryFileSystem>,
  record: SkillEvaluationResult,
  root = "/project",
): void {
  fs.files.set(
    `${root}/.aif/memory/evaluations/${record.id}.json`,
    `${JSON.stringify(record, null, 2)}\n`,
  );
}

function evaluationRecord(
  id: string,
  overrides: Partial<SkillEvaluationResult> = {},
): SkillEvaluationResult {
  return validateSkillEvaluationResult({
    schemaVersion: "1",
    id,
    skillId: "alpha-skill",
    proposalId: "alpha",
    outcome: "passed",
    passed: true,
    contextCost: 1,
    toolSelectionScore: 1,
    capabilityScore: 1,
    securityPass: true,
    details: ["checks passed"],
    provenance: {
      runtime: "node-v22",
      provider: "local-evaluator",
      model: "eval-gate-v1",
      environment: "test-harness",
    },
    evaluatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  });
}

describe("P1K.5 semantic ranking behavior", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the default configuration when semantic_config.json is missing", async () => {
    const fs = createMemoryFileSystem();
    await expect(
      getSemanticRankingConfig({ root: "/project" }, fs),
    ).resolves.toEqual({
      schemaVersion: "1",
      enabled: false,
      provider: "local-tf-idf",
    });
  });

  it("falls back to defaults for malformed or invalid configuration", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project/p1k5-config";
    const configPath = `${root}/.aif/memory/semantic_config.json`;
    fs.files.set(configPath, "{");
    await expect(getSemanticRankingConfig({ root }, fs)).resolves.toEqual({
      schemaVersion: "1",
      enabled: false,
      provider: "local-tf-idf",
    });
    fs.files.set(configPath, JSON.stringify({ schemaVersion: "9" }));
    await expect(getSemanticRankingConfig({ root }, fs)).resolves.toEqual({
      schemaVersion: "1",
      enabled: false,
      provider: "local-tf-idf",
    });
  });

  it("falls back on read failures but propagates exists failures outside the catch", async () => {
    const failingRead = fileSystem({
      async exists() {
        return true;
      },
    });
    await expect(
      getSemanticRankingConfig({ root: "/project" }, failingRead),
    ).resolves.toEqual({
      schemaVersion: "1",
      enabled: false,
      provider: "local-tf-idf",
    });

    const failingExists = fileSystem({
      async exists() {
        throw new Error("exists failed");
      },
    });
    await expect(
      getSemanticRankingConfig({ root: "/project" }, failingExists),
    ).rejects.toThrow("exists failed");
  });

  it("persists validated config JSON with two-space indentation and trailing newline", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project/p1k5-write";
    const updated = await updateSemanticRankingConfig(
      { schemaVersion: "1", enabled: true, provider: "local-embeddings" },
      { root },
      fs,
    );
    const path = `${root}/.aif/memory/semantic_config.json`;
    expect(updated.enabled).toBe(true);
    expect(fs.files.get(path)).toBe(
      `${JSON.stringify(
        {
          schemaVersion: "1",
          enabled: true,
          provider: "local-embeddings",
        },
        null,
        2,
      )}\n`,
    );
  });

  it("creates the config parent directory only when absent and rejects invalid writes", async () => {
    let mkdirCount = 0;
    const directories = new Set<string>();
    const fs = fileSystem({
      async exists(path) {
        return directories.has(path);
      },
      async mkdir(path) {
        directories.add(path);
        mkdirCount += 1;
      },
      async write() {},
    });
    await updateSemanticRankingConfig(
      { schemaVersion: "1", enabled: false, provider: "local-tf-idf" },
      { root: "/project" },
      fs,
    );
    await updateSemanticRankingConfig(
      { schemaVersion: "1", enabled: true, provider: "local-tf-idf" },
      { root: "/project" },
      fs,
    );
    expect(mkdirCount).toBe(1);
    await expect(
      updateSemanticRankingConfig(
        { schemaVersion: "9" },
        { root: "/project" },
        fs,
      ),
    ).rejects.toThrow("unsupported semantic ranking config schema version");
  });

  it("honors provider and enabled overrides and still ranks when config is disabled", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project/p1k5-disabled";
    await createSkillProposal(
      proposalInput("p-disabled", {
        name: "jwt-helper",
        observedPattern: "jwt",
        content: "token",
      }),
      { root },
      fs,
    );
    await updateSemanticRankingConfig(
      { schemaVersion: "1", enabled: false, provider: "local-tf-idf" },
      { root },
      fs,
    );
    const ranked = await rankProceduralMemory("jwt", { root }, fs);
    expect(ranked.enabled).toBe(false);
    expect(ranked.provider).toBe("local-tf-idf");
    expect(ranked.items.length).toBeGreaterThan(0);

    const disabled = await rankProceduralMemory(
      "jwt",
      {
        root,
        enabled: false,
        provider: "local-embeddings",
      },
      fs,
    );
    expect(disabled.enabled).toBe(false);
    expect(disabled.provider).toBe("local-embeddings");
    expect(disabled.items.length).toBeGreaterThan(0);
  });

  it("scores one proposal term at 0.5 and caps the total at 1.0", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project/p1k5-proposal-score";
    await createSkillProposal(
      proposalInput("prop-a", {
        name: "alpha",
        observedPattern: "jwt token alpha",
        content: "jwt jwt jwt jwt",
      }),
      { root },
      fs,
    );
    const oneTerm = await rankProceduralMemory("jwt", { root }, fs);
    expect(oneTerm.items[0]).toMatchObject({
      type: "proposal",
      score: 0.5,
      relevanceReason: "Matched terms in proposal alpha",
      record: {
        id: "prop-a",
        name: "alpha",
        state: "proposed",
        confidence: 0.8,
      },
    });
    const repeated = await rankProceduralMemory(
      "jwt jwt jwt jwt",
      { root },
      fs,
    );
    expect(repeated.items[0]!.score).toBe(1);
  });

  it("scores one evaluation term at 0.4 and caps the total at 1.0", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project/p1k5-evaluation-score";
    storeEvaluation(
      fs,
      evaluationRecord("eval-a", {
        skillId: "beta-skill",
        outcome: "improved",
        details: ["beta regression beta"],
      }),
      root,
    );
    const oneTerm = await rankProceduralMemory("beta", { root }, fs);
    expect(oneTerm.items[0]).toMatchObject({
      type: "evidence",
      score: 0.4,
      relevanceReason: "Matched evaluation outcome improved for beta-skill",
      record: {
        id: "eval-a",
        skillId: "beta-skill",
        outcome: "improved",
        passed: true,
      },
    });
    const repeated = await rankProceduralMemory(
      "beta beta beta beta",
      { root },
      fs,
    );
    expect(repeated.items[0]!.score).toBe(1);
  });

  it("normalizes whitespace and lowercases case-insensitive substring matches", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project/p1k5-normalize";
    await createSkillProposal(
      proposalInput("case-prop", {
        name: "Auth-JWT",
        observedPattern: "Bearer",
        content: "signature",
      }),
      { root },
      fs,
    );
    const ranked = await rankProceduralMemory("  JWT   bearer  ", { root }, fs);
    expect(ranked.items[0]!.score).toBe(1);
  });

  it("returns an empty item list when nothing matches", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project/p1k5-empty";
    await createSkillProposal(
      proposalInput("none", { content: "xyz" }),
      {
        root,
      },
      fs,
    );
    storeEvaluation(
      fs,
      evaluationRecord("eval-none", { details: ["abc"] }),
      root,
    );
    const ranked = await rankProceduralMemory("missing", { root }, fs);
    expect(ranked.items).toEqual([]);
    expect(ranked.query).toBe("missing");
  });

  it("ranks mixed proposals and evaluations with proposals preceding equal scores", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project/p1k5-mixed";
    await createSkillProposal(
      proposalInput("first", {
        name: "shared",
        observedPattern: "term",
        content: "body",
        updatedAt: "2026-03-02T00:00:00.000Z",
        createdAt: "2026-03-02T00:00:00.000Z",
      }),
      { root },
      fs,
    );
    await createSkillProposal(
      proposalInput("second", {
        name: "shared-two",
        observedPattern: "term",
        content: "body",
        updatedAt: "2026-03-01T00:00:00.000Z",
        createdAt: "2026-03-01T00:00:00.000Z",
      }),
      { root },
      fs,
    );
    storeEvaluation(
      fs,
      evaluationRecord("eval-one", {
        skillId: "shared",
        outcome: "passed",
        details: ["term matched"],
        evaluatedAt: "2026-02-01T00:00:00.000Z",
      }),
      root,
    );
    const ranked = await rankProceduralMemory("term", { root }, fs);
    expect(ranked.items.map((item) => item.id)).toEqual([
      "first",
      "second",
      "eval-one",
    ]);
    expect(ranked.items[0]!.score).toBe(0.5);
    expect(ranked.items[1]!.score).toBe(0.5);
    expect(ranked.items[2]!.score).toBe(0.4);
  });

  it("applies maxResults default, zero, and positive limits without clamping", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project/p1k5-max";
    for (let index = 0; index < 12; index += 1) {
      await createSkillProposal(
        proposalInput(`p-${index}`, {
          name: `skill-${index}`,
          observedPattern: "needle",
          content: `value-${index}`,
        }),
        { root },
        fs,
      );
    }
    const defaults = await rankProceduralMemory("needle", { root }, fs);
    expect(defaults.items).toHaveLength(10);
    const zero = await rankProceduralMemory(
      "needle",
      { root, maxResults: 0 },
      fs,
    );
    expect(zero.items).toEqual([]);
    const three = await rankProceduralMemory(
      "needle",
      { root, maxResults: 3 },
      fs,
    );
    expect(three.items).toHaveLength(3);
  });

  it("records ranking latency using the current wall-clock delta", async () => {
    let calls = 0;
    vi.spyOn(Date, "now").mockImplementation(() => {
      calls += 1;
      if (calls === 1) return 1_700_000_000_000;
      if (calls === 2) return 1_700_000_000_150;
      return 1_700_000_000_250;
    });
    const fs = createMemoryFileSystem();
    const root = "/project/p1k5-latency";
    await createSkillProposal(
      proposalInput("latency", { name: "jwt", content: "jwt" }),
      { root },
      fs,
    );
    const ranked = await rankProceduralMemory("jwt", { root }, fs);
    expect(ranked.rankingLatencyMs).toBe(150);
  });

  it("keeps the public API and CLI rank commands compatible", async () => {
    const leaf =
      await import("../packages/application/src/memory/semantic-ranking.ts");
    expect(application.getSemanticRankingConfig).toBe(
      leaf.getSemanticRankingConfig,
    );
    expect(application.updateSemanticRankingConfig).toBe(
      leaf.updateSemanticRankingConfig,
    );
    expect(application.rankProceduralMemory).toBe(leaf.rankProceduralMemory);

    const fs = createMemoryFileSystem();
    const root = "/project/p1k5-cli";
    await createSkillProposal(
      proposalInput("cli-prop", {
        name: "jwt-cli",
        content: "jwt validation",
      }),
      { root },
      fs,
    );
    const output: string[] = [];
    const exit = await runCli(
      ["rank", "jwt", "--root", root, "--json"],
      { catalogRoot: resolve("catalog"), fileSystem: fs },
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );
    expect(exit).toBe(0);
    const payload = JSON.parse(output.join("\n"));
    expect(payload.items[0]).toMatchObject({
      id: "cli-prop",
      type: "proposal",
      score: 0.5,
    });
  });
});
