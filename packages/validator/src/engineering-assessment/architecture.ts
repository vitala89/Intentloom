import type {
  ArchitectureAssessmentResult,
  ArchitectureDependencyEdge,
} from "@intentloom/protocol";
import { isObject, stringArray } from "./common.js";

function validateArchitectureDependencyEdge(
  value: unknown,
): ArchitectureDependencyEdge {
  if (!isObject(value)) {
    throw new Error("dependency edge must be an object");
  }
  if (typeof value.from !== "string" || !value.from.trim()) {
    throw new Error("edge.from must be a non-empty string");
  }
  if (typeof value.to !== "string" || !value.to.trim()) {
    throw new Error("edge.to must be a non-empty string");
  }
  if (typeof value.isBoundaryViolation !== "boolean") {
    throw new Error("edge.isBoundaryViolation must be a boolean");
  }
  return {
    from: value.from,
    to: value.to,
    isBoundaryViolation: value.isBoundaryViolation,
  };
}

export function validateArchitectureAssessmentResult(
  value: unknown,
): ArchitectureAssessmentResult {
  if (!isObject(value)) {
    throw new Error("architecture result must be an object");
  }
  const packages = stringArray(value.packages, "architectureResult.packages");
  if (!Array.isArray(value.dependencyEdges)) {
    throw new Error("architectureResult.dependencyEdges must be an array");
  }
  const dependencyEdges = value.dependencyEdges.map(
    validateArchitectureDependencyEdge,
  );
  if (!Array.isArray(value.dependencyCycles)) {
    throw new Error("architectureResult.dependencyCycles must be an array");
  }
  const dependencyCycles = value.dependencyCycles.map((cycle, index) =>
    stringArray(cycle, `architectureResult.dependencyCycles[${index}]`),
  );
  const driftDiagnostics = stringArray(
    value.driftDiagnostics,
    "architectureResult.driftDiagnostics",
  );

  return {
    packages,
    dependencyEdges,
    dependencyCycles,
    driftDiagnostics,
  };
}
