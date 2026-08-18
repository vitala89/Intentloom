import { describe, expect, it } from "vitest";
import {
  adoptProject,
  createMemoryFileSystem,
  doctorProject,
  initProject,
  inspectProject,
} from "../packages/application/src/index.js";

function viiLikeTree(
  extra: Record<string, string> = {},
): Record<string, string> {
  return {
    "/project/nx.json": JSON.stringify({ targetDefaults: {} }),
    "/project/package.json": JSON.stringify({
      devDependencies: { nx: "21.0.0", typescript: "5.8.0" },
    }),
    "/project/tsconfig.json": "{}",
    "/project/README.md": "vii workspace\n",
    "/project/.github/workflows/validate.yml": "name: validate\n",
    "/project/.github/workflows/governance.yml": "name: governance\n",
    "/project/.github/PULL_REQUEST_TEMPLATE.md": "## Summary\n",
    "/project/.github/ISSUE_TEMPLATE/bug_report.md": "## Bug\n",
    "/project/.github/ISSUE_TEMPLATE/implementation_task.md": "## Task\n",
    ...extra,
  };
}

async function adoptedCodex(tree: Record<string, string>) {
  const fs = createMemoryFileSystem(tree);
  const result = await adoptProject(
    {
      root: "/project",
      profile: "typescript",
      adapters: ["codex"],
      dryRun: false,
    },
    fs,
  );
  expect(result.applied).toBe(true);
  return fs;
}

describe("instruction file taxonomy", () => {
  it("recognizes AGENTS.md as an instruction path during inspection", async () => {
    const result = await inspectProject(
      "/project",
      createMemoryFileSystem({
        "/project/AGENTS.md": "project guidance",
        "/project/README.md": "readme",
      }),
    );

    expect(result.instructionPaths).toEqual(["AGENTS.md"]);
    expect(result.detectedAdapters).toEqual(["codex", "cursor"]);
  });

  it("does not treat GitHub workflows as Copilot instruction paths", async () => {
    const result = await inspectProject(
      "/project",
      createMemoryFileSystem({
        "/project/README.md": "readme",
        "/project/.github/workflows/validate.yml": "name: validate\n",
        "/project/.github/workflows/codeql.yml": "name: codeql\n",
      }),
    );

    expect(result.instructionPaths).toEqual([]);
    expect(result.detectedAdapters).toEqual([]);
  });

  it("does not treat GitHub issue or PR templates as Copilot instruction paths", async () => {
    const result = await inspectProject(
      "/project",
      createMemoryFileSystem({
        "/project/README.md": "readme",
        "/project/.github/PULL_REQUEST_TEMPLATE.md": "## Summary\n",
        "/project/.github/ISSUE_TEMPLATE/bug_report.md": "## Bug\n",
      }),
    );

    expect(result.instructionPaths).toEqual([]);
    expect(result.detectedAdapters).toEqual([]);
  });

  it("still detects Copilot instruction roots from supported paths", async () => {
    const result = await inspectProject(
      "/project",
      createMemoryFileSystem({
        "/project/README.md": "readme",
        "/project/.github/copilot-instructions.md": "copilot guidance\n",
        "/project/.github/instructions/project.instructions.md":
          "scoped guidance\n",
        "/project/.github/skills/review/SKILL.md": "# Review\n",
      }),
    );

    expect(result.instructionPaths).toEqual([
      ".github/copilot-instructions.md",
      ".github/instructions/project.instructions.md",
      ".github/skills/review/SKILL.md",
    ]);
    expect(result.detectedAdapters).toEqual(["copilot"]);
  });

  it("reports instruction-root conflicts for multiple project-owned provider roots", async () => {
    const fs = createMemoryFileSystem({
      "/project/README.md": "project\n",
      "/project/CLAUDE.md": "project\n",
      "/project/.cursor/rules/project.mdc": "project\n",
    });
    await initProject(
      {
        root: "/project",
        profile: "generic",
        adapters: ["codex"],
        dryRun: false,
      },
      fs,
    );

    const report = await doctorProject(
      {
        root: "/project",
        profile: "generic",
        adapters: ["codex"],
        dryRun: true,
      },
      fs,
    );

    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "instruction-files-conflicting" }),
      ]),
    );
  });

  it("does not warn on a Vii-like Nx workspace with GitHub governance files alone", async () => {
    const fs = await adoptedCodex(viiLikeTree());
    const report = await doctorProject(
      {
        root: "/project",
        profile: "typescript",
        adapters: ["codex"],
        dryRun: true,
      },
      fs,
    );

    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "installation-healthy" }),
      ]),
    );
    expect(report.findings).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "instruction-files-conflicting" }),
      ]),
    );
  });

  it("still warns when real Copilot and Claude instruction roots both remain project-owned", async () => {
    const fs = await adoptedCodex(viiLikeTree());
    await fs.write("/project/CLAUDE.md", "project claude guidance\n");
    await fs.write(
      "/project/.github/copilot-instructions.md",
      "project copilot guidance\n",
    );

    const report = await doctorProject(
      {
        root: "/project",
        profile: "typescript",
        adapters: ["codex"],
        dryRun: true,
      },
      fs,
    );

    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "instruction-files-conflicting" }),
      ]),
    );
  });
});
