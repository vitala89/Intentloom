import {
  QUALITY_PACK_SCHEMA_URN,
  type EngineeringQualityPack,
} from "@intentloom/protocol";
import {
  provenance,
  repoPrinciplesSource,
  repoQualitySource,
} from "./common.js";

const baseSources = [repoQualitySource, repoPrinciplesSource] as const;

export const baseQualityPack = {
  schemaVersion: QUALITY_PACK_SCHEMA_URN,
  id: "intentloom/base-quality",
  version: "1.0.0",
  name: "Base Quality",
  description:
    "Provider-neutral budgets, evidence, testing, and exception guidance.",
  dependencies: [],
  compatibility: { intentloomVersionRange: ">=1.0.0 <2.0.0" },
  provenance: provenance(baseSources),
  entries: [
    {
      id: "base-file-size",
      meaningId: "quality.file.physical-lines",
      kind: "rule",
      metric: "physical-lines",
      name: "Hand-written file budgets",
      description:
        "Keep hand-written production files cohesive and reviewable.",
      category: "code-quality",
      severity: "error",
      applicableClassifications: [
        "hand-written-production",
        "hand-written-test",
      ],
      enforcement: "deterministic",
      thresholds: [
        { level: "preferred", maxPhysicalLines: 250 },
        { level: "review", maxPhysicalLines: 300 },
        { level: "hard", maxPhysicalLines: 400 },
      ],
      sourceReferenceIds: ["intentloom-code-quality-standards"],
    },
    {
      id: "base-function-size",
      meaningId: "quality.function.lines",
      kind: "rule",
      metric: "function-lines",
      name: "Function budgets",
      description:
        "Prefer small functions and review functions that exceed the hard budget.",
      category: "maintainability",
      severity: "warning",
      applicableClassifications: [
        "hand-written-production",
        "hand-written-test",
      ],
      enforcement: "review-checklist",
      thresholds: [
        { level: "preferred", maxPhysicalLines: 40 },
        { level: "hard", maxPhysicalLines: 80 },
      ],
      sourceReferenceIds: ["intentloom-code-quality-standards"],
    },
    {
      id: "base-testing-expectations",
      meaningId: "quality.testing.behavior-change",
      kind: "guidance",
      name: "Behavior changes have tests",
      description:
        "Every behavior change has the lowest reliable regression test.",
      category: "code-quality",
      severity: "warning",
      applicableClassifications: ["hand-written-production"],
      enforcement: "review-checklist",
      reviewQuestion:
        "Which focused test proves the changed behavior and regression boundary?",
      sourceReferenceIds: ["intentloom-code-quality-standards"],
    },
    {
      id: "base-exception-policy",
      meaningId: "quality.exception.explicit-review",
      kind: "guidance",
      name: "Exceptions are explicit",
      description:
        "A quality-budget exception names its measured value, owner, and review trigger.",
      category: "maintainability",
      severity: "warning",
      applicableClassifications: [
        "hand-written-production",
        "hand-written-test",
      ],
      enforcement: "review-checklist",
      reviewQuestion:
        "Is the exception bounded, owned, and scheduled for review?",
      sourceReferenceIds: ["intentloom-code-quality-standards"],
    },
  ],
} satisfies EngineeringQualityPack;
