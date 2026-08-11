import type {
  FoundationActor,
  FoundationWorkflow,
  FoundationDomainConcept,
  FoundationSourceOfTruth,
  FoundationQualityScenario,
  FoundationQualityCategory,
  FoundationSensitivityLevel,
  FoundationConstraint,
  FoundationConstraintKind,
  FoundationChangeScenario,
  FoundationChangeImportance,
  FoundationRisk,
  FoundationRiskSeverity,
  FoundationAlternative,
  FoundationAlternativeTier,
  FoundationReadinessFinding,
  FoundationReadinessSeverity,
} from "@intentloom/protocol";
import {
  assertArr,
  assertStr,
  isObj,
} from "./foundation-validation-helpers.js";

const SOURCE_OF_TRUTH: readonly FoundationSourceOfTruth[] = [
  "internal",
  "external",
  "shared",
  "unresolved",
];

const QUALITY_CATEGORIES: readonly FoundationQualityCategory[] = [
  "security",
  "privacy",
  "reliability",
  "accessibility",
  "performance",
  "offline",
  "compatibility",
];

const SENSITIVITY_LEVELS: readonly FoundationSensitivityLevel[] = [
  "not-applicable",
  "low",
  "medium",
  "high",
  "unclassified",
];

const CONSTRAINT_KINDS: readonly FoundationConstraintKind[] = [
  "hard",
  "preference",
];

const CHANGE_IMPORTANCE: readonly FoundationChangeImportance[] = [
  "strategic",
  "likely",
  "speculative",
];

const RISK_SEVERITIES: readonly FoundationRiskSeverity[] = [
  "low",
  "medium",
  "high",
];

const ALTERNATIVE_TIERS: readonly FoundationAlternativeTier[] = [
  "minimal",
  "recommended",
  "extensible",
];

const READINESS_SEVERITIES: readonly FoundationReadinessSeverity[] = [
  "blocking",
  "warning",
  "info",
];

export function validateFoundationActor(v: unknown): FoundationActor {
  if (!isObj(v)) throw new Error("Invalid foundation actor: expected object");
  return {
    id: assertStr(v.id, "actor.id"),
    name: assertStr(v.name, "actor.name"),
    role: assertStr(v.role, "actor.role"),
    description: assertStr(v.description, "actor.description"),
  };
}

export function validateFoundationWorkflow(v: unknown): FoundationWorkflow {
  if (!isObj(v))
    throw new Error("Invalid foundation workflow: expected object");
  return {
    id: assertStr(v.id, "workflow.id"),
    name: assertStr(v.name, "workflow.name"),
    description: assertStr(v.description, "workflow.description"),
    ...(v.primaryActorId === undefined
      ? {}
      : {
          primaryActorId: assertStr(
            v.primaryActorId,
            "workflow.primaryActorId",
          ),
        }),
  };
}

export function validateFoundationDomainConcept(
  v: unknown,
): FoundationDomainConcept {
  if (!isObj(v))
    throw new Error("Invalid foundation domain concept: expected object");
  const sourceOfTruth = v.sourceOfTruth as FoundationSourceOfTruth;
  if (!SOURCE_OF_TRUTH.includes(sourceOfTruth))
    throw new Error(`Invalid sourceOfTruth '${String(v.sourceOfTruth)}'`);
  return {
    id: assertStr(v.id, "domainConcept.id"),
    name: assertStr(v.name, "domainConcept.name"),
    description: assertStr(v.description, "domainConcept.description"),
    sourceOfTruth,
  };
}

export function validateFoundationQualityScenario(
  v: unknown,
): FoundationQualityScenario {
  if (!isObj(v))
    throw new Error("Invalid foundation quality scenario: expected object");
  const category = v.category as FoundationQualityCategory;
  const sensitivity = v.sensitivity as FoundationSensitivityLevel;
  if (!QUALITY_CATEGORIES.includes(category))
    throw new Error(`Invalid quality category '${String(v.category)}'`);
  if (!SENSITIVITY_LEVELS.includes(sensitivity))
    throw new Error(`Invalid sensitivity '${String(v.sensitivity)}'`);
  return {
    id: assertStr(v.id, "qualityScenario.id"),
    category,
    description: assertStr(v.description, "qualityScenario.description"),
    sensitivity,
    expectation: assertStr(v.expectation, "qualityScenario.expectation"),
  };
}

