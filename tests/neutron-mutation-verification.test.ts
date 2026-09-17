import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checksum, type GeneratedFile } from "@intentloom/core";
import { nodeFileSystem } from "../packages/application/src/index.js";
import {
  applyApprovedNeutronMutation,
  retryNeutronMutationVerification,
} from "../packages/application/src/neutron-mutation-apply.js";
import { createMemoryNeutronMutationApprovalStore } from "../packages/application/src/neutron-mutation-apply-store.js";
import { neutronMutationApplyLeaksToken } from "../packages/application/src/neutron-mutation-apply-result.js";
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
import {
  digestContentBoundApplyPlan,
  digestGeneratedFileContent,
  digestNeutronMutationApproval,
  digestNeutronMutationProposal,
  expectedNeutronMutationApprovalToken,
  materializeNeutronMutationReviewArtifact,
} from "../packages/validator/src/neutron-mutation.js";
import { validateNeutronRuntimeSession } from "../packages/validator/src/neutron-runtime.js";

const NOW = 1_750_000_000_000;
const CONTENT_A = "export const a = 1;\n";
const CONTENT_Z = "export const z = 2;\n";
const PREVIOUS_A = "old-a-SENTINEL-PREVIOUS-BODY\n";
const CORRUPT = "CORRUPT-AFTER-APPLY-SENTINEL\n";

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

