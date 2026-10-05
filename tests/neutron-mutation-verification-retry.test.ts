import { mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  NEUTRON_MUTATION_VERIFICATION_RETRY_METHOD,
  NEUTRON_MUTATION_VERIFICATION_RETRY_SCHEMA_URN,
  NEUTRON_READ_ONLY_TOOLS,
  PROTOCOL_VERSION,
  WORKSPACE_DAEMON_REQUEST_METHODS,
  parseNeutronMutationVerificationRetryQuery,
  parseWorkspaceDaemonRequest,
} from "@intentloom/protocol";
import { nodeFileSystem } from "../packages/application/src/index.js";
import type { FileSystem } from "../packages/application/src/index.js";
import {
  decodeDurableTransactionRecord,
  encodeDurableTransactionRecord,
} from "../packages/application/src/neutron-mutation-apply-durable-record.js";
import { createNeutronSessionRuntime } from "../packages/application/src/neutron-session-runtime.js";
import { fingerprintNeutronProjectRoot } from "../packages/application/src/neutron-session-fingerprint.js";
import { approveAndApplyNeutronGraphMutation } from "../packages/application/src/neutron-scheduler.js";
import { retryAppliedNeutronMutationVerification } from "../packages/application/src/neutron-mutation-verification-retry-run.js";
import { neutronSessionCapabilities as daemonCapabilities } from "../packages/daemon/src/neutron-session-handlers.js";
import { bindNeutronSessionHandlers as bindDaemonHandlers } from "../packages/daemon/src/neutron-session-handlers.js";
import { NeutronApproveApplyControl } from "../apps/desktop/src/neutron/NeutronApproveApplyControl.js";
import { createNeutronMutationRecovery } from "../apps/desktop/src/neutron/neutron-mutation-recovery-controller.js";
import { projectMutationRecoveryView } from "../apps/desktop/src/neutron/neutron-mutation-recovery-view.js";
import {
  NEUTRON_MUTATION_APPROVAL_INTENT_ACTION,
  NEUTRON_MUTATION_APPROVAL_INTENT_SCHEMA_URN,
} from "../packages/protocol/src/neutron-mutation-approval-intent.js";
import {
  REVIEW_GRAPH_ID,
  SLICE5_CONTENT_A,
  SLICE5_NOW,
  materializeReviewBundle,
  reviewProject,
} from "./neutron-mutation-review-support.js";
import { slice5Session } from "./neutron-mutation-slice5-support.js";

const FORBIDDEN = [
  "approveAndApplyNeutronGraphMutation",
  "applyApprovedNeutronGraphMutation",
  "applyApprovedNeutronMutation",
  "executeApprovedApplyPlan",
  "executeTrustedDeclaredPathApply",
  "issueNeutronMutationApproval",
] as const;

