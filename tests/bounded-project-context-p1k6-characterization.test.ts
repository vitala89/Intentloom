import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createMemoryFileSystem,
  getBoundedProjectContext,
  type FileSystem,
} from "@intentloom/application";
import { ProtocolValidationError } from "@intentloom/protocol";
import { runCli } from "../packages/cli/src/command.js";

const root = "/workspace";

function listedFileSystem(
  paths: readonly string[],
  readFile: (path: string) => string,
  list: () => Promise<string[]> = async () => [...paths],
): FileSystem & { reads: string[] } {
  const reads: string[] = [];
  return {
    reads,
    async exists() {
      return false;
    },
    async read(path) {
      reads.push(path);
      return readFile(path);
    },
    async write() {},
    async mkdir() {},
    async remove() {},
    list,
    async realpath(path) {
      return path;
    },
    async isSymbolicLink() {
      return false;
    },
  };
}

function contentBySuffix(files: Record<string, string>) {
  return (path: string) => {
    const normalized = path.replaceAll("\\", "/");
    if (
      /(?:^|\/)\.env(?:\.|$)|(?:^|\/)[^/]*\.(?:pem|key)$|(?:^|\/)credentials\.json$|(?:^|\/)id_rsa$|(?:^|\/)id_ed25519$|\/\.git\/|\/node_modules\//u.test(
        normalized,
      )
    ) {
      throw new Error(`excluded path was read: ${path}`);
    }
    const key = Object.keys(files).find(
      (entry) => normalized === entry || normalized.endsWith(`/${entry}`),
    );
    if (key === undefined) throw new Error(`missing ${path}`);
    return files[key] ?? "";
  };
}

async function writeFiles(
  files: Record<string, string>,
  projectRoot = root,
): Promise<ReturnType<typeof createMemoryFileSystem>> {
  const fs = createMemoryFileSystem();
  for (const [path, content] of Object.entries(files)) {
    await fs.write(`${projectRoot}/${path}`, content);
  }
  return fs;
}

