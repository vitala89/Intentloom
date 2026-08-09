import {
  QUALITY_PULL_REQUEST_EVIDENCE_SCHEMA_URN,
  type EngineeringQualityPullRequestEvidence,
  type EngineeringQualityPullRequestEvidenceOptions,
} from "@intentloom/protocol";
import { validateEngineeringQualityPullRequestEvidence } from "@intentloom/validator";

function inline(value: string): string {
  return value.replaceAll("`", "\\`").replaceAll("\n", " ");
}

export function renderEngineeringQualityPullRequestEvidence(
  options: EngineeringQualityPullRequestEvidenceOptions,
): EngineeringQualityPullRequestEvidence {
  const { plan, diff } = options;
  const conflicts = diff.conflicts;
  const markdown = [
    `## Engineering Quality Evidence: ${inline(plan.taskId)}`,
    "",
    `- **Project:** \`${inline(plan.projectId)}\``,
    `- **Policy:** \`${inline(plan.policyId)}\``,
    `- **Plan status:** \`${plan.status}\``,
    `- **Final diff status:** \`${diff.status}\``,
    `- **Result:** \`${conflicts.length === 0 ? "ready" : "conflict"}\``,
    "",
    "### Projected paths",
    "",
    "| Path | Current lines | Projected likely | Policy limit | Disposition |",
    "| --- | ---: | ---: | ---: | --- |",
    ...plan.changes.map(
      (change) =>
        `| \`${inline(change.path)}\` | ${change.currentLines} | ${change.projectedLikely} | ${change.policy.hardLimit ?? "unresolved"} | ${change.disposition} |`,
    ),
    "",
    "### Acceptance criteria",
    "",
    ...plan.acceptanceCriteria.map(
      (criterion) =>
        `- ${criterion.required ? "**Required**" : "Optional"} \`${inline(criterion.id)}\`: ${inline(criterion.description)}`,
    ),
    "",
    "### Final comparison",
    "",
    ...diff.changes.map(
      (change) =>
        `- \`${inline(change.path)}\`: ${change.status}${change.finalLines === undefined ? "" : ` at ${change.finalLines} lines`}`,
    ),
    "",
    "### Conflicts",
    "",
    ...(conflicts.length === 0
      ? ["- None."]
      : conflicts.map(
          (conflict) =>
            `- **${conflict.kind}**${conflict.path === undefined ? "" : ` \`${inline(conflict.path)}\``}: ${inline(conflict.message)}`,
        )),
  ].join("\n");
  return validateEngineeringQualityPullRequestEvidence({
    schemaVersion: QUALITY_PULL_REQUEST_EVIDENCE_SCHEMA_URN,
    projectId: plan.projectId,
    taskId: plan.taskId,
    planStatus: plan.status,
    diffStatus: diff.status,
    status: conflicts.length === 0 ? "ready" : "conflict",
    markdown,
    conflicts,
  });
}
