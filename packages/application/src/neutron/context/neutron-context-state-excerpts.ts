import { checksum } from "@intentloom/core";
import type {
  ProfileDefinition,
  TaskCheckpoint,
  TaskSummary,
} from "@intentloom/protocol";

export function profileExcerpt(profile: ProfileDefinition): string {
  const caps = profile.allowedCapabilities;
  return [
    `name:${profile.name}`,
    profile.description === undefined
      ? undefined
      : `description:${profile.description}`,
    `activeRoles:${stableJoin(profile.activeRoles)}`,
    `readOnly:${String(caps.readOnly)}`,
    `allowNetwork:${String(caps.allowNetwork)}`,
    `maxBudget:${String(caps.maxBudget)}`,
    `allowedPaths:${stableJoin(caps.allowedPaths)}`,
    `allowedTools:${stableJoin(caps.allowedTools)}`,
  ]
    .filter((line): line is string => line !== undefined)
    .join("\n");
}

export function summaryExcerpt(summary: TaskSummary): string {
  return [
    `id:${summary.id}`,
    `intent:${summary.intent}`,
    `validationOutcome:${summary.validationOutcome}`,
    `retentionState:${summary.retentionState}`,
    `unresolvedWork:${summary.unresolvedWork.join(",")}`,
    `usedSkills:${summary.usedSkills.join(",")}`,
    summary.planRef === undefined ? undefined : `planRef:${summary.planRef}`,
  ]
    .filter((line): line is string => line !== undefined)
    .join("\n");
}

export function checkpointExcerpt(checkpoint: TaskCheckpoint): string {
  return [
    `id:${checkpoint.id}`,
    `taskId:${checkpoint.taskId}`,
    `state:${checkpoint.state}`,
    `completedSteps:${checkpoint.completedSteps.join(",")}`,
    `unresolvedWork:${checkpoint.unresolvedWork.join(",")}`,
    `invalidatedPlans:${checkpoint.invalidatedPlans.join(",")}`,
  ].join("\n");
}

export function estimateTokens(excerpt: string): number {
  return excerpt.length === 0 ? 0 : Math.ceil(excerpt.length / 4);
}

export function digestExcerpt(excerpt: string): string {
  return `sha256:${checksum(excerpt)}`;
}

function stableJoin(values: readonly string[]): string {
  return values
    .slice()
    .sort((left, right) => {
      if (left < right) return -1;
      if (left > right) return 1;
      return 0;
    })
    .join(",");
}
