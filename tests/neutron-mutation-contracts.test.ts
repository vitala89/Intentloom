import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { listRegisteredNeutronTools } from "../packages/application/src/neutron-tool-registry.js";
import {
  NEUTRON_MUTATION_APPROVAL_SCHEMA_URN,
  NEUTRON_MUTATION_CLASS,
  NEUTRON_MUTATION_PREFLIGHT_REQUEST_SCHEMA_URN,
  NEUTRON_MUTATION_PREFLIGHT_RESULT_SCHEMA_URN,
  NEUTRON_MUTATION_PROPOSAL_SCHEMA_URN,
  type NeutronMutationApproval,
  type NeutronMutationPreflightRequest,
  type NeutronMutationProposal,
} from "../packages/protocol/src/neutron-mutation.js";
import {
  NEUTRON_READ_ONLY_TOOLS,
  NEUTRON_RUNTIME_SESSION_SCHEMA_URN,
  type NeutronRuntimeSession,
} from "../packages/protocol/src/neutron-runtime.js";
import { validateNeutronRuntimeSession } from "../packages/validator/src/neutron-runtime.js";
import {
  digestNeutronMutationApproval,
  digestNeutronMutationProposal,
  expectedNeutronMutationApprovalToken,
  validateNeutronMutationApproval,
  validateNeutronMutationPreflightRequest,
  validateNeutronMutationPreflightResult,
  validateNeutronMutationProposal,
} from "../packages/validator/src/neutron-mutation.js";

function loadJson(name: string): unknown {
  return JSON.parse(
    readFileSync(resolve("tests/fixtures/neutron-mutation", name), "utf8"),
  ) as unknown;
}

function loadProposal(): NeutronMutationProposal {
  return loadJson("proposal.v1.json") as NeutronMutationProposal;
}

function loadApproval(): NeutronMutationApproval {
  return loadJson("approval.v1.json") as NeutronMutationApproval;
}

describe("Neutron mutation proposal", () => {
  it("accepts the frozen fixture and canonicalizes path order", () => {
    const shuffled = {
      ...loadProposal(),
      plan: {
        ...loadProposal().plan,
        changedPaths: ["src/z.ts", "src/a.ts"],
      },
    };
    const accepted = validateNeutronMutationProposal(shuffled);
    expect(accepted.plan.changedPaths).toEqual(["src/a.ts", "src/z.ts"]);
    expect(accepted.proposalDigest).toBe(loadProposal().proposalDigest);
  });

  it("rejects a missing required field", () => {
    const { proposalId: _omit, ...rest } = loadProposal();
    expect(() => validateNeutronMutationProposal(rest)).toThrow(/proposalId/);
  });

  it("ignores unknown non-authority extras", () => {
    expect(
      validateNeutronMutationProposal({ ...loadProposal(), comment: "note" }),
    ).toMatchObject({ proposalId: "proposal-fixture-1" });
  });

  it("rejects a malformed digest", () => {
    expect(() =>
      validateNeutronMutationProposal({
        ...loadProposal(),
        proposalDigest: "sha256:not-hex",
      }),
    ).toThrow(/sha256:<64 lowercase hex/);
  });

  it("rejects a mismatched schema version", () => {
    expect(() =>
      validateNeutronMutationProposal({
        ...loadProposal(),
        schemaVersion: "urn:intentloom:schema:neutron-mutation-proposal:0",
      }),
    ).toThrow(/unsupported neutron mutation proposal schema/);
  });

  it("rejects absolute and duplicate paths", () => {
    expect(() =>
      validateNeutronMutationProposal({
        ...loadProposal(),
        plan: { ...loadProposal().plan, changedPaths: ["/etc/passwd"] },
      }),
    ).toThrow(/project-relative path/);
    expect(() =>
      validateNeutronMutationProposal({
        ...loadProposal(),
        plan: {
          ...loadProposal().plan,
          changedPaths: ["src/a.ts", "src/a.ts"],
        },
      }),
    ).toThrow(/duplicate paths/);
  });

  it("changes digest when paths or baseline change", () => {
    const base = loadProposal();
    const pathChanged = digestNeutronMutationProposal({
      ...base,
      plan: { ...base.plan, changedPaths: ["src/a.ts", "src/b.ts"] },
    });
    const baselineChanged = digestNeutronMutationProposal({
      ...base,
      plan: {
        ...base.plan,
        projectStateDigest: `sha256:${"c".repeat(64)}`,
      },
    });
    expect(pathChanged).not.toBe(base.proposalDigest);
    expect(baselineChanged).not.toBe(base.proposalDigest);
    expect(pathChanged).not.toBe(baselineChanged);
  });
});

