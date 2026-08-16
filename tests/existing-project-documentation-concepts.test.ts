import { describe, expect, it } from "vitest";
import {
  adoptProject,
  createMemoryFileSystem,
} from "../packages/application/src/index.js";
import { documentConcept } from "../packages/application/src/document-concepts.js";

const viiDocumentationTree = {
  "/project/AGENTS.md": "project agents\n",
  "/project/README.md": "vii workspace\n",
  "/project/docs/architecture/ARCHITECTURE_MAP.md": "architecture map\n",
  "/project/docs/architecture/CLI_ARCHITECTURE.md": "cli architecture\n",
  "/project/docs/architecture/FORM_ARCHITECTURE.md": "form architecture\n",
  "/project/docs/architecture/REGISTRY_ARCHITECTURE.md":
    "registry architecture\n",
  "/project/docs/architecture/STATE_ARCHITECTURE.md": "state architecture\n",
  "/project/docs/architecture/UI_ARCHITECTURE.md": "ui architecture\n",
  "/project/docs/governance/ADR_PROCESS.md": "adr process\n",
  "/project/docs/security/SECURITY_ARCHITECTURE.md": "security architecture\n",
  "/project/rfcs/0020-security-architecture-and-threat-model.md":
    "rfc threat model\n",
} as const;

const specializedPaths = [
  "docs/architecture/CLI_ARCHITECTURE.md",
  "docs/architecture/FORM_ARCHITECTURE.md",
  "docs/architecture/REGISTRY_ARCHITECTURE.md",
  "docs/architecture/STATE_ARCHITECTURE.md",
  "docs/architecture/UI_ARCHITECTURE.md",
  "docs/governance/ADR_PROCESS.md",
  "docs/security/SECURITY_ARCHITECTURE.md",
  "rfcs/0020-security-architecture-and-threat-model.md",
] as const;

describe("existing-project documentation concepts", () => {
  it.each([
    ["ARCHITECTURE.md", "architecture"],
    ["docs/architecture.md", "architecture"],
    ["docs/architecture/ARCHITECTURE_MAP.md", "architecture"],
    ["docs/architecture/architecture-overview.md", "architecture"],
    ["docs/architecture/CLI_ARCHITECTURE.md", null],
    ["docs/architecture/FORM_ARCHITECTURE.md", null],
    ["docs/governance/ADR_PROCESS.md", null],
    ["docs/ADR-0001.md", null],
    ["docs/security/SECURITY_ARCHITECTURE.md", null],
    ["rfcs/0020-security-architecture-and-threat-model.md", null],
  ] as const)("classifies %s as %s", (path, concept) => {
    expect(documentConcept(path)).toBe(concept);
  });

  it("does not require architecture mappings for specialized Vii documents", async () => {
    const fs = createMemoryFileSystem(viiDocumentationTree);
    const first = await adoptProject(
      {
        root: "/project",
        profile: "typescript",
        adapters: ["codex"],
        dryRun: true,
      },
      fs,
    );
    const second = await adoptProject(
      {
        root: "/project",
        profile: "typescript",
        adapters: ["codex"],
        dryRun: true,
      },
      fs,
    );

    expect(first).toEqual(second);
    expect([...fs.files.entries()]).toEqual(
      Object.entries(viiDocumentationTree),
    );
    expect(first.items.find((item) => item.path === "AGENTS.md")).toEqual(
      expect.objectContaining({
        action: "map-existing-project-owned",
        manualDecisionRequired: true,
      }),
    );
    expect(
      first.items.find(
        (item) => item.path === "docs/architecture/ARCHITECTURE_MAP.md",
      ),
    ).toEqual(
      expect.objectContaining({
        action: "map-existing-aif-compatible-document",
        reason: expect.stringContaining("architecture"),
        manualDecisionRequired: false,
      }),
    );
    for (const path of specializedPaths) {
      const item = first.items.find((candidate) => candidate.path === path);
      expect(item?.path).toBe(path);
      expect(item?.action).toBe("skip");
      expect(item?.manualDecisionRequired).toBe(false);
      expect(item?.writeEligible).toBe(false);
      expect(item?.reason).not.toContain("architecture concept");
    }
    expect(first.items.filter((item) => item.manualDecisionRequired)).toEqual([
      expect.objectContaining({
        path: "AGENTS.md",
        action: "map-existing-project-owned",
        manualDecisionRequired: true,
      }),
    ]);
  });

  it("still requires a choice when two canonical architecture documents exist", async () => {
    const result = await adoptProject(
      {
        root: "/project",
        profile: "generic",
        adapters: ["codex"],
        dryRun: true,
      },
      createMemoryFileSystem({
        "/project/docs/architecture.md": "overview\n",
        "/project/docs/architecture/ARCHITECTURE_MAP.md": "map\n",
        "/project/docs/architecture/CLI_ARCHITECTURE.md": "cli\n",
      }),
    );
    expect(
      result.items.filter(
        (item) =>
          item.action === "manual-decision-required" &&
          item.reason.includes("architecture"),
      ),
    ).toEqual([
      expect.objectContaining({
        path: "docs/architecture.md",
      }),
      expect.objectContaining({
        path: "docs/architecture/ARCHITECTURE_MAP.md",
      }),
    ]);
    expect(
      result.items.find(
        (item) => item.path === "docs/architecture/CLI_ARCHITECTURE.md",
      ),
    ).toEqual(
      expect.objectContaining({
        action: "skip",
        manualDecisionRequired: false,
      }),
    );
  });
});
