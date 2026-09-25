import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  NEUTRON_MUTATION_REVIEW_GET_SCHEMA_URN,
  NEUTRON_MUTATION_REVIEW_LIST_SCHEMA_URN,
  NEUTRON_MUTATION_REVIEW_VIEW_SCHEMA_URN,
  PROTOCOL_VERSION,
  type NeutronMutationReviewCurrentness,
  type NeutronMutationReviewFileView,
  type NeutronMutationReviewGetResult,
  type NeutronMutationReviewSummary,
  type NeutronMutationReviewView,
} from "@intentloom/protocol";
import { NeutronMutationReviewView as MutationReviewView } from "../apps/desktop/src/neutron/NeutronMutationReviewPanel.js";
import { diffReviewLines } from "../apps/desktop/src/neutron/neutron-mutation-review-diff.js";
import { orchestrateMutationReviewLoad } from "../apps/desktop/src/neutron/neutron-mutation-review-load.js";
import {
  initialMutationReviewUiState,
  selectMutationProposal,
  type NeutronMutationReviewPort,
  type NeutronMutationReviewScope,
  type NeutronMutationReviewUiState,
} from "../apps/desktop/src/neutron/neutron-mutation-review-state.js";

const desktopNeutron = join(
  dirname(fileURLToPath(import.meta.url)),
  "../apps/desktop/src/neutron",
);
const scope: NeutronMutationReviewScope = {
  root: "/project",
  sessionId: "session-1",
  projectId: "project-1",
  graphId: "graph-1",
};
const digest = (char: string) => `sha256:${char.repeat(64)}`;

function summary(
  proposalId: string,
  currentness: NeutronMutationReviewCurrentness = "current",
): NeutronMutationReviewSummary {
  return {
    proposalId,
    proposalDigest: digest("a"),
    planDigest: digest("b"),
    reviewArtifactDigest: digest("c"),
    projectStateDigest: digest("d"),
    mutationClass: "approved-transaction-apply",
    graphId: "graph-1",
    taskId: "task-1",
    attempt: 1,
    changedPathCount: 1,
    currentness,
    expiresAt: 1_800_000_000_000,
  };
}

function fileView(
  overrides: Partial<NeutronMutationReviewFileView> = {},
): NeutronMutationReviewFileView {
  return {
    path: "src/a.ts",
    operation: "update",
    status: "available",
    proposedContentDigest: digest("e"),
    existedBefore: true,
    currentExists: true,
    currentContent: "alpha\n  keep\nomega\n",
    proposedContent: "alpha\n  keep\nadded\n",
    currentContentDigest: digest("f"),
    ...overrides,
  };
}

function reviewView(
  proposalId: string,
  file: NeutronMutationReviewFileView,
  currentness: NeutronMutationReviewCurrentness = "current",
): NeutronMutationReviewView {
  return {
    schemaVersion: NEUTRON_MUTATION_REVIEW_VIEW_SCHEMA_URN,
    sessionId: scope.sessionId,
    projectId: scope.projectId,
    root: scope.root,
    graphId: "graph-1",
    taskId: "task-1",
    attempt: 1,
    proposalId,
    proposalDigest: digest("a"),
    planDigest: digest("b"),
    reviewArtifactDigest: digest("c"),
    projectStateDigest: digest("d"),
    mutationClass: "approved-transaction-apply",
    currentness,
    files: [file],
    expiresAt: 1_800_000_000_000,
  };
}

function listResult(reviews: readonly NeutronMutationReviewSummary[]) {
  return {
    protocolVersion: PROTOCOL_VERSION,
    schemaVersion: NEUTRON_MUTATION_REVIEW_LIST_SCHEMA_URN,
    outcome: "ok" as const,
    reviews,
  };
}

function getResult(
  review: NeutronMutationReviewView | undefined,
  outcome: NeutronMutationReviewGetResult["outcome"] = "ok",
): NeutronMutationReviewGetResult {
  return {
    protocolVersion: PROTOCOL_VERSION,
    schemaVersion: NEUTRON_MUTATION_REVIEW_GET_SCHEMA_URN,
    outcome,
    ...(review === undefined ? {} : { review }),
  };
}

function markup(state: NeutronMutationReviewUiState): string {
  const file =
    state.review?.files.find((item) => item.path === state.selectedPath) ??
    null;
  return renderToStaticMarkup(
    createElement(MutationReviewView, {
      state,
      file,
      headingRef: () => undefined,
      onSelectProposal: () => undefined,
      onSelectFile: () => undefined,
      onClose: () => undefined,
    }),
  );
}

