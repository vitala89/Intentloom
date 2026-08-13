import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BOUNDED_EXECUTION_FIXTURE_IDS,
  buildBoundedExecutionWorkspaceViewModel,
  createBoundedExecutionFixtureFileSystem,
  getBoundedExecutionFixture,
  loadBoundedExecutionFixtureCatalog,
  prepareBoundedExecutionWorkspace,
  renderBoundedExecutionWorkspaceText,
  runBoundedExecutionWorkspaceCliCommand,
} from "@intentloom/application";

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

describe("Engineering Workspace W11 Client: Desktop and TUI viewmodels", () => {
  it("builds panel viewmodels for frozen fixture IDs", async () => {
    for (const fixtureId of BOUNDED_EXECUTION_FIXTURE_IDS) {
      const fixture = getBoundedExecutionFixture(catalog, fixtureId);
      const overview = await prepareBoundedExecutionWorkspace(
        fixtureOptions(fixture),
        createBoundedExecutionFixtureFileSystem(fixture),
      );
      const viewmodel = buildBoundedExecutionWorkspaceViewModel(
        overview,
        "ready",
      );
      expect(viewmodel.executionGate).toBe(fixture.expected.executionGate);
      expect(viewmodel.mutationAllowed).toBe(fixture.expected.mutationAllowed);
      expect(viewmodel.networkAccess).toBe(false);
      expect(viewmodel.processExecution).toBe(false);
      const diagnosticNeedles = fixture.expected.diagnosticIncludes
        ? [fixture.expected.diagnosticIncludes]
        : [];
      expect(
        diagnosticNeedles.every((needle) =>
          viewmodel.diagnostics.some((item) => item.includes(needle)),
        ),
      ).toBe(true);
    }
  });

  it("renders gate, bounds, and apply status for the ready-logging fixture", async () => {
    const fixture = getBoundedExecutionFixture(
      catalog,
      "bounded-fixture-ready-logging",
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

    expect(text).toContain("Bounded Execution Workspace:");
    expect(text).toContain("Execution gate: applied");
    expect(text).toContain("Mutation allowed: true");
    expect(text).toContain("Network access: false");
    expect(text).toContain("Process execution: false");
    expect(text).toContain("Apply applied: true");
    expect(text).toContain("Harness: passed");
  });

  it("keeps CLI JSON parity with panel viewmodels", async () => {
    for (const fixtureId of BOUNDED_EXECUTION_FIXTURE_IDS) {
      const fixture = getBoundedExecutionFixture(catalog, fixtureId);
      const fixtureRoot = resolve(fixture.root);
      const fs = createBoundedExecutionFixtureFileSystem(fixture);
      const overview = await prepareBoundedExecutionWorkspace(
        fixtureOptions(fixture),
        fs,
      );
      const viewmodel = buildBoundedExecutionWorkspaceViewModel(
        overview,
        "ready",
      );
      const command = fixture.applyRequested === true ? "execute" : "prepare";
      const cliResult = await runBoundedExecutionWorkspaceCliCommand(command, {
        root: fixtureRoot,
        title: fixture.title,
        summary: fixture.summary,
        json: true,
        fs: createBoundedExecutionFixtureFileSystem(fixture),
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
      });
      expect(cliResult.exitCode).toBe(0);
      const parsed = JSON.parse(cliResult.stdout) as {
        executionGate: string;
        mutationAllowed: boolean;
        networkAccess: boolean;
        processExecution: boolean;
      };
      expect(parsed.executionGate).toBe(viewmodel.executionGate);
      expect(parsed.mutationAllowed).toBe(viewmodel.mutationAllowed);
      expect(parsed.networkAccess).toBe(false);
      expect(parsed.processExecution).toBe(false);
    }
  });
});
