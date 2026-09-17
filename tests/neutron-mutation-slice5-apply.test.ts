import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  inspectProject,
  nodeFileSystem,
} from "../packages/application/src/index.js";
import { applyApprovedNeutronGraphMutation } from "../packages/application/src/neutron-scheduler.js";
import {
  collectNeutronGraphMutationCandidates,
  createMemoryNeutronGraphMutationPayloadStore,
  executeNeutronTaskNode,
  materializeNeutronGraphMutationReview,
  NEUTRON_MUTATION_PROPOSAL_CAPABILITY,
} from "../packages/application/src/neutron-scheduler.js";
import { createMemoryNeutronMutationApprovalStore } from "../packages/application/src/neutron-mutation-apply-store.js";
import { neutronMutationApplyLeaksToken } from "../packages/application/src/neutron-mutation-apply-result.js";
import { fingerprintNeutronProjectRoot } from "../packages/application/src/neutron-session-fingerprint.js";
import { listRegisteredNeutronTools } from "../packages/application/src/neutron-tool-registry.js";
import {
  NEUTRON_MUTATION_APPROVAL_SCHEMA_URN,
  NEUTRON_MUTATION_APPROVAL_SOURCE,
  NEUTRON_MUTATION_CLASS,
} from "../packages/protocol/src/neutron-mutation.js";
import type {
  NeutronMutationApproval,
  NeutronMutationProposal,
} from "../packages/protocol/src/neutron-mutation.js";
import { NEUTRON_READ_ONLY_TOOLS } from "../packages/protocol/src/neutron-runtime.js";
import {
  digestNeutronMutationApproval,
  expectedNeutronMutationApprovalToken,
} from "../packages/validator/src/neutron-mutation.js";
import { NeutronN2Error } from "../packages/validator/src/neutron-runtime-n2.js";
import { validateModelAdapterCapabilities } from "../packages/validator/src/model-adapter.js";
import type {
  ModelTurnRequest,
  ModelTurnResult,
} from "../packages/protocol/src/model-adapter.js";
import {
  NEUTRON_STRUCTURED_MUTATION_PROPOSAL_PREFIX,
  bindStructuredNeutronMutationProposal,
} from "../packages/application/src/neutron-session-mutation-proposal.js";
import {
  SLICE5_CONTENT_A,
  SLICE5_CONTENT_Z,
  SLICE5_NOW,
  slice5CandidateOutput,
  slice5Caps,
  slice5Graph,
  slice5Node,
  slice5Session,
} from "./neutron-mutation-slice5-support.js";

class ScriptedAdapter implements ModelAdapter {
  private readonly steps: ModelTurnResult[];

  constructor(steps: ModelTurnResult[]) {
    this.steps = [...steps];
  }

  getCapabilities() {
    return validateModelAdapterCapabilities({
      maxContextTokens: 8192,
      maxOutputTokens: 1024,
      modelId: "fixture-slice5",
      providerKind: "ollama",
      supportsStreaming: false,
      supportsToolCalls: true,
      supportsVision: false,
    });
  }

  async executeTurn(
    request: ModelTurnRequest,
    options: { signal?: AbortSignal } = {},
  ): Promise<ModelTurnResult> {
    if (options.signal?.aborted === true) {
      throw new NeutronN2Error(
        "cancelled",
        "Model turn execution was cancelled",
      );
    }
    const next = this.steps.shift();
    if (next === undefined) throw new Error("unexpected extra model turn");
    return { ...next, sessionId: request.sessionId };
  }
}

function inspectThenCandidate(
  sessionId: string,
  root: string,
): ScriptedAdapter {
  return new ScriptedAdapter([
    {
      diagnostics: ["slice5"],
      responseText: "",
      schemaVersion: 1,
      sessionId,
      stopReason: "tool_call",
      toolCalls: [
        {
          argumentsJson: JSON.stringify({ root }),
          id: "call-inspect",
          name: "inspect",
        },
      ],
      usage: { inputTokens: 4, outputTokens: 2, totalTokens: 6 },
    },
    {
      diagnostics: ["slice5"],
      responseText: slice5CandidateOutput(),
      schemaVersion: 1,
      sessionId,
      stopReason: "stop",
      toolCalls: [],
      usage: { inputTokens: 4, outputTokens: 2, totalTokens: 6 },
    },
  ]);
}

