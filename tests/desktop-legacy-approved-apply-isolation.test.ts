import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  APPROVED_APPLY_METHOD,
  NEUTRON_READ_ONLY_TOOLS,
} from "@intentloom/protocol";

const desktopRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "../apps/desktop",
);
const desktopSrc = join(desktopRoot, "src");

const FORBIDDEN_APPLY_AUTHORITY = [
  "ApprovedApplyModal",
  "onApprovePlan",
  "applyApprovedNeutronMutation",
  "applyApprovedNeutronGraphMutation",
  "approveAndApply",
  APPROVED_APPLY_METHOD,
] as const;

function collectSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(path));
      continue;
    }
    if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      files.push(path);
    }
  }
  return files;
}

function assertNoForbiddenApplyAuthority(source: string): void {
  for (const symbol of FORBIDDEN_APPLY_AUTHORITY) {
    expect(source).not.toContain(symbol);
  }
}

describe("Desktop legacy Approved Apply isolation (DL)", () => {
  it("removes the ApprovedApplyModal production module", () => {
    expect(existsSync(join(desktopSrc, "ApprovedApplyModal.tsx"))).toBe(false);
    expect(existsSync(join(desktopSrc, "ApprovedApplyModal.ts"))).toBe(false);
  });

  it("does not fabricate Apply success or synthetic rollback evidence in App.tsx", () => {
    const source = readFileSync(join(desktopSrc, "App.tsx"), "utf8");
    expect(source).not.toContain("applied: true");
    expect(source).not.toContain("previous snapshot content");
    expect(source).not.toContain("previousContent");
    expect(source).not.toContain("setTimeout");
    expect(source).not.toContain("action-applied-successfully");
    expect(source).not.toContain("atomic-commit-approval");
    expect(source).not.toContain("isApprovedApplyModalOpen");
    assertNoForbiddenApplyAuthority(source);
  });

  it("does not mount or render the removed legacy Apply control", () => {
    const source = readFileSync(
      join(desktopSrc, "WorkspaceContent.tsx"),
      "utf8",
    );
    expect(source).not.toContain("Approve & Apply Plan");
    expect(source).not.toContain("applied: true");
    expect(source).not.toContain("previousContent");
    expect(source).not.toContain("atomic-commit-approval");
    expect(source).not.toContain("isApprovedApplyModalOpen");
    assertNoForbiddenApplyAuthority(source);
  });

  it("does not import ApprovedApplyModal from any production Desktop module", () => {
    const files = collectSourceFiles(desktopSrc);
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      expect(source).not.toContain("ApprovedApplyModal");
      expect(source).not.toContain("previous snapshot content");
    }
  });

  it("keeps Neutron production files isolated from the removed Apply path", () => {
    const files = collectSourceFiles(join(desktopSrc, "neutron"));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      expect(source).not.toContain("previousContent");
      expect(source).not.toContain("atomic-commit-approval");
      expect(source).not.toContain("applied: true");
      assertNoForbiddenApplyAuthority(source);
    }
  });

  it("does not call real Apply or mutating daemon RPC from Desktop client composition", () => {
    const clientFiles = collectSourceFiles(desktopSrc).filter((path) =>
      path.includes("desktop-client"),
    );
    expect(clientFiles.length).toBeGreaterThan(0);
    for (const file of clientFiles) {
      const source = readFileSync(file, "utf8");
      assertNoForbiddenApplyAuthority(source);
    }
  });

  it("keeps mutationAllowed literal false on the Neutron session viewmodel", () => {
    const source = readFileSync(
      join(desktopSrc, "neutron/neutron-session-viewmodel.ts"),
      "utf8",
    );
    expect(source).toContain("mutationAllowed: false");
    expect(source).toContain("mutationAllowed must be false");
    expect(source).not.toContain("mutationAllowed: true");
  });

  it("keeps N4 at seven read-only tools with no Apply or approval tool", () => {
    expect([...NEUTRON_READ_ONLY_TOOLS]).toEqual([
      "inspect",
      "doctor",
      "memorySearch",
      "timeline",
      "conformance",
      "securityAudit",
      "projectDiff",
    ]);
    expect(NEUTRON_READ_ONLY_TOOLS).toHaveLength(7);
    expect(NEUTRON_READ_ONLY_TOOLS).not.toContain("apply");
    expect(NEUTRON_READ_ONLY_TOOLS).not.toContain("approve");
    expect(NEUTRON_READ_ONLY_TOOLS).not.toContain("approveAndApply");
  });
});
