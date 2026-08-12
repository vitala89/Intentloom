import { resolve } from "node:path";
import type { FeatureIntentWorkspaceOverview } from "@intentloom/protocol";
import {
  FEATURE_INTENT_OPERATIONS,
  FEATURE_INTENT_WORKSPACE_OVERVIEW_SCHEMA_URN,
  type FeatureIntentOperation,
} from "@intentloom/protocol";
import { validateFeatureIntentWorkspaceOverview } from "@intentloom/validator";
import type { FileSystem } from "./index.js";
import { createFeatureIntent } from "./feature-intent-create.js";
import { analyzeArchitectureImpact } from "./feature-intent-impact.js";
import {
  prepareImplementationAlternatives,
  prepareImplementationPlan,
} from "./feature-intent-plan.js";
import { resolveAffectedScope } from "./feature-intent-scope.js";

export interface PrepareFeatureIntentWorkspaceOptions {
  readonly root: string;
  readonly title: string;
  readonly summary: string;
  readonly projectId?: string;
  readonly now?: () => number;
}

export async function prepareFeatureIntentWorkspace(
  options: PrepareFeatureIntentWorkspaceOptions,
  fs: FileSystem,
): Promise<FeatureIntentWorkspaceOverview> {
  const root = resolve(options.root);
  if (root.length === 0) {
    throw new Error("root must be a non-empty string");
  }
  const projectId = options.projectId ?? "intentloom-project";
  const preparedAt = options.now ? options.now() : Date.now();
  const intent = createFeatureIntent({
    title: options.title,
    summary: options.summary,
    now: () => preparedAt,
  });
  const affectedScope = await resolveAffectedScope({ root, intent }, fs);
  const architectureImpact = await analyzeArchitectureImpact({
    root,
    projectId,
    intent,
    affectedScope,
    now: () => preparedAt,
  });
  const alternatives = prepareImplementationAlternatives({
    intent,
    affectedScope,
    architectureImpact,
  });
  const plan = prepareImplementationPlan({ alternatives });
  return validateFeatureIntentWorkspaceOverview({
    schemaVersion: FEATURE_INTENT_WORKSPACE_OVERVIEW_SCHEMA_URN,
    root,
    projectId,
    preparedAt,
    readOnly: true,
    intent,
    affectedScope,
    architectureImpact,
    alternatives,
    plan,
  });
}

export function listFeatureIntentOperations(): readonly FeatureIntentOperation[] {
  return FEATURE_INTENT_OPERATIONS;
}