describe("Neutron mutation bound approval", () => {
  it("accepts the frozen host-issued fixture", () => {
    const accepted = validateNeutronMutationApproval(loadApproval());
    expect(accepted.approvalSource).toBe("local-interactive");
    expect(accepted.approvalToken).toBe(
      expectedNeutronMutationApprovalToken(accepted.proposalDigest),
    );
  });

  it("rejects a malformed token", () => {
    expect(() =>
      validateNeutronMutationApproval({
        ...loadApproval(),
        approvalToken: "granted",
      }),
    ).toThrow(/approved:<proposalDigest>/);
  });

  it("rejects a mismatched approval digest", () => {
    expect(() =>
      validateNeutronMutationApproval({
        ...loadApproval(),
        approvalDigest: `sha256:${"d".repeat(64)}`,
      }),
    ).toThrow(/approvalDigest does not match/);
  });

  it("rejects invalid expiry shape and inverted timestamps", () => {
    expect(() =>
      validateNeutronMutationApproval({
        ...loadApproval(),
        approvalValidUntil: "tomorrow",
      }),
    ).toThrow(/non-negative integer/);
    expect(() =>
      validateNeutronMutationApproval({
        ...loadApproval(),
        approvedAt: 2,
        approvalValidUntil: 1,
      }),
    ).toThrow(/must not precede approvedAt/);
  });

  it("rejects duplicate paths", () => {
    expect(() =>
      validateNeutronMutationApproval({
        ...loadApproval(),
        changedPaths: ["src/a.ts", "src/a.ts"],
      }),
    ).toThrow(/duplicate paths/);
  });

  it("invalidates the digest when root, session, task, paths, or baseline change", () => {
    const approval = loadApproval();
    const { approvalDigest: _omit, ...unsigned } = approval;
    expect(
      digestNeutronMutationApproval({ ...unsigned, root: "/other" }),
    ).not.toBe(approval.approvalDigest);
    expect(
      digestNeutronMutationApproval({ ...unsigned, sessionId: "other" }),
    ).not.toBe(approval.approvalDigest);
    expect(
      digestNeutronMutationApproval({ ...unsigned, taskId: "other-task" }),
    ).not.toBe(approval.approvalDigest);
    expect(
      digestNeutronMutationApproval({
        ...unsigned,
        changedPaths: ["src/a.ts"],
      }),
    ).not.toBe(approval.approvalDigest);
    expect(
      digestNeutronMutationApproval({
        ...unsigned,
        projectStateDigest: `sha256:${"c".repeat(64)}`,
      }),
    ).not.toBe(approval.approvalDigest);
    expect(
      digestNeutronMutationApproval({
        ...unsigned,
        proposalDigest: `sha256:${"e".repeat(64)}`,
      }),
    ).not.toBe(approval.approvalDigest);
  });
});

