import { describe, expect, it } from "vitest";
import {
  createMemoryFileSystem,
  type FileSystem,
} from "@intentloom/application";
import {
  assembleNeutronContext,
  N3_DEFAULT_MAX_ITEMS,
  N3_DEFAULT_MAX_TOKENS,
  N3_DEFAULT_SKILL_LEVEL,
  N3_WARNING_BUDGET,
  N3_WARNING_EMPTY_CONTEXT,
  N3_WARNING_EMPTY_SKILLS,
  N3_WARNING_SEMANTIC,
} from "../packages/application/src/neutron-context-assembly.js";
import { NEUTRON_CONTEXT_ASSEMBLY_REQUEST_SCHEMA_URN } from "../packages/protocol/src/neutron-runtime.js";
import {
  validateNeutronContextBundle,
  validateNeutronUsageBudget,
} from "../packages/validator/src/neutron-runtime.js";

const REVIEW_SKILL = `---
name: sample-code-review
version: 1.2.0
description: Perform automated code review on bounded diffs
packs:
  - frontend
roles:
  - reviewer
trustClass: canonical-policy
capabilities:
  - code-analysis
---

# sample-code-review

## Procedure

1. Read diff.
`;

const DEPLOY_SKILL = `---
name: sample-deploy-helper
version: 2.0.0
description: Manage infrastructure and deployment tasks
packs:
  - devops
roles:
  - devops-engineer
trustClass: verified-evidence
capabilities:
  - deployment
---

# sample-deploy-helper

## Procedure

1. Validate configuration.
`;

function fixtureFiles(
  order: "policy-first" | "docs-first",
): Record<string, string> {
  const files: Record<string, string> = {
    "/project/docs/specs/SPEC.md": "# Intent\nCanonical policy for assembly.\n",
    "/project/docs/decisions/ADR-0001.md":
      "# ADR-0001\nArchitecture decision.\n",
    "/project/PROJECT_STATE.md": "# Project state\nOwnership record.\n",
    "/project/DUTY_WATCH.md": "# Duty watch\nCurrent watch status.\n",
    "/project/docs/guide.md": "# Guide\nBounded documentation.\n",
    "/project/.aif/memory/summary.json":
      '{"schemaVersion":"1","id":"task-1"}\n',
    "/project/catalog/skills/sample-code-review/SKILL.md": REVIEW_SKILL,
    "/project/catalog/skills/sample-deploy-helper/SKILL.md": DEPLOY_SKILL,
    "/project/.env": "SECRET_KEY=supersecret12345\n",
    "/project/credentials.json": '{"api_key":"secret_api_key_abc"}\n',
  };
  if (order === "docs-first") {
    return {
      "/project/docs/guide.md": files["/project/docs/guide.md"]!,
      "/project/.aif/memory/summary.json":
        files["/project/.aif/memory/summary.json"]!,
      "/project/catalog/skills/sample-deploy-helper/SKILL.md": DEPLOY_SKILL,
      "/project/DUTY_WATCH.md": files["/project/DUTY_WATCH.md"]!,
      "/project/.env": files["/project/.env"]!,
      "/project/docs/specs/SPEC.md": files["/project/docs/specs/SPEC.md"]!,
      "/project/PROJECT_STATE.md": files["/project/PROJECT_STATE.md"]!,
      "/project/catalog/skills/sample-code-review/SKILL.md": REVIEW_SKILL,
      "/project/docs/decisions/ADR-0001.md":
        files["/project/docs/decisions/ADR-0001.md"]!,
      "/project/credentials.json": files["/project/credentials.json"]!,
    };
  }
  return files;
}

function request(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    schemaVersion: NEUTRON_CONTEXT_ASSEMBLY_REQUEST_SCHEMA_URN,
    root: "/project",
    sessionId: "neutron-session-n3-1",
    projectId: "proj-n3-1",
    ...overrides,
  };
}

function snapshotFiles(
  fs: FileSystem & { files: Map<string, string> },
): string {
  return JSON.stringify(
    [...fs.files.entries()].toSorted(([left], [right]) =>
      left < right ? -1 : left > right ? 1 : 0,
    ),
  );
}

function guardWrites(
  inner: FileSystem & { files: Map<string, string> },
): FileSystem & { files: Map<string, string>; writeCount: number } {
  let writeCount = 0;
  return {
    files: inner.files,
    get writeCount() {
      return writeCount;
    },
    exists: (path) => inner.exists(path),
    read: (path) => inner.read(path),
    list: (path) => inner.list(path),
    realpath: (path) => inner.realpath(path),
    isSymbolicLink: (path) => inner.isSymbolicLink(path),
    async write() {
      writeCount += 1;
      throw new Error("write forbidden");
    },
    async mkdir() {
      writeCount += 1;
      throw new Error("mkdir forbidden");
    },
    async remove() {
      writeCount += 1;
      throw new Error("remove forbidden");
    },
  };
}

