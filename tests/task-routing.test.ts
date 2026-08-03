import { describe, expect, it } from "vitest";
import { routeTaskRequest } from "../packages/application/src/index.js";
import {
  validateTaskRouteDecision,
  validateTaskRouteRequest,
} from "@intentloom/validator";

describe("Phase C5 TaskRouteDecision protocol and application contract", () => {
  it("validates TaskRouteRequest schema correctly", () => {
    const valid = validateTaskRouteRequest({
      schemaVersion: 1,
      taskDescription: "Fix memory leak in web worker",
      projectRoot: "/projects/my-app",
      options: { profile: "typescript", maxSkills: 5 },
    });

    expect(valid.schemaVersion).toBe(1);
    expect(valid.taskDescription).toBe("Fix memory leak in web worker");
    expect(valid.projectRoot).toBe("/projects/my-app");
    expect(valid.options?.profile).toBe("typescript");
  });

  it("rejects invalid TaskRouteRequest payloads", () => {
    expect(() =>
      validateTaskRouteRequest({
        schemaVersion: 2,
        taskDescription: "Some task",
      }),
    ).toThrow("schemaVersion must equal 1");

    expect(() =>
      validateTaskRouteRequest({
        schemaVersion: 1,
        taskDescription: "",
      }),
    ).toThrow("taskDescription must be a non-empty string");
  });

  it("validates TaskRouteDecision schema correctly", () => {
    const valid = validateTaskRouteDecision({
      schemaVersion: 1,
      routeKind: "plan",
      recommendedSkills: ["aif-task-router"],
      reasons: ["Task requires architecture planning."],
      requiredApprovals: ["plan-approval"],
      expectedChecks: ["architecture-check"],
      firstAction: "create plan",
      readOnly: true,
    });

    expect(valid.schemaVersion).toBe(1);
    expect(valid.routeKind).toBe("plan");
    expect(valid.readOnly).toBe(true);
  });

  it("classifies adopt/governance tasks deterministically", () => {
    const decision = routeTaskRequest({
      schemaVersion: 1,
      taskDescription:
        "Setup Intentloom governance policy for project adoption",
    });

    expect(decision.routeKind).toBe("adopt");
    expect(decision.recommendedSkills).toContain("aif-task-router");
    expect(decision.requiredApprovals).toContain("adopt-write-approval");
    expect(decision.readOnly).toBe(false);
  });

  it("classifies plugin/extension tasks to review route", () => {
    const decision = routeTaskRequest({
      schemaVersion: 1,
      taskDescription:
        "Install external MCP plugin for chrome extension debugging",
    });

    expect(decision.routeKind).toBe("review");
    expect(decision.recommendedSkills).toContain("aif-extension-review");
    expect(decision.requiredApprovals).toContain(
      "extension-activation-approval",
    );
    expect(decision.readOnly).toBe(true);
  });

  it("classifies ambiguous/discovery tasks to discover route", () => {
    const decision = routeTaskRequest({
      schemaVersion: 1,
      taskDescription: "Explore fuzzy user requirements and conduct interview",
    });

    expect(decision.routeKind).toBe("discover");
    expect(decision.recommendedSkills).toContain("aif-feature-discovery");
    expect(decision.readOnly).toBe(true);
  });

  it("classifies architecture/planning tasks to plan route", () => {
    const decision = routeTaskRequest({
      schemaVersion: 1,
      taskDescription:
        "Design architecture ADR spec for multi-agent orchestrator",
    });

    expect(decision.routeKind).toBe("plan");
    expect(decision.requiredApprovals).toContain(
      "implementation-plan-approval",
    );
    expect(decision.readOnly).toBe(true);
  });

  it("classifies bug/diagnosis tasks to diagnose route", () => {
    const decision = routeTaskRequest({
      schemaVersion: 1,
      taskDescription: "Fix memory leak bug and error failure in daemon worker",
    });

    expect(decision.routeKind).toBe("diagnose");
    expect(decision.readOnly).toBe(true);
  });

  it("classifies code implementation tasks to implement route", () => {
    const decision = routeTaskRequest({
      schemaVersion: 1,
      taskDescription:
        "Implement feature helper method and refactor index module",
    });

    expect(decision.routeKind).toBe("implement");
    expect(decision.requiredApprovals).toContain("atomic-commit-approval");
    expect(decision.readOnly).toBe(false);
  });

  it("classifies direct tasks as direct route default", () => {
    const decision = routeTaskRequest({
      schemaVersion: 1,
      taskDescription: "Format readme file",
    });

    expect(decision.routeKind).toBe("direct");
    expect(decision.readOnly).toBe(false);
  });
});
