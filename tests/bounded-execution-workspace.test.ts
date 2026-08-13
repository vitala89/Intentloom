import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BOUNDED_EXECUTION_PLAN_APPROVAL,
  createBoundedExecutionFixtureFileSystem,
  getBoundedExecutionFixture,
  listBoundedExecutionOperations,
  loadBoundedExecutionFixtureCatalog,
  prepareBoundedExecutionWorkspace,
  runBoundedExecutionWorkspaceCliCommand,
  buildBoundedExecutionWorkspaceViewModel,
  renderBoundedExecutionWorkspaceText,
} from "@intentloom/application";
import { BOUNDED_EXECUTION_WORKSPACE_OVERVIEW_SCHEMA_URN } from "@intentloom/protocol";
import { validateBoundedExecutionWorkspaceOverview } from "@intentloom/validator";

const catalog = loadBoundedExecutionFixtureCatalog();

function fixtureOptions(
  fixture: ReturnType<typeof getBoundedExecutionFixture>,
) {
  return {
    root: resolve(fixture.root),
    title: fixture.title,
    summary: fixture.summary,
    now: () => 1_700_000_000_000,
    ...(fixture.planApproval !== undefined
      ? { planApproval: fixture.planApproval }
      : {}),
    ...(fixture.requestedNetworkAccess !== undefined
      ? { requestedNetworkAccess: fixture.requestedNetworkAccess }
      : {}),
    ...(fixture.requestedProcessExecution !== undefined
      ? { requestedProcessExecution: fixture.requestedProcessExecution }
      : {}),
    ...(fixture.requestedAllowedCommands !== undefined
      ? { requestedAllowedCommands: fixture.requestedAllowedCommands }
      : {}),
    ...(fixture.requestedAllowedPaths !== undefined
      ? { requestedAllowedPaths: fixture.requestedAllowedPaths }
      : {}),
    ...(fixture.requestedRoot !== undefined
      ? { requestedRoot: fixture.requestedRoot }
      : {}),
    ...(fixture.proposedPaths !== undefined
      ? { proposedPaths: fixture.proposedPaths }
      : {}),
    ...(fixture.applyRequested !== undefined
      ? { applyRequested: fixture.applyRequested }
      : {}),
    ...(fixture.grantedApprovals !== undefined
      ? { grantedApprovals: fixture.grantedApprovals }
      : {}),
    ...(fixture.applyFiles !== undefined
      ? { applyFiles: fixture.applyFiles }
      : {}),
  };
}