async function prepareProject(contents?: {
  readonly a?: string;
  readonly z?: string;
}): Promise<{ readonly root: string; readonly digest: string }> {
  const root = await mkdtemp(join(tmpdir(), "neutron-verify-"));
  await mkdir(join(root, "src"), { recursive: true });
  await writeFile(join(root, "src/a.ts"), contents?.a ?? PREVIOUS_A);
  await writeFile(join(root, "src/z.ts"), contents?.z ?? "old z\n");
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
    proposalId: "proposal-verify-1",
    sessionId: "session-verify-1",
    projectId: "project-verify-1",
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
    approvalId: "approval-verify-1",
    approvalToken: expectedNeutronMutationApprovalToken(
      proposal.proposalDigest,
    ),
    approvalSource: NEUTRON_MUTATION_APPROVAL_SOURCE,
    approvingActor: "human-reviewer",
    root: proposal.root,
    projectId: proposal.projectId,
    sessionId: proposal.sessionId,
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

async function hostApply(input: {
  readonly root: string;
  readonly digest: string;
  readonly payload?: GeneratedFile[];
  readonly extra?: Record<string, unknown>;
  readonly store?: ReturnType<typeof createMemoryNeutronMutationApprovalStore>;
}) {
  const payload = input.payload ?? files();
  const proposal = proposalFor(input.root, input.digest, payload);
  const artifact = materializeNeutronMutationReviewArtifact({
    proposal,
    files: payload,
    artifactId: "artifact-verify-1",
    transactionId: "txn-verify-1",
  });
  const approval = approvalFor(proposal, artifact.artifactDigest);
  return {
    result: await applyApprovedNeutronMutation({
      proposal,
      approval,
      artifact,
      files: payload,
      transactionId: "txn-verify-1",
      authorization: { kind: "host", mutationClass: NEUTRON_MUTATION_CLASS },
      fs: nodeFileSystem,
      now: () => NOW,
      session: validateNeutronRuntimeSession({
        schemaVersion: NEUTRON_RUNTIME_SESSION_SCHEMA_URN,
        sessionId: proposal.sessionId,
        root: proposal.root,
        projectId: proposal.projectId,
        state: "planning",
        mutationAllowed: false,
        createdAt: "2026-09-16T00:00:00.000Z",
      }),
      actualRoot: input.root,
      store: input.store ?? createMemoryNeutronMutationApprovalStore(),
      ...input.extra,
    }),
    approval,
    artifact,
    payload,
  };
}

function serializedLeaks(value: unknown, approvalToken: string): boolean {
  const serialized = JSON.stringify(value);
  return (
    neutronMutationApplyLeaksToken(value, approvalToken) ||
    serialized.includes(PREVIOUS_A) ||
    serialized.includes(CONTENT_A) ||
    serialized.includes(CORRUPT) ||
    serialized.includes('"previousContent"') ||
    serialized.includes('"approvalToken"')
  );
}

describe("Neutron mutation Slice 4 verification evidence", () => {
  it("verifies exact reviewed bytes, paths, and post-apply digest", async () => {
    const project = await prepareProject();
    const { result, approval } = await hostApply(project);
    expect(result.applied).toBe(true);
    expect(result.verificationStatus).toBe("verified");
    expect(result.verification?.applied).toBe(true);
    expect(result.verification?.byteVerification.status).toBe("matched");
    expect(result.verification?.writeSetVerification.status).toBe("matched");
    expect(result.verification?.projectStateChange).toBe("changed");
    expect(result.verification?.postApplyProjectStateDigest).toBeDefined();
    expect(result.verification?.postApplyProjectStateDigest).not.toBe(
      result.verification?.preApplyProjectStateDigest,
    );
    expect(await readFile(join(project.root, "src/a.ts"), "utf8")).toBe(
      CONTENT_A,
    );
    expect(
      result.verification?.byteVerification.files.every((file) => file.matched),
    ).toBe(true);
    expect(
      await nodeFileSystem.exists(
        join(project.root, ".aif/manifest.lock.json"),
      ),
    ).toBe(false);
    expect(serializedLeaks(result, approval.approvalToken)).toBe(false);
  });

  it("keeps applied true when verification detects a byte mismatch", async () => {
    const project = await prepareProject();
    const store = createMemoryNeutronMutationApprovalStore();
    const { result, approval } = await hostApply({
      ...project,
      store,
      extra: {
        afterWriteBeforeVerification: async () => {
          await writeFile(join(project.root, "src/a.ts"), CORRUPT);
        },
      },
    });
    expect(result.applied).toBe(true);
    expect(result.status).toBe("applied");
    expect(result.verificationStatus).toBe("verification-failed");
    expect(result.reconciliationRequired).toBe(true);
    expect(result.verification?.byteVerification.status).toBe("mismatched");
    const replay = await hostApply({ ...project, store });
    expect(replay.result.applied).toBe(true);
    expect(await readFile(join(project.root, "src/a.ts"), "utf8")).toBe(
      CORRUPT,
    );
    expect(serializedLeaks(result, approval.approvalToken)).toBe(false);
  });

  it("records create vs update rollback digests without previous bodies", async () => {
    const root = await mkdtemp(join(tmpdir(), "neutron-verify-create-"));
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src/a.ts"), PREVIOUS_A);
    const digest = `sha256:${await fingerprintNeutronProjectRoot(root)}`;
    const payload: GeneratedFile[] = [
      {
        path: "src/a.ts",
        content: CONTENT_A,
        sources: ["review:test"],
        checksum: checksum(CONTENT_A),
      },
      {
        path: "src/created.ts",
        content: "export const created = true;\n",
        sources: ["review:test"],
        checksum: checksum("export const created = true;\n"),
      },
    ];
    const { result } = await hostApply({ root, digest, payload });
    expect(result.applied).toBe(true);
    expect(result.verificationStatus).toBe("verified");
    expect(result.createdPaths).toContain("src/created.ts");
    expect(result.updatedPaths).toContain("src/a.ts");
    const previous = result.verification?.rollback.previousContentDigests ?? [];
    expect(
      previous.find((entry) => entry.path === "src/created.ts")?.existedBefore,
    ).toBe(false);
    expect(
      previous.find((entry) => entry.path === "src/created.ts")?.digest,
    ).toBeNull();
    expect(
      previous.find((entry) => entry.path === "src/a.ts")?.existedBefore,
    ).toBe(true);
    expect(previous.find((entry) => entry.path === "src/a.ts")?.digest).toBe(
      digestGeneratedFileContent(PREVIOUS_A),
    );
    expect(JSON.stringify(result).includes(PREVIOUS_A)).toBe(false);
    expect(
      JSON.stringify(result).includes("export const created = true;\n"),
    ).toBe(false);
  });

  it("treats reviewed bytes that already match as an unchanged no-op", async () => {
    const project = await prepareProject({ a: CONTENT_A, z: CONTENT_Z });
    const { result } = await hostApply(project);
    expect(result.applied).toBe(true);
    expect(result.verificationStatus).toBe("verified");
    expect(result.unchangedPaths).toEqual(["src/a.ts", "src/z.ts"]);
    expect(result.verification?.projectStateChange).toBe("unchanged");
    expect(result.verification?.postApplyProjectStateDigest).toBe(
      result.verification?.preApplyProjectStateDigest,
    );
  });

  it("independently verifies successful rollback against the pre-apply digest", async () => {
    const project = await prepareProject();
    const { result, approval } = await hostApply({
      ...project,
      extra: { failAt: "post-write-consistency" },
    });
    expect(result.applied).toBe(false);
    expect(result.status).toBe("transaction-failed");
    expect(result.verification?.rollback.attempted).toBe(true);
    expect(result.verification?.rollback.completed).toBe(true);
    expect(result.verification?.rollback.verified).toBe(true);
    expect(result.verification?.rollback.postRollbackProjectStateDigest).toBe(
      result.verification?.preApplyProjectStateDigest,
    );
    expect(result.reconciliationRequired).toBe(false);
    expect(result.verification?.rollback.previousContentDigests.length).toBe(2);
    expect(serializedLeaks(result, approval.approvalToken)).toBe(false);
    expect(await readFile(join(project.root, "src/a.ts"), "utf8")).toBe(
      PREVIOUS_A,
    );
  });

  it("requires reconciliation when rollback is incomplete", async () => {
    const project = await prepareProject();
    const { result } = await hostApply({
      ...project,
      extra: {
        failAt: "post-write-consistency",
        rollbackFailPaths: ["src/a.ts"],
      },
    });
    expect(result.applied).toBe(false);
    expect(result.failureCode).toBe("rollback-incomplete");
    expect(result.reconciliationRequired).toBe(true);
    expect(result.verificationStatus).toBe("reconciliation-required");
    expect(result.verification?.rollback.verified).toBe(false);
    expect(result.verification?.rollback.failedPaths).toContain("src/a.ts");
  });

  it("resumes read-only verification after crash without a second Apply", async () => {
    const project = await prepareProject();
    const store = createMemoryNeutronMutationApprovalStore();
    const first = await hostApply({
      ...project,
      store,
      extra: { deferVerification: true },
    });
    expect(first.result.applied).toBe(true);
    expect(first.result.verificationStatus).toBe("verification-incomplete");
    expect(await readFile(join(project.root, "src/a.ts"), "utf8")).toBe(
      CONTENT_A,
    );
    const second = await hostApply({ ...project, store });
    expect(second.result.applied).toBe(true);
    expect(second.result.verificationStatus).toBe("verified");
    expect(second.result.verificationEvidenceDigest).not.toBe(
      first.result.verificationEvidenceDigest,
    );
    await writeFile(join(project.root, "src/a.ts"), CORRUPT);
    const third = await hostApply({ ...project, store });
    expect(third.result.verificationStatus).toBe("verified");
    expect(await readFile(join(project.root, "src/a.ts"), "utf8")).toBe(
      CORRUPT,
    );
  });

  it("resumes verification from a recreated durable store", async () => {
    const project = await prepareProject();
    const stateDir = await mkdtemp(join(tmpdir(), "neutron-verify-state-"));
    const first = await hostApply({
      ...project,
      extra: {
        durableStateDirectory: stateDir,
        store: undefined,
        deferVerification: true,
      },
    });
    expect(first.result.applied).toBe(true);
    expect(first.result.verificationStatus).toBe("verification-incomplete");
    const second = await hostApply({
      ...project,
      extra: { durableStateDirectory: stateDir, store: undefined },
    });
    expect(second.result.applied).toBe(true);
    expect(second.result.verificationStatus).toBe("verified");
    expect(
      JSON.stringify(second.result).includes(first.approval.approvalToken),
    ).toBe(false);
  });

  it("retries verification without re-running Apply", async () => {
    const project = await prepareProject();
    const store = createMemoryNeutronMutationApprovalStore();
    const first = await hostApply({
      ...project,
      store,
      extra: {
        afterWriteBeforeVerification: async () => {
          await writeFile(join(project.root, "src/a.ts"), CORRUPT);
        },
      },
    });
    expect(first.result.verificationStatus).toBe("verification-failed");
    await writeFile(join(project.root, "src/a.ts"), CONTENT_A);
    const retried = await retryNeutronMutationVerification({
      proposal: proposalFor(project.root, project.digest, files()),
      approval: first.approval,
      artifact: first.artifact,
      files: files(),
      transactionId: "txn-verify-1",
      authorization: { kind: "host", mutationClass: NEUTRON_MUTATION_CLASS },
      fs: nodeFileSystem,
      now: () => NOW,
      actualRoot: project.root,
      store,
    });
    expect(retried.applied).toBe(true);
    expect(retried.verificationStatus).toBe("verified");
    expect(await readFile(join(project.root, "src/a.ts"), "utf8")).toBe(
      CONTENT_A,
    );
  });
});