describe("post-D5 verification-only retry", () => {
  it("recovers a failed verification without a second Apply", async () => {
    const writes = { count: 0 };
    const turns = { count: 0 };
    const ready = await prepared(countingFs(writes));
    const runtime = runtimeFor(ready, turns);
    const controller = createNeutronMutationRecovery(
      {
        submitMutation: async () => {
          await approveFailed(ready);
          throw new Error("response lost");
        },
        getStatus: (identity) =>
          runtime.getNeutronMutationStatus(statusQuery(ready, identity)),
        retryVerification: (identity, signal) =>
          runtime.retryNeutronMutationVerification(
            retryQuery(ready, identity),
            signal,
          ),
      },
      { daemonReady: true },
    );
    controller.setScope(scope(ready));
    await controller.submit(submitInput(ready));
    expect(controller.model().phase).toBe("uncertain");
    const writesAfterApply = writes.count;
    expect(writesAfterApply).toBeGreaterThan(0);
    await controller.setDaemonReady(false);
    await controller.setDaemonReady(true);
    const failedView = markup(controller);
    expect(failedView).toContain("Applied. Verification failed.");
    expect(failedView).toContain("Retry verification");
    expect(failedView).not.toContain("Undo");
    expect(failedView).not.toContain("Retry Apply");
    expect(failedView).not.toContain("Applying");
    await writeFile(join(ready.root, "src/a.ts"), SLICE5_CONTENT_A);
    await controller.retryVerification();
    expect(markup(controller)).toContain(
      "Mutation was already applied. Verification now succeeded.",
    );
    expect(controller.model().status).toMatchObject({
      applied: true,
      outcome: "recorded",
      verificationStatus: "verified",
    });
    expect(writes.count).toBe(writesAfterApply);
    expect(turns.count).toBe(0);
    expect(await approvalCount(ready.durable)).toBe(1);
  });

  it("allows applied verification-failed and verification-incomplete only", async () => {
    const failed = await prepared();
    await approveFailed(failed);
    expect((await retry(failed)).verificationStatus).toBe(
      "verification-failed",
    );
    const incomplete = await prepared();
    const deferred = await approveDeferred(incomplete);
    expect(deferred).toMatchObject({
      applied: true,
      verificationStatus: "verification-incomplete",
    });
    const recovered = await retry(incomplete);
    expect(recovered).toMatchObject({
      applied: true,
      outcome: "recorded",
      verificationStatus: "verified",
    });
    const verified = await prepared();
    await approve(verified);
    expect((await retry(verified)).outcome).toBe("not-eligible");
  });

  it("rejects states that were not applied", async () => {
    const missing = await prepared();
    expect((await retry(missing)).outcome).toBe("unknown");
    const blocked = await prepared();
    await approveLocked(blocked);
    expect((await retry(blocked)).outcome).toBe("not-eligible");
    const claimed = await prepared();
    await approve(claimed);
    await rewriteState(claimed.durable, "claimed");
    expect((await retry(claimed)).outcome).toBe("not-eligible");
    const executing = await prepared();
    await approve(executing);
    await rewriteState(executing.durable, "executing");
    expect((await retry(executing)).outcome).toBe("not-eligible");
    const reconciliation = await prepared();
    await approveReconciliation(reconciliation);
    expect((await retry(reconciliation)).outcome).toBe("not-eligible");
  });

  it("rejects identity mismatches and corruption", async () => {
    const ready = await prepared();
    await approveFailed(ready);
    const base = retryQuery(ready);
    const runtime = runtimeFor(ready, { count: 0 });
    expect(
      (
        await runtime.retryNeutronMutationVerification({
          ...base,
          root: `${ready.root}-x`,
        })
      ).outcome,
    ).toBe("unknown");
    expect(
      (
        await runtime.retryNeutronMutationVerification({
          ...base,
          projectId: "other",
        })
      ).outcome,
    ).toBe("unknown");
    expect(
      (
        await runtime.retryNeutronMutationVerification({
          ...base,
          sessionId: "other",
        })
      ).outcome,
    ).toBe("unknown");
    expect(
      (
        await runtime.retryNeutronMutationVerification({
          ...base,
          graphId: "other",
        })
      ).outcome,
    ).toBe("unknown");
    expect(
      (
        await runtime.retryNeutronMutationVerification({
          ...base,
          proposalId: "other",
        })
      ).outcome,
    ).toBe("unknown");
    expect(
      (
        await runtime.retryNeutronMutationVerification({
          ...base,
          transactionId: "other-tx",
        })
      ).outcome,
    ).toBe("transaction-mismatch");
    await writeFile(await approvalFile(ready.durable), "{");
    await expect(retry(ready)).rejects.toThrow(/durable-status-corrupt/);
  });

  it("rejects spoofed authority and keeps verification off Apply", async () => {
    const query = retryQuery(await prepared());
    for (const key of [
      "approvalToken",
      "approval",
      "approvalId",
      "planDigest",
      "reviewArtifactDigest",
      "verification",
      "previousContent",
      "proposedContent",
      "durableStateDirectory",
      "mutationAllowed",
      "grantedApprovals",
    ]) {
      expect(() =>
        parseNeutronMutationVerificationRetryQuery({
          ...query,
          [key]: "spoof",
        }),
      ).toThrow(new RegExp(key));
    }
    const source = retrySource();
    for (const name of FORBIDDEN) expect(source).not.toContain(name);
  });

  it("keeps historical applied true when a later edit still fails", async () => {
    const writes = { count: 0 };
    const ready = await prepared(countingFs(writes));
    await approveFailed(ready);
    const afterApply = writes.count;
    await writeFile(join(ready.root, "src/a.ts"), "still-wrong\n");
    const again = await retry(ready);
    expect(again).toMatchObject({
      applied: true,
      outcome: "recorded",
      verificationStatus: "verification-failed",
    });
    expect(writes.count).toBe(afterApply);
    expect(again).not.toHaveProperty("approvalToken");
    expect(JSON.stringify(again)).not.toContain("previousContent");
    expect(JSON.stringify(again)).not.toContain("proposedContent");
    expect(JSON.stringify(again)).not.toContain("durableStateDirectory");
  });

  it("does not let a stale cross-process retry overwrite verified", async () => {
    const writes = { count: 0 };
    const turns = { count: 0 };
    const ready = await prepared(countingFs(writes));
    const runtime = runtimeFor(ready, turns);
    expect(typeof runtime.retryNeutronMutationVerification).toBe("function");
    await approveFailed(ready);
    const afterApply = writes.count;
    const approvals = await approvalCount(ready.durable);
    const before = decodeDurableTransactionRecord(
      await readFile(await approvalFile(ready.durable), "utf8"),
    );
    await writeFile(join(ready.root, "src/a.ts"), SLICE5_CONTENT_A);
    let readers = 0;
    let openBoth: (() => void) | undefined;
    const bothSnapshotted = new Promise<void>((resolve) => {
      openBoth = resolve;
    });
    let releaseFollower: (() => void) | undefined;
    const followerTurn = new Promise<void>((resolve) => {
      releaseFollower = resolve;
    });
    const race = (role: "leader" | "follower") =>
      retryAppliedNeutronMutationVerification({
        afterEligibleSnapshot: async () => {
          readers += 1;
          if (readers === 2) openBoth?.();
          await bothSnapshotted;
          if (role === "follower") {
            await followerTurn;
            await writeFile(join(ready.root, "src/a.ts"), "stale-tamper\n");
          }
        },
        directory: ready.durable,
        fs: ready.fs,
        now: () => SLICE5_NOW,
        processGate: new Map(),
        query: retryQuery(ready),
      });
    const leader = race("leader");
    const follower = race("follower");
    const leaderResult = await leader;
    expect(leaderResult).toMatchObject({
      applied: true,
      outcome: "recorded",
      verificationStatus: "verified",
    });
    releaseFollower?.();
    expect((await follower).outcome).toBe("not-eligible");
    const after = decodeDurableTransactionRecord(
      await readFile(await approvalFile(ready.durable), "utf8"),
    );
    expect(after.state).toBe("applied");
    expect(after.transactionId).toBe(before.transactionId);
    expect(after.claimedAt).toBe(before.claimedAt);
    expect(after.result).toMatchObject({
      applied: true,
      verificationStatus: "verified",
    });
    expect(writes.count).toBe(afterApply);
    expect(await approvalCount(ready.durable)).toBe(approvals);
    expect(turns.count).toBe(0);
  });

  it("serializes concurrent retries and leaves one applied transaction", async () => {
    const writes = { count: 0 };
    const ready = await prepared(countingFs(writes));
    await approveFailed(ready);
    await writeFile(join(ready.root, "src/a.ts"), SLICE5_CONTENT_A);
    const afterApply = writes.count;
    const [first, second] = await Promise.all([retry(ready), retry(ready)]);
    const outcomes = [first.outcome, second.outcome].toSorted();
    expect(outcomes).toEqual(["not-eligible", "recorded"]);
    const recorded = [first, second].find(
      (item) => item.outcome === "recorded",
    );
    expect(recorded).toMatchObject({
      applied: true,
      verificationStatus: "verified",
    });
    expect(writes.count).toBe(afterApply);
    expect(await approvalCount(ready.durable)).toBe(1);
  });

  it("does not persist or write when verification retry is cancelled", async () => {
    const writes = { count: 0 };
    const ready = await prepared(countingFs(writes));
    await approveFailed(ready);
    const afterApply = writes.count;
    const controller = new AbortController();
    const fs: FileSystem = {
      ...ready.fs,
      read: async (path) => {
        controller.abort();
        return ready.fs.read(path);
      },
    };
    await expect(
      retryAppliedNeutronMutationVerification({
        directory: ready.durable,
        fs,
        query: retryQuery(ready),
        signal: controller.signal,
      }),
    ).rejects.toThrow(/verification-retry-cancelled/);
    expect(writes.count).toBe(afterApply);
    expect((await retry(ready)).verificationStatus).toBe("verification-failed");
  });

  it("keeps N4 and mutation authority unchanged", () => {
    expect([...NEUTRON_READ_ONLY_TOOLS]).toEqual([
      "inspect",
      "doctor",
      "memorySearch",
      "timeline",
      "conformance",
      "securityAudit",
      "projectDiff",
    ]);
    expect(slice5Session("/tmp/project").mutationAllowed).toBe(false);
    expect(WORKSPACE_DAEMON_REQUEST_METHODS).toContain(
      NEUTRON_MUTATION_VERIFICATION_RETRY_METHOD,
    );
    expect(
      parseWorkspaceDaemonRequest(
        {
          id: 1,
          jsonrpc: "2.0",
          method: NEUTRON_MUTATION_VERIFICATION_RETRY_METHOD,
          params: retryQuery({
            proposalId: "proposal",
            root: "/tmp/project",
          }),
        },
        1,
      )?.method,
    ).toBe(NEUTRON_MUTATION_VERIFICATION_RETRY_METHOD);
    const handlers = bindDaemonHandlers(
      createNeutronSessionRuntime({
        createAdapter: () => null,
        durableStateDirectory: "/tmp/intentloom-verification-retry",
      }),
    );
    const capability = daemonCapabilities(handlers).find(
      (item) => item.method === NEUTRON_MUTATION_VERIFICATION_RETRY_METHOD,
    );
    expect(capability).toMatchObject({
      classification: "read-only",
      operation: "neutron.mutation.verification.retry",
    });
    const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
    const allowlist = readFileSync(
      join(repo, "apps/desktop/src-tauri/src/method_allowlist.rs"),
      "utf8",
    );
    const neutronMethods = allowlist.slice(
      allowlist.indexOf("pub fn is_neutron_method"),
      allowlist.indexOf("pub fn is_neutron_mutation_review_list_method"),
    );
    expect(neutronMethods).not.toContain("verification.retry");
  });

  it("shows Retry verification only for eligible authoritative states", () => {
    expect(buttonFor("verification-failed", true)).toContain(
      "Retry verification",
    );
    expect(buttonFor("verification-incomplete", true)).toContain(
      "Retry verification",
    );
    expect(buttonFor("verified", true)).not.toContain("Retry verification");
    expect(buttonFor("reconciliation-required", true)).not.toContain(
      "Retry verification",
    );
    expect(buttonFor("verification-failed", false)).not.toContain(
      "Retry verification",
    );
    const markupText = buttonFor("verification-failed", true);
    expect(markupText).not.toContain("Undo");
    expect(markupText).not.toContain("Retry Apply");
  });
});

