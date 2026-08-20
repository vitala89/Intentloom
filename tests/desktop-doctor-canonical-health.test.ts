import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import {
  applyExistingProjectAdoptionPreparedPlan,
  createMemoryFileSystem,
  diffProject,
  doctorProject,
  initProject,
  resolveProjectDoctorInit,
} from "@intentloom/application";
import {
  createDoctorRequest,
  createProjectDiffRequest,
} from "@intentloom/protocol";
import {
  handleProjectDiffRequest,
  handleProjectDoctorRequest,
} from "../packages/daemon/src/project-health-handlers.js";
import {
  preparedApproved,
  viiLikeTree,
} from "./existing-project-adoption-apply-fixture.js";

import { createArtifactValidator } from "@intentloom/validator";

const catalogRoot = resolve("catalog");
const schemaRoot = resolve("catalog/schemas");

async function catalogValidator() {
  return createArtifactValidator(schemaRoot);
}

function remapTree(root: string): Record<string, string> {
  return Object.fromEntries(
    Object.entries(viiLikeTree()).map(([path, content]) => [
      path.replace("/project", root),
      content,
    ]),
  );
}

function normalizeDoctorResult(result: {
  readonly exitCode: 0 | 3;
  readonly findings: readonly {
    readonly code: string;
    readonly severity: string;
    readonly category: string;
    readonly path: string;
  }[];
  readonly diagnostics: readonly string[];
}) {
  return {
    exitCode: result.exitCode,
    findings: result.findings.map(({ code, severity, category, path }) => ({
      code,
      severity,
      category,
      path,
    })),
    diagnostics: result.diagnostics,
  };
}

function doctorDaemonResultFromPlan(
  report: Awaited<ReturnType<typeof doctorProject>>,
) {
  return {
    findings: report.findings.map(
      ({ code, severity, category, path, message }) => ({
        code,
        severity,
        category,
        path,
        message,
      }),
    ),
    diagnostics: report.diagnostics,
    exitCode: report.findings.some((finding) => finding.severity === "error")
      ? (3 as const)
      : (0 as const),
  };
}

async function adoptHealthyProject(
  fs: ReturnType<typeof createMemoryFileSystem>,
) {
  const { plan, approval } = await preparedApproved(fs, 1_700_000_000_000, {
    catalogRoot,
  });
  await applyExistingProjectAdoptionPreparedPlan(
    {
      root: "/project",
      preparedPlanId: plan.preparedPlanId,
      planDigest: plan.planDigest,
      preparedPlan: plan,
      approval,
      catalogRoot,
      now: () => 1_700_000_000_300,
    },
    fs,
  );
  return plan;
}

