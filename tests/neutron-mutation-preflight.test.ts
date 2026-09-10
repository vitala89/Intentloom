import { mkdir, readFile, realpath, stat, writeFile } from "node:fs/promises";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { listRegisteredNeutronTools } from "../packages/application/src/neutron-tool-registry.js";
import { fingerprintNeutronProjectRoot } from "../packages/application/src/neutron-session-fingerprint.js";
import { preflightNeutronMutation } from "../packages/application/src/neutron-mutation-preflight.js";
import { neutronMutationOutcomeLeaksToken } from "../packages/application/src/neutron-mutation-diagnostics.js";
import type { NeutronMutationPathFilesystem } from "../packages/application/src/neutron-mutation-containment.js";
import { classifyNeutronMutationRoute } from "../packages/application/src/neutron-mutation-authorization.js";
import * as approvedApplyEngine from "../packages/application/src/approved-apply-engine.js";
import {
  NEUTRON_MUTATION_CLASS,
  NEUTRON_MUTATION_PREFLIGHT_REQUEST_SCHEMA_URN,
  type NeutronMutationApproval,
  type NeutronMutationPreflightRequest,
  type NeutronMutationProposal,
} from "../packages/protocol/src/neutron-mutation.js";
import {
  NEUTRON_READ_ONLY_TOOLS,
  NEUTRON_RUNTIME_SESSION_SCHEMA_URN,
  type NeutronRuntimeSession,
} from "../packages/protocol/src/neutron-runtime.js";
import {
  digestNeutronMutationApproval,
  digestNeutronMutationProposal,
  expectedNeutronMutationApprovalToken,
} from "../packages/validator/src/neutron-mutation.js";

const FIXTURE_NOW = 1_750_000_000_000;
const STATE_DIGEST = `sha256:${"b".repeat(64)}`;

function loadJson(name: string): unknown {
  return JSON.parse(
    readFileSync(resolve("tests/fixtures/neutron-mutation", name), "utf8"),
  ) as unknown;
}

function loadRequest(): NeutronMutationPreflightRequest {
  return structuredClone(
    loadJson("preflight-request.v1.json"),
  ) as NeutronMutationPreflightRequest;
}

function hostAuth() {
  return { kind: "host" as const, mutationClass: NEUTRON_MUTATION_CLASS };
}

function lexicalFs(root: string): NeutronMutationPathFilesystem {
  const canonical = resolve(root);
  const prefix = canonical.endsWith(sep) ? canonical : `${canonical}${sep}`;
  return {
    async exists(path) {
      const resolved = resolve(path);
      return resolved === canonical || resolved.startsWith(prefix);
    },
    async realpath(path) {
      return resolve(path);
    },
  };
}

function nodePathFs(): NeutronMutationPathFilesystem {
  return {
    async exists(path) {
      try {
        await stat(path);
        return true;
      } catch {
        return false;
      }
    },
    realpath,
  };
}

function readOnlyCapabilities() {
  return {
    readOnly: true,
    allowedPaths: ["."],
    allowedTools: [] as string[],
    maxBudget: 1,
    allowNetwork: false,
  };
}

function sessionFor(
  request: NeutronMutationPreflightRequest,
): NeutronRuntimeSession {
  return {
    schemaVersion: NEUTRON_RUNTIME_SESSION_SCHEMA_URN,
    sessionId: request.proposal.sessionId,
    root: request.proposal.root,
    projectId: request.proposal.projectId,
    state: "planning",
    mutationAllowed: false,
    createdAt: "2026-09-11T00:00:00.000Z",
  };
}

function resignProposal(
  proposal: NeutronMutationProposal,
): NeutronMutationProposal {
  return {
    ...proposal,
    proposalDigest: digestNeutronMutationProposal(proposal),
  };
}

function resignApproval(
  approval: NeutronMutationApproval,
): NeutronMutationApproval {
  const { approvalDigest: _omit, ...unsigned } = approval;
  return {
    ...unsigned,
    approvalDigest: digestNeutronMutationApproval(unsigned),
  };
}