function buttonFor(
  verificationStatus:
    | "verified"
    | "verification-failed"
    | "verification-incomplete"
    | "reconciliation-required",
  applied: boolean,
): string {
  const model = {
    direct: null,
    generation: 1,
    identity: {
      graphId: REVIEW_GRAPH_ID,
      projectId: "project",
      proposalId: "proposal-1",
      root: "/tmp/project",
      sessionId: "session",
    },
    isolatedNotice: false,
    phase: "authoritative" as const,
    resume: null,
    status: {
      applied,
      outcome: "recorded" as const,
      proposalId: "proposal-1",
      protocolVersion: PROTOCOL_VERSION,
      reconciliationRequired: verificationStatus !== "verified",
      schemaVersion: "urn:intentloom:schema:neutron-mutation-status:1" as const,
      transactionState: "applied" as const,
      verificationStatus,
    },
    verificationNotice: null,
  };
  return renderToStaticMarkup(
    createElement(NeutronApproveApplyControl, {
      onRefresh: () => undefined,
      onRetry: () => undefined,
      onSubmit: () => undefined,
      view: projectMutationRecoveryView({
        currentness: "current",
        daemonReady: true,
        model,
        proposalId: "proposal-1",
        reviewReady: true,
      }),
    }),
  );
}

async function prepared(fs: FileSystem = nodeFileSystem) {
  const root = await reviewProject();
  const fingerprint = await fingerprintNeutronProjectRoot(root);
  const materialized = materializeReviewBundle({ fingerprint, root });
  return {
    durable: await mkdtemp(join(tmpdir(), "neutron-verify-retry-")),
    fingerprint,
    fs,
    proposalId: materialized.bundle.proposal.proposalId,
    root,
    store: materialized.store,
  };
}

