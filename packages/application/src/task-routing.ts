import type {
  TaskRouteDecision,
  TaskRouteKind,
  TaskRouteRequest,
} from "@intentloom/protocol";
import {
  validateTaskRouteDecision,
  validateTaskRouteRequest,
} from "@intentloom/validator";

export function routeTaskRequest(request: TaskRouteRequest): TaskRouteDecision {
  const validatedRequest = validateTaskRouteRequest(request);
  const text = validatedRequest.taskDescription.toLowerCase();

  let routeKind: TaskRouteKind = "direct";
  let recommendedSkills: readonly string[] = ["aif-task-router"];
  let reasons: readonly string[] = ["Task is clear, bounded, and direct."];
  let requiredApprovals: readonly string[] = [];
  let expectedChecks: readonly string[] = ["git status"];
  let firstAction = "execute direct task";
  let readOnly = false;

  if (
    text.includes("plugin") ||
    text.includes("extension") ||
    text.includes("mcp") ||
    text.includes("external skill")
  ) {
    routeKind = "review";
    recommendedSkills = ["aif-extension-review", "aif-task-router"];
    reasons = [
      "Task touches external skills, plugins, or MCP extensions requiring safety review.",
    ];
    requiredApprovals = ["extension-activation-approval"];
    expectedChecks = [
      "extension-schema-validation",
      "capability-minimization-check",
    ];
    firstAction = "review extension capabilities and security boundary";
    readOnly = true;
  } else if (
    text.includes("adopt") ||
    text.includes("governance") ||
    text.includes("policy") ||
    text.includes("install")
  ) {
    routeKind = "adopt";
    recommendedSkills = ["aif-task-router", "aif-verification-gate"];
    reasons = [
      "Task involves system setup, adoption, or policy governance enforcement.",
    ];
    requiredApprovals = ["adopt-write-approval"];
    expectedChecks = ["pnpm verify", "git diff --check"];
    firstAction = "run adoption analysis";
    readOnly = false;
  } else if (
    text.includes("discover") ||
    text.includes("interview") ||
    text.includes("ambigu") ||
    text.includes("explore")
  ) {
    routeKind = "discover";
    recommendedSkills = ["aif-feature-discovery", "aif-task-router"];
    reasons = [
      "Task contains ambiguity or requires structured discovery before implementation.",
    ];
    requiredApprovals = [];
    expectedChecks = [];
    firstAction = "conduct feature discovery interview";
    readOnly = true;
  } else if (
    text.includes("plan") ||
    text.includes("architecture") ||
    text.includes("design") ||
    text.includes("adr")
  ) {
    routeKind = "plan";
    recommendedSkills = ["aif-task-router", "aif-verification-gate"];
    reasons = [
      "Task requires architectural planning, specification updates, or ADR design.",
    ];
    requiredApprovals = ["implementation-plan-approval"];
    expectedChecks = ["architecture-boundary-check"];
    firstAction = "create implementation plan artifact";
    readOnly = true;
  } else if (
    text.includes("bug") ||
    text.includes("fix") ||
    text.includes("error") ||
    text.includes("fail") ||
    text.includes("diagnose") ||
    text.includes("leak")
  ) {
    routeKind = "diagnose";
    recommendedSkills = ["aif-task-router", "aif-verification-gate"];
    reasons = [
      "Task requires bug diagnosis, error log analysis, or regression investigation.",
    ];
    requiredApprovals = [];
    expectedChecks = ["pnpm vitest run <affected-test>"];
    firstAction = "inspect error logs and failing assertions";
    readOnly = true;
  } else if (
    text.includes("implement") ||
    text.includes("add") ||
    text.includes("create") ||
    text.includes("refactor") ||
    text.includes("build")
  ) {
    routeKind = "implement";
    recommendedSkills = ["aif-task-router", "aif-verification-gate"];
    reasons = [
      "Task specifies clear implementation or code refactoring goals.",
    ];
    requiredApprovals = ["atomic-commit-approval"];
    expectedChecks = ["pnpm verify", "git diff --check"];
    firstAction = "apply implementation changes";
    readOnly = false;
  }

  return validateTaskRouteDecision({
    schemaVersion: 1,
    routeKind,
    recommendedSkills,
    reasons,
    requiredApprovals,
    expectedChecks,
    firstAction,
    readOnly,
  });
}