async function prepareProject(): Promise<{
  readonly root: string;
  readonly digest: string;
}> {
  const root = await mkdtemp(join(tmpdir(), "neutron-slice5-"));
  await mkdir(join(root, "src"), { recursive: true });
  await mkdir(join(root, "docs/specs"), { recursive: true });
  await writeFile(join(root, "src/a.ts"), "old a\n");
  await writeFile(join(root, "src/z.ts"), "old z\n");
  await writeFile(join(root, "package.json"), '{"name":"slice5"}\n');
  await writeFile(join(root, "README.md"), "safe\n");
  await writeFile(join(root, "docs/specs/SPEC.md"), "# Intent\n");
  await mkdir(join(root, ".aif/memory/tasks"), { recursive: true });
  await writeFile(
    join(root, ".aif/memory/tasks/task-a.json"),
    `${JSON.stringify({
      schemaVersion: "1",
      id: "task-a",
      root,
      intent: "Propose exact file changes",
      affectedPaths: ["src/a.ts"],
      validationOutcome: "partial",
      evidenceReferences: [],
      usedSkills: [],
      unresolvedWork: ["inspect"],
      provenance: "intentloom.task.summary.v1",
      trustClass: "user-supplied",
      retentionState: "active",
      createdAt: "2026-09-17T00:00:00.000Z",
    })}\n`,
  );
  const digest = `sha256:${await fingerprintNeutronProjectRoot(root)}`;
  return { digest, root };
}

function approvalFor(
  proposal: NeutronMutationProposal,
  reviewArtifactDigest: string,
): NeutronMutationApproval {
  const unsigned = {
    approvalId: "approval-slice5-1",
    approvalSource: NEUTRON_MUTATION_APPROVAL_SOURCE,
    approvalToken: expectedNeutronMutationApprovalToken(
      proposal.proposalDigest,
    ),
    approvalValidUntil: SLICE5_NOW + 1_800_000,
    approvedAt: SLICE5_NOW,
    approvingActor: "human-reviewer",
    changedPaths: proposal.plan.changedPaths,
    mutationClass: proposal.mutationClass,
    planDigest: proposal.plan.planDigest,
    projectId: proposal.projectId,
    projectStateDigest: proposal.plan.projectStateDigest,
    proposalDigest: proposal.proposalDigest,
    proposalId: proposal.proposalId,
    reviewArtifactDigest,
    root: proposal.root,
    schemaVersion: NEUTRON_MUTATION_APPROVAL_SCHEMA_URN,
    sessionId: proposal.sessionId,
    ...(proposal.taskId === undefined ? {} : { taskId: proposal.taskId }),
    ...(proposal.graphId === undefined ? {} : { graphId: proposal.graphId }),
  };
  return {
    ...unsigned,
    approvalDigest: digestNeutronMutationApproval(unsigned),
  };
}

