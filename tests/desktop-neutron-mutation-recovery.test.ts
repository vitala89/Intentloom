import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  NEUTRON_MUTATION_STATUS_SCHEMA_URN,
  PROTOCOL_VERSION,
  type DaemonInfoResult,
  closedNeutronMutationStatus,
  validateNeutronMutationStatusResult,
  type NeutronMutationApproveAndApplyResult,
  type NeutronMutationStatusResult,
} from "@intentloom/protocol";
import { NEUTRON_READ_ONLY_TOOLS } from "../packages/protocol/src/neutron-runtime.js";
import { nodeFileSystem } from "../packages/application/src/index.js";
import { createNeutronSessionRuntime } from "../packages/application/src/neutron-session-runtime.js";
import { fingerprintNeutronProjectRoot } from "../packages/application/src/neutron-session-fingerprint.js";
import { approveAndApplyNeutronGraphMutation } from "../packages/application/src/neutron-scheduler.js";
import {
  NEUTRON_MUTATION_APPROVAL_INTENT_ACTION,
  NEUTRON_MUTATION_APPROVAL_INTENT_SCHEMA_URN,
} from "../packages/protocol/src/neutron-mutation-approval-intent.js";
import { desktopDaemonAuthenticated } from "../apps/desktop/src/desktop-daemon-ready.js";
import { NeutronApproveApplyControl } from "../apps/desktop/src/neutron/NeutronApproveApplyControl.js";
import { createNeutronMutationRecovery } from "../apps/desktop/src/neutron/neutron-mutation-recovery-controller.js";
import type { NeutronMutationRecoveryController } from "../apps/desktop/src/neutron/neutron-mutation-recovery-controller.js";
import {
  MUTATION_APPLIED_INCOMPLETE_COPY,
  MUTATION_APPLIED_RECONCILIATION_COPY,
  MUTATION_APPLIED_VERIFICATION_FAILED_COPY,
  MUTATION_APPLIED_VERIFIED_COPY,
  MUTATION_FAILED_BEFORE_WRITE_COPY,
  MUTATION_IN_PROGRESS_COPY,
  MUTATION_INTEGRITY_COPY,
  MUTATION_ISOLATED_SCOPE_COPY,
  MUTATION_RESULT_UNKNOWN_COPY,
  MUTATION_STATUS_UNAVAILABLE_COPY,
  MUTATION_UNKNOWN_RECORD_COPY,
} from "../apps/desktop/src/neutron/neutron-mutation-recovery-copy.js";
import { projectMutationRecoveryView } from "../apps/desktop/src/neutron/neutron-mutation-recovery-view.js";
import type { NeutronMutationReviewScope } from "../apps/desktop/src/neutron/neutron-mutation-review-state.js";
import {
  REVIEW_GRAPH_ID,
  SLICE5_CONTENT_A,
  SLICE5_NOW,
  materializeReviewBundle,
  reviewProject,
} from "./neutron-mutation-review-support.js";
import { slice5Session } from "./neutron-mutation-slice5-support.js";

const SCOPE: NeutronMutationReviewScope = {
  graphId: "graph-1",
  projectId: "project-1",
  root: "/project",
  sessionId: "session-1",
};

