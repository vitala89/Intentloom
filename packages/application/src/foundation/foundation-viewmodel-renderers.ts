import type {
  FoundationWorkshopProgressViewModel,
  FoundationWorkshopShellViewModel,
} from "./foundation-client-viewmodel.js";

export function renderFoundationWorkshopShellText(
  vm: FoundationWorkshopShellViewModel,
): string {
  const lines = [
    vm.headline,
    vm.description,
    `Surface state: ${vm.surfaceState}`,
    vm.canStart ? "Ready to start" : "Busy",
  ];
  if (vm.resumeWorkshopId) {
    lines.push(`Resume workshop: ${vm.resumeWorkshopId}`);
  }
  return lines.join("\n");
}

export function renderFoundationWorkshopProgressText(
  vm: FoundationWorkshopProgressViewModel,
): string {
  const lines = [
    `Foundation Workshop: ${vm.workshopId}`,
    `Root: ${vm.root}`,
    `Idea: ${vm.idea}`,
    `Status: ${vm.status} (${vm.retentionStatus})`,
    `Readiness: ${vm.readinessStatus}`,
    `Progress: ${vm.answeredQuestions}/${vm.totalQuestions} (${vm.progressPercent}%)`,
    `Pending: ${vm.pendingQuestions} | Conflicts: ${vm.conflictCount}`,
    `Findings: ${vm.blockingFindings} blocking, ${vm.warningFindings} warning`,
    `Surface state: ${vm.surfaceState}`,
    "Questions:",
  ];

  for (const question of vm.questions) {
    const required = question.required ? "required" : "optional";
    const answer =
      question.answered && question.answerValue !== undefined
        ? `${question.answerValue} (${question.confidence ?? "unknown"})`
        : "pending";
    lines.push(`  - [${required}] ${question.prompt} → ${answer}`);
  }

  if (vm.readinessFindings.length > 0) {
    lines.push("Readiness findings:");
    for (const finding of vm.readinessFindings) {
      const state = finding.resolved ? "resolved" : "open";
      lines.push(
        `  - [${finding.severity}/${state}] ${finding.ruleGroup}: ${finding.message}`,
      );
    }
  }

  return lines.join("\n");
}
