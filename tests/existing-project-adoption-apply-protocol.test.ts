import { describe, expect, it } from "vitest";
import {
  EXISTING_PROJECT_ADOPTION_APPLY_METHOD,
  PROTOCOL_VERSION,
  ProtocolValidationError,
  createExistingProjectAdoptionApplyRequest,
  parseDaemonRequest,
  parseExistingProjectAdoptionApplyViewModel,
  parseExistingProjectAdoptionApproval,
  parseExistingProjectAdoptionPreparedPlan,
} from "@intentloom/protocol";

function samplePlan() {
  return parseExistingProjectAdoptionPreparedPlan({
    schemaVersion: 1,
    readOnly: true,
    classification: "read-only",
    applied: false,
    changesApplied: 0,
    approved: false,
    root: "/workspace/example",
    projectId: "example-workspace",
    profile: "typescript",
    workspaceTopology: "nx",
    detectedAdapters: ["codex"],
    previewIdentity: "a".repeat(64),
    preparedPlanId: "prepared-plan-aaaaaaaaaaaaaaaaaaaaaaaa",
    planDigest: "b".repeat(64),
    projectFingerprint: "c".repeat(64),
    createdAt: 1_700_000_000_000,
    expiresAt: 1_700_000_900_000,
    decisions: [{ path: "AGENTS.md", kind: "keep-project-owned" }],
    affectedPaths: ["AGENTS.md"],
    plannedActions: [
      {
        path: "AGENTS.md",
        action: "map-existing-project-owned",
        currentClassification: "project-owned",
        proposedClassification: "project-owned",
        manualDecisionRequired: false,
      },
    ],
    diagnostics: [],
    remainingManualDecisionPaths: [],
  });
}

function sampleApproval() {
  return parseExistingProjectAdoptionApproval({
    schemaVersion: 1,
    readOnly: true,
    classification: "read-only",
    approved: true,
    applied: false,
    changesApplied: 0,
    approvalId: "adoption-approval-aaaaaaaaaaaaaaaaaaaaaaaa",
    approvalDigest: "d".repeat(64),
    approvalSource: "local-interactive",
    approvalToken: `approved:${"b".repeat(64)}`,
    root: "/workspace/example",
    previewIdentity: "a".repeat(64),
    preparedPlanId: "prepared-plan-aaaaaaaaaaaaaaaaaaaaaaaa",
    planDigest: "b".repeat(64),
    projectFingerprint: "c".repeat(64),
    approvedAt: 1_700_000_000_100,
    approvalValidUntil: 1_700_000_900_000,
    preparedPlanExpiresAt: 1_700_000_900_000,
  });
}

describe("existing-project adoption apply protocol", () => {
  it("parses a valid apply payload and round-trips JSON", () => {
    const request = createExistingProjectAdoptionApplyRequest(
      1,
      "/workspace/example",
      "prepared-plan-aaaaaaaaaaaaaaaaaaaaaaaa",
      "b".repeat(64),
      samplePlan(),
      sampleApproval(),
    );
    expect(request.method).toBe(EXISTING_PROJECT_ADOPTION_APPLY_METHOD);
    expect(request.params.protocolVersion).toBe(PROTOCOL_VERSION);
    const parsed = parseDaemonRequest(JSON.parse(JSON.stringify(request)));
    expect(parsed.method).toBe(EXISTING_PROJECT_ADOPTION_APPLY_METHOD);
    const viewmodel = parseExistingProjectAdoptionApplyViewModel({
      schemaVersion: 1,
      readOnly: false,
      classification: "mutating",
      status: "applied",
      reasons: [],
      applied: true,
      alreadyApplied: false,
      ready: true,
      changesApplied: 2,
      canonicalRoot: "/workspace/example",
      preparedPlanId: "prepared-plan-aaaaaaaaaaaaaaaaaaaaaaaa",
      planDigest: "b".repeat(64),
      approvalId: "adoption-approval-aaaaaaaaaaaaaaaaaaaaaaaa",
      appliedPaths: [".aif/config.yaml"],
      unchangedPaths: ["AGENTS.md"],
      rollbackAttempted: false,
      rollbackCompleted: true,
      rollbackFailures: [],
      doctor: { errorCount: 0, warningCount: 0, codes: [] },
      diff: { unmanagedDriftPaths: [] },
      inspectionReadiness: "ready",
      recoveryGuidance: null,
      diagnostics: [],
      cancelledAfterCommit: false,
      approval: sampleApproval(),
      plan: samplePlan(),
    });
    expect(viewmodel.status).toBe("applied");
    expect(JSON.stringify(viewmodel)).not.toContain("previousContent");
  });

  it("rejects missing approval, malformed hashes, previousContent, and unsupported schema", () => {
    const plan = samplePlan();
    const approval = sampleApproval();
    expect(() =>
      parseDaemonRequest({
        jsonrpc: "2.0",
        id: 1,
        method: EXISTING_PROJECT_ADOPTION_APPLY_METHOD,
        params: {
          protocolVersion: PROTOCOL_VERSION,
          root: "/workspace/example",
          preparedPlanId: plan.preparedPlanId,
          planDigest: plan.planDigest,
          preparedPlan: plan,
        },
      }),
    ).toThrow(ProtocolValidationError);
    expect(() =>
      parseDaemonRequest({
        jsonrpc: "2.0",
        id: 1,
        method: EXISTING_PROJECT_ADOPTION_APPLY_METHOD,
        params: {
          protocolVersion: PROTOCOL_VERSION,
          root: "/workspace/example",
          preparedPlanId: plan.preparedPlanId,
          planDigest: "not-a-hash",
          preparedPlan: plan,
          approval,
        },
      }),
    ).toThrow(ProtocolValidationError);
    expect(() =>
      parseDaemonRequest({
        jsonrpc: "2.0",
        id: 1,
        method: EXISTING_PROJECT_ADOPTION_APPLY_METHOD,
        params: {
          protocolVersion: PROTOCOL_VERSION,
          root: "/workspace/example",
          preparedPlanId: plan.preparedPlanId,
          planDigest: plan.planDigest,
          preparedPlan: plan,
          approval,
          previousContent: "secret",
        },
      }),
    ).toThrow(/previousContent/);
    expect(() =>
      parseExistingProjectAdoptionApplyViewModel({
        schemaVersion: 2,
        readOnly: false,
        classification: "mutating",
        status: "applied",
        reasons: [],
        applied: true,
        alreadyApplied: false,
        ready: true,
        changesApplied: 0,
        canonicalRoot: "/workspace/example",
        preparedPlanId: plan.preparedPlanId,
        planDigest: plan.planDigest,
        approvalId: approval.approvalId,
        appliedPaths: [],
        unchangedPaths: [],
        rollbackAttempted: false,
        rollbackCompleted: true,
        rollbackFailures: [],
        doctor: null,
        diff: null,
        inspectionReadiness: "ready",
        recoveryGuidance: null,
        diagnostics: [],
        cancelledAfterCommit: false,
        approval,
        plan,
      }),
    ).toThrow(/schemaVersion/);
  });
});
