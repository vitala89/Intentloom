import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  NEUTRON_MUTATION_CLASS,
  type NeutronMutationApproveAndApplyResult,
  type NeutronMutationReviewCurrentness,
} from "@intentloom/protocol";
import { NeutronApproveApplyControl } from "../apps/desktop/src/neutron/NeutronApproveApplyControl.js";
import { NeutronMutationReviewView as MutationReviewView } from "../apps/desktop/src/neutron/NeutronMutationReviewPanel.js";
import { idleRecoveryModel } from "../apps/desktop/src/neutron/neutron-mutation-recovery-model.js";
import { beginPending } from "../apps/desktop/src/neutron/neutron-mutation-recovery-model.js";
import { recordDirectResult } from "../apps/desktop/src/neutron/neutron-mutation-recovery-model.js";
import { recoveryIdentity } from "../apps/desktop/src/neutron/neutron-mutation-recovery-model.js";
import { projectMutationRecoveryView } from "../apps/desktop/src/neutron/neutron-mutation-recovery-view.js";
import { initialMutationReviewUiState } from "../apps/desktop/src/neutron/neutron-mutation-review-state.js";

describe("Desktop Approve & Apply control", () => {
  it("enables the mutation button only for a current review", () => {
    const enabled = markup("current", { pending: false, settled: false });
    expect(enabled).toContain("Approve &amp; Apply");
    expect(enabled).not.toContain("disabled");
    for (const currentness of ["stale", "expired", "cancelled"] as const) {
      const html = markup(currentness, { pending: false, settled: false });
      expect(html).toContain("disabled");
      expect(html).toContain("Approve &amp; Apply");
    }
  });

  it("disables submission while the host request is in flight and after a result", () => {
    const pending = markup("current", { pending: true, settled: false });
    expect(pending).toContain("disabled");
    expect(pending).toContain("in progress");
    const settled = markup("current", {
      pending: false,
      result: {
        applied: true,
        approvalOutcome: undefined,
        changedPaths: ["src/a.ts"],
        diagnostics: [],
        protocolVersion: 1,
        reconciliationRequired: false,
        schemaVersion:
          "urn:intentloom:schema:neutron-mutation-approve-and-apply:1",
        stage: "apply",
        status: "applied",
        verificationStatus: "verification-failed",
      } as NeutronMutationApproveAndApplyResult,
      settled: true,
    });
    expect(settled).toContain("disabled");
    expect(settled).toContain("Applied. Verification failed.");
    expect(settled).not.toContain("not applied");
  });

  it("does not offer the control when no exact proposal is selected", () => {
    const html = renderToStaticMarkup(
      createElement(MutationReviewView, {
        file: null,
        headingRef: () => undefined,
        onClose: () => undefined,
        onSelectFile: () => undefined,
        onSelectProposal: () => undefined,
        state: {
          ...initialMutationReviewUiState(),
          listOutcome: "ok",
          listPhase: "ready",
          summaries: [summary("a"), summary("b")],
        },
      }),
    );
    expect(html).not.toContain("Approve &amp; Apply");
  });
});

function markup(
  currentness: NeutronMutationReviewCurrentness,
  input: {
    readonly pending: boolean;
    readonly settled: boolean;
    readonly result?: NeutronMutationApproveAndApplyResult;
  },
): string {
  let model = idleRecoveryModel();
  if (input.pending || input.settled) {
    model = beginPending(
      model,
      recoveryIdentity({
        graphId: "graph-1",
        projectId: "project-1",
        proposalId: "proposal-1",
        root: "/project",
        sessionId: "session-1",
      }),
    );
  }
  if (input.result !== undefined) {
    model = recordDirectResult(model, model.generation, input.result);
  }
  return renderToStaticMarkup(
    createElement(NeutronApproveApplyControl, {
      onRefresh: () => undefined,
      onRetry: () => undefined,
      onSubmit: () => undefined,
      view: projectMutationRecoveryView({
        currentness,
        daemonReady: false,
        model,
        proposalId: "proposal-1",
        reviewReady: true,
      }),
    }),
  );
}

function summary(proposalId: string) {
  return {
    attempt: 1,
    changedPathCount: 1,
    currentness: "current" as const,
    graphId: "graph-1",
    mutationClass: NEUTRON_MUTATION_CLASS,
    planDigest: "sha256:" + "ab".repeat(32),
    projectStateDigest: "sha256:" + "cd".repeat(32),
    proposalDigest: "sha256:" + "ef".repeat(32),
    proposalId,
    reviewArtifactDigest: "sha256:" + "11".repeat(32),
    taskId: "task",
  };
}