describe("Engineering Workspace W11 Core: bounded execution orchestration", () => {
  it("lists the seven composed operations", () => {
    expect(listBoundedExecutionOperations()).toEqual([
      "approveImplementationPlan",
      "grantExecutionCapability",
      "executeBoundedTask",
      "collectCheckpoints",
      "runVerificationChecks",
      "prepareDiffReview",
      "applyBoundedExecution",
    ]);
  });

  it("applies one bounded task without widening capabilities", async () => {
    const fixture = getBoundedExecutionFixture(
      catalog,
      "bounded-fixture-ready-logging",
    );
    const fs = createBoundedExecutionFixtureFileSystem(fixture);
    const overview = await prepareBoundedExecutionWorkspace(
      fixtureOptions(fixture),
      fs,
    );
    expect(overview.schemaVersion).toBe(
      BOUNDED_EXECUTION_WORKSPACE_OVERVIEW_SCHEMA_URN,
    );
    expect(overview.executionGate).toBe("applied");
    expect(overview.mutationAllowed).toBe(true);
    expect(overview.capability.networkAccess).toBe(false);
    expect(overview.capability.processExecution).toBe(false);
    expect(overview.capability.allowedCommands).toEqual([]);
    expect(overview.diffReview.outsideApprovedPaths).toEqual([]);
    expect(overview.harnessScorecardStatus).toBe("passed");
    validateBoundedExecutionWorkspaceOverview(overview);
    const written = await fs.read(
      resolve(fixture.root, "src/bounded-task-evidence.txt"),
    );
    expect(written).toBe("bounded-execution-verified\n");
  });

  it("keeps W10 plans blocked until explicit plan approval", async () => {
    const fixture = getBoundedExecutionFixture(
      catalog,
      "bounded-fixture-blocked-unapproved",
    );
    const overview = await prepareBoundedExecutionWorkspace(
      fixtureOptions(fixture),
      createBoundedExecutionFixtureFileSystem(fixture),
    );
    expect(overview.executionGate).toBe("w11-blocked");
    expect(overview.mutationAllowed).toBe(false);
    expect(overview.diagnostics).toContain("plan-approval-missing");
    expect(overview.apply.applied).toBe(false);
  });

  it("rejects network capability widening as unsupported", async () => {
    const fixture = getBoundedExecutionFixture(
      catalog,
      "bounded-fixture-unsupported-network",
    );
    const overview = await prepareBoundedExecutionWorkspace(
      fixtureOptions(fixture),
      createBoundedExecutionFixtureFileSystem(fixture),
    );
    expect(overview.executionGate).toBe("unsupported");
    expect(overview.diagnostics).toContain("network-access-not-granted");
    expect(overview.mutationAllowed).toBe(false);
  });

  it("rejects allowed paths that leave the approved root", async () => {
    const fixture = getBoundedExecutionFixture(
      catalog,
      "bounded-fixture-path-widening",
    );
    const overview = await prepareBoundedExecutionWorkspace(
      fixtureOptions(fixture),
      createBoundedExecutionFixtureFileSystem(fixture),
    );
    expect(overview.executionGate).toBe("blocked");
    expect(
      overview.diagnostics.some((item) =>
        item.startsWith("path-widening-rejected:"),
      ),
    ).toBe(true);
  });

  it("fails closed when execute is requested without apply approval", async () => {
    const fixture = getBoundedExecutionFixture(
      catalog,
      "bounded-fixture-ready-logging",
    );
    const overview = await prepareBoundedExecutionWorkspace(
      {
        ...fixtureOptions(fixture),
        planApproval: BOUNDED_EXECUTION_PLAN_APPROVAL,
        grantedApprovals: [],
        applyRequested: true,
      },
      createBoundedExecutionFixtureFileSystem(fixture),
    );
    expect(overview.apply.attempted).toBe(true);
    expect(overview.apply.applied).toBe(false);
    expect(overview.mutationAllowed).toBe(false);
    expect(overview.executionGate).not.toBe("applied");
  });

  it("rejects CLI validation failures for missing root", async () => {
    const result = await runBoundedExecutionWorkspaceCliCommand("prepare", {
      title: "Add logging",
      summary: "Need a root.",
      json: true,
    });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("root is required");
  });

  it("builds client viewmodel and JSON CLI output from overview", async () => {
    const fixture = getBoundedExecutionFixture(
      catalog,
      "bounded-fixture-blocked-unapproved",
    );
    const overview = await prepareBoundedExecutionWorkspace(
      fixtureOptions(fixture),
      createBoundedExecutionFixtureFileSystem(fixture),
    );
    const viewmodel = buildBoundedExecutionWorkspaceViewModel(
      overview,
      "ready",
    );
    const text = renderBoundedExecutionWorkspaceText(viewmodel);
    expect(text).toContain("Execution gate: w11-blocked");
    const result = await runBoundedExecutionWorkspaceCliCommand("prepare", {
      root: resolve(fixture.root),
      title: fixture.title,
      summary: fixture.summary,
      json: true,
      fs: createBoundedExecutionFixtureFileSystem(fixture),
    });
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout) as {
      executionGate: string;
      mutationAllowed: boolean;
    };
    expect(parsed.executionGate).toBe("w11-blocked");
    expect(parsed.mutationAllowed).toBe(false);
  });
});
