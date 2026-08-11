import type {
  FoundationDiscoveryQuestionsViewModel,
  FoundationDiscoveryTurnViewModel,
} from "./foundation-discovery-client-viewmodel.js";

export function renderFoundationDiscoveryTurnText(
  vm: FoundationDiscoveryTurnViewModel,
): string {
  const lines = [
    `Foundation discovery turn: ${vm.workshopId}`,
    `Turn index: ${vm.turnIndex}`,
    `Agent status: ${vm.agentStatus}`,
    `Workshop unchanged: ${vm.workshopUnchanged ? "yes" : "no"}`,
    `Provider: ${vm.visibility.provider} (${vm.visibility.adapterId})`,
    `Model: ${vm.visibility.model}`,
    `Effort: ${vm.visibility.effort}`,
    `Network: ${vm.visibility.networkMode}`,
    `Credentials: ${vm.visibility.credentialSource}`,
    `Retention: ${vm.visibility.retention}`,
    `Completeness: ${vm.completeness.isComplete ? "complete" : "incomplete"} (${vm.completeness.remainingRequiredCount} required remaining)`,
    `Proposed questions: ${vm.proposedQuestions.length}`,
    `Surface state: ${vm.surfaceState}`,
  ];

  if (vm.proposedQuestions.length > 0) {
    lines.push("Proposals:");
    for (const question of vm.proposedQuestions) {
      const required = question.required ? "required" : "optional";
      lines.push(
        `  - [${required}/${question.source}] ${question.prompt} (${question.category})`,
      );
    }
  }

  if (vm.diagnostics.length > 0) {
    lines.push(`Diagnostics: ${vm.diagnostics.join(", ")}`);
  }

  return lines.join("\n");
}

export function renderFoundationDiscoveryQuestionsText(
  vm: FoundationDiscoveryQuestionsViewModel,
): string {
  const lines = [
    `Adaptive discovery questions: ${vm.workshopId}`,
    `Effort: ${vm.effort}`,
    `Count: ${vm.questions.length}`,
    `Surface state: ${vm.surfaceState}`,
  ];
  for (const question of vm.questions) {
    const required = question.required ? "required" : "optional";
    lines.push(`  - [${required}] ${question.prompt} (${question.category})`);
  }
  return lines.join("\n");
}