export function validateFoundationConstraint(v: unknown): FoundationConstraint {
  if (!isObj(v))
    throw new Error("Invalid foundation constraint: expected object");
  const kind = v.kind as FoundationConstraintKind;
  if (!CONSTRAINT_KINDS.includes(kind))
    throw new Error(`Invalid constraint kind '${String(v.kind)}'`);
  return {
    id: assertStr(v.id, "constraint.id"),
    kind,
    scope: assertStr(v.scope, "constraint.scope"),
    description: assertStr(v.description, "constraint.description"),
  };
}

export function validateFoundationChangeScenario(
  v: unknown,
): FoundationChangeScenario {
  if (!isObj(v))
    throw new Error("Invalid foundation change scenario: expected object");
  const importance = v.importance as FoundationChangeImportance;
  if (!CHANGE_IMPORTANCE.includes(importance))
    throw new Error(`Invalid change importance '${String(v.importance)}'`);
  if (typeof v.reviewed !== "boolean")
    throw new Error("Invalid changeScenario.reviewed: expected boolean");
  return {
    id: assertStr(v.id, "changeScenario.id"),
    name: assertStr(v.name, "changeScenario.name"),
    description: assertStr(v.description, "changeScenario.description"),
    importance,
    reviewed: v.reviewed,
  };
}

export function validateFoundationRisk(v: unknown): FoundationRisk {
  if (!isObj(v)) throw new Error("Invalid foundation risk: expected object");
  const severity = v.severity as FoundationRiskSeverity;
  if (!RISK_SEVERITIES.includes(severity))
    throw new Error(`Invalid risk severity '${String(v.severity)}'`);
  return {
    id: assertStr(v.id, "risk.id"),
    description: assertStr(v.description, "risk.description"),
    severity,
    ...(v.mitigation === undefined
      ? {}
      : { mitigation: assertStr(v.mitigation, "risk.mitigation") }),
  };
}

export function validateFoundationAlternative(
  v: unknown,
): FoundationAlternative {
  if (!isObj(v))
    throw new Error("Invalid foundation alternative: expected object");
  const tier = v.tier as FoundationAlternativeTier;
  if (!ALTERNATIVE_TIERS.includes(tier))
    throw new Error(`Invalid alternative tier '${String(v.tier)}'`);
  if (typeof v.selected !== "boolean")
    throw new Error("Invalid alternative.selected: expected boolean");
  const tradeoffs = assertArr(v.tradeoffs, "alternative.tradeoffs");
  if (!tradeoffs.every((item) => typeof item === "string"))
    throw new Error("Invalid alternative.tradeoffs: expected string array");
  return {
    id: assertStr(v.id, "alternative.id"),
    name: assertStr(v.name, "alternative.name"),
    tier,
    summary: assertStr(v.summary, "alternative.summary"),
    tradeoffs: tradeoffs as string[],
    selected: v.selected,
  };
}

export function validateFoundationReadinessFinding(
  v: unknown,
): FoundationReadinessFinding {
  if (!isObj(v))
    throw new Error("Invalid foundation readiness finding: expected object");
  const severity = v.severity as FoundationReadinessSeverity;
  if (!READINESS_SEVERITIES.includes(severity))
    throw new Error(`Invalid readiness severity '${String(v.severity)}'`);
  if (typeof v.resolved !== "boolean")
    throw new Error("Invalid finding.resolved: expected boolean");
  return {
    id: assertStr(v.id, "finding.id"),
    ruleGroup: assertStr(v.ruleGroup, "finding.ruleGroup"),
    severity,
    message: assertStr(v.message, "finding.message"),
    resolved: v.resolved,
  };
}
