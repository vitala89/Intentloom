import {
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checksum, type GeneratedFile } from "@intentloom/core";
import {
  executeApprovedApplyPlan,
  GENERATED_FILE_SYNC_DECLARED_PATHS_ONLY,
  nodeFileSystem,
} from "../packages/application/src/index.js";
import { applyApprovedNeutronMutation } from "../packages/application/src/neutron-mutation-apply.js";
import {
  acquireNeutronMutationProjectLock,
  releaseNeutronMutationProjectLock,
} from "../packages/application/src/neutron-mutation-apply-lock.js";
import { createMemoryNeutronMutationApprovalStore } from "../packages/application/src/neutron-mutation-apply-store.js";
import { classifyNeutronMutationRoute } from "../packages/application/src/neutron-mutation-authorization.js";
import { fingerprintNeutronProjectRoot } from "../packages/application/src/neutron-session-fingerprint.js";
import { listRegisteredNeutronTools } from "../packages/application/src/neutron-tool-registry.js";
import {
  NEUTRON_MUTATION_APPROVAL_SCHEMA_URN,
  NEUTRON_MUTATION_APPROVAL_SOURCE,
  NEUTRON_MUTATION_CLASS,
  NEUTRON_MUTATION_PROPOSAL_SCHEMA_URN,
  type NeutronMutationApproval,
  type NeutronMutationProposal,
} from "../packages/protocol/src/neutron-mutation.js";
import {
  NEUTRON_READ_ONLY_TOOLS,
  NEUTRON_RUNTIME_SESSION_SCHEMA_URN,
} from "../packages/protocol/src/neutron-runtime.js";
import { validateNeutronRuntimeSession } from "../packages/validator/src/neutron-runtime.js";
import {
  digestContentBoundApplyPlan,
  digestGeneratedFileContent,
  digestNeutronMutationApproval,
  digestNeutronMutationProposal,
  expectedNeutronMutationApprovalToken,
  materializeNeutronMutationReviewArtifact,
} from "../packages/validator/src/neutron-mutation.js";

const NOW = 1_750_000_000_000;
const CONTENT_A = "export const a = 1;\n";
const CONTENT_Z = "export const z = 2;\n";

function files(contentA = CONTENT_A): GeneratedFile[] {
  return [
    {
      path: "src/a.ts",
      content: contentA,
      sources: ["review:test"],
      checksum: checksum(contentA),
    },
    {
      path: "src/z.ts",
      content: CONTENT_Z,
      sources: ["review:test"],
      checksum: checksum(CONTENT_Z),
    },
  ];
}

async function prepareProject(): Promise<{
  readonly root: string;
  readonly digest: string;
}> {
  const root = await mkdtemp(join(tmpdir(), "neutron-apply-"));
  await mkdir(join(root, "src"), { recursive: true });
  await writeFile(join(root, "src/a.ts"), "old a\n");
  await writeFile(join(root, "src/z.ts"), "old z\n");
  const digest = `sha256:${await fingerprintNeutronProjectRoot(root)}`;
  return { root, digest };
}

function proposalFor(
  root: string,
  digest: string,
  payload: GeneratedFile[],
): NeutronMutationProposal {
  const fileBindings = payload.map((file) => ({
    path: file.path,
    contentDigest: digestGeneratedFileContent(file.content),
  }));
  const planDigest = digestContentBoundApplyPlan({
    projectStateDigest: digest,
    targetRoot: root,
    fileBindings,
  });
  const facts = {
    proposalId: "proposal-apply-1",
    sessionId: "session-apply-1",
    projectId: "project-apply-1",
    root,
    mutationClass: NEUTRON_MUTATION_CLASS,
    plan: {
      schemaVersion: 1 as const,
      planDigest,
      projectStateDigest: digest,
      targetRoot: root,
      changedPaths: payload.map((file) => file.path),
      expiresAt: NOW + 1_800_000,
    },
  };
  return {
    schemaVersion: NEUTRON_MUTATION_PROPOSAL_SCHEMA_URN,
    ...facts,
    proposalDigest: digestNeutronMutationProposal(facts),
  };
}