describe("Neutron mutation Slice 5 host composition", () => {
  it("keeps proposal node execution non-mutating", async () => {
    const project = await prepareProject();
    const session = slice5Session(project.root);
    const graph = slice5Graph(
      [slice5Node("task-build", { state: "ready" })],
      project.root,
    );
    const before = await fingerprintNeutronProjectRoot(project.root);
    const result = await executeNeutronTaskNode({
      adapter: inspectThenCandidate(session.sessionId, project.root),
      fingerprintProject: async () =>
        fingerprintNeutronProjectRoot(project.root),
      fs: nodeFileSystem,
      graph,
      inspect: (root) => inspectProject(root, nodeFileSystem),
      projectId: session.projectId,
      session,
      sessionCapabilities: slice5Caps(),
      taskId: "task-build",
    });
    expect(result.executed).toBe(true);
    if (!result.executed) return;
    expect(result.error).toBeNull();
    expect(result.node.state).toBe("completed");
    expect(result.projectFingerprintBefore).toBe(
      result.projectFingerprintAfter,
    );
    expect(await fingerprintNeutronProjectRoot(project.root)).toBe(before);
    expect(await readFile(join(project.root, "src/a.ts"), "utf8")).toBe(
      "old a\n",
    );
    expect(result.output).toContain("src/a.ts");
    expect(session.mutationAllowed).toBe(false);
  });

  it("applies an authorized graph proposal through existing Apply", async () => {
    const project = await prepareProject();
    const session = slice5Session(project.root);
    const graph = slice5Graph(
      [slice5Node("task-build", { state: "ready" })],
      project.root,
    );
    const executed = await executeNeutronTaskNode({
      adapter: inspectThenCandidate(session.sessionId, project.root),
      fingerprintProject: async () =>
        fingerprintNeutronProjectRoot(project.root),
      fs: nodeFileSystem,
      graph,
      inspect: (root) => inspectProject(root, nodeFileSystem),
      projectId: session.projectId,
      session,
      sessionCapabilities: slice5Caps(),
      taskId: "task-build",
    });
    expect(executed.executed).toBe(true);
    if (!executed.executed) return;
    const store = createMemoryNeutronGraphMutationPayloadStore();
    const records = collectNeutronGraphMutationCandidates({
      graph: executed.graph,
      graphId: "graph-slice5",
      outcomes: [
        {
          admitted: true,
          attempts: [
            {
              attempt: executed.attempt,
              completedAt: SLICE5_NOW,
              error: null,
              leaseId: "lease-1",
              startedAt: SLICE5_NOW,
              state: "completed",
            },
          ],
          error: null,
          executed: true,
          execution: executed,
          lease: {
            acquiredAt: SLICE5_NOW,
            attempt: executed.attempt,
            expiresAt: SLICE5_NOW + 60_000,
            leaseId: "lease-1",
            ownerId: "host",
            renewedAt: SLICE5_NOW,
            sessionId: session.sessionId,
            status: "active",
            taskId: "task-build",
          },
          taskId: "task-build",
        },
      ],
      permission: {
        sessionProposalCapabilities: [NEUTRON_MUTATION_PROPOSAL_CAPABILITY],
      },
      session,
    });
    expect(records).toHaveLength(1);
    const digest = `sha256:${await fingerprintNeutronProjectRoot(project.root)}`;
    const bundle = materializeNeutronGraphMutationReview({
      now: () => SLICE5_NOW,
      projectStateDigest: digest,
      record: records[0]!,
      session,
      store,
    });
    const approval = approvalFor(
      bundle.proposal,
      bundle.artifact.artifactDigest,
    );
    const applied = await applyApprovedNeutronGraphMutation({
      approval,
      apply: {
        actualRoot: project.root,
        authorization: { kind: "host", mutationClass: NEUTRON_MUTATION_CLASS },
        fs: nodeFileSystem,
        now: () => SLICE5_NOW,
        store: createMemoryNeutronMutationApprovalStore(),
      },
      graphStale: {
        baseline: { projectFingerprint: digest },
        current: { projectFingerprint: digest },
      },
      proposalId: bundle.proposal.proposalId,
      session,
      store,
    });
    expect(applied.applied).toBe(true);
    expect(applied.apply?.verificationStatus).toBe("verified");
    expect(applied.evidence?.applied).toBe(true);
    expect(applied.evidence?.transactionId).toBe(bundle.artifact.transactionId);
    expect(await readFile(join(project.root, "src/a.ts"), "utf8")).toBe(
      SLICE5_CONTENT_A,
    );
    expect(await readFile(join(project.root, "src/z.ts"), "utf8")).toBe(
      SLICE5_CONTENT_Z,
    );
    expect(executed.node.state).toBe("completed");
    expect(
      neutronMutationApplyLeaksToken(applied, approval.approvalToken),
    ).toBe(false);
    expect(JSON.stringify(applied.evidence)).not.toContain(SLICE5_CONTENT_A);
    expect(JSON.stringify(applied.evidence)).not.toContain(
      approval.approvalToken,
    );
  });

  it("rejects seed-only expectedOutput preview as Apply authority", async () => {
    const project = await prepareProject();
    const session = slice5Session(project.root);
    const seed = `${NEUTRON_STRUCTURED_MUTATION_PROPOSAL_PREFIX}${JSON.stringify(
      {
        changedPaths: ["src/a.ts"],
        expiresAt: SLICE5_NOW + 1_800_000,
        planDigest:
          "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        projectStateDigest:
          "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        proposalId: "proposal-preview-seed",
      },
    )}`;
    const preview = bindStructuredNeutronMutationProposal({
      expectedOutput: seed,
      graphId: "graph-slice5",
      session,
      taskId: "task-build",
    });
    expect(preview?.proposalId).toBe("proposal-preview-seed");
    const denied = await applyApprovedNeutronGraphMutation({
      approval: { approvalToken: "secret-token" },
      apply: {
        actualRoot: project.root,
        authorization: { kind: "host", mutationClass: NEUTRON_MUTATION_CLASS },
        fs: nodeFileSystem,
        now: () => SLICE5_NOW,
        store: createMemoryNeutronMutationApprovalStore(),
      },
      graphStale: {
        baseline: { projectFingerprint: "sha256:old" },
        current: { projectFingerprint: "sha256:old" },
      },
      proposalId: preview!.proposalId,
      session,
      store: createMemoryNeutronGraphMutationPayloadStore(),
    });
    expect(denied.applied).toBe(false);
    expect(denied.failureCode).toBe("proposal-not-found");
    expect(await readFile(join(project.root, "src/a.ts"), "utf8")).toBe(
      "old a\n",
    );
    expect(JSON.stringify(denied)).not.toContain("secret-token");
  });

  it("rejects stale project, checkpoint, and profile before write", async () => {
    const project = await prepareProject();
    const session = slice5Session(project.root);
    const store = createMemoryNeutronGraphMutationPayloadStore();
    const executed = await executeNeutronTaskNode({
      adapter: inspectThenCandidate(session.sessionId, project.root),
      fingerprintProject: async () =>
        fingerprintNeutronProjectRoot(project.root),
      fs: nodeFileSystem,
      graph: slice5Graph(
        [slice5Node("task-build", { state: "ready" })],
        project.root,
      ),
      inspect: (root) => inspectProject(root, nodeFileSystem),
      projectId: session.projectId,
      session,
      sessionCapabilities: slice5Caps(),
      taskId: "task-build",
    });
    if (!executed.executed) throw new Error("expected execution");
    const digest = `sha256:${await fingerprintNeutronProjectRoot(project.root)}`;
    const records = collectNeutronGraphMutationCandidates({
      graph: executed.graph,
      graphId: "graph-slice5",
      outcomes: [
        {
          admitted: true,
          attempts: [
            {
              attempt: 1,
              completedAt: SLICE5_NOW,
              error: null,
              leaseId: "lease-1",
              startedAt: SLICE5_NOW,
              state: "completed",
            },
          ],
          error: null,
          executed: true,
          execution: executed,
          lease: {
            acquiredAt: SLICE5_NOW,
            attempt: 1,
            expiresAt: SLICE5_NOW + 60_000,
            leaseId: "lease-1",
            ownerId: "host",
            renewedAt: SLICE5_NOW,
            sessionId: session.sessionId,
            status: "active",
            taskId: "task-build",
          },
          taskId: "task-build",
        },
      ],
      permission: {
        sessionProposalCapabilities: [NEUTRON_MUTATION_PROPOSAL_CAPABILITY],
      },
      session,
    });
    const bundle = materializeNeutronGraphMutationReview({
      now: () => SLICE5_NOW,
      projectStateDigest: digest,
      record: records[0]!,
      session,
      store,
    });
    const approval = approvalFor(
      bundle.proposal,
      bundle.artifact.artifactDigest,
    );
    const projectStale = await applyApprovedNeutronGraphMutation({
      approval,
      apply: {
        actualRoot: project.root,
        authorization: { kind: "host", mutationClass: NEUTRON_MUTATION_CLASS },
        fs: nodeFileSystem,
        now: () => SLICE5_NOW,
        store: createMemoryNeutronMutationApprovalStore(),
      },
      graphStale: {
        baseline: { projectFingerprint: digest },
        current: { projectFingerprint: `${digest}:stale` },
      },
      proposalId: bundle.proposal.proposalId,
      session,
      store,
    });
    expect(projectStale.applied).toBe(false);
    expect(projectStale.failureCode).toBe("graph-stale");
    expect(await readFile(join(project.root, "src/a.ts"), "utf8")).toBe(
      "old a\n",
    );
    const checkpointStale = await applyApprovedNeutronGraphMutation({
      approval,
      apply: {
        actualRoot: project.root,
        authorization: { kind: "host", mutationClass: NEUTRON_MUTATION_CLASS },
        fs: nodeFileSystem,
        now: () => SLICE5_NOW,
        store: createMemoryNeutronMutationApprovalStore(),
      },
      graphStale: {
        baseline: {
          checkpoint: {
            checkpointId: "cp-1",
            createdSnapshotChecksum: "old",
            state: "active",
            taskId: "task-build",
            updatedAt: "2026-09-17T00:00:00.000Z",
          },
          projectFingerprint: digest,
        },
        current: {
          checkpoint: {
            checkpointId: "cp-1",
            createdSnapshotChecksum: "new",
            state: "active",
            taskId: "task-build",
            updatedAt: "2026-09-17T00:00:01.000Z",
          },
          projectFingerprint: digest,
        },
      },
      proposalId: bundle.proposal.proposalId,
      session,
      store,
    });
    expect(checkpointStale.failureCode).toBe("graph-stale");
    const profileStale = await applyApprovedNeutronGraphMutation({
      approval,
      apply: {
        actualRoot: project.root,
        authorization: { kind: "host", mutationClass: NEUTRON_MUTATION_CLASS },
        fs: nodeFileSystem,
        now: () => SLICE5_NOW,
        store: createMemoryNeutronMutationApprovalStore(),
      },
      graphStale: {
        baseline: {
          profile: { fingerprint: "sha256:profile-a", profileName: "default" },
          projectFingerprint: digest,
        },
        current: {
          profile: { fingerprint: "sha256:profile-b", profileName: "default" },
          projectFingerprint: digest,
        },
      },
      proposalId: bundle.proposal.proposalId,
      session,
      store,
    });
    expect(profileStale.failureCode).toBe("graph-stale");
    expect(profileStale.applied).toBe(false);
  });

  it("records Apply failure without N5 retry or a new proposal", async () => {
    const project = await prepareProject();
    const session = slice5Session(project.root);
    const executed = await executeNeutronTaskNode({
      adapter: inspectThenCandidate(session.sessionId, project.root),
      fingerprintProject: async () =>
        fingerprintNeutronProjectRoot(project.root),
      fs: nodeFileSystem,
      graph: slice5Graph(
        [slice5Node("task-build", { state: "ready" })],
        project.root,
      ),
      inspect: (root) => inspectProject(root, nodeFileSystem),
      projectId: session.projectId,
      session,
      sessionCapabilities: slice5Caps(),
      taskId: "task-build",
    });
    if (!executed.executed) throw new Error("expected execution");
    const digest = `sha256:${await fingerprintNeutronProjectRoot(project.root)}`;
    const store = createMemoryNeutronGraphMutationPayloadStore();
    const records = collectNeutronGraphMutationCandidates({
      graph: executed.graph,
      graphId: "graph-slice5",
      outcomes: [
        {
          admitted: true,
          attempts: [
            {
              attempt: 1,
              completedAt: SLICE5_NOW,
              error: null,
              leaseId: "lease-1",
              startedAt: SLICE5_NOW,
              state: "completed",
            },
          ],
          error: null,
          executed: true,
          execution: executed,
          lease: {
            acquiredAt: SLICE5_NOW,
            attempt: 1,
            expiresAt: SLICE5_NOW + 60_000,
            leaseId: "lease-1",
            ownerId: "host",
            renewedAt: SLICE5_NOW,
            sessionId: session.sessionId,
            status: "active",
            taskId: "task-build",
          },
          taskId: "task-build",
        },
      ],
      permission: {
        sessionProposalCapabilities: [NEUTRON_MUTATION_PROPOSAL_CAPABILITY],
      },
      session,
    });
    const bundle = materializeNeutronGraphMutationReview({
      now: () => SLICE5_NOW,
      projectStateDigest: digest,
      record: records[0]!,
      session,
      store,
    });
    const failed = await applyApprovedNeutronGraphMutation({
      approval: approvalFor(bundle.proposal, bundle.artifact.artifactDigest),
      apply: {
        actualRoot: project.root,
        authorization: { kind: "host", mutationClass: NEUTRON_MUTATION_CLASS },
        failAt: "post-write-consistency",
        fs: nodeFileSystem,
        now: () => SLICE5_NOW,
        store: createMemoryNeutronMutationApprovalStore(),
      },
      graphStale: {
        baseline: { projectFingerprint: digest },
        current: { projectFingerprint: digest },
      },
      proposalId: bundle.proposal.proposalId,
      session,
      store,
    });
    expect(failed.applied).toBe(false);
    expect(failed.evidence?.applied).toBe(false);
    expect(executed.node.state).toBe("completed");
    expect(store.list()).toHaveLength(1);
    expect(store.list()[0]?.proposal.proposalId).toBe(
      bundle.proposal.proposalId,
    );
  });

  it("keeps applied versus verified distinct after verification failure", async () => {
    const project = await prepareProject();
    const session = slice5Session(project.root);
    const executed = await executeNeutronTaskNode({
      adapter: inspectThenCandidate(session.sessionId, project.root),
      fingerprintProject: async () =>
        fingerprintNeutronProjectRoot(project.root),
      fs: nodeFileSystem,
      graph: slice5Graph(
        [slice5Node("task-build", { state: "ready" })],
        project.root,
      ),
      inspect: (root) => inspectProject(root, nodeFileSystem),
      projectId: session.projectId,
      session,
      sessionCapabilities: slice5Caps(),
      taskId: "task-build",
    });
    if (!executed.executed) throw new Error("expected execution");
    const digest = `sha256:${await fingerprintNeutronProjectRoot(project.root)}`;
    const store = createMemoryNeutronGraphMutationPayloadStore();
    const records = collectNeutronGraphMutationCandidates({
      graph: executed.graph,
      graphId: "graph-slice5",
      outcomes: [
        {
          admitted: true,
          attempts: [
            {
              attempt: 1,
              completedAt: SLICE5_NOW,
              error: null,
              leaseId: "lease-1",
              startedAt: SLICE5_NOW,
              state: "completed",
            },
          ],
          error: null,
          executed: true,
          execution: executed,
          lease: {
            acquiredAt: SLICE5_NOW,
            attempt: 1,
            expiresAt: SLICE5_NOW + 60_000,
            leaseId: "lease-1",
            ownerId: "host",
            renewedAt: SLICE5_NOW,
            sessionId: session.sessionId,
            status: "active",
            taskId: "task-build",
          },
          taskId: "task-build",
        },
      ],
      permission: {
        sessionProposalCapabilities: [NEUTRON_MUTATION_PROPOSAL_CAPABILITY],
      },
      session,
    });
    const bundle = materializeNeutronGraphMutationReview({
      now: () => SLICE5_NOW,
      projectStateDigest: digest,
      record: records[0]!,
      session,
      store,
    });
    const result = await applyApprovedNeutronGraphMutation({
      approval: approvalFor(bundle.proposal, bundle.artifact.artifactDigest),
      apply: {
        actualRoot: project.root,
        afterWriteBeforeVerification: async () => {
          await writeFile(join(project.root, "src/a.ts"), "tampered\n");
        },
        authorization: { kind: "host", mutationClass: NEUTRON_MUTATION_CLASS },
        fs: nodeFileSystem,
        now: () => SLICE5_NOW,
        store: createMemoryNeutronMutationApprovalStore(),
      },
      graphStale: {
        baseline: { projectFingerprint: digest },
        current: { projectFingerprint: digest },
      },
      proposalId: bundle.proposal.proposalId,
      session,
      store,
    });
    expect(result.applied).toBe(true);
    expect(result.apply?.verificationStatus).toBe("verification-failed");
    expect(result.evidence?.applied).toBe(true);
    expect(result.evidence?.verificationStatus).toBe("verification-failed");
    expect(executed.node.state).toBe("completed");
  });

  it("does not Apply a cancelled review", async () => {
    const project = await prepareProject();
    const denied = await applyApprovedNeutronGraphMutation({
      approval: { approvalToken: "secret-token" },
      apply: {
        actualRoot: project.root,
        authorization: { kind: "host", mutationClass: NEUTRON_MUTATION_CLASS },
        fs: nodeFileSystem,
        now: () => SLICE5_NOW,
        signal: AbortSignal.abort(),
        store: createMemoryNeutronMutationApprovalStore(),
      },
      graphStale: {
        baseline: { projectFingerprint: "sha256:x" },
        current: { projectFingerprint: "sha256:x" },
      },
      proposalId: "missing",
      session: slice5Session(project.root),
      store: createMemoryNeutronGraphMutationPayloadStore(),
    });
    expect(denied.applied).toBe(false);
    expect(denied.failureCode).toBe("cancelled-before-write");
    expect(await readFile(join(project.root, "src/a.ts"), "utf8")).toBe(
      "old a\n",
    );
  });

  it("keeps N4 read-only and mutationAllowed false", () => {
    expect(listRegisteredNeutronTools().map((tool) => tool.toolName)).toEqual([
      ...NEUTRON_READ_ONLY_TOOLS,
    ]);
    expect(NEUTRON_READ_ONLY_TOOLS).toHaveLength(7);
    expect(slice5Session().mutationAllowed).toBe(false);
  });
});
