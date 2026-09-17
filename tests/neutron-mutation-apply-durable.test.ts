import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  realpath,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checksum, type GeneratedFile } from "@intentloom/core";
import { nodeFileSystem } from "../packages/application/src/index.js";
import { applyApprovedNeutronMutation } from "../packages/application/src/neutron-mutation-apply.js";
import { acquireNeutronMutationApplyLock } from "../packages/application/src/neutron-mutation-apply-durable-lock.js";
import { durableApprovalRecordPath } from "../packages/application/src/neutron-mutation-apply-durable-record.js";
import { createPersistentNeutronMutationApprovalStore } from "../packages/application/src/neutron-mutation-apply-durable-store.js";
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

function payload(): GeneratedFile[] {
  return [
    {
      path: "src/a.ts",
      content: CONTENT_A,
      sources: ["review:test"],
      checksum: checksum(CONTENT_A),
    },
  ];
}

async function prepare(): Promise<{
  readonly root: string;
  readonly digest: string;
  readonly stateDir: string;
}> {
  const root = await mkdtemp(join(tmpdir(), "neutron-durable-"));
  const stateDir = await mkdtemp(join(tmpdir(), "neutron-durable-state-"));
  await mkdir(join(root, "src"), { recursive: true });
  await writeFile(join(root, "src/a.ts"), "old a\n");
  const digest = `sha256:${await fingerprintNeutronProjectRoot(root)}`;
  return { root, digest, stateDir };
}

function bind(root: string, digest: string, files: GeneratedFile[]) {
  const fileBindings = files.map((file) => ({
    path: file.path,
    contentDigest: digestGeneratedFileContent(file.content),
  }));
  const planDigest = digestContentBoundApplyPlan({
    projectStateDigest: digest,
    targetRoot: root,
    fileBindings,
  });
  const facts = {
    proposalId: "proposal-durable-1",
    sessionId: "session-durable-1",
    projectId: "project-durable-1",
    root,
    mutationClass: NEUTRON_MUTATION_CLASS,
    plan: {
      schemaVersion: 1 as const,
      planDigest,
      projectStateDigest: digest,
      targetRoot: root,
      changedPaths: files.map((file) => file.path),
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
    files,
    artifactId: "artifact-durable-1",
    transactionId: "txn-durable-1",
  });
  const unsigned = {
    schemaVersion: NEUTRON_MUTATION_APPROVAL_SCHEMA_URN,
    approvalId: "approval-durable-1",
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
    reviewArtifactDigest: artifact.artifactDigest,
  };
  const approval: NeutronMutationApproval = {
    ...unsigned,
    approvalDigest: digestNeutronMutationApproval(unsigned),
  };
  return { proposal, artifact, approval, files };
}

async function hostApply(
  prepared: Awaited<ReturnType<typeof prepare>>,
  overrides: Record<string, unknown> = {},
) {
  const bound = bind(prepared.root, prepared.digest, payload());
  return applyApprovedNeutronMutation({
    proposal: bound.proposal,
    approval: bound.approval,
    artifact: bound.artifact,
    files: bound.files,
    transactionId: "txn-durable-1",
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
    actualRoot: prepared.root,
    durableStateDirectory: prepared.stateDir,
    ...overrides,
  });
}

async function readPersistedBytes(directory: string): Promise<string> {
  const chunks: string[] = [directory];
  const entries = await readdir(directory, { recursive: true });
  for (const entry of entries) {
    const path = join(directory, entry);
    try {
      chunks.push(await readFile(path, "utf8"));
    } catch {
      continue;
    }
  }
  return chunks.join("\n");
}