describe("desktop doctor canonical health parity", () => {
  it("reports missing metadata for an uninitialized project", async () => {
    const fs = createMemoryFileSystem(viiLikeTree());
    const daemon = await handleProjectDoctorRequest(
      createDoctorRequest("doctor-uninitialized", { root: "/project" }),
      catalogRoot,
      fs,
    );
    expect(daemon.exitCode).toBe(3);
    expect(daemon.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "aif-config-missing",
        "manifest-lock-missing",
        "source-map-missing",
      ]),
    );
  });

  it("matches CLI doctor semantics for a healthy adopted TypeScript project", async () => {
    const fs = createMemoryFileSystem(viiLikeTree());
    const plan = await adoptHealthyProject(fs);
    const validator = await catalogValidator();
    const cliInit = await resolveProjectDoctorInit(
      { root: "/project", catalogRoot, validator },
      fs,
    );
    const cliDoctor = normalizeDoctorResult(
      doctorDaemonResultFromPlan(await doctorProject(cliInit, fs)),
    );
    const daemonDoctor = normalizeDoctorResult(
      await handleProjectDoctorRequest(
        createDoctorRequest("doctor-adopted", { root: "/project" }),
        catalogRoot,
        fs,
      ),
    );
    expect(plan.profile).toBe("typescript");
    expect(cliDoctor).toEqual(daemonDoctor);
    expect(cliDoctor.exitCode).toBe(0);
    expect(cliDoctor.findings.map((finding) => finding.code)).toContain(
      "installation-healthy",
    );
    expect(cliDoctor.findings.map((finding) => finding.code)).not.toContain(
      "profile-mismatch",
    );
    expect(
      cliDoctor.findings.filter((finding) => finding.severity === "info")
        .length,
    ).toBeGreaterThan(0);
  });

  it("returns project B findings when B is selected, not project A", async () => {
    const fs = createMemoryFileSystem({
      ...remapTree("/project-a"),
      ...remapTree("/project"),
    });
    await adoptHealthyProject(fs);

    const projectA = await handleProjectDoctorRequest(
      createDoctorRequest("doctor-a", { root: "/project-a" }),
      catalogRoot,
      fs,
    );
    const projectB = await handleProjectDoctorRequest(
      createDoctorRequest("doctor-b", { root: "/project" }),
      catalogRoot,
      fs,
    );

    expect(projectA.exitCode).toBe(3);
    expect(projectB.exitCode).toBe(0);
    expect(projectA.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining(["aif-config-missing"]),
    );
    expect(projectB.findings.map((finding) => finding.code)).toContain(
      "installation-healthy",
    );
  });

  it("resolves typescript profile from adopted config instead of generic", async () => {
    const fs = createMemoryFileSystem(viiLikeTree());
    await adoptHealthyProject(fs);
    const resolved = await resolveProjectDoctorInit(
      { root: "/project", catalogRoot, validator: await catalogValidator() },
      fs,
    );
    expect(resolved.profile).toBe("typescript");
    expect(resolved.adapters).toEqual(["codex", "cursor"]);
  });

  it("matches desktop diff parity for the same adopted root", async () => {
    const fs = createMemoryFileSystem(viiLikeTree());
    await adoptHealthyProject(fs);
    const validator = await catalogValidator();
    const init = await resolveProjectDoctorInit(
      { root: "/project", catalogRoot, validator },
      fs,
    );
    const cliDiff = await diffProject(init, fs);
    const daemonDiff = await handleProjectDiffRequest(
      createProjectDiffRequest("diff-adopted", { root: "/project" }),
      catalogRoot,
      fs,
    );
    expect(daemonDiff.root).toBe(resolve("/project"));
    expect(daemonDiff.changes).toEqual(cliDiff.changes);
    expect(daemonDiff.diagnostics).toEqual(cliDiff.diagnostics);
  });

  it("builds a root-only desktop doctor request without hardcoded generic profile", () => {
    const request = createDoctorRequest("desktop-doctor", {
      root: "/workspace/example",
    });
    expect(request.params.root).toBe("/workspace/example");
    expect(request.params.profile).toBeUndefined();
    expect(request.params.adapters).toBeUndefined();
  });

  it("replaces pre-adoption missing findings after refresh on a healthy tree", async () => {
    const fs = createMemoryFileSystem(viiLikeTree());
    const before = await handleProjectDoctorRequest(
      createDoctorRequest("doctor-before", { root: "/project" }),
      catalogRoot,
      fs,
    );
    await adoptHealthyProject(fs);
    const after = await handleProjectDoctorRequest(
      createDoctorRequest("doctor-after", { root: "/project" }),
      catalogRoot,
      fs,
    );
    expect(before.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining(["aif-config-missing"]),
    );
    expect(after.exitCode).toBe(0);
    expect(after.findings.map((finding) => finding.code)).toContain(
      "installation-healthy",
    );
  });

  it("keeps generic profile only when explicitly requested", async () => {
    const fs = createMemoryFileSystem({});
    await initProject({ root: "/project", adapters: ["codex"] }, fs);
    const resolved = await resolveProjectDoctorInit(
      {
        root: "/project",
        profile: "generic",
        adapters: ["codex"],
        catalogRoot,
      },
      fs,
    );
    expect(resolved.profile).toBe("generic");
  });
});