function runtimeFor(
  ready: Awaited<ReturnType<typeof prepared>>,
  turns: { count: number },
) {
  return createNeutronSessionRuntime({
    createAdapter: () => ({
      executeTurn: async () => {
        turns.count += 1;
        throw new Error("verification retry must not call a model");
      },
      getCapabilities: () => ({
        maxContextTokens: 1,
        maxOutputTokens: 1,
        modelId: "unused",
        providerKind: "deterministic-test",
        supportsStreaming: false,
        supportsToolCalls: false,
        supportsVision: false,
      }),
    }),
    durableStateDirectory: ready.durable,
    fs: ready.fs,
    now: () => new Date(SLICE5_NOW),
  });
}

function countingFs(writes: { count: number }): FileSystem {
  return {
    ...nodeFileSystem,
    write: async (path, content) => {
      writes.count += 1;
      await nodeFileSystem.write(path, content);
    },
  };
}

function hostInput(ready: Awaited<ReturnType<typeof prepared>>) {
  return {
    currentProjectFingerprint: ready.fingerprint,
    durableStateDirectory: ready.durable,
    fs: ready.fs,
    graphStale: {
      baseline: { projectFingerprint: ready.fingerprint },
      current: { projectFingerprint: ready.fingerprint },
    },
    now: SLICE5_NOW,
    session: slice5Session(ready.root),
    store: ready.store,
  };
}

