import type {
  FeatureIntent,
  FeatureIntentAffectedScope,
  FeatureIntentArchitectureImpact,
  FeatureIntentImplementationAlternative,
  FeatureIntentImplementationPlan,
} from "@intentloom/protocol";

export function prepareImplementationAlternatives(input: {
  readonly intent: FeatureIntent;
  readonly affectedScope: FeatureIntentAffectedScope;
  readonly architectureImpact: FeatureIntentArchitectureImpact;
}): readonly FeatureIntentImplementationAlternative[] {
  const packages = input.affectedScope.packages.join(", ");
  return [
    {
      id: "alt-narrow-scope",
      strategy: "narrow-scope",
      title: "Narrow scope",
      summary: `Change only ${packages} for "${input.intent.title}".`,
      tradeoffs: ["Smallest blast radius", "May leave related debt untouched"],
    },
    {
      id: "alt-boundary-preserving",
      strategy: "boundary-preserving",
      title: "Preserve public API",
      summary:
        "Keep package and public-API boundaries intact while implementing the feature.",
      tradeoffs: [
        "Protects downstream consumers",
        "May require internal adapters",
      ],
    },
    {
      id: "alt-phased-with-debt",
      strategy: "phased-with-debt",
      title: "Phased with accepted debt",
      summary: `Sequence the feature after reviewing ${input.architectureImpact.debtItemCount} current debt item(s).`,
      tradeoffs: [
        "Makes debt explicit before coding",
        "Longer review before W11 execution",
      ],
    },
  ];
}

export function prepareImplementationPlan(input: {
  readonly alternatives: readonly FeatureIntentImplementationAlternative[];
  readonly selectedAlternativeId?: string;
}): FeatureIntentImplementationPlan {
  const selected =
    input.alternatives.find(
      (alternative) => alternative.id === input.selectedAlternativeId,
    ) ?? input.alternatives[0];
  if (selected === undefined) {
    throw new Error("at least one implementation alternative is required");
  }
  return {
    selectedAlternativeId: selected.id,
    reviewRequired: true,
    mutationAllowed: false,
    executionGate: "w11-blocked",
    steps: [
      {
        id: "review-impact",
        label: "Review explainable architecture impact",
        mutationAllowed: false,
      },
      {
        id: "confirm-scope",
        label: `Confirm affected scope for ${selected.title}`,
        mutationAllowed: false,
      },
      {
        id: "hold-for-execution",
        label: "Hold for explicit W11 bounded execution approval",
        mutationAllowed: false,
      },
    ],
  };
}
