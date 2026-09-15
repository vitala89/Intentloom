import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checksum, type GeneratedFile } from "@intentloom/core";
import { nodeFileSystem } from "../packages/application/src/index.js";
import { applyApprovedNeutronMutation } from "../packages/application/src/neutron-mutation-apply.js";
import { neutronMutationApplyLeaksToken } from "../packages/application/src/neutron-mutation-apply-result.js";
import { createMemoryNeutronMutationApprovalStore } from "../packages/application/src/neutron-mutation-apply-store.js";
import { fingerprintNeutronProjectRoot } from "../packages/application/src/neutron-session-fingerprint.js";
import {
  NEUTRON_MUTATION_APPROVAL_SCHEMA_URN,
  NEUTRON_MUTATION_APPROVAL_SOURCE,
  NEUTRON_MUTATION_CLASS,
  NEUTRON_MUTATION_PROPOSAL_SCHEMA_URN,
  type NeutronMutationApproval,
  type NeutronMutationProposal,
} from "../packages/protocol/src/neutron-mutation.js";
import { NEUTRON_RUNTIME_SESSION_SCHEMA_URN } from "../packages/protocol/src/neutron-runtime.js";
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

function sample(contentA = "export const a = 1;\n"): GeneratedFile[] {
  return [
    {
      path: "src/a.ts",
      content: contentA,
      sources: ["review:test"],
      checksum: checksum(contentA),
    },
    {
      path: "src/z.ts",
      content: "export const z = 2;\n",
      sources: ["review:test"],
      checksum: checksum("export const z = 2;\n"),
    },
  ];
}

async function project() {
  const root = await mkdtemp(join(tmpdir(), "neutron-attack-"));
  await mkdir(join(root, "src"), { recursive: true });
  await writeFile(join(root, "src/a.ts"), "old a\n");
  await writeFile(join(root, "src/z.ts"), "old z\n");
  return {
    root,
    digest: `sha256:${await fingerprintNeutronProjectRoot(root)}`,
  };
}

function bind(
  root: string,
  digest: string,
  payload: GeneratedFile[],
  extras: { readonly graphId?: string; readonly taskId?: string } = {},
) {
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
    proposalId: "proposal-attack-1",
    sessionId: "session-attack-1",
    projectId: "project-attack-1",
    root,
    ...(extras.taskId !== undefined ? { taskId: extras.taskId } : {}),
    ...(extras.graphId !== undefined ? { graphId: extras.graphId } : {}),
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
  const proposal: NeutronMutationProposal = {
    schemaVersion: NEUTRON_MUTATION_PROPOSAL_SCHEMA_URN,
    ...facts,
    proposalDigest: digestNeutronMutationProposal(facts),
  };
  const artifact = materializeNeutronMutationReviewArtifact({
    proposal,
    files: payload,
    artifactId: "artifact-attack-1",
    transactionId: "txn-attack-1",
  });
  const unsigned = {
    schemaVersion: NEUTRON_MUTATION_APPROVAL_SCHEMA_URN,
    approvalId: "approval-attack-1",
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
    reviewArtifactDigest: artifact.artifactDigest,
  };
  const approval: NeutronMutationApproval = {
    ...unsigned,
    approvalDigest: digestNeutronMutationApproval(unsigned),
  };
  return { proposal, artifact, approval, payload };
}

async function applyBound(
  root: string,
  bound: ReturnType<typeof bind>,
  overrides: Record<string, unknown> = {},
) {
  return applyApprovedNeutronMutation({
    proposal: bound.proposal,
    approval: bound.approval,
    artifact: bound.artifact,
    files: bound.payload,
    transactionId: "txn-attack-1",
    authorization: { kind: "host", mutationClass: NEUTRON_MUTATION_CLASS },
    fs: nodeFileSystem,
    now: () => NOW,
    session: validateNeutronRuntimeSession({
      schemaVersion: NEUTRON_RUNTIME_SESSION_SCHEMA_URN,
      sessionId: bound.proposal.sessionId,
      root: bound.proposal.root,
      projectId: bound.proposal.projectId,
      state: "planning",
      mutationAllowed: false,
      createdAt: "2026-09-16T00:00:00.000Z",
    }),
    actualRoot: root,
    store: createMemoryNeutronMutationApprovalStore(),
    ...overrides,
  });
}