function approve(ready: Awaited<ReturnType<typeof prepared>>) {
  return approveAndApplyNeutronGraphMutation({
    ...hostInput(ready),
    intent: intent(ready),
  });
}

function approveFailed(ready: Awaited<ReturnType<typeof prepared>>) {
  return approveAndApplyNeutronGraphMutation({
    ...hostInput(ready),
    afterWriteBeforeVerification: async () => {
      await writeFile(join(ready.root, "src/a.ts"), "tampered\n");
    },
    intent: intent(ready),
  });
}

function approveDeferred(ready: Awaited<ReturnType<typeof prepared>>) {
  return approveAndApplyNeutronGraphMutation({
    ...hostInput(ready),
    deferVerification: true,
    intent: intent(ready),
  });
}

async function approveLocked(ready: Awaited<ReturnType<typeof prepared>>) {
  const { acquireNeutronMutationApplyLock } =
    await import("../packages/application/src/neutron-mutation-apply-durable-lock.js");
  const canonical = await nodeFileSystem.realpath(ready.root);
  await acquireNeutronMutationApplyLock({
    canonicalRoot: canonical,
    durableStateDirectory: ready.durable,
    transactionId: "other-transaction",
  });
  return approve(ready);
}

function approveReconciliation(ready: Awaited<ReturnType<typeof prepared>>) {
  return approveAndApplyNeutronGraphMutation({
    ...hostInput(ready),
    failAt: "post-write-consistency",
    intent: intent(ready),
    rollbackFailPaths: ["src/a.ts"],
  });
}

function retry(ready: Awaited<ReturnType<typeof prepared>>) {
  return runtimeFor(ready, { count: 0 }).retryNeutronMutationVerification(
    retryQuery(ready),
  );
}

