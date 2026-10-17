import type {
  InceptionNewProjectShellViewModel,
  InceptionSessionProgressViewModel,
} from "./inception-client-viewmodel.js";

export function renderInceptionNewProjectShellText(
  vm: InceptionNewProjectShellViewModel,
): string {
  const lines = [
    vm.headline,
    vm.description,
    `Surface state: ${vm.surfaceState}`,
    vm.canStart ? "Ready to start" : "Busy",
  ];
  if (vm.resumeSessionId) {
    lines.push(`Resume session: ${vm.resumeSessionId}`);
  }
  return lines.join("\n");
}

export function renderInceptionSessionProgressText(
  vm: InceptionSessionProgressViewModel,
): string {
  const lines = [
    `Inception Session: ${vm.sessionId}`,
    `Root: ${vm.root}`,
    `Idea: ${vm.idea}`,
    `Status: ${vm.status} (${vm.retentionStatus})`,
    `Progress: ${vm.answeredQuestions}/${vm.totalQuestions} (${vm.progressPercent}%)`,
    `Pending: ${vm.pendingQuestions} | Conflicts: ${vm.conflictCount}`,
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

  return lines.join("\n");
}
