import { describe, expect, it } from "vitest";
import {
  createMemoryFileSystem,
  initProject,
  runContinuousSecurityAudit,
  getSecurityAuditReport,
} from "@intentloom/application";

describe("v1.0 Security & Supply Chain Verification (V1_0_STABLE_COMPATIBILITY_PLAN Phase 4)", () => {
  it("generates deterministic local security audit reports with valid health scores", async () => {
    const fs = createMemoryFileSystem();
    const root = "/secure-project";
    await initProject({ root, adapters: ["codex"] }, fs);

    await runContinuousSecurityAudit({ root, projectId: "sec-test" }, fs);
    const report = await getSecurityAuditReport({ root }, fs);

    expect(report).not.toBeNull();
    expect(typeof report?.healthScore).toBe("number");
    expect(report?.healthScore).toBeGreaterThanOrEqual(0);
    expect(report?.healthScore).toBeLessThanOrEqual(100);
    expect(Array.isArray(report?.invariantChecks)).toBe(true);
  });

  it("verifies zero source file mutation during security audit execution", async () => {
    const fs = createMemoryFileSystem();
    const root = "/audit-project";
    await initProject({ root, adapters: ["codex"] }, fs);

    await fs.write(`${root}/AGENTS.md`, "# Project Guidance\nLocal only.\n");
    const agentsBefore = await fs.read(`${root}/AGENTS.md`);

    await runContinuousSecurityAudit({ root, projectId: "sec-test" }, fs);
    await getSecurityAuditReport({ root }, fs);

    const agentsAfter = await fs.read(`${root}/AGENTS.md`);
    expect(agentsAfter).toBe(agentsBefore);
  });
});