function intent(ready: Awaited<ReturnType<typeof prepared>>) {
  const session = slice5Session(ready.root);
  return {
    action: NEUTRON_MUTATION_APPROVAL_INTENT_ACTION,
    graphId: REVIEW_GRAPH_ID,
    projectId: session.projectId,
    proposalId: ready.proposalId,
    protocolVersion: PROTOCOL_VERSION,
    root: ready.root,
    schemaVersion: NEUTRON_MUTATION_APPROVAL_INTENT_SCHEMA_URN,
    sessionId: session.sessionId,
  };
}

function retryQuery(
  ready: { readonly root: string; readonly proposalId: string },
  identity?: {
    readonly graphId: string;
    readonly projectId: string;
    readonly proposalId: string;
    readonly root: string;
    readonly sessionId: string;
    readonly transactionId?: string;
  },
) {
  const session = slice5Session(ready.root);
  return {
    graphId: identity?.graphId ?? REVIEW_GRAPH_ID,
    projectId: identity?.projectId ?? session.projectId,
    proposalId: identity?.proposalId ?? ready.proposalId,
    protocolVersion: PROTOCOL_VERSION,
    root: identity?.root ?? ready.root,
    schemaVersion: NEUTRON_MUTATION_VERIFICATION_RETRY_SCHEMA_URN,
    sessionId: identity?.sessionId ?? session.sessionId,
    ...(identity?.transactionId === undefined
      ? {}
      : { transactionId: identity.transactionId }),
  };
}

function statusQuery(
  ready: { readonly root: string; readonly proposalId: string },
  identity: {
    readonly graphId: string;
    readonly projectId: string;
    readonly proposalId: string;
    readonly root: string;
    readonly sessionId: string;
    readonly transactionId?: string;
  },
) {
  return {
    ...retryQuery(ready, identity),
    schemaVersion: "urn:intentloom:schema:neutron-mutation-status:1" as const,
  };
}

function scope(ready: { readonly root: string }) {
  const session = slice5Session(ready.root);
  return {
    graphId: REVIEW_GRAPH_ID,
    projectId: session.projectId,
    root: ready.root,
    sessionId: session.sessionId,
  };
}

function submitInput(ready: {
  readonly proposalId: string;
  readonly root: string;
}) {
  const session = slice5Session(ready.root);
  return {
    graphId: REVIEW_GRAPH_ID,
    projectId: session.projectId,
    proposalId: ready.proposalId,
    root: ready.root,
    sessionId: session.sessionId,
  };
}

function markup(controller: {
  model: () => Parameters<typeof projectMutationRecoveryView>[0]["model"];
}): string {
  return renderToStaticMarkup(
    createElement(NeutronApproveApplyControl, {
      onRefresh: () => undefined,
      onRetry: () => undefined,
      onSubmit: () => undefined,
      view: projectMutationRecoveryView({
        currentness: "current",
        daemonReady: true,
        model: controller.model(),
        proposalId: controller.model().identity?.proposalId ?? "",
        reviewReady: true,
      }),
    }),
  );
}

async function rewriteState(
  directory: string,
  state: "claimed" | "executing",
): Promise<void> {
  const file = await approvalFile(directory);
  const record = decodeDurableTransactionRecord(await readFile(file, "utf8"));
  await writeFile(file, encodeDurableTransactionRecord({ ...record, state }));
}

async function approvalFile(directory: string): Promise<string> {
  const names = await readdir(join(directory, "approvals"));
  const file = names.find((name) => name.endsWith(".json"));
  if (file === undefined) throw new Error("missing approval record");
  return join(directory, "approvals", file);
}

async function approvalCount(directory: string): Promise<number> {
  const names = await readdir(join(directory, "approvals"));
  return names.filter((name) => name.endsWith(".json")).length;
}

function retrySource(): string {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  return [
    "packages/application/src/neutron-mutation-verification-retry-run.ts",
    "packages/daemon/src/neutron-mutation-verification-retry-handlers.ts",
    "apps/desktop/src/neutron/neutron-mutation-recovery-controller.ts",
  ]
    .map((path) => readFileSync(join(root, path), "utf8"))
    .join("\n");
}