describe("Desktop mutation reconnect status recovery", () => {
  it("shows a normal result after a successful Approve & Apply response", async () => {
    const harness = fake({ direct: appliedResult("verified") });
    await harness.controller.submit(request());
    expect(harness.calls.apply).toBe(1);
    expect(harness.calls.status).toBe(0);
    expect(viewText(harness.controller, true)).toContain(
      MUTATION_APPLIED_VERIFIED_COPY,
    );
    expect(viewText(harness.controller, true)).not.toContain(
      MUTATION_RESULT_UNKNOWN_COPY,
    );
  });

  it("enters an uncertain state when the Apply response is lost", async () => {
    const harness = fake({ loseResponse: true });
    await harness.controller.submit(request());
    expect(harness.controller.model().phase).toBe("uncertain");
    expect(harness.controller.model().identity?.transactionId).toBeUndefined();
    const html = viewText(harness.controller, false);
    expect(html).toContain(MUTATION_RESULT_UNKNOWN_COPY);
    expect(html).toContain("disabled");
    expect(html.toLowerCase()).not.toContain("apply failed");
    expect(html).not.toContain("Refresh status");
  });

  it("recovers applied and verified with one status read and no second Apply", async () => {
    const harness = fake({
      loseResponse: true,
      status: recorded({
        applied: true,
        reconciliationRequired: false,
        transactionState: "applied",
        verificationStatus: "verified",
      }),
    });
    await harness.controller.submit(request());
    await harness.controller.setDaemonReady(false);
    await harness.controller.setDaemonReady(true);
    expect(harness.calls.status).toBe(1);
    expect(harness.calls.apply).toBe(1);
    expect(harness.calls.identities[0]?.transactionId).toBeUndefined();
    expect(viewText(harness.controller, true)).toContain(
      MUTATION_APPLIED_VERIFIED_COPY,
    );
    await harness.controller.submit(request());
    await harness.controller.setDaemonReady(false);
    await harness.controller.setDaemonReady(true);
    expect(harness.calls.apply).toBe(1);
    expect(harness.calls.status).toBe(1);
  });

  it("shows verification failure as applied and does not retry Apply", async () => {
    const harness = await recoverRecorded({
      applied: true,
      reconciliationRequired: false,
      transactionState: "applied",
      verificationStatus: "verification-failed",
    });
    const html = viewText(harness.controller, true);
    expect(html).toContain(MUTATION_APPLIED_VERIFICATION_FAILED_COPY);
    expect(html.toLowerCase()).not.toContain("mutation failed");
    await harness.controller.submit(request());
    expect(harness.calls.apply).toBe(1);
  });

  it("shows incomplete verification as applied", async () => {
    const harness = await recoverRecorded({
      applied: true,
      reconciliationRequired: false,
      transactionState: "applied",
      verificationStatus: "verification-incomplete",
    });
    expect(viewText(harness.controller, true)).toContain(
      MUTATION_APPLIED_INCOMPLETE_COPY,
    );
  });

  it("keeps reconciliation required distinct from verification failure", async () => {
    const harness = await recoverRecorded({
      applied: true,
      reconciliationRequired: true,
      transactionState: "failed-needs-reconciliation",
      verificationStatus: "reconciliation-required",
    });
    const html = viewText(harness.controller, true);
    expect(html).toContain(MUTATION_APPLIED_RECONCILIATION_COPY);
    expect(html).not.toContain("Verification failed");
    expect(html).not.toContain("Undo");
    expect(html).not.toContain("Roll back");
    expect(html).not.toContain("Retry verification");
  });

  it("shows failed-before-write without starting another Apply", async () => {
    const harness = await recoverRecorded({
      applied: false,
      failureCode: "lock-conflict",
      reconciliationRequired: false,
      status: "rejected",
      transactionState: "failed-before-write",
    });
    expect(viewText(harness.controller, true)).toContain(
      MUTATION_FAILED_BEFORE_WRITE_COPY,
    );
    await harness.controller.submit(request());
    expect(harness.calls.apply).toBe(1);
  });

  it("does not describe an unknown record as not applied", async () => {
    const harness = await recoverClosed("unknown");
    const html = viewText(harness.controller, true);
    expect(html).toContain(MUTATION_UNKNOWN_RECORD_COPY);
    expect(html.toLowerCase()).not.toContain("not applied");
    await harness.controller.submit(request());
    expect(harness.calls.apply).toBe(1);
  });

  it("does not retry Apply when durable state is unavailable", async () => {
    const harness = await recoverClosed("durable-state-unavailable");
    expect(viewText(harness.controller, true)).toContain(
      MUTATION_STATUS_UNAVAILABLE_COPY,
    );
    await harness.controller.setDaemonReady(false);
    await harness.controller.setDaemonReady(true);
    await harness.controller.submit(request());
    expect(harness.calls.apply).toBe(1);
    expect(harness.calls.status).toBe(1);
  });

  it("keeps a corrupt status error distinct from unknown and success", async () => {
    const harness = fake({
      loseResponse: true,
      statusError: Object.assign(new Error("durable-status-corrupt"), {
        code: "durable-status-corrupt",
      }),
    });
    await harness.controller.submit(request());
    await reconnect(harness.controller);
    expect(harness.controller.model().phase).toBe("integrity");
    const html = viewText(harness.controller, true);
    expect(html).toContain(MUTATION_INTEGRITY_COPY);
    expect(html).not.toContain(MUTATION_UNKNOWN_RECORD_COPY);
    expect(html).not.toContain(MUTATION_APPLIED_VERIFIED_COPY);
    expect(html).not.toContain("/tmp/");
    await harness.controller.submit(request());
    expect(harness.calls.apply).toBe(1);
  });

  it("disables a second Apply while the durable state is claimed or executing", async () => {
    for (const transactionState of ["claimed", "executing"] as const) {
      const harness = await recoverRecorded({
        applied: false,
        reconciliationRequired: false,
        transactionState,
      });
      const html = viewText(harness.controller, true);
      expect(html).toContain(MUTATION_IN_PROGRESS_COPY);
      expect(html).toContain("disabled");
      expect(html).toContain("Refresh status");
      await harness.controller.submit(request());
      expect(harness.calls.apply).toBe(1);
    }
  });

  it("refreshes status without calling Apply or polling", async () => {
    const harness = fake({
      daemonReady: true,
      loseResponse: true,
      status: recorded({
        applied: false,
        reconciliationRequired: false,
        transactionState: "claimed",
      }),
    });
    await harness.controller.submit(request());
    expect(harness.calls.status).toBe(0);
    await harness.controller.refresh();
    expect(harness.calls.status).toBe(1);
    expect(harness.calls.apply).toBe(1);
    await harness.controller.refresh();
    expect(harness.calls.status).toBe(2);
    expect(harness.calls.apply).toBe(1);
    await harness.controller.setDaemonReady(true);
    await harness.controller.setDaemonReady(true);
    expect(harness.calls.status).toBe(2);
    expect(recoverySource()).not.toContain("setInterval");
    expect(recoverySource()).not.toContain("setTimeout");
  });

  it("drops unresolved identity when root, project, or session changes", async () => {
    for (const replacement of [
      { ...SCOPE, root: "/other" },
      { ...SCOPE, projectId: "other-project" },
      { ...SCOPE, sessionId: "other-session" },
    ]) {
      const harness = fake({
        loseResponse: true,
        status: recorded({
          applied: true,
          reconciliationRequired: false,
          transactionState: "applied",
          verificationStatus: "verified",
        }),
      });
      await harness.controller.submit(request());
      const next = harness.controller.setScope(replacement);
      expect(next.identity).toBeNull();
      expect(next.phase).toBe("idle");
      expect(next.isolatedNotice).toBe(true);
      await reconnect(harness.controller);
      expect(harness.calls.status).toBe(0);
      expect(harness.calls.apply).toBe(1);
      expect(viewText(harness.controller, true)).not.toContain(
        MUTATION_APPLIED_VERIFIED_COPY,
      );
    }
  });

  it("shows the isolated-scope notice and stores no approval token", async () => {
    const harness = fake({ loseResponse: true });
    await harness.controller.submit(request());
    harness.controller.setScope({ ...SCOPE, root: "/other" });
    expect(harness.controller.model().isolatedNotice).toBe(true);
    const encoded = JSON.stringify(harness.controller.model());
    expect(encoded).not.toContain("approvalToken");
    expect(encoded).not.toContain("previousContent");
    expect(encoded).not.toContain("proposedContent");
    expect(encoded).not.toContain("durableStateDirectory");
    expect(MUTATION_ISOLATED_SCOPE_COPY).toContain("not queried");
    expect(recoverySource()).not.toContain("approvalToken");
    expect(recoverySource()).not.toContain("executeTurn");
    expect([...NEUTRON_READ_ONLY_TOOLS]).toEqual([
      "inspect",
      "doctor",
      "memorySearch",
      "timeline",
      "conformance",
      "securityAudit",
      "projectDiff",
    ]);
    expect(slice5Session().mutationAllowed).toBe(false);
  });

  it("shows scope mismatches as recovery failures", async () => {
    const harness = await recoverClosed("project-mismatch");
    expect(viewText(harness.controller, true)).toContain(
      "The host project does not match this mutation.",
    );
    expect(viewText(harness.controller, true)).not.toContain(
      MUTATION_APPLIED_VERIFIED_COPY,
    );
  });

  it("treats only an authenticated daemon connection as ready for recovery", () => {
    const compatible = daemonInfo("compatible");
    expect(
      desktopDaemonAuthenticated({
        connection: "Daemon 1.0.0",
        daemonInfo: compatible,
        inspectStatus: "ready",
        isConnecting: false,
      }),
    ).toBe(true);
    expect(
      desktopDaemonAuthenticated({
        connection: "Loading diff…",
        daemonInfo: compatible,
        inspectStatus: "ready",
        isConnecting: false,
      }),
    ).toBe(true);
    expect(
      desktopDaemonAuthenticated({
        connection: "Disconnected",
        daemonInfo: compatible,
        inspectStatus: "disconnected",
        isConnecting: false,
      }),
    ).toBe(false);
    expect(
      desktopDaemonAuthenticated({
        connection: "Protocol mismatch",
        daemonInfo: daemonInfo("incompatible"),
        inspectStatus: "protocol-mismatch",
        isConnecting: false,
      }),
    ).toBe(false);
  });

  it("recovers a lost Apply response from the host without a second write", async () => {
    const ready = await prepared();
    const calls = { adapters: 0, apply: 0, status: 0, turns: 0 };
    const runtime = createNeutronSessionRuntime({
      createAdapter: () => {
        calls.adapters += 1;
        return {
          executeTurn: async () => {
            calls.turns += 1;
            throw new Error("recovery must not call a model");
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
        };
      },
      durableStateDirectory: ready.durable,
      now: () => new Date(SLICE5_NOW),
    });
    const session = slice5Session(ready.root);
    const controller = createNeutronMutationRecovery({
      submitMutation: async () => {
        calls.apply += 1;
        await approve(ready);
        throw new Error("response lost");
      },
      retryVerification: async () => {
        throw new Error("verification retry is not part of status recovery");
      },
      getStatus: (identity) => {
        calls.status += 1;
        expect(identity.transactionId).toBeUndefined();
        return runtime.getNeutronMutationStatus({
          graphId: REVIEW_GRAPH_ID,
          projectId: session.projectId,
          proposalId: ready.proposalId,
          protocolVersion: PROTOCOL_VERSION,
          root: ready.root,
          schemaVersion: NEUTRON_MUTATION_STATUS_SCHEMA_URN,
          sessionId: session.sessionId,
        });
      },
    });
    controller.setScope({
      graphId: REVIEW_GRAPH_ID,
      projectId: session.projectId,
      root: ready.root,
      sessionId: session.sessionId,
    });
    await controller.submit({
      graphId: REVIEW_GRAPH_ID,
      projectId: session.projectId,
      proposalId: ready.proposalId,
      root: ready.root,
      sessionId: session.sessionId,
    });
    expect(controller.model().phase).toBe("uncertain");
    const written = await readFile(join(ready.root, "src/a.ts"), "utf8");
    expect(written).toBe(SLICE5_CONTENT_A);
    await reconnect(controller);
    expect(controller.model().status).toMatchObject({
      applied: true,
      outcome: "recorded",
      verificationStatus: "verified",
    });
    expect(calls).toMatchObject({ adapters: 0, apply: 1, status: 1, turns: 0 });
    expect(await readFile(join(ready.root, "src/a.ts"), "utf8")).toBe(written);
    await controller.submit({
      graphId: REVIEW_GRAPH_ID,
      projectId: session.projectId,
      proposalId: ready.proposalId,
      root: ready.root,
      sessionId: session.sessionId,
    });
    expect(calls.apply).toBe(1);
    expect(await readFile(join(ready.root, "src/a.ts"), "utf8")).toBe(written);
  });
});

function request() {
  return {
    graphId: SCOPE.graphId ?? "graph-1",
    projectId: SCOPE.projectId,
    proposalId: "proposal-1",
    root: SCOPE.root,
    sessionId: SCOPE.sessionId,
  };
}

function fake(input: {
  readonly daemonReady?: boolean;
  readonly direct?: NeutronMutationApproveAndApplyResult;
  readonly loseResponse?: boolean;
  readonly status?: NeutronMutationStatusResult;
  readonly statusError?: unknown;
}) {
  const calls = {
    apply: 0,
    identities: [] as { readonly transactionId?: string }[],
    status: 0,
  };
  const controller = createNeutronMutationRecovery(
    {
      submitMutation: async () => {
        calls.apply += 1;
        if (input.loseResponse === true) throw new Error("disconnected");
        return input.direct ?? appliedResult("verified");
      },
      retryVerification: async () => {
        throw new Error("verification retry is not part of status recovery");
      },
      getStatus: async (identity) => {
        calls.status += 1;
        calls.identities.push(
          identity.transactionId === undefined
            ? {}
            : { transactionId: identity.transactionId },
        );
        if (input.statusError !== undefined) throw input.statusError;
        return (
          input.status ??
          closedNeutronMutationStatus({
            outcome: "unknown",
            proposalId: identity.proposalId,
          })
        );
      },
    },
    { daemonReady: input.daemonReady === true },
  );
  controller.setScope(SCOPE);
  return { calls, controller };
}

async function recoverRecorded(fields: Parameters<typeof recorded>[0]) {
  const harness = fake({ loseResponse: true, status: recorded(fields) });
  await harness.controller.submit(request());
  await reconnect(harness.controller);
  return harness;
}

async function recoverClosed(
  outcome: "unknown" | "durable-state-unavailable" | "project-mismatch",
) {
  const harness = fake({
    loseResponse: true,
    status: closedNeutronMutationStatus({
      outcome,
      proposalId: "proposal-1",
    }),
  });
  await harness.controller.submit(request());
  await reconnect(harness.controller);
  return harness;
}

function reconnect(
  controller: NeutronMutationRecoveryController,
): Promise<unknown> {
  return controller
    .setDaemonReady(false)
    .then(() => controller.setDaemonReady(true));
}

function viewText(
  controller: NeutronMutationRecoveryController,
  daemonReady: boolean,
): string {
  return renderToStaticMarkup(
    createElement(NeutronApproveApplyControl, {
      onRefresh: () => undefined,
      onRetry: () => undefined,
      onSubmit: () => undefined,
      view: projectMutationRecoveryView({
        currentness: "current",
        daemonReady,
        model: controller.model(),
        proposalId: "proposal-1",
        reviewReady: true,
      }),
    }),
  );
}

function appliedResult(
  verificationStatus: "verified",
): NeutronMutationApproveAndApplyResult {
  return {
    applied: true,
    protocolVersion: PROTOCOL_VERSION,
    reconciliationRequired: false,
    schemaVersion: "urn:intentloom:schema:neutron-mutation-approve-and-apply:1",
    stage: "apply",
    status: "applied",
    verificationStatus,
  };
}

function recorded(fields: {
  readonly applied: boolean;
  readonly transactionState:
    | "claimed"
    | "executing"
    | "applied"
    | "failed-before-write"
    | "failed-needs-reconciliation";
  readonly reconciliationRequired: boolean;
  readonly verificationStatus?:
    | "verified"
    | "verification-failed"
    | "verification-incomplete"
    | "reconciliation-required";
  readonly failureCode?: "lock-conflict";
  readonly status?: "rejected";
}): NeutronMutationStatusResult {
  return validateNeutronMutationStatusResult({
    applied: fields.applied,
    changedPaths: [],
    diagnostics: [],
    outcome: "recorded",
    proposalId: "proposal-1",
    protocolVersion: PROTOCOL_VERSION,
    reconciliationRequired: fields.reconciliationRequired,
    schemaVersion: NEUTRON_MUTATION_STATUS_SCHEMA_URN,
    transactionState: fields.transactionState,
    ...(fields.failureCode === undefined
      ? {}
      : { failureCode: fields.failureCode }),
    ...(fields.status === undefined ? {} : { status: fields.status }),
    ...(fields.verificationStatus === undefined
      ? {}
      : { verificationStatus: fields.verificationStatus }),
  });
}

function daemonInfo(status: "compatible" | "incompatible"): DaemonInfoResult {
  return {
    capabilities: [],
    compatibility: {
      clientProtocolVersion: PROTOCOL_VERSION,
      daemonProtocolVersion: PROTOCOL_VERSION,
      status,
    },
    daemonVersion: "1.0.0",
    limits: {
      maxConnections: 1,
      maxMessageBytes: 1,
      maxResponseBytes: 1,
      requestTimeoutMs: 1,
    },
    protocolVersion: PROTOCOL_VERSION,
  };
}

function recoverySource(): string {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  return [
    "apps/desktop/src/neutron/neutron-mutation-recovery-controller.ts",
    "apps/desktop/src/neutron/neutron-mutation-recovery-model.ts",
    "apps/desktop/src/neutron/neutron-mutation-recovery-copy.ts",
    "apps/desktop/src/neutron/neutron-mutation-recovery-view.ts",
    "apps/desktop/src/neutron/use-neutron-mutation-recovery.ts",
  ]
    .map((path) => readFileSync(join(root, path), "utf8"))
    .join("\n");
}

async function prepared() {
  const root = await reviewProject();
  const fingerprint = await fingerprintNeutronProjectRoot(root);
  const materialized = materializeReviewBundle({ fingerprint, root });
  return {
    durable: await mkdtemp(join(tmpdir(), "neutron-d5-ux-")),
    fingerprint,
    proposalId: materialized.bundle.proposal.proposalId,
    root,
    store: materialized.store,
  };
}

function approve(ready: Awaited<ReturnType<typeof prepared>>) {
  const session = slice5Session(ready.root);
  return approveAndApplyNeutronGraphMutation({
    currentProjectFingerprint: ready.fingerprint,
    durableStateDirectory: ready.durable,
    fs: nodeFileSystem,
    graphStale: {
      baseline: { projectFingerprint: ready.fingerprint },
      current: { projectFingerprint: ready.fingerprint },
    },
    intent: {
      action: NEUTRON_MUTATION_APPROVAL_INTENT_ACTION,
      graphId: REVIEW_GRAPH_ID,
      projectId: session.projectId,
      proposalId: ready.proposalId,
      protocolVersion: PROTOCOL_VERSION,
      root: ready.root,
      schemaVersion: NEUTRON_MUTATION_APPROVAL_INTENT_SCHEMA_URN,
      sessionId: session.sessionId,
    },
    now: SLICE5_NOW,
    session,
    store: ready.store,
  });
}
