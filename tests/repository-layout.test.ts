import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const REQUIRED_TOP_LEVEL_DIRECTORIES = [
  "apps",
  "catalog",
  "docs",
  "examples",
  "packages",
  "profiles",
  "scripts",
  "tests",
];

const FORBIDDEN_TOP_LEVEL_DIRECTORIES = ["common", "lib", "shared", "src"];

const REQUIRED_PACKAGE_ROOTS = [
  "apps/desktop",
  "packages/application",
  "packages/cli",
  "packages/core",
  "packages/daemon",
  "packages/protocol",
  "packages/validator",
];

const CANONICAL_ENTRYPOINTS = [
  "AGENT_START_HERE.md",
  "AGENTS.md",
  "CHANGELOG.md",
  "CONTRIBUTING.md",
  "DUTY_WATCH.md",
  "LICENSE",
  "PROJECT_STATE.md",
  "README.md",
  "ROADMAP.md",
  "SECURITY.md",
  "docs/README.md",
  "docs/architecture/ARCHITECTURE.md",
  "docs/governance/AI_AGENT_WORKFLOW.md",
  "docs/governance/CODE_QUALITY_STANDARDS.md",
  "docs/governance/DOMAIN_MODELING.md",
  "docs/governance/ENGINEERING_PRINCIPLES.md",
  "docs/governance/REACT_BEST_PRACTICES.md",
];

const FORBIDDEN_ALIAS_NAMES = new Set([
  "AGENT_DEVELOPMENT_RULES.md",
  "ARCHITECTURE_GUIDELINES.md",
  "BACKEND_ARCHITECTURE.md",
  "CODE_STYLE.md",
  "DDD_ARCHITECTURE.md",
  "FRONTEND_ARCHITECTURE.md",
  "UBIQUITOUS_LANGUAGE.md",
]);

const ARCHIVED_IMPLEMENTATION_PLANS = [
  "implementation_plan.md",
  "implementation_plan_q10.md",
  "implementation_plan_q11.md",
  "implementation_plan_q12.md",
  "implementation_plan_q13.md",
  "implementation_plan_q14.md",
  "implementation_plan_q4.md",
  "implementation_plan_q5.md",
  "implementation_plan_q6.md",
  "implementation_plan_q7.md",
  "implementation_plan_q8.md",
  "implementation_plan_q9.md",
];

const ARCHIVE_DIRECTORY = join("docs", "archive", "implementation-plans");

function findAliasDocuments(directory: string): string[] {
  const skip = new Set([".git", "dist", "node_modules", "target"]);
  const hits: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue;
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      hits.push(...findAliasDocuments(fullPath));
    } else if (FORBIDDEN_ALIAS_NAMES.has(entry.name)) {
      hits.push(relative(root, fullPath));
    }
  }
  return hits;
}

describe("repository layout", () => {
  it("keeps the intentional top-level directories", () => {
    for (const name of REQUIRED_TOP_LEVEL_DIRECTORIES) {
      expect(statSync(name).isDirectory()).toBe(true);
    }
  });

  it("rejects generic top-level dumping grounds", () => {
    for (const name of FORBIDDEN_TOP_LEVEL_DIRECTORIES) {
      expect(existsSync(name)).toBe(false);
    }
    expect(existsSync(join("packages", "catalog"))).toBe(false);
    expect(existsSync(join("packages", "profiles"))).toBe(false);
  });

  it("keeps application and package roots in place", () => {
    for (const name of REQUIRED_PACKAGE_ROOTS) {
      expect(statSync(name).isDirectory()).toBe(true);
    }
  });

  it("keeps canonical architecture and governance entrypoints", () => {
    for (const name of CANONICAL_ENTRYPOINTS) {
      expect(statSync(name).isFile()).toBe(true);
    }
  });

  it("keeps historical implementation plans out of the repository root", () => {
    const rootPlans = readdirSync(root).filter((name) =>
      /^implementation_plan.*\.md$/.test(name),
    );
    expect(rootPlans).toEqual([]);
    const archived = readdirSync(ARCHIVE_DIRECTORY)
      .filter((name) => name.startsWith("implementation_plan"))
      .toSorted();
    expect(archived).toEqual(ARCHIVED_IMPLEMENTATION_PLANS);
    const notice = readFileSync(join(ARCHIVE_DIRECTORY, "README.md"), "utf8");
    expect(notice).toMatch(/not current roadmap\s+authority/);
    expect(notice).toContain("ROADMAP.md");
    expect(notice).toContain("PROJECT_STATE.md");
  });

  it("rejects duplicate canonical architecture aliases", () => {
    expect(findAliasDocuments(root)).toEqual([]);
  });
});
