import { createHash } from "node:crypto";
import type {
  InceptionSessionState,
  ProjectBlueprint,
  BlueprintAlternative,
  BlueprintTopology,
} from "@intentloom/protocol";
import {
  validateInceptionSessionState,
  validateProjectBlueprint,
} from "@intentloom/validator";

export interface ProposedBlueprintsResult {
  readonly recommended: ProjectBlueprint;
  readonly alternatives: readonly BlueprintAlternative[];
  readonly digest: string;
}

export function computeBlueprintDigest(
  blueprint: Omit<ProjectBlueprint, "digest">,
): string {
  const payload = JSON.stringify({
    name: blueprint.name,
    topology: blueprint.topology,
    recommendedPacks: [...blueprint.recommendedPacks].sort(),
    qualityProfile: blueprint.qualityProfile,
    frameworkNeutral: blueprint.frameworkNeutral,
  });

  return createHash("sha256").update(payload).digest("hex");
}

export function proposeProjectBlueprints(
  session: InceptionSessionState,
): ProposedBlueprintsResult {
  const validated = validateInceptionSessionState(session);
  const answersMap = new Map(
    validated.answers.map((a) => [a.questionId, a.value]),
  );

  const rawTopology =
    answersMap.get("q2_architecture_style") ?? "single-package";
  const topology: BlueprintTopology = [
    "single-package",
    "pnpm-workspace",
    "cli-tool",
    "web-product",
    "desktop-product",
  ].includes(rawTopology)
    ? (rawTopology as BlueprintTopology)
    : "single-package";

  const frameworkNeutral = answersMap.get("q3_framework_neutrality") === "yes";

  const recommendedPacks: string[] = ["typescript-strict", "vitest"];
  if (topology === "pnpm-workspace") {
    recommendedPacks.push("pnpm-workspaces");
  } else if (topology === "cli-tool") {
    recommendedPacks.push("cli-runtime");
  } else if (topology === "web-product") {
    recommendedPacks.push("vite-react");
  } else if (topology === "desktop-product") {
    recommendedPacks.push("tauri-v2");
  }

  const alternatives: BlueprintAlternative[] = [
    {
      id: "alt_minimal_single_pkg",
      name: "Minimal Single Package",
      summary:
        "Lightweight single npm package structure with zero external workspaces.",
      pros: ["Simple setup", "Minimal configuration"],
      cons: ["Does not scale to multiple public packages"],
    },
  ];

  const now = Date.now();
  const partialBlueprint = {
    id: `bp_${validated.id}`,
    name: `Blueprint for ${validated.idea}`,
    topology,
    recommendedPacks,
    qualityProfile: "strict-engineering",
    frameworkNeutral,
    alternatives,
    createdAt: now,
  };

  const digest = computeBlueprintDigest(partialBlueprint);

  const recommended = validateProjectBlueprint({
    ...partialBlueprint,
    digest,
  });

  return {
    recommended,
    alternatives,
    digest,
  };
}

export function compareProjectBlueprints(
  a: ProjectBlueprint,
  b: ProjectBlueprint,
): {
  readonly topologyMatch: boolean;
  readonly packDifferences: readonly string[];
} {
  const valA = validateProjectBlueprint(a);
  const valB = validateProjectBlueprint(b);

  const setA = new Set(valA.recommendedPacks);
  const setB = new Set(valB.recommendedPacks);

  const diffA = valA.recommendedPacks.filter((p) => !setB.has(p));
  const diffB = valB.recommendedPacks.filter((p) => !setA.has(p));

  const packDifferences = [...new Set([...diffA, ...diffB])];

  return {
    topologyMatch: valA.topology === valB.topology,
    packDifferences,
  };
}