describe("Neutron mutation preflight contracts", () => {
  it("accepts the frozen request and deterministic results", () => {
    const request = validateNeutronMutationPreflightRequest(
      loadJson("preflight-request.v1.json"),
    );
    expect(request.schemaVersion).toBe(
      NEUTRON_MUTATION_PREFLIGHT_REQUEST_SCHEMA_URN,
    );
    expect(
      validateNeutronMutationPreflightResult(
        loadJson("preflight-result-eligible.v1.json"),
      ).decision,
    ).toBe("eligible");
    expect(
      validateNeutronMutationPreflightResult(
        loadJson("preflight-result-rejected.v1.json"),
      ).reasons,
    ).toEqual(["project-state-mismatch"]);
  });

  it("rejects a malformed request and unstructured result", () => {
    expect(() =>
      validateNeutronMutationPreflightRequest({
        schemaVersion: NEUTRON_MUTATION_PREFLIGHT_REQUEST_SCHEMA_URN,
      }),
    ).toThrow(/mutation proposal must be an object/);
    expect(() =>
      validateNeutronMutationPreflightResult({
        schemaVersion: NEUTRON_MUTATION_PREFLIGHT_RESULT_SCHEMA_URN,
        decision: "eligible",
        reasons: ["cancelled"],
        proposalDigest: loadProposal().proposalDigest,
        approvalId: "approval-fixture-1",
      }),
    ).toThrow(/must not include reasons/);
    expect(() =>
      validateNeutronMutationPreflightResult({
        schemaVersion: NEUTRON_MUTATION_PREFLIGHT_RESULT_SCHEMA_URN,
        decision: "rejected",
        reasons: [],
        proposalDigest: loadProposal().proposalDigest,
        approvalId: "approval-fixture-1",
      }),
    ).toThrow(/structured reasons/);
  });
});

describe("Neutron mutation security boundary", () => {
  it("rejects model self-approval fields on the proposal", () => {
    expect(() =>
      validateNeutronMutationProposal({ ...loadProposal(), approved: true }),
    ).toThrow(/must not include approved/);
    expect(() =>
      validateNeutronMutationProposal({
        ...loadProposal(),
        grantedApprovals: ["atomic-commit-approval"],
      }),
    ).toThrow(/must not include grantedApprovals/);
    expect(() =>
      validateNeutronMutationProposal({
        ...loadProposal(),
        approvalToken: expectedNeutronMutationApprovalToken(
          loadProposal().proposalDigest,
        ),
      }),
    ).toThrow(/must not include approvalToken/);
  });

  it("does not treat grantedApprovals as a bound approval", () => {
    expect(() =>
      validateNeutronMutationApproval({
        schemaVersion: NEUTRON_MUTATION_APPROVAL_SCHEMA_URN,
        grantedApprovals: ["atomic-commit-approval"],
      }),
    ).toThrow(/must not accept grantedApprovals/);
    expect(() =>
      validateNeutronMutationApproval({
        schemaVersion: 1,
        targetResourceId: "project",
        plan: loadProposal().plan,
        grantedApprovals: ["atomic-commit-approval"],
      }),
    ).toThrow(/unsupported neutron mutation approval schema/);
  });

  it("keeps session mutationAllowed as literal false", () => {
    const session: NeutronRuntimeSession = {
      schemaVersion: NEUTRON_RUNTIME_SESSION_SCHEMA_URN,
      sessionId: "session-fixture-1",
      root: "/project",
      projectId: "project-fixture-1",
      state: "planning",
      mutationAllowed: false,
      createdAt: "2026-09-07T00:00:00.000Z",
    };
    expect(validateNeutronRuntimeSession(session).mutationAllowed).toBe(false);
    expect(() =>
      validateNeutronRuntimeSession({ ...session, mutationAllowed: true }),
    ).toThrow(/mutationAllowed must be false/);
  });

  it("does not register an N4 mutation tool", () => {
    const names = listRegisteredNeutronTools().map((tool) => tool.toolName);
    expect(names).toEqual([...NEUTRON_READ_ONLY_TOOLS]);
    expect(names).not.toContain("applyApprovedTransaction");
    expect(NEUTRON_MUTATION_CLASS).toBe("approved-transaction-apply");
  });

  it("does not execute Apply from these contracts", () => {
    const request = loadJson(
      "preflight-request.v1.json",
    ) as NeutronMutationPreflightRequest;
    expect(
      validateNeutronMutationPreflightRequest(request).approval.approvalId,
    ).toBe("approval-fixture-1");
    expect(NEUTRON_MUTATION_PROPOSAL_SCHEMA_URN).toContain("proposal:1");
  });
});