function buttonLabels(html: string): string[] {
  return [...html.matchAll(/<button\b[^>]*>(.*?)<\/button>/gs)].map(
    (match) => match[1]?.replace(/<[^>]+>/g, "") ?? "",
  );
}

describe("Neutron D2 exact mutation review UI", () => {
  it("renders an empty safe state when no authoritative proposals exist", async () => {
    const state = await orchestrateMutationReviewLoad({
      port: portFor([]),
      scope,
      previous: initialMutationReviewUiState(),
    });
    expect(markup(state)).toContain("No authoritative proposals");
    expect(markup(state)).not.toContain("proposal-a-bytes");
  });

  it("reviews the single proposal by its explicit proposal id", async () => {
    const calls: string[] = [];
    const file = fileView({ proposedContent: "only-a\n" });
    const state = await orchestrateMutationReviewLoad({
      port: {
        listNeutronMutationReviews: async () => {
          calls.push("list");
          return listResult([summary("proposal-a")]);
        },
        getNeutronMutationReview: async (...args) => {
          calls.push(args[3]);
          return getResult(reviewView("proposal-a", file));
        },
      },
      scope,
      previous: initialMutationReviewUiState(),
    });
    expect(calls).toEqual(["list", "proposal-a"]);
    expect(state.selectedProposalId).toBe("proposal-a");
    expect(markup(state)).toContain("only-a");
  });

  it("does not auto-select the first proposal when several exist", async () => {
    const gets: string[] = [];
    const state = await orchestrateMutationReviewLoad({
      port: {
        listNeutronMutationReviews: async () =>
          listResult([summary("proposal-a"), summary("proposal-b")]),
        getNeutronMutationReview: async (...args) => {
          gets.push(args[3]);
          return getResult(undefined, "proposal-not-found");
        },
      },
      scope,
      previous: initialMutationReviewUiState(),
    });
    expect(gets).toEqual([]);
    expect(state.selectedProposalId).toBeNull();
    expect(state.review).toBeNull();
    const html = markup(state);
    expect(html).toContain("Select a proposal");
    expect(html).toContain("proposal-a");
    expect(html).toContain("proposal-b");
    expect(html).not.toContain('aria-selected="true"');
  });

  it("loads proposal B by id and never shows proposal A bytes", async () => {
    const gets: string[] = [];
    const listed = await orchestrateMutationReviewLoad({
      port: portFor([summary("proposal-a"), summary("proposal-b")]),
      scope,
      previous: initialMutationReviewUiState(),
    });
    const selected = selectMutationProposal(listed, "proposal-b");
    const loaded = await orchestrateMutationReviewLoad({
      port: {
        listNeutronMutationReviews: async () =>
          listResult([summary("proposal-a"), summary("proposal-b")]),
        getNeutronMutationReview: async (...args) => {
          gets.push(args[3]);
          const id = args[3];
          const content =
            id === "proposal-b" ? "bytes-from-b\n" : "bytes-from-a\n";
          return getResult(
            reviewView(
              id,
              fileView({
                proposedContent: content,
                currentContent: "current-b\n",
              }),
            ),
          );
        },
      },
      scope,
      previous: selected,
    });
    expect(gets).toEqual(["proposal-b"]);
    const html = markup(loaded);
    expect(html).toContain("bytes-from-b");
    expect(html).toContain("current-b");
    expect(html).not.toContain("bytes-from-a");
  });

  it("renders exact added, removed, modified, and whitespace-sensitive lines", () => {
    const edits = diffReviewLines(
      ["alpha", "  keep", "gone"],
      ["alpha", "  keep", "gone-changed", "  added"],
    );
    expect(edits).toEqual([
      { kind: "context", text: "alpha" },
      { kind: "context", text: "  keep" },
      { kind: "del", text: "gone" },
      { kind: "add", text: "gone-changed" },
      { kind: "add", text: "  added" },
    ]);
    const html = markup({
      ...initialMutationReviewUiState(),
      listPhase: "ready",
      listOutcome: "ok",
      summaries: [summary("proposal-a")],
      selectedProposalId: "proposal-a",
      reviewPhase: "ready",
      reviewOutcome: "ok",
      selectedPath: "src/a.ts",
      review: reviewView(
        "proposal-a",
        fileView({
          currentContent: "alpha\n  keep\ngone\n",
          proposedContent: "alpha\n  keep\ngone-changed\n  added\n",
        }),
      ),
    });
    expect(html).toContain("alpha");
    expect(html).toContain("  keep");
    expect(html).toContain("gone");
    expect(html).toContain("gone-changed");
    expect(html).toContain("  added");
    expect(html).toContain("added line");
    expect(html).toContain("removed line");
  });

  it.each(["current", "stale", "expired", "cancelled"] as const)(
    "shows %s status without a mutation control",
    (currentness) => {
      const html = markup({
        ...initialMutationReviewUiState(),
        listPhase: "ready",
        listOutcome: "ok",
        summaries: [summary("proposal-a", currentness)],
        selectedProposalId: "proposal-a",
        reviewPhase: "ready",
        reviewOutcome: "ok",
        selectedPath: "src/a.ts",
        review: reviewView("proposal-a", fileView(), currentness),
      });
      expect(html.toLowerCase()).toContain(currentness);
      const labels = buttonLabels(html)
        .join(" ")
        .replaceAll("approved-transaction-apply", "")
        .toLowerCase();
      expect(labels).not.toMatch(/\bapprove\b/);
      expect(labels).not.toMatch(/\bapply\b/);
      expect(labels).not.toContain("accept changes");
      expect(labels).not.toContain("commit changes");
      expect(labels).not.toContain("write files");
    },
  );

  it("does not render secret-like file bodies", () => {
    const html = markup({
      ...initialMutationReviewUiState(),
      listPhase: "ready",
      listOutcome: "ok",
      summaries: [summary("proposal-a")],
      selectedProposalId: "proposal-a",
      reviewPhase: "ready",
      reviewOutcome: "ok",
      selectedPath: ".env",
      review: reviewView(
        "proposal-a",
        fileView({
          path: ".env",
          status: "secret-path-unavailable",
          proposedContent: "SECRET_TOKEN_VALUE",
          currentContent: "OLD_SECRET_TOKEN_VALUE",
        }),
      ),
    });
    expect(html).toContain("secret-path-unavailable");
    expect(html).toContain("Body unavailable");
    expect(html).not.toContain("SECRET_TOKEN_VALUE");
    expect(html).not.toContain("OLD_SECRET_TOKEN_VALUE");
  });

  it("requests only the D1 list and explicit get arguments", async () => {
    const calls: unknown[][] = [];
    const modelCalls: string[] = [];
    const client = {
      listNeutronMutationReviews: async (...args: unknown[]) => {
        calls.push(["list", ...args]);
        return listResult([summary("proposal-a")]);
      },
      getNeutronMutationReview: async (...args: unknown[]) => {
        calls.push(["get", ...args]);
        return getResult(reviewView("proposal-a", fileView()));
      },
      neutronTurnExecute: async () => {
        modelCalls.push("turn");
      },
      applyApproved: async () => {
        modelCalls.push("apply");
      },
    };
    await orchestrateMutationReviewLoad({
      port: client,
      scope,
      previous: initialMutationReviewUiState(),
    });
    expect(modelCalls).toEqual([]);
    expect(calls[0]?.slice(0, 5)).toEqual([
      "list",
      "/project",
      "session-1",
      "project-1",
      "graph-1",
    ]);
    expect(calls[1]?.slice(0, 6)).toEqual([
      "get",
      "/project",
      "session-1",
      "project-1",
      "proposal-a",
      "graph-1",
    ]);
    expect(JSON.stringify(calls)).not.toContain("approvalToken");
    expect(JSON.stringify(calls)).not.toContain("mutationAllowed");
    expect(JSON.stringify(calls)).not.toContain("grantedApprovals");
  });

  it("keeps the review UI isolated from the legacy apply modal", () => {
    const files = readdirSync(desktopNeutron).filter((name) =>
      name.includes("mutation-review"),
    );
    expect(files.length).toBeGreaterThan(0);
    for (const name of files) {
      const source = readFileSync(join(desktopNeutron, name), "utf8");
      expect(source).not.toContain("ApprovedApplyModal");
      expect(source).not.toContain("applied: true");
      expect(source).not.toContain("approveAndApply");
      expect(source).not.toContain("approvalToken");
    }
  });
});

function portFor(
  reviews: readonly NeutronMutationReviewSummary[],
): NeutronMutationReviewPort {
  return {
    listNeutronMutationReviews: async () => listResult(reviews),
    getNeutronMutationReview: async () =>
      getResult(undefined, "proposal-not-found"),
  };
}