function approvalFor(
  proposal: NeutronMutationProposal,
  reviewArtifactDigest: string,
): NeutronMutationApproval {
  const unsigned = {
    schemaVersion: NEUTRON_MUTATION_APPROVAL_SCHEMA_URN,
    approvalId: "approval-apply-1",
    approvalToken: expectedNeutronMutationApprovalToken(
      proposal.proposalDigest,
    ),
    approvalSource: NEUTRON_MUTATION_APPROVAL_SOURCE,
    approvingActor: "human-reviewer",
    root: proposal.root,
    projectId: proposal.projectId,
    sessionId: proposal.sessionId,
    ...(proposal.taskId !== undefined ? { taskId: proposal.taskId } : {}),
    ...(proposal.graphId !== undefined ? { graphId: proposal.graphId } : {}),
    proposalId: proposal.proposalId,
    proposalDigest: proposal.proposalDigest,
    planDigest: proposal.plan.planDigest,
    projectStateDigest: proposal.plan.projectStateDigest,
    changedPaths: proposal.plan.changedPaths,
    mutationClass: proposal.mutationClass,
    approvedAt: NOW,
    approvalValidUntil: NOW + 1_800_000,
    reviewArtifactDigest,
  };
  return {
    ...unsigned,
    approvalDigest: digestNeutronMutationApproval(unsigned),
  };
}

function sessionFor(proposal: NeutronMutationProposal) {
  return validateNeutronRuntimeSession({
    schemaVersion: NEUTRON_RUNTIME_SESSION_SCHEMA_URN,
    sessionId: proposal.sessionId,
    root: proposal.root,
    projectId: proposal.projectId,
    state: "planning",
    mutationAllowed: false,
    createdAt: "2026-09-16T00:00:00.000Z",
  });
}

async function hostApply(input: {
  readonly root: string;
  readonly digest: string;
  readonly payload?: GeneratedFile[];
  readonly mutate?: (
    proposal: NeutronMutationProposal,
    approval: NeutronMutationApproval,
  ) => {
    readonly proposal?: unknown;
    readonly approval?: unknown;
    readonly files?: readonly GeneratedFile[];
  };
  readonly extra?: Record<string, unknown>;
  readonly store?: ReturnType<typeof createMemoryNeutronMutationApprovalStore>;
}) {
  const payload = input.payload ?? files();
  const proposal = proposalFor(input.root, input.digest, payload);
  const artifact = materializeNeutronMutationReviewArtifact({
    proposal,
    files: payload,
    artifactId: "artifact-apply-1",
    transactionId: "txn-apply-1",
  });
  const approval = approvalFor(proposal, artifact.artifactDigest);
  const mutated = input.mutate?.(proposal, approval) ?? {};
  return applyApprovedNeutronMutation({
    proposal: mutated.proposal ?? proposal,
    approval: mutated.approval ?? approval,
    artifact,
    files: mutated.files ?? payload,
    transactionId: "txn-apply-1",
    authorization: { kind: "host", mutationClass: NEUTRON_MUTATION_CLASS },
    fs: nodeFileSystem,
    now: () => NOW,
    session: sessionFor(proposal),
    actualRoot: input.root,
    store: input.store ?? createMemoryNeutronMutationApprovalStore(),
    ...input.extra,
  });
}