describe("Neutron N3 Slice 2 context assembly", () => {
  it("assembles a deterministic validated bundle from policy, ownership, skills, and docs", async () => {
    const fs = createMemoryFileSystem(fixtureFiles("policy-first"));
    const result = await assembleNeutronContext(request(), { fs });
    validateNeutronContextBundle(result.bundle);
    validateNeutronUsageBudget(result.usage);
    expect(result.usage.tokenBudget).toBe(N3_DEFAULT_MAX_TOKENS);
    expect(result.usage.inputTokens).toBe(0);
    expect(result.usage.outputTokens).toBe(0);
    expect(result.bundle.estimatedTokens).toBe(result.usage.contextTokens);
    expect(result.bundle.estimatedTokens).toBeLessThanOrEqual(
      N3_DEFAULT_MAX_TOKENS,
    );
    const included = result.bundle.sources.filter((source) => source.included);
    expect(included.length).toBeGreaterThan(0);
    expect(included.length).toBeLessThanOrEqual(N3_DEFAULT_MAX_ITEMS);
    expect(included.some((source) => source.kind === "policy")).toBe(true);
    expect(included.some((source) => source.kind === "skill")).toBe(true);
    expect(
      included.some(
        (source) =>
          source.path === "PROJECT_STATE.md" || source.path === "DUTY_WATCH.md",
      ),
    ).toBe(true);
    expect(
      included.some(
        (source) =>
          source.kind === "inspect" || source.path === "docs/guide.md",
      ),
    ).toBe(true);
    const skillSources = included.filter((item) => item.kind === "skill");
    expect(
      skillSources.every(
        (source) =>
          source.loadingLevel === N3_DEFAULT_SKILL_LEVEL &&
          source.trustClass === "catalog",
      ),
    ).toBe(true);
    const paths = result.bundle.sources
      .map((source) => source.path)
      .filter((path): path is string => path !== undefined);
    const digests = result.bundle.sources
      .map((source) => source.contentDigest)
      .filter((digest): digest is string => digest !== undefined);
    expect(paths.every((path) => !/^[/\\]/u.test(path))).toBe(true);
    expect(paths.every((path) => !/^[A-Za-z]:/u.test(path))).toBe(true);
    expect(
      digests.every((digest) => /^sha256:[a-f0-9]{64}$/u.test(digest)),
    ).toBe(true);
  });

  it("returns deep-equal results across filesystem insertion order", async () => {
    const first = await assembleNeutronContext(request(), {
      fs: createMemoryFileSystem(fixtureFiles("policy-first")),
    });
    const second = await assembleNeutronContext(request(), {
      fs: createMemoryFileSystem(fixtureFiles("docs-first")),
    });
    expect(first.bundle).toEqual(second.bundle);
    expect(first.usage).toEqual(second.usage);
    expect(first.warnings).toEqual(second.warnings);
    expect(JSON.stringify(first.bundle)).toBe(JSON.stringify(second.bundle));
  });

  it("enforces item and token budgets with stable priority truncation", async () => {
    const fs = createMemoryFileSystem(fixtureFiles("docs-first"));
    const result = await assembleNeutronContext(request({ maxItems: 2 }), {
      fs,
    });
    const included = result.bundle.sources.filter((source) => source.included);
    expect(included).toHaveLength(2);
    expect(included.every((source) => source.kind === "policy")).toBe(true);
    expect(
      included.every(
        (source) =>
          source.path === "docs/specs/SPEC.md" ||
          source.path === "docs/decisions/ADR-0001.md",
      ),
    ).toBe(true);
    const excluded = result.bundle.sources.filter((source) => !source.included);
    expect(
      excluded.some((source) => source.exclusionReason === "item-budget"),
    ).toBe(true);
    expect(result.usage.limitExceeded).toBe(true);
    expect(result.warnings).toContain(N3_WARNING_BUDGET);
    expect(result.bundle.estimatedTokens).toBeLessThanOrEqual(
      N3_DEFAULT_MAX_TOKENS,
    );

    const tight = await assembleNeutronContext(request({ maxTokens: 1 }), {
      fs,
    });
    expect(
      tight.bundle.sources.filter((source) => source.included),
    ).toHaveLength(0);
    expect(tight.bundle.estimatedTokens).toBe(0);
    expect(tight.bundle.estimatedTokens).toBeLessThanOrEqual(1);
    expect(
      tight.bundle.sources.some(
        (source) => source.exclusionReason === "token-budget",
      ),
    ).toBe(true);
    expect(tight.usage.tokenBudget).toBe(1);
    expect(tight.usage.limitExceeded).toBe(true);
  });

  it("loads skills at the requested level without executing them", async () => {
    const fs = createMemoryFileSystem(fixtureFiles("policy-first"));
    const catalog = await assembleNeutronContext(request(), { fs });
    const contract = await assembleNeutronContext(
      request({ skillLevel: "contract" }),
      { fs },
    );
    const procedure = await assembleNeutronContext(
      request({ skillLevel: "procedure" }),
      { fs },
    );
    const catalogSkills = catalog.bundle.sources.filter(
      (source) => source.kind === "skill" && source.included,
    );
    const contractSkills = contract.bundle.sources.filter(
      (source) => source.kind === "skill" && source.included,
    );
    const procedureSkills = procedure.bundle.sources.filter(
      (source) => source.kind === "skill" && source.included,
    );
    expect(
      catalogSkills.every((source) => source.loadingLevel === "catalog"),
    ).toBe(true);
    expect(
      contractSkills.every((source) => source.loadingLevel === "contract"),
    ).toBe(true);
    expect(
      procedureSkills.every((source) => source.loadingLevel === "procedure"),
    ).toBe(true);
    expect(catalogSkills.map((source) => source.sourceId).toSorted()).toEqual(
      contractSkills.map((source) => source.sourceId).toSorted(),
    );
    const filtered = await assembleNeutronContext(
      request({ role: "context-scout" }),
      { fs },
    );
    expect(
      filtered.bundle.sources.some(
        (source) =>
          source.kind === "skill" && source.exclusionReason === "skill-filter",
      ),
    ).toBe(true);
  });

  it("reuses bounded-context secret filtering and project-relative paths", async () => {
    const fs = createMemoryFileSystem(fixtureFiles("policy-first"));
    const result = await assembleNeutronContext(request(), { fs });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("supersecret12345");
    expect(serialized).not.toContain("secret_api_key_abc");
    expect(
      result.bundle.sources.some(
        (source) =>
          source.path === ".env" || source.path === "credentials.json",
      ),
    ).toBe(false);
    expect(result.bundle.excludedSecretLikePaths).toEqual([]);
    expect(
      result.bundle.sources
        .filter((source) => source.path !== undefined)
        .every((source) => !source.path!.startsWith("/")),
    ).toBe(true);
  });

  it("honors sourceTypes and records an empty bounded selection", async () => {
    const fs = createMemoryFileSystem(fixtureFiles("policy-first"));
    const filtered = await assembleNeutronContext(
      request({ sourceTypes: ["intent"] }),
      { fs },
    );
    const bounded = filtered.bundle.sources.filter(
      (source) =>
        source.included &&
        (source.kind === "policy" ||
          source.kind === "inspect" ||
          source.kind === "evidence"),
    );
    expect(
      bounded.every((source) => source.path?.startsWith("docs/specs/")),
    ).toBe(true);
    const empty = await assembleNeutronContext(
      request({ sourceTypes: ["provisional"], query: "zzz-no-match" }),
      { fs },
    );
    expect(empty.warnings).toContain(N3_WARNING_EMPTY_SKILLS);
    expect(
      empty.bundle.sources.filter(
        (source) => source.included && source.kind !== "skill",
      ),
    ).toHaveLength(0);
  });

  it("records deferred semantic ranking without a provider call", async () => {
    const fs = createMemoryFileSystem(fixtureFiles("policy-first"));
    const result = await assembleNeutronContext(
      request({ semanticRanking: true }),
      { fs },
    );
    expect(result.warnings).toContain(N3_WARNING_SEMANTIC);
    expect(result.bundle.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceId: "deferred:semantic",
          included: false,
          exclusionReason: "deferred",
        }),
      ]),
    );
    expect(
      result.bundle.sources.some((source) =>
        source.sourceId.startsWith("deferred:profile"),
      ),
    ).toBe(false);
    expect(
      result.bundle.sources.some((source) =>
        source.sourceId.startsWith("deferred:task"),
      ),
    ).toBe(false);
    expect(
      result.bundle.sources.some((source) =>
        source.sourceId.startsWith("deferred:memory"),
      ),
    ).toBe(false);
  });

  it("does not write, call network, or change project files", async () => {
    const inner = createMemoryFileSystem(fixtureFiles("policy-first"));
    const before = snapshotFiles(inner);
    const fs = guardWrites(inner);
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (() => {
      throw new Error("network forbidden");
    }) as typeof fetch;
    try {
      const result = await assembleNeutronContext(request(), { fs });
      expect(result.bundle.sources.length).toBeGreaterThan(0);
      expect(fs.writeCount).toBe(0);
      expect(snapshotFiles(inner)).toBe(before);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("returns a valid empty bundle when the project has no authorized sources", async () => {
    const fs = createMemoryFileSystem({
      "/empty/README.md": "# empty\n",
    });
    const result = await assembleNeutronContext(request({ root: "/empty" }), {
      fs,
    });
    validateNeutronContextBundle(result.bundle);
    expect(
      result.bundle.sources.filter((source) => source.included),
    ).toHaveLength(0);
    expect(result.warnings).toContain(N3_WARNING_EMPTY_CONTEXT);
    expect(result.warnings).toContain(N3_WARNING_EMPTY_SKILLS);
    expect(result.bundle.estimatedTokens).toBe(0);
  });
});
