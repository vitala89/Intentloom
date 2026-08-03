import type {
  TaskRouteDecision,
  TaskRouteKind,
  TaskRouteRequest,
} from "@intentloom/protocol";

const ROUTE_KINDS: readonly TaskRouteKind[] = [
  "direct",
  "clarify",
  "discover",
  "diagnose",
  "plan",
  "implement",
  "review",
  "adopt",
];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringArray(value: unknown, field: string): readonly string[] {
  if (
    !Array.isArray(value) ||
    !value.every((item) => typeof item === "string")
  ) {
    throw new Error(`${field} must be an array of strings`);
  }
  return value;
}

export function validateTaskRouteRequest(value: unknown): TaskRouteRequest {
  if (!isObject(value)) throw new Error("task route request must be an object");
  if (value.schemaVersion !== 1) {
    throw new Error("task route request schemaVersion must equal 1");
  }
  if (
    typeof value.taskDescription !== "string" ||
    value.taskDescription.trim().length === 0
  ) {
    throw new Error("taskDescription must be a non-empty string");
  }
  if (
    value.projectRoot !== undefined &&
    (typeof value.projectRoot !== "string" ||
      value.projectRoot.trim().length === 0)
  ) {
    throw new Error("projectRoot must be a non-empty string if provided");
  }

  let options: TaskRouteRequest["options"];
  if (value.options !== undefined) {
    if (!isObject(value.options)) {
      throw new Error("options must be an object if provided");
    }
    const profile = value.options.profile;
    if (profile !== undefined && (typeof profile !== "string" || !profile)) {
      throw new Error("options.profile must be a non-empty string if provided");
    }
    const maxSkills = value.options.maxSkills;
    if (
      maxSkills !== undefined &&
      (typeof maxSkills !== "number" ||
        !Number.isInteger(maxSkills) ||
        maxSkills <= 0)
    ) {
      throw new Error(
        "options.maxSkills must be a positive integer if provided",
      );
    }
    options = {
      ...(typeof profile === "string" ? { profile } : {}),
      ...(typeof maxSkills === "number" ? { maxSkills } : {}),
    };
  }

  return {
    schemaVersion: 1,
    taskDescription: value.taskDescription,
    ...(typeof value.projectRoot === "string"
      ? { projectRoot: value.projectRoot }
      : {}),
    ...(options ? { options } : {}),
  };
}

export function validateTaskRouteDecision(value: unknown): TaskRouteDecision {
  if (!isObject(value))
    throw new Error("task route decision must be an object");
  if (value.schemaVersion !== 1) {
    throw new Error("task route decision schemaVersion must equal 1");
  }
  if (!ROUTE_KINDS.includes(value.routeKind as TaskRouteKind)) {
    throw new Error("invalid task route kind");
  }
  const recommendedSkills = stringArray(
    value.recommendedSkills,
    "recommendedSkills",
  );
  const reasons = stringArray(value.reasons, "reasons");
  const requiredApprovals = stringArray(
    value.requiredApprovals,
    "requiredApprovals",
  );
  const expectedChecks = stringArray(value.expectedChecks, "expectedChecks");

  if (typeof value.firstAction !== "string" || !value.firstAction) {
    throw new Error("firstAction must be a non-empty string");
  }
  if (typeof value.readOnly !== "boolean") {
    throw new Error("readOnly must be a boolean");
  }

  return {
    schemaVersion: 1,
    routeKind: value.routeKind as TaskRouteKind,
    recommendedSkills,
    reasons,
    requiredApprovals,
    expectedChecks,
    firstAction: value.firstAction,
    readOnly: value.readOnly,
  };
}