describe("Neutron mutation Slice 3 approval and content attacks", () => {
  it("rejects forged token, wrong digests, identity, and expiry without writes", async () => {
    const prepared = await project();
    const bound = bind(prepared.root, prepared.digest, sample());
    const cases: Array<[string, Record<string, unknown>]> = [
      [
        "forged-token",
        {
          approval: {
            ...bound.approval,
            approvalToken:
              "approved:sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
          },
        },
      ],
      [
        "wrong-approval-digest",
        {
          approval: {
            ...bound.approval,
            approvalDigest: `sha256:${"c".repeat(64)}`,
          },
        },
      ],
      [
        "wrong-approval-id",
        {
          approval: {
            ...bound.approval,
            approvalId: "approval-forged",
          },
        },
      ],
      [
        "wrong-proposal-digest",
        {
          approval: digestResign({
            ...bound.approval,
            proposalDigest: `sha256:${"d".repeat(64)}`,
            approvalToken: expectedNeutronMutationApprovalToken(
              `sha256:${"d".repeat(64)}`,
            ),
          }),
        },
      ],
      [
        "wrong-review-artifact",
        {
          approval: digestResign({
            ...bound.approval,
            reviewArtifactDigest: `sha256:${"e".repeat(64)}`,
          }),
        },
      ],
      [
        "wrong-plan-digest",
        {
          approval: digestResign({
            ...bound.approval,
            planDigest: `sha256:${"f".repeat(64)}`,
          }),
        },
      ],
      [
        "wrong-root",
        {
          approval: digestResign({
            ...bound.approval,
            root: "/tmp/other-root",
          }),
        },
      ],
      [
        "wrong-project",
        {
          approval: digestResign({
            ...bound.approval,
            projectId: "project-forged",
          }),
        },
      ],
      [
        "wrong-session",
        {
          approval: digestResign({
            ...bound.approval,
            sessionId: "session-forged",
          }),
        },
      ],
      [
        "wrong-graph",
        {
          approval: digestResign({
            ...bound.approval,
            graphId: "graph-forged",
          }),
        },
      ],
      [
        "wrong-task",
        {
          approval: digestResign({
            ...bound.approval,
            taskId: "task-forged",
          }),
        },
      ],
      [
        "expired",
        {
          now: () => bound.approval.approvalValidUntil + 1,
        },
      ],
    ];
    for (const [, overrides] of cases) {
      const result = await applyBound(prepared.root, bound, overrides);
      expect(result.applied).toBe(false);
      expect(await readFile(join(prepared.root, "src/a.ts"), "utf8")).toBe(
        "old a\n",
      );
      expect(
        neutronMutationApplyLeaksToken(result, bound.approval.approvalToken),
      ).toBe(false);
    }
  });

  it("rejects swapped, extra, missing, and duplicate payload bytes", async () => {
    const prepared = await project();
    const bound = bind(prepared.root, prepared.digest, sample());
    const swapped = await applyBound(prepared.root, bound, {
      files: sample("export const a = 9;\n"),
    });
    expect(swapped.applied).toBe(false);
    expect(swapped.failureCode).toBe("content-mismatch");
    const extra = await applyBound(prepared.root, bound, {
      files: [
        ...sample(),
        {
          path: "src/extra.ts",
          content: "extra\n",
          sources: ["review:test"],
          checksum: checksum("extra\n"),
        },
      ],
    });
    expect(extra.applied).toBe(false);
    expect(extra.failureCode).toBe("path-scope-mismatch");
    const missing = await applyBound(prepared.root, bound, {
      files: [sample()[0]],
    });
    expect(missing.applied).toBe(false);
    expect(missing.failureCode).toBe("path-scope-mismatch");
    const duplicate = await applyBound(prepared.root, bound, {
      files: [sample()[0], sample()[0], sample()[1]],
    });
    expect(duplicate.applied).toBe(false);
    expect(await readFile(join(prepared.root, "src/a.ts"), "utf8")).toBe(
      "old a\n",
    );
  });

  it("rejects already consumed approval and graph stale without writing", async () => {
    const prepared = await project();
    const bound = bind(prepared.root, prepared.digest, sample());
    const store = createMemoryNeutronMutationApprovalStore();
    const first = await applyBound(prepared.root, bound, { store });
    expect(first.applied).toBe(true);
    const second = await applyBound(prepared.root, bound, {
      store,
      transactionId: "txn-attack-2",
    });
    expect(second.applied).toBe(false);
    expect(second.failureCode).toBe("approval-consumed");
    const stalePrepared = await project();
    const staleBound = bind(
      stalePrepared.root,
      stalePrepared.digest,
      sample(),
      { graphId: "graph-attack-1", taskId: "task-attack-1" },
    );
    const staleGraph = await applyBound(stalePrepared.root, staleBound, {
      graphStale: {
        baseline: { projectFingerprint: "sha256:old" },
        current: { projectFingerprint: "sha256:new" },
      },
    });
    expect(staleGraph.applied).toBe(false);
    expect(staleGraph.failureCode).toBe("graph-stale");
  });
});

function digestResign(
  approval: NeutronMutationApproval,
): NeutronMutationApproval {
  const { approvalDigest: _omit, ...unsigned } = approval;
  return {
    ...unsigned,
    approvalDigest: digestNeutronMutationApproval(unsigned),
  };
}