describe("Neutron mutation Slice 3 host Apply", () => {
  it("writes reviewed bytes exactly once without undeclared .aif metadata", async () => {
    const project = await prepareProject();
    const result = await hostApply(project);
    if (result.applied !== true) {
      throw new Error(
        JSON.stringify({
          status: result.status,
          failureCode: result.failureCode,
          diagnostics: result.diagnostics,
          verificationStatus: result.verificationStatus,
        }),
      );
    }
    expect(result.applied).toBe(true);
    expect(result.status).toBe("applied");
    expect(result.failureCode).toBeUndefined();
    expect(await readFile(join(project.root, "src/a.ts"), "utf8")).toBe(
      CONTENT_A,
    );
    expect(await readFile(join(project.root, "src/z.ts"), "utf8")).toBe(
      CONTENT_Z,
    );
    expect(
      await nodeFileSystem.exists(
        join(project.root, ".aif/manifest.lock.json"),
      ),
    ).toBe(false);
    expect(
      await nodeFileSystem.exists(join(project.root, ".aif/source-map.json")),
    ).toBe(false);
    expect(JSON.stringify(result).includes("approved:")).toBe(false);
  });

  it("does not write twice on replay of an applied transaction", async () => {
    const project = await prepareProject();
    const store = createMemoryNeutronMutationApprovalStore();
    const first = await hostApply({ ...project, store });
    expect(first.applied).toBe(true);
    await writeFile(join(project.root, "src/a.ts"), "tampered after apply\n");
    const second = await hostApply({ ...project, store });
    expect(second.applied).toBe(true);
    expect(second.transactionId).toBe(first.transactionId);
    expect(await readFile(join(project.root, "src/a.ts"), "utf8")).toBe(
      "tampered after apply\n",
    );
  });

  it("rejects a second project transaction while the lock is held", async () => {
    const project = await prepareProject();
    const canonical = await realpath(project.root);
    const held = acquireNeutronMutationProjectLock({
      canonicalRoot: canonical,
      transactionId: "other-txn",
    });
    expect(held.ok).toBe(true);
    try {
      const result = await hostApply(project);
      expect(result.applied).toBe(false);
      expect(result.failureCode).toBe("lock-conflict");
      expect(await readFile(join(project.root, "src/a.ts"), "utf8")).toBe(
        "old a\n",
      );
    } finally {
      releaseNeutronMutationProjectLock({
        key: canonical,
        transactionId: "other-txn",
      });
    }
  });

  it("cancels before first write with zero mutation", async () => {
    const project = await prepareProject();
    const controller = new AbortController();
    controller.abort();
    const result = await hostApply({
      ...project,
      extra: { signal: controller.signal },
    });
    expect(result.applied).toBe(false);
    expect(result.failureCode).toBe("cancelled-before-write");
    expect(await readFile(join(project.root, "src/a.ts"), "utf8")).toBe(
      "old a\n",
    );
  });

  it("rolls back an injected in-transaction failure and does not retry", async () => {
    const project = await prepareProject();
    const store = createMemoryNeutronMutationApprovalStore();
    const result = await hostApply({
      ...project,
      store,
      extra: { failAt: "post-write-consistency" },
    });
    expect(result.applied).toBe(false);
    expect(result.failureCode).toBe("transaction-failed");
    expect(result.verification?.rollback.verified).toBe(true);
    expect(result.verification?.rollback.completed).toBe(true);
    expect(result.reconciliationRequired).toBe(false);
    expect(await readFile(join(project.root, "src/a.ts"), "utf8")).toBe(
      "old a\n",
    );
    const replay = await hostApply({
      ...project,
      store,
      extra: { failAt: "post-write-consistency" },
    });
    expect(replay.applied).toBe(false);
    expect(replay.failureCode).toBe("approval-consumed");
  });

  it("records reconciliation when rollback is incomplete", async () => {
    const project = await prepareProject();
    const result = await hostApply({
      ...project,
      extra: {
        failAt: "post-write-consistency",
        rollbackFailPaths: ["src/a.ts"],
      },
    });
    expect(result.applied).toBe(false);
    expect(result.failureCode).toBe("rollback-incomplete");
    expect(result.reconciliationRequired).toBe(true);
    expect(result.rollbackCompleted).toBe(false);
  });

  it("rejects stale project state before the first write", async () => {
    const project = await prepareProject();
    await writeFile(join(project.root, "src/a.ts"), "drift after approval\n");
    const result = await hostApply({
      ...project,
      extra: {
        evaluateProjectStateDigest: async () => `sha256:${"a".repeat(64)}`,
      },
    });
    expect(result.applied).toBe(false);
    expect(result.failureCode).toBe("project-stale");
    expect(await readFile(join(project.root, "src/a.ts"), "utf8")).toBe(
      "drift after approval\n",
    );
  });

  it("rejects a symlink substitution between review and apply", async () => {
    const sandbox = await mkdtemp(join(tmpdir(), "neutron-symlink-"));
    const root = join(sandbox, "project");
    const outside = join(sandbox, "outside");
    await mkdir(join(root, "src"), { recursive: true });
    await mkdir(outside);
    await writeFile(join(root, "src/a.ts"), "old a\n");
    await writeFile(join(root, "src/z.ts"), "old z\n");
    await writeFile(join(outside, "a.ts"), "escaped\n");
    const digest = `sha256:${await fingerprintNeutronProjectRoot(root)}`;
    await nodeFileSystem.remove(join(root, "src/a.ts"));
    await symlink(join(outside, "a.ts"), join(root, "src/a.ts"));
    const result = await hostApply({
      root,
      digest,
      extra: { evaluateProjectStateDigest: async () => digest },
    });
    expect(result.applied).toBe(false);
    expect(result.failureCode).toBe("containment-failed");
    expect(await readFile(join(outside, "a.ts"), "utf8")).toBe("escaped\n");
  });

  it("rejects model grantedApprovals and approved flags without writing", async () => {
    const project = await prepareProject();
    const granted = await hostApply({
      ...project,
      extra: { grantedApprovals: ["atomic-commit-approval"] },
    });
    expect(granted.applied).toBe(false);
    expect(granted.failureCode).toBe("approval-invalid");
    const approved = await hostApply({
      ...project,
      extra: { approved: true },
    });
    expect(approved.applied).toBe(false);
    expect(await readFile(join(project.root, "src/a.ts"), "utf8")).toBe(
      "old a\n",
    );
  });

  it("rejects caller-controlled grantedApprovals authorization", async () => {
    const project = await prepareProject();
    const result = await hostApply({
      ...project,
      extra: {
        authorization: {
          kind: "grantedApprovals",
          grantedApprovals: ["atomic-commit-approval"],
        },
      },
    });
    expect(result.applied).toBe(false);
    expect(result.failureCode).toBe("approval-invalid");
    expect(await readFile(join(project.root, "src/a.ts"), "utf8")).toBe(
      "old a\n",
    );
  });

  it("keeps mutationAllowed false and the N4 catalog read-only", () => {
    const session = validateNeutronRuntimeSession({
      schemaVersion: NEUTRON_RUNTIME_SESSION_SCHEMA_URN,
      sessionId: "s",
      root: "/p",
      projectId: "p",
      state: "planning",
      mutationAllowed: false,
      createdAt: "2026-09-16T00:00:00.000Z",
    });
    expect(session.mutationAllowed).toBe(false);
    expect(
      classifyNeutronMutationRoute(NEUTRON_MUTATION_CLASS).applyAuthorized,
    ).toBe(false);
    const tools = listRegisteredNeutronTools();
    expect(tools.map((tool) => tool.toolName).sort()).toEqual(
      [...NEUTRON_READ_ONLY_TOOLS].sort(),
    );
    expect(tools.every((tool) => tool.readOnly === true)).toBe(true);
    expect(tools.map((tool) => tool.toolName)).not.toContain(
      "applyApprovedTransaction",
    );
  });

  it("declared-path executeApprovedApplyPlan does not add hidden metadata", async () => {
    const root = await mkdtemp(join(tmpdir(), "approved-apply-declared-"));
    await mkdir(join(root, "src"), { recursive: true });
    const result = await executeApprovedApplyPlan(
      {
        schemaVersion: 1,
        targetResourceId: "res-1",
        grantedApprovals: ["atomic-commit-approval"],
        plan: {
          schemaVersion: 1,
          planDigest: "sha256:plan1",
          projectStateDigest: "sha256:state1",
          targetRoot: root,
          changedPaths: ["src/a.ts"],
        },
      },
      [
        {
          path: "src/a.ts",
          content: CONTENT_A,
          sources: ["test"],
          checksum: checksum(CONTENT_A),
        },
      ],
      {
        fs: nodeFileSystem,
        syncMode: GENERATED_FILE_SYNC_DECLARED_PATHS_ONLY,
        currentProjectStateDigest: "sha256:state1",
      },
    );
    expect(result.applied).toBe(true);
    expect(
      await nodeFileSystem.exists(join(root, ".aif/manifest.lock.json")),
    ).toBe(false);
  });
});
