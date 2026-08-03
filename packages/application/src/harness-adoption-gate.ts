import type {
  HarnessAdoptionGateRequest,
  HarnessAdoptionGateResult,
} from "@intentloom/protocol";
import {
  validateHarnessAdoptionGateRequest,
  validateHarnessAdoptionGateResult,
} from "@intentloom/validator";

const REQUIRED_ACTION_APPROVALS = {
  "activate-external-skill": ["managed-extension-activation-approval"],
  "mutate-agent-capability": ["atomic-commit-approval"],
  "execute-external-mcp": ["mcp-capability-approval"],
} as const;

export function evaluateHarnessAdoptionGate(
  request: HarnessAdoptionGateRequest,
  options: { readonly now?: () => number } = {},
): HarnessAdoptionGateResult {
  const validated = validateHarnessAdoptionGateRequest(request);
  const currentTime = options.now?.() ?? Date.now();
  const maxAgeMs = validated.maxScorecardAgeMs ?? 86_400_000;
  const diagnostics: string[] = [];

  if (validated.scorecards.length === 0) {
    diagnostics.push("missing-harness-scorecard");
  }

  for (const scorecard of validated.scorecards) {
    if (scorecard.status !== "passed") {
      diagnostics.push(
        `harness-scorecard-failed:${scorecard.scorecardId}:${scorecard.status}`,
      );
    }
    const scorecardTime =
      scorecard.events.find((e) => typeof e.timestamp === "number")
        ?.timestamp ?? currentTime;

    if (currentTime < scorecardTime || currentTime - scorecardTime > maxAgeMs) {
      diagnostics.push(`stale-harness-scorecard:${scorecard.scorecardId}`);
    }
  }

  const requiredApprovals = REQUIRED_ACTION_APPROVALS[validated.actionKind];
  for (const approval of requiredApprovals) {
    if (!validated.grantedApprovals.includes(approval)) {
      diagnostics.push(`missing-required-approval:${approval}`);
    }
  }

  const passed = diagnostics.length === 0;

  return validateHarnessAdoptionGateResult({
    schemaVersion: 1,
    targetResourceId: validated.targetResourceId,
    actionKind: validated.actionKind,
    passed,
    checkedScorecardsCount: validated.scorecards.length,
    diagnostics,
    safeNextAction: passed
      ? `grant requested action for ${validated.targetResourceId}`
      : "fail closed: obtain required passing harness scorecards and explicit approvals before retrying",
  });
}