describe("P1K.6 bounded project context behavior", () => {
  it("uses schema version 1 defaults for nullish requests and non-positive budgets", async () => {
    const fs = await writeFiles({
      "docs/a.md": "aaaa",
      "docs/b.md": "bbbb",
      "docs/c.md": "cccc",
    });

    for (const request of [null, undefined]) {
      const result = await getBoundedProjectContext(request, { root }, fs);
      expect(result.items.map((item) => item.path)).toEqual([
        "docs/a.md",
        "docs/b.md",
        "docs/c.md",
      ]);
      expect(result.totalTokens).toBe(3);
      expect(result.excludedPathsCount).toBe(0);
    }

    const zeroBudget = await getBoundedProjectContext(
      { schemaVersion: "1", maxTokens: 0, maxItems: 0, query: "" },
      { root },
      fs,
    );
    expect(zeroBudget.items).toHaveLength(3);
    expect(zeroBudget.totalTokens).toBe(3);
  });

  it("preserves context retrieval request validation errors", async () => {
    const fs = listedFileSystem([], () => "");
    await expect(
      getBoundedProjectContext("nope", { root }, fs),
    ).rejects.toThrow(
      new ProtocolValidationError(
        -32602,
        "context retrieval request must be an object",
      ),
    );
    await expect(
      getBoundedProjectContext({ schemaVersion: "2" }, { root }, fs),
    ).rejects.toThrow(
      new ProtocolValidationError(
        -32602,
        "unsupported context retrieval request schema version",
      ),
    );
    await expect(
      getBoundedProjectContext(
        { schemaVersion: "1", sourceTypes: [1] },
        { root },
        fs,
      ),
    ).rejects.toThrow(
      new ProtocolValidationError(
        -32602,
        "sourceTypes must be an array of strings",
      ),
    );
    expect(fs.reads).toEqual([]);
  });

  it("counts every excluded path and does not read those files", async () => {
    const files = {
      ".env": "SECRET_ENV",
      ".env.local": "SECRET_ENV_LOCAL",
      "keys/server.pem": "SECRET_PEM",
      "keys/server.key": "SECRET_KEY",
      "credentials.json": "SECRET_CREDENTIALS",
      id_rsa: "SECRET_RSA",
      id_ed25519: "SECRET_ED25519",
      ".git/HEAD": "SECRET_GIT",
      "node_modules/left-pad/index.js": "SECRET_MODULES",
      "docs/specs/.env": "SECRET_NESTED_ENV",
      "docs/specs/keep.md": "public intent",
      "README.md": "unclassified",
    };
    const fs = listedFileSystem(
      Object.keys(files).map((path) => `${root}/${path}`),
      contentBySuffix(files),
    );

    const result = await getBoundedProjectContext(
      { schemaVersion: "1" },
      { root },
      fs,
    );

    expect(result.excludedPathsCount).toBe(10);
    expect(result.items.map((item) => item.path)).toEqual([
      "docs/specs/keep.md",
    ]);
    expect(JSON.stringify(result)).not.toContain("SECRET_");
    expect(fs.reads.some((path) => path.includes(".env"))).toBe(false);
    expect(fs.reads.some((path) => path.includes("node_modules"))).toBe(false);
  });

  it("normalizes listed paths without reclassifying a root-prefix collision", async () => {
    const slashRoot = "/workspace";
    const windowsRelative = listedFileSystem(
      ["docs\\specs\\intent.md", "docs\\guide.md"],
      contentBySuffix({
        "docs/specs/intent.md": "Intent body",
        "docs/guide.md": "Guide body",
      }),
    );
    const normalized = await getBoundedProjectContext(
      { schemaVersion: "1" },
      { root: slashRoot },
      windowsRelative,
    );
    expect(normalized.items.map((item) => item.path)).toEqual([
      "docs/specs/intent.md",
      "docs/guide.md",
    ]);
    expect(normalized.items.map((item) => item.type)).toEqual([
      "intent",
      "documentation",
    ]);
    expect(normalized.root).toBe(slashRoot);

    const collision = listedFileSystem(
      ["/project/docs/specs/x.md", "/proj/docs/specs/real.md"],
      contentBySuffix({
        "docs/specs/x.md": "collision",
        "docs/specs/real.md": "real",
      }),
    );
    const collided = await getBoundedProjectContext(
      { schemaVersion: "1" },
      { root: "/proj" },
      collision,
    );
    expect(collided.items.map((item) => item.path)).toEqual([
      "docs/specs/real.md",
    ]);
    expect(collided.excludedPathsCount).toBe(0);
    expect(collided.root).toBe("/proj");
  });

  it("keeps classification precedence, case, and exact ownership names", async () => {
    const fs = await writeFiles({
      "docs/specs/core.md": "intent",
      "docs/specs/decisions/nested.md": "still intent",
      "docs/decisions/adr.md": "adr",
      "docs/decisions/specs/nested.md": "still adr",
      "docs/guide.md": "docs",
      "docs/PROJECT_STATE.md": "nested ownership name",
      "docs/Specs/upper.md": "not the specs prefix",
      "PROJECT_STATE.md": "state",
      "DUTY_WATCH.md": "watch",
      ".aif/memory/note.md": "evidence",
      "project_state.md": "wrong case",
      "Docs/specs/skipped.md": "wrong case prefix",
      ".aif/memory-note.md": "missing slash",
      "notes/PROJECT_STATE.md": "not the root file",
    });

    const result = await getBoundedProjectContext(
      { schemaVersion: "1" },
      { root },
      fs,
    );

    expect(
      result.items.map((item) => [item.path, item.type, item.trustClass]),
    ).toEqual([
      ["docs/specs/core.md", "intent", "canonical-policy"],
      ["docs/specs/decisions/nested.md", "intent", "canonical-policy"],
      ["docs/decisions/adr.md", "adr", "canonical-policy"],
      ["docs/decisions/specs/nested.md", "adr", "canonical-policy"],
      ["docs/guide.md", "documentation", "verified-evidence"],
      ["docs/PROJECT_STATE.md", "documentation", "verified-evidence"],
      ["docs/Specs/upper.md", "documentation", "verified-evidence"],
      ["PROJECT_STATE.md", "ownership", "verified-evidence"],
      ["DUTY_WATCH.md", "ownership", "verified-evidence"],
      [".aif/memory/note.md", "evidence", "verified-evidence"],
    ]);
    expect(result.excludedPathsCount).toBe(0);
  });

  it("filters source types without counting mismatches as exclusions", async () => {
    const fs = await writeFiles({
      "docs/specs/core.md": "intent",
      "docs/decisions/adr.md": "adr",
      "docs/guide.md": "docs",
      "PROJECT_STATE.md": "state",
      ".aif/memory/note.md": "evidence",
    });

    const filtered = await getBoundedProjectContext(
      { schemaVersion: "1", sourceTypes: ["adr", "ownership"] },
      { root },
      fs,
    );
    expect(filtered.items.map((item) => item.path)).toEqual([
      "docs/decisions/adr.md",
      "PROJECT_STATE.md",
    ]);
    expect(filtered.excludedPathsCount).toBe(0);

    const empty = await getBoundedProjectContext(
      { schemaVersion: "1", sourceTypes: [] },
      { root },
      fs,
    );
    expect(empty.items).toEqual([]);
    expect(empty.excludedPathsCount).toBe(0);

    const unknown = await getBoundedProjectContext(
      { schemaVersion: "1", sourceTypes: ["provisional"] },
      { root },
      fs,
    );
    expect(unknown.items).toEqual([]);
    expect(unknown.excludedPathsCount).toBe(0);
  });

  it("preserves list order and ignores unclassified or unreadable files", async () => {
    const files = {
      "docs/z.md": "later name",
      "README.md": "skip",
      "docs/a.md": "earlier name",
      "docs/missing.md": "unread",
      "docs/m.md": "after missing",
    };
    const fs = listedFileSystem(
      Object.keys(files).map((path) => `${root}/${path}`),
      (path) => {
        if (path.endsWith("docs/missing.md")) throw new Error("unreadable");
        return contentBySuffix(files)(path);
      },
    );

    const result = await getBoundedProjectContext(
      { schemaVersion: "1" },
      { root },
      fs,
    );
    expect(result.items.map((item) => item.path)).toEqual([
      "docs/z.md",
      "docs/a.md",
      "docs/m.md",
    ]);
    expect(result.excludedPathsCount).toBe(0);

    const failing = listedFileSystem(
      [],
      () => "",
      async () => {
        throw new Error("list failed");
      },
    );
    await expect(
      getBoundedProjectContext({ schemaVersion: "1" }, { root }, failing),
    ).rejects.toThrow("list failed");
  });

  it("matches a query against the path or full content without case sensitivity", async () => {
    const fs = await writeFiles({
      "docs/specs/UniquePathToken.md": "zzzz",
      "docs/guide.md": "prefix UniqueContentToken suffix",
      "docs/other.md": "NoSpace",
      "PROJECT_STATE.md": "state",
    });

    const byPath = await getBoundedProjectContext(
      { schemaVersion: "1", query: "uniquepathtoken" },
      { root },
      fs,
    );
    expect(byPath.items.map((item) => item.path)).toEqual([
      "docs/specs/UniquePathToken.md",
    ]);

    const byContent = await getBoundedProjectContext(
      { schemaVersion: "1", query: "UNIQUECONTENTTOKEN" },
      { root },
      fs,
    );
    expect(byContent.items.map((item) => item.path)).toEqual(["docs/guide.md"]);

    const absent = await getBoundedProjectContext(
      { schemaVersion: "1", query: "absent-token" },
      { root },
      fs,
    );
    expect(absent.items).toEqual([]);
    expect(absent.excludedPathsCount).toBe(0);

    const blank = await getBoundedProjectContext(
      { schemaVersion: "1", query: " " },
      { root },
      fs,
    );
    expect(blank.items.map((item) => item.path)).not.toContain("docs/other.md");
    expect(blank.items.map((item) => item.path)).toContain("docs/guide.md");
  });

  it("summarizes the first 150 characters and counts tokens from the full text", async () => {
    const content = `${"\n".repeat(2)}${"A".repeat(160)}\ntrailer`;
    const windowed = `${"x".repeat(149)}\n${"y".repeat(20)}`;
    const spaced = "  hello\n\nworld  ";
    const fs = await writeFiles({
      "docs/specs/summary.md": content,
      "docs/window.md": windowed,
      "docs/spaced.md": spaced,
    });

    const result = await getBoundedProjectContext(
      { schemaVersion: "1" },
      { root },
      fs,
    );
    const summary = result.items[0];
    const window = result.items[1];
    const spaces = result.items[2];

    expect(summary).toEqual({
      id: "ctx-intent-docs-specs-summary.md",
      type: "intent",
      path: "docs/specs/summary.md",
      summary: "A".repeat(148),
      trustClass: "canonical-policy",
      tokenCount: Math.ceil(content.length / 4),
    });
    expect(window?.summary).toBe("x".repeat(149));
    expect(window?.summary).not.toContain("y");
    expect(window?.tokenCount).toBe(Math.ceil(windowed.length / 4));
    expect(spaces?.summary).toBe("hello world");
    expect(spaces?.tokenCount).toBe(Math.ceil(spaced.length / 4));
  });

  it("keeps the first over-budget item and stops without searching for a later fit", async () => {
    const fs = await writeFiles({
      "docs/first.md": "a".repeat(40),
      "docs/second.md": "b".repeat(4),
    });
    const oversizedFirst = await getBoundedProjectContext(
      { schemaVersion: "1", maxTokens: 1, maxItems: 20 },
      { root },
      fs,
    );
    expect(oversizedFirst.items.map((item) => item.path)).toEqual([
      "docs/first.md",
    ]);
    expect(oversizedFirst.items[0]?.tokenCount).toBe(10);
    expect(oversizedFirst.totalTokens).toBe(10);

    const stopping = await writeFiles({
      "docs/a.md": "a".repeat(8),
      "docs/b.md": "b".repeat(16),
      "docs/c.md": "c".repeat(4),
    });
    const stopped = await getBoundedProjectContext(
      { schemaVersion: "1", maxTokens: 5, maxItems: 20 },
      { root },
      stopping,
    );
    expect(stopped.items.map((item) => item.path)).toEqual(["docs/a.md"]);
    expect(stopped.totalTokens).toBe(2);

    const exact = await writeFiles({
      "docs/a.md": "a".repeat(8),
      "docs/b.md": "b".repeat(8),
      "docs/c.md": "c".repeat(4),
    });
    const filled = await getBoundedProjectContext(
      { schemaVersion: "1", maxTokens: 4, maxItems: 1 },
      { root },
      exact,
    );
    expect(filled.items.map((item) => item.path)).toEqual(["docs/a.md"]);
    expect(filled.totalTokens).toBe(2);

    const tokenBoundary = await getBoundedProjectContext(
      { schemaVersion: "1", maxTokens: 4, maxItems: 20 },
      { root },
      exact,
    );
    expect(tokenBoundary.items.map((item) => item.path)).toEqual([
      "docs/a.md",
      "docs/b.md",
    ]);
    expect(tokenBoundary.totalTokens).toBe(4);
  });

  it("returns the validated result fields and the supplied root string", async () => {
    const fs = await writeFiles({
      "docs/specs/a/b.md": "abcd",
    });
    const before = Date.now();
    const result = await getBoundedProjectContext(
      { schemaVersion: "1" },
      { root: "/workspace" },
      fs,
    );
    expect(result.schemaVersion).toBe("1");
    expect(result.root).toBe("/workspace");
    expect(result.totalTokens).toBe(1);
    expect(result.excludedPathsCount).toBe(0);
    expect(result.items).toEqual([
      {
        id: "ctx-intent-docs-specs-a-b.md",
        type: "intent",
        path: "docs/specs/a/b.md",
        summary: "abcd",
        trustClass: "canonical-policy",
        tokenCount: 1,
      },
    ]);
    expect(result.retrievedAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u,
    );
    expect(Math.abs(Date.parse(result.retrievedAt) - before)).toBeLessThan(
      5_000,
    );
  });

  it("keeps the public context command compatible with JSON and text output", async () => {
    const fs = await writeFiles(
      {
        "docs/specs/spec.md": "Project specification",
      },
      "/cli-project",
    );
    const jsonOutput: string[] = [];
    const jsonExit = await runCli(
      ["context", "get", "--root", "/cli-project", "--json"],
      { catalogRoot: resolve("catalog"), fileSystem: fs },
      {
        stdout: (message) => jsonOutput.push(message),
        stderr: () => undefined,
      },
    );
    expect(jsonExit).toBe(0);
    const parsed = JSON.parse(jsonOutput.join("\n")) as {
      schemaVersion: string;
      root: string;
      items: { type: string; path: string }[];
    };
    expect(parsed.schemaVersion).toBe("1");
    expect(parsed.root).toBe("/cli-project");
    expect(parsed.items).toEqual([
      expect.objectContaining({
        type: "intent",
        path: "docs/specs/spec.md",
      }),
    ]);

    const textOutput: string[] = [];
    const textExit = await runCli(
      ["context", "get", "--root", "/cli-project"],
      { catalogRoot: resolve("catalog"), fileSystem: fs },
      {
        stdout: (message) => textOutput.push(message),
        stderr: () => undefined,
      },
    );
    expect(textExit).toBe(0);
    expect(textOutput.join("\n")).toContain(
      "Bounded Project Context (Root: /cli-project",
    );
    expect(textOutput.join("\n")).toContain(
      "[canonical-policy] [intent] docs/specs/spec.md",
    );
  });
});
