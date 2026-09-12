import type {
  NeutronGraphSnapshot,
  NeutronGraphStatus,
  NeutronSessionViewmodel,
} from "@intentloom/protocol";

export type NeutronAuthoritativeOutcomeKind =
  | NeutronGraphStatus
  | "session-completed"
  | "session-failed"
  | "session-cancelled"
  | "session-timed-out"
  | "session-created"
  | "session-discussing"
  | "session-inspecting"
  | "session-planning"
  | "session-unknown";

export interface NeutronAuthoritativeOutcome {
  readonly kind: NeutronAuthoritativeOutcomeKind;
  readonly accepted: boolean | null;
  readonly partial: boolean;
  readonly mutationAttempted: false;
  readonly budgetExceeded: boolean;
  readonly staleKinds: readonly string[];
  readonly source: "graph" | "session";
}

export function authoritativeNeutronOutcome(
  viewmodel: NeutronSessionViewmodel,
): NeutronAuthoritativeOutcome | null {
  const graph = viewmodel.graphSnapshot;
  if (graph !== null) return outcomeFromGraph(graph);
  if (viewmodel.errorCode !== null) {
    return sessionTerminalOutcome(viewmodel);
  }
  return outcomeFromSessionState(viewmodel);
}

function outcomeFromGraph(
  graph: NeutronGraphSnapshot,
): NeutronAuthoritativeOutcome {
  return {
    accepted: graph.accepted,
    budgetExceeded: graph.budgetExceeded,
    kind: graph.status,
    mutationAttempted: false,
    partial: graph.partial,
    source: "graph",
    staleKinds: graph.stale?.kinds ?? [],
  };
}

function sessionTerminalOutcome(
  viewmodel: NeutronSessionViewmodel,
): NeutronAuthoritativeOutcome {
  const state = viewmodel.session.state;
  const limitExceeded = viewmodel.contextSummary?.limitExceeded === true;
  const kind =
    state === "cancelled"
      ? "session-cancelled"
      : state === "timed-out"
        ? "session-timed-out"
        : state === "failed"
          ? "session-failed"
          : "session-failed";
  return {
    accepted: null,
    budgetExceeded: limitExceeded,
    kind,
    mutationAttempted: false,
    partial: false,
    source: "session",
    staleKinds: [],
  };
}

function outcomeFromSessionState(
  viewmodel: NeutronSessionViewmodel,
): NeutronAuthoritativeOutcome | null {
  const state = viewmodel.session.state;
  if (state === "created") {
    return {
      accepted: null,
      budgetExceeded: false,
      kind: "session-created",
      mutationAttempted: false,
      partial: false,
      source: "session",
      staleKinds: [],
    };
  }
  if (
    state === "discussing" ||
    state === "inspecting" ||
    state === "planning"
  ) {
    return {
      accepted: null,
      budgetExceeded: viewmodel.contextSummary?.limitExceeded === true,
      kind: `session-${state}` as NeutronAuthoritativeOutcomeKind,
      mutationAttempted: false,
      partial: false,
      source: "session",
      staleKinds: [],
    };
  }
  if (state === "completed") {
    return {
      accepted: null,
      budgetExceeded: viewmodel.contextSummary?.limitExceeded === true,
      kind: "session-completed",
      mutationAttempted: false,
      partial: false,
      source: "session",
      staleKinds: [],
    };
  }
  return sessionTerminalOutcome(viewmodel);
}

export function outcomeStatusLabel(
  outcome: NeutronAuthoritativeOutcome,
): string {
  if (outcome.kind === "stale") return "Stale";
  if (outcome.kind === "timed-out" || outcome.kind === "session-timed-out") {
    return "Timed out";
  }
  if (outcome.kind === "cancelled" || outcome.kind === "session-cancelled") {
    return "Cancelled";
  }
  if (outcome.kind === "failed" || outcome.kind === "session-failed") {
    return "Failed";
  }
  if (outcome.kind === "incomplete") return "Incomplete";
  if (outcome.kind === "session-completed") {
    return "Session completed";
  }
  if (outcome.kind === "completed") {
    return outcome.accepted === true
      ? "Completed (accepted)"
      : "Completed (not accepted)";
  }
  if (outcome.kind.startsWith("session-")) {
    return `Session ${outcome.kind.replace("session-", "")}`;
  }
  return outcome.kind;
}

export function modelProseClaimsSuccess(responseText: string | null): boolean {
  if (responseText === null || responseText.trim().length === 0) return false;
  const lower = responseText.toLowerCase();
  return (
    lower.includes("verified") ||
    lower.includes("succeeded") ||
    lower.includes("successfully") ||
    lower.includes("all tasks") ||
    lower.includes("files were updated")
  );
}