async function runPreflight(
  request: unknown,
  extras: {
    readonly fs?: NeutronMutationPathFilesystem;
    readonly now?: () => number;
    readonly signal?: AbortSignal;
    readonly session?: NeutronRuntimeSession;
    readonly roleCapabilities?: ReturnType<typeof readOnlyCapabilities>;
    readonly delegatedRole?: string;
    readonly actualRoot?: string;
    readonly evaluateProjectStateDigest?: (root: string) => Promise<string>;
    readonly replay?: { isApprovalConsumed: () => boolean | Promise<boolean> };
    readonly authorization?:
      | ReturnType<typeof hostAuth>
      | { kind: "model" }
      | {
          kind: "grantedApprovals";
          grantedApprovals: readonly string[];
        }
      | {
          kind: "role";
          capabilities: ReturnType<typeof readOnlyCapabilities>;
        };
  } = {},
) {
  const parsed =
    typeof request === "object" &&
    request !== null &&
    "proposal" in request &&
    typeof (request as NeutronMutationPreflightRequest).proposal?.root ===
      "string"
      ? (request as NeutronMutationPreflightRequest)
      : undefined;
  return preflightNeutronMutation({
    request,
    authorization: extras.authorization ?? hostAuth(),
    fs: extras.fs ?? lexicalFs(parsed?.proposal.root ?? "/project"),
    now: extras.now ?? (() => FIXTURE_NOW),
    ...(extras.signal !== undefined ? { signal: extras.signal } : {}),
    ...(extras.session !== undefined ? { session: extras.session } : {}),
    ...(extras.roleCapabilities !== undefined
      ? { roleCapabilities: extras.roleCapabilities }
      : {}),
    ...(extras.delegatedRole !== undefined
      ? { delegatedRole: extras.delegatedRole }
      : {}),
    ...(extras.actualRoot !== undefined
      ? { actualRoot: extras.actualRoot }
      : {}),
    ...(extras.evaluateProjectStateDigest !== undefined
      ? { evaluateProjectStateDigest: extras.evaluateProjectStateDigest }
      : {}),
    ...(extras.replay !== undefined ? { replay: extras.replay } : {}),
  });
}