describe("Neutron mutation Slice 3.1 durable approval store", () => {
  it("rejects production Apply without a durable store or directory", async () => {
    const prepared = await prepare();
    const result = await hostApply(prepared, {
      durableStateDirectory: undefined,
    });
    expect(result.applied).toBe(false);
    expect(result.failureCode).toBe("mutation-state-unknown");
    expect(await readFile(join(prepared.root, "src/a.ts"), "utf8")).toBe(
      "old a\n",
    );
  });

  it("replays an applied transaction after store recreation without a second write", async () => {
    const prepared = await prepare();
    const first = await hostApply(prepared);
    expect(first.applied).toBe(true);
    await writeFile(join(prepared.root, "src/a.ts"), "tampered after apply\n");
    const second = await hostApply(prepared);
    expect(second.applied).toBe(true);
    expect(second.transactionId).toBe(first.transactionId);
    expect(await readFile(join(prepared.root, "src/a.ts"), "utf8")).toBe(
      "tampered after apply\n",
    );
    expect(
      neutronMutationApplyLeaksToken(second, expectedToken(prepared)),
    ).toBe(false);
  });

  it("treats executing state after restart as reconciliation-required", async () => {
    const prepared = await prepare();
    const bound = bind(prepared.root, prepared.digest, payload());
    const store = createPersistentNeutronMutationApprovalStore({
      directory: prepared.stateDir,
    });
    const claimed = await store.claim({
      transactionId: "txn-durable-1",
      approvalId: bound.approval.approvalId,
      approvalDigest: bound.approval.approvalDigest,
      reviewArtifactDigest: bound.artifact.artifactDigest,
      planDigest: bound.artifact.planDigest,
      lockKey: prepared.root,
      state: "claimed",
      claimedAt: NOW,
      updatedAt: NOW,
    });
    expect(claimed.kind).toBe("claimed");
    await store.transition({
      approvalId: bound.approval.approvalId,
      expected: "claimed",
      next: "executing",
      updatedAt: NOW,
    });
    const result = await hostApply(prepared);
    expect(result.applied).toBe(false);
    expect(result.status).toBe("mutation-state-unknown");
    expect(result.reconciliationRequired).toBe(true);
    expect(await readFile(join(prepared.root, "src/a.ts"), "utf8")).toBe(
      "old a\n",
    );
    const retry = await hostApply(prepared);
    expect(retry.applied).toBe(false);
    expect(retry.failureCode).toBe("approval-consumed");
  });

  it("keeps failed-needs-reconciliation consumed after restart", async () => {
    const prepared = await prepare();
    const first = await hostApply(prepared, {
      failAt: "post-write-consistency",
    });
    expect(first.applied).toBe(false);
    expect(first.status).toBe("transaction-failed");
    expect(first.verification?.rollback.verified).toBe(true);
    const second = await hostApply(prepared);
    expect(second.applied).toBe(false);
    expect(second.failureCode).toBe("approval-consumed");
    expect(await readFile(join(prepared.root, "src/a.ts"), "utf8")).toBe(
      "old a\n",
    );
  });

  it("rejects concurrent claims of the same approval", async () => {
    const prepared = await prepare();
    const bound = bind(prepared.root, prepared.digest, payload());
    const left = createPersistentNeutronMutationApprovalStore({
      directory: prepared.stateDir,
    });
    const right = createPersistentNeutronMutationApprovalStore({
      directory: prepared.stateDir,
    });
    const record = {
      transactionId: "txn-durable-1",
      approvalId: bound.approval.approvalId,
      approvalDigest: bound.approval.approvalDigest,
      reviewArtifactDigest: bound.artifact.artifactDigest,
      planDigest: bound.artifact.planDigest,
      lockKey: prepared.root,
      state: "claimed" as const,
      claimedAt: NOW,
      updatedAt: NOW,
    };
    const outcomes = await Promise.all([
      left.claim(record),
      right.claim(record),
    ]);
    const kinds = outcomes.map((outcome) => outcome.kind).toSorted();
    expect(kinds).toContain("claimed");
    expect(kinds.some((kind) => kind !== "claimed")).toBe(true);
  });

  it("fails closed on a corrupted durable record", async () => {
    const prepared = await prepare();
    const first = await hostApply(prepared);
    expect(first.applied).toBe(true);
    const files = await readdir(join(prepared.stateDir, "approvals"));
    await writeFile(join(prepared.stateDir, "approvals", files[0]!), "{");
    await writeFile(join(prepared.root, "src/a.ts"), "old a\n");
    const result = await hostApply(prepared);
    expect(result.applied).toBe(false);
    expect(result.status).toBe("mutation-state-unknown");
    expect(result.reconciliationRequired).toBe(true);
    expect(await readFile(join(prepared.root, "src/a.ts"), "utf8")).toBe(
      "old a\n",
    );
  });

  it("fails closed on partial persistence leftovers", async () => {
    const prepared = await prepare();
    const path = durableApprovalRecordPath(
      prepared.stateDir,
      "approval-durable-1",
    );
    await mkdir(join(prepared.stateDir, "approvals"), { recursive: true });
    await writeFile(path, "");
    const result = await hostApply(prepared);
    expect(result.applied).toBe(false);
    expect(result.status).toBe("mutation-state-unknown");
    expect(result.reconciliationRequired).toBe(true);
    expect(await readFile(join(prepared.root, "src/a.ts"), "utf8")).toBe(
      "old a\n",
    );
  });

  it("does not persist the raw approval token", async () => {
    const prepared = await prepare();
    const bound = bind(prepared.root, prepared.digest, payload());
    const result = await hostApply(prepared);
    expect(result.applied).toBe(true);
    const persisted = await readPersistedBytes(prepared.stateDir);
    expect(persisted.includes(bound.approval.approvalToken)).toBe(false);
    expect(persisted.includes("approvalToken")).toBe(false);
    expect(
      neutronMutationApplyLeaksToken(result, bound.approval.approvalToken),
    ).toBe(false);
  });

  it("rejects a different transactionId after restart", async () => {
    const prepared = await prepare();
    const first = await hostApply(prepared);
    expect(first.applied).toBe(true);
    const second = await hostApply(prepared, { transactionId: "txn-other" });
    expect(second.applied).toBe(false);
    expect(second.failureCode).toBe("approval-consumed");
  });

  it("rejects a different reviewArtifactDigest after restart", async () => {
    const prepared = await prepare();
    const first = await hostApply(prepared);
    expect(first.applied).toBe(true);
    const store = createPersistentNeutronMutationApprovalStore({
      directory: prepared.stateDir,
    });
    const existing = await store.getByApproval("approval-durable-1");
    expect(existing?.state).toBe("applied");
    const claim = await store.claim({
      transactionId: "txn-durable-1",
      approvalId: "approval-durable-1",
      approvalDigest: existing!.approvalDigest,
      reviewArtifactDigest: `sha256:${"a".repeat(64)}`,
      planDigest: existing!.planDigest,
      lockKey: existing!.lockKey,
      state: "claimed",
      claimedAt: NOW,
      updatedAt: NOW,
    });
    expect(claim.kind).toBe("conflict");
  });

  it("rejects a different planDigest after restart", async () => {
    const prepared = await prepare();
    await hostApply(prepared);
    const store = createPersistentNeutronMutationApprovalStore({
      directory: prepared.stateDir,
    });
    const existing = await store.getByApproval("approval-durable-1");
    const claim = await store.claim({
      transactionId: "txn-durable-1",
      approvalId: "approval-durable-1",
      approvalDigest: existing!.approvalDigest,
      reviewArtifactDigest: existing!.reviewArtifactDigest,
      planDigest: `sha256:${"b".repeat(64)}`,
      lockKey: existing!.lockKey,
      state: "claimed",
      claimedAt: NOW,
      updatedAt: NOW,
    });
    expect(claim.kind).toBe("conflict");
  });

  it("rejects a second durable lock holder for the same project", async () => {
    const prepared = await prepare();
    const canonical = await realpath(prepared.root);
    const first = await acquireNeutronMutationApplyLock({
      canonicalRoot: canonical,
      transactionId: "other-txn",
      durableStateDirectory: prepared.stateDir,
    });
    expect(first.ok).toBe(true);
    const result = await hostApply(prepared);
    expect(result.applied).toBe(false);
    expect(result.failureCode).toBe("lock-conflict");
    expect(await readFile(join(prepared.root, "src/a.ts"), "utf8")).toBe(
      "old a\n",
    );
  });
});

function expectedToken(prepared: Awaited<ReturnType<typeof prepare>>): string {
  return bind(prepared.root, prepared.digest, payload()).approval.approvalToken;
}
