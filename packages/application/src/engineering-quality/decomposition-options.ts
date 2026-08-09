import type {
  EngineeringQualityDecompositionEvidence,
  EngineeringQualityDecompositionMigrationStep,
  EngineeringQualityDecompositionOption,
  EngineeringQualityPublicApiEvidence,
  EngineeringQualityResponsibilityEvidence,
  EngineeringQualityTestPreservationEvidence,
  QualityDecompositionOptionKind,
} from "@intentloom/protocol";

function publicApiFor(
  evidence: EngineeringQualityDecompositionEvidence,
  ids: ReadonlySet<string>,
): readonly EngineeringQualityPublicApiEvidence[] {
  return evidence.publicApi.filter((item) => ids.has(item.responsibilityId));
}

function hasUnsafeDependency(
  evidence: EngineeringQualityDecompositionEvidence,
  id: string,
): boolean {
  return evidence.dependencies.some(
    (dependency) =>
      dependency.kind === "internal" &&
      !dependency.stable &&
      (dependency.fromResponsibilityId === id ||
        dependency.toResponsibilityId === id),
  );
}

function candidates(
  evidence: EngineeringQualityDecompositionEvidence,
  recommended: boolean,
): readonly EngineeringQualityResponsibilityEvidence[] {
  const available = evidence.responsibilities
    .filter((item) => item.cohesion !== "high")
    .filter((item) => !hasUnsafeDependency(evidence, item.id))
    .filter((item) =>
      publicApiFor(evidence, new Set([item.id])).every(
        (api) => api.compatibility === "preserve",
      ),
    );
  const cohesionOrder = { low: 0, medium: 1, high: 2 } as const;
  const compare = (
    left: EngineeringQualityResponsibilityEvidence,
    right: EngineeringQualityResponsibilityEvidence,
  ): number => {
    const cohesionDifference = recommended
      ? cohesionOrder[left.cohesion] - cohesionOrder[right.cohesion]
      : 0;
    return (
      cohesionDifference ||
      right.measuredLines - left.measuredLines ||
      left.id.localeCompare(right.id)
    );
  };
  const sorted: EngineeringQualityResponsibilityEvidence[] = [];
  for (const item of available) {
    let index = 0;
    while (index < sorted.length && compare(sorted[index]!, item) <= 0)
      index += 1;
    sorted.splice(index, 0, item);
  }
  return sorted;
}

function selectForTarget(
  evidence: EngineeringQualityDecompositionEvidence,
  target: number,
  recommended: boolean,
): readonly string[] {
  const requiredReduction = Math.max(0, evidence.currentLines - target);
  let reduction = 0;
  const selected: string[] = [];
  for (const responsibility of candidates(evidence, recommended)) {
    if (reduction >= requiredReduction) break;
    selected.push(responsibility.id);
    reduction += responsibility.measuredLines;
  }
  return selected;
}

function relatedTests(
  evidence: EngineeringQualityDecompositionEvidence,
  extracted: ReadonlySet<string>,
): readonly EngineeringQualityTestPreservationEvidence[] {
  return evidence.tests.filter((test) =>
    test.responsibilityIds.some((id) => extracted.has(id)),
  );
}

function publicApiActions(
  evidence: EngineeringQualityDecompositionEvidence,
  extracted: ReadonlySet<string>,
): readonly string[] {
  return publicApiFor(evidence, extracted).map(
    (api) =>
      `Preserve ${api.symbol} through a stable re-export while moving its responsibility.`,
  );
}

function migrationSteps(
  evidence: EngineeringQualityDecompositionEvidence,
  kind: QualityDecompositionOptionKind,
  extracted: readonly string[],
): readonly EngineeringQualityDecompositionMigrationStep[] {
  const ids = new Set(extracted);
  const tests = relatedTests(evidence, ids);
  if (extracted.length === 0) {
    return [
      {
        order: 1,
        description: `Keep ${evidence.artifactPath} together and record why ${kind} remains the selected option.`,
        responsibilityIds: evidence.responsibilities.map((item) => item.id),
        verification:
          "Review the evidence and confirm no unsupported split was introduced.",
      },
    ];
  }
  return [
    {
      order: 1,
      description: `Extract cohesive responsibilities ${extracted.join(", ")} into named modules.`,
      responsibilityIds: extracted,
      verification:
        "Check module boundaries and dependency direction before rewiring imports.",
    },
    {
      order: 2,
      description:
        "Preserve public entry points with explicit re-exports where required.",
      responsibilityIds: extracted,
      verification:
        "Run public API contract tests and typecheck the affected packages.",
    },
    {
      order: 3,
      description: `Preserve ${tests.length} related test behaviors while migrating imports.`,
      responsibilityIds: extracted,
      verification:
        "Run every listed focused test before and after the migration.",
    },
  ];
}

function option(
  evidence: EngineeringQualityDecompositionEvidence,
  kind: QualityDecompositionOptionKind,
  extracted: readonly string[],
  rationale: string,
  requiresApproval: boolean,
): EngineeringQualityDecompositionOption {
  const extractedSet = new Set(extracted);
  const retained = evidence.responsibilities
    .map((item) => item.id)
    .filter((id) => !extractedSet.has(id));
  const extractedLines = evidence.responsibilities
    .filter((item) => extractedSet.has(item.id))
    .reduce((sum, item) => sum + item.measuredLines, 0);
  const tests = relatedTests(evidence, extractedSet);
  return {
    kind,
    title: `${kind} decomposition for ${evidence.artifactPath}`,
    rationale,
    extractedResponsibilityIds: extracted,
    retainedResponsibilityIds: retained,
    projectedHostLines: evidence.currentLines - extractedLines,
    publicApiActions: publicApiActions(evidence, extractedSet),
    testPreservationSteps: tests.map(
      (test) => `Preserve ${test.id} (${test.path}): ${test.behavior}`,
    ),
    migrationSteps: migrationSteps(evidence, kind, extracted),
    requiresApproval,
  };
}

export function buildDecompositionOptions(
  evidence: EngineeringQualityDecompositionEvidence,
): readonly EngineeringQualityDecompositionOption[] {
  const minimal = selectForTarget(evidence, evidence.hardLimit, false);
  const recommended = selectForTarget(evidence, evidence.preferredLimit, true);
  return [
    option(
      evidence,
      "minimal",
      minimal,
      "Extract the fewest whole cohesive responsibilities selected by the hard-limit reduction heuristic.",
      true,
    ),
    option(
      evidence,
      "recommended",
      recommended,
      "Prefer low-cohesion responsibilities and reduce the host toward the preferred limit without arbitrary line splitting.",
      true,
    ),
    option(
      evidence,
      "keep-together",
      [],
      "Retain the current boundary when cohesion, compatibility, or evidence does not justify extraction.",
      evidence.currentLines > evidence.hardLimit,
    ),
    option(
      evidence,
      "defer",
      [],
      "Defer decomposition until missing responsibility, dependency, public API, or test evidence is available.",
      false,
    ),
    option(
      evidence,
      "exception",
      [],
      "Keep the oversized artifact under an explicit human-approved exception with a concrete review trigger.",
      true,
    ),
  ];
}