describe("Neutron mutation semantic preflight", () => {
  it("accepts a valid bound host-issued approval as eligible", async () => {
    const request = loadRequest();
    const outcome = await runPreflight(request, {
      session: sessionFor(request),
    });
    expect(outcome.result.decision).toBe("eligible");
    expect(outcome.result.reasons).toEqual([]);
    expect(outcome.diagnostics.capabilityClass).toBe("host");
  });

  it("rejects model approved:true without a bound approval", async () => {
    const request = loadRequest();
    const outcome = await runPreflight({
      schemaVersion: NEUTRON_MUTATION_PREFLIGHT_REQUEST_SCHEMA_URN,
      proposal: request.proposal,
      approved: true,
      currentProjectStateDigest: STATE_DIGEST,
    });
    expect(outcome.result.decision).toBe("rejected");
    expect(outcome.result.reasons).toEqual(["invalid-approval"]);
  });

  it("rejects legacy grantedApprovals without NeutronMutationApproval", async () => {
    const request = loadRequest();
    const spoofed = await runPreflight({
      schemaVersion: NEUTRON_MUTATION_PREFLIGHT_REQUEST_SCHEMA_URN,
      proposal: request.proposal,
      grantedApprovals: ["atomic-commit-approval"],
      currentProjectStateDigest: STATE_DIGEST,
    });
    expect(spoofed.result.reasons).toEqual(["invalid-approval"]);
    const viaAuth = await runPreflight(request, {
      authorization: {
        kind: "grantedApprovals",
        grantedApprovals: ["atomic-commit-approval"],
      },
    });
    expect(viaAuth.result.reasons).toEqual(["invalid-approval"]);
  });

  it("rejects a wrong approval token binding", async () => {
    const request = loadRequest();
    const outcome = await runPreflight({
      ...request,
      approval: {
        ...request.approval,
        approvalToken:
          "approved:sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
      },
    });
    expect(outcome.result.reasons).toEqual(["invalid-approval"]);
  });

  it("accepts approval just before expiry and rejects after the deadline", async () => {
    const request = loadRequest();
    const before = await runPreflight(request, {
      now: () => request.approval.approvalValidUntil - 1,
    });
    expect(before.result.decision).toBe("eligible");
    const expired = await runPreflight(request, {
      now: () => request.approval.approvalValidUntil,
    });
    expect(expired.result.reasons).toEqual(["approval-expired"]);
    const after = await runPreflight(request, {
      now: () => request.approval.approvalValidUntil + 1,
    });
    expect(after.result.reasons).toEqual(["approval-expired"]);
  });

  it("rejects an invalid timestamp structurally", async () => {
    const request = loadRequest();
    const outcome = await runPreflight({
      ...request,
      approval: { ...request.approval, approvalValidUntil: "tomorrow" },
    });
    expect(outcome.result.reasons).toEqual(["invalid-approval"]);
  });

  it("rejects proposal tampering after approval", async () => {
    const request = loadRequest();
    const proposal = resignProposal({
      ...request.proposal,
      plan: { ...request.proposal.plan, expiresAt: 1_800_000_000_001 },
    });
    const outcome = await runPreflight({ ...request, proposal });
    expect(outcome.result.reasons).toEqual(["proposal-digest-mismatch"]);
  });

  it("rejects ApprovedApplyPlan digest tampering on the approval", async () => {
    const request = loadRequest();
    const approval = resignApproval({
      ...request.approval,
      planDigest: `sha256:${"f".repeat(64)}`,
    });
    const outcome = await runPreflight({ ...request, approval });
    expect(outcome.result.reasons).toEqual(["approval-scope-mismatch"]);
  });

  it("rejects root, project, and session mismatches", async () => {
    const request = loadRequest();
    const root = await runPreflight({
      ...request,
      approval: resignApproval({ ...request.approval, root: "/other" }),
    });
    expect(root.result.reasons).toEqual(["root-mismatch"]);
    const project = await runPreflight({
      ...request,
      approval: resignApproval({
        ...request.approval,
        projectId: "other-project",
      }),
    });
    expect(project.result.reasons).toEqual(["invalid-approval"]);
    const session = await runPreflight({
      ...request,
      approval: resignApproval({
        ...request.approval,
        sessionId: "other-session",
      }),
    });
    expect(session.result.reasons).toEqual(["invalid-approval"]);
    const task = await runPreflight({
      ...request,
      approval: resignApproval({
        ...request.approval,
        taskId: "other-task",
      }),
    });
    expect(task.result.reasons).toEqual(["invalid-approval"]);
  });

  it("rejects a stale project-state digest", async () => {
    const request = loadRequest();
    const stale = `sha256:${"c".repeat(64)}`;
    const outcome = await runPreflight({
      ...request,
      currentProjectStateDigest: stale,
    });
    expect(outcome.result.reasons).toEqual(["project-state-mismatch"]);
    const live = await runPreflight(request, {
      evaluateProjectStateDigest: async () => stale,
    });
    expect(live.result.reasons).toEqual(["project-state-mismatch"]);
  });

  it("rejects affected-scope widening and unapproved targets", async () => {
    const request = loadRequest();
    const widened = await runPreflight({
      ...request,
      approval: resignApproval({
        ...request.approval,
        changedPaths: ["src/a.ts", "src/extra.ts", "src/z.ts"],
      }),
    });
    expect(widened.result.reasons).toEqual(["approval-scope-mismatch"]);
    const narrowed = await runPreflight({
      ...request,
      approval: resignApproval({
        ...request.approval,
        changedPaths: ["src/a.ts"],
      }),
    });
    expect(narrowed.result.reasons).toEqual(["affected-path-mismatch"]);
  });

  it("rejects absolute and traversal paths at the structural boundary", async () => {
    const request = loadRequest();
    const absolute = await runPreflight({
      ...request,
      proposal: {
        ...request.proposal,
        plan: { ...request.proposal.plan, changedPaths: ["/etc/passwd"] },
      },
    });
    expect(absolute.result.reasons).toEqual(["invalid-approval"]);
    const traversal = await runPreflight({
      ...request,
      proposal: {
        ...request.proposal,
        plan: { ...request.proposal.plan, changedPaths: ["../outside.ts"] },
      },
    });
    expect(traversal.result.reasons).toEqual(["invalid-approval"]);
  });

  it("rejects read-only capability, delegated roles, and model authorization", async () => {
    const request = loadRequest();
    const capabilities = readOnlyCapabilities();
    const role = await runPreflight(request, {
      roleCapabilities: capabilities,
    });
    expect(role.result.reasons).toEqual(["capability-denied"]);
    const delegated = await runPreflight(request, {
      delegatedRole: "context-scout",
    });
    expect(delegated.result.reasons).toEqual(["capability-denied"]);
    const model = await runPreflight(request, {
      authorization: { kind: "model" },
    });
    expect(model.result.reasons).toEqual(["capability-denied"]);
    const roleKind = await runPreflight(request, {
      authorization: { kind: "role", capabilities },
    });
    expect(roleKind.result.reasons).toEqual(["capability-denied"]);
  });

  it("rejects a cancelled session or aborted signal before evaluation", async () => {
    const request = loadRequest();
    const cancelled = await runPreflight({
      ...request,
      sessionState: "cancelled",
    });
    expect(cancelled.result.reasons).toEqual(["cancelled"]);
    const signal = new AbortController();
    signal.abort();
    const aborted = await runPreflight(request, { signal: signal.signal });
    expect(aborted.result.reasons).toEqual(["cancelled"]);
  });

  it("rejects when the replay checker reports the approval consumed", async () => {
    const request = loadRequest();
    const outcome = await runPreflight(request, {
      replay: { isApprovalConsumed: () => true },
    });
    expect(outcome.result.reasons).toEqual(["replayed-approval"]);
  });

  it("does not leak the raw approval token in rejection diagnostics", async () => {
    const request = loadRequest();
    const token = request.approval.approvalToken;
    const outcome = await runPreflight({
      ...request,
      approval: resignApproval({
        ...request.approval,
        projectId: "other-project",
      }),
    });
    expect(outcome.result.decision).toBe("rejected");
    expect(neutronMutationOutcomeLeaksToken(outcome, token)).toBe(false);
    expect(JSON.stringify(outcome)).not.toContain(token);
  });

  it("keeps mutationAllowed false and does not register a write tool", async () => {
    const request = loadRequest();
    const outcome = await runPreflight(request, {
      session: sessionFor(request),
    });
    expect(outcome.result.decision).toBe("eligible");
    expect(sessionFor(request).mutationAllowed).toBe(false);
    const names = listRegisteredNeutronTools().map((tool) => tool.toolName);
    expect(names).toEqual([...NEUTRON_READ_ONLY_TOOLS]);
    expect(names).not.toContain("applyApprovedTransaction");
    expect(classifyNeutronMutationRoute(NEUTRON_MUTATION_CLASS)).toEqual({
      mutationClass: NEUTRON_MUTATION_CLASS,
      applyAuthorized: false,
      supported: true,
    });
  });

  it("proves eligible preflight is zero-write and never reaches Apply", async () => {
    const apply = vi.spyOn(approvedApplyEngine, "executeApprovedApplyPlan");
    const sandbox = await mkdtemp(join(tmpdir(), "neutron-preflight-"));
    const root = join(sandbox, "project");
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src", "a.ts"), "export const a = 1;\n");
    await writeFile(join(root, "src", "z.ts"), "export const z = 1;\n");
    const before = await fingerprintNeutronProjectRoot(root);
    const base = loadRequest();
    const proposal = resignProposal({
      ...base.proposal,
      root,
      plan: { ...base.proposal.plan, targetRoot: root },
    });
    const approval = resignApproval({
      ...base.approval,
      root,
      proposalDigest: proposal.proposalDigest,
      approvalToken: expectedNeutronMutationApprovalToken(
        proposal.proposalDigest,
      ),
    });
    const request: NeutronMutationPreflightRequest = {
      ...base,
      proposal,
      approval,
    };
    const outcome = await runPreflight(request, {
      fs: nodePathFs(),
      actualRoot: root,
      session: { ...sessionFor(request), root },
    });
    expect(outcome.result.decision).toBe("eligible");
    expect(apply).not.toHaveBeenCalled();
    expect(await readFile(join(root, "src", "a.ts"), "utf8")).toBe(
      "export const a = 1;\n",
    );
    const after = await fingerprintNeutronProjectRoot(root);
    expect(after).toBe(before);
    const sources = [
      "packages/application/src/neutron-mutation-preflight.ts",
      "packages/application/src/neutron-mutation-authorization.ts",
      "packages/application/src/neutron-mutation-bindings.ts",
      "packages/application/src/neutron-mutation-containment.ts",
      "packages/application/src/neutron-mutation-diagnostics.ts",
      "packages/application/src/neutron-mutation-preflight-parse.ts",
      "packages/application/src/neutron-mutation-replay.ts",
      "packages/application/src/neutron-mutation-lock.ts",
    ];
    for (const file of sources) {
      const text = readFileSync(file, "utf8");
      expect(text).not.toContain("executeApprovedApplyPlan");
      expect(text).not.toContain("synchronizeGeneratedFiles");
    }
    apply.mockRestore();
  });
});
