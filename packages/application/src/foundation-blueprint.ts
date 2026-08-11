import type {
  BlueprintTopology,
  FoundationBlueprintCandidate,
  FoundationBlueprintCompareResult,
  FoundationBlueprintDecisionMetadata,
  FoundationBlueprintProposalResult,
  FoundationBlueprintTier,
  FoundationWorkshopState,
  ProjectBlueprint,
} from "@intentloom/protocol";
import {
  FOUNDATION_BLUEPRINT_APPROVAL_SCHEMA_URN,
  FOUNDATION_BLUEPRINT_COMPARE_SCHEMA_URN,
  FOUNDATION_BLUEPRINT_PROPOSAL_SCHEMA_URN,
} from "@intentloom/protocol";
import {
  validateFoundationBlueprintApprovalRecord,
  validateFoundationBlueprintCompareResult,
  validateFoundationBlueprintProposalResult,
} from "@intentloom/validator";
import {
  compareProjectBlueprints,
  computeBlueprintDigest,
} from "./inception-blueprint.js";
import {
  approveBlueprint,
  revokeBlueprintApproval,
} from "./inception-approval.js";
import {
  clearFoundationBlueprintApprovals,
  deleteFoundationBlueprintApproval,
  getFoundationBlueprintApproval,
  setFoundationBlueprintApproval,
} from "./foundation-blueprint-store.js";
import { getFoundationWorkshop } from "./foundation-workshop.js";

const TIERS: readonly FoundationBlueprintTier[] = [
  "minimal",
  "recommended",
  "extensible",
];

function answerMap(
  workshop: FoundationWorkshopState,
): ReadonlyMap<string, string> {
  return new Map(
    workshop.answers.map((entry) => [entry.questionId, entry.value]),
  );
}

function containsAny(haystack: string, needles: readonly string[]): boolean {
  return needles.some((needle) => haystack.includes(needle));
}

export function resolveFoundationBlueprintTopology(
  workshop: FoundationWorkshopState,
): BlueprintTopology {
  const answers = answerMap(workshop);
  const offline = answers.get("fq8_offline_required");
  const idea = workshop.idea.toLowerCase();
  const workflow = workshop.workflows[0]?.description.toLowerCase() ?? "";
  const changeText = workshop.changeScenarios
    .map((scenario) => `${scenario.name} ${scenario.description}`.toLowerCase())
    .join(" ");

  if (
    offline === "yes" ||
    containsAny(idea, ["desktop", "local-first", "offline"])
  ) {
    return "desktop-product";
  }
  if (
    containsAny(idea, ["cli", "command-line", "command line"]) ||
    containsAny(workflow, ["cli", "command-line", "command line"])
  ) {
    return "cli-tool";
  }
  if (
    containsAny(changeText, ["monorepo", "multi-package", "workspace"]) ||
    containsAny(idea, ["monorepo", "multi-package"])
  ) {
    return "pnpm-workspace";
  }
  if (containsAny(idea, ["web", "browser"]) || containsAny(workflow, ["web"])) {
    return "web-product";
  }
  return "single-package";
}

function packsForTopology(topology: BlueprintTopology): readonly string[] {
  const base = ["typescript-strict", "vitest"] as const;
  switch (topology) {
    case "pnpm-workspace":
      return [...base, "pnpm-workspaces"];
    case "cli-tool":
      return [...base, "cli-runtime"];
    case "web-product":
      return [...base, "vite-react"];
    case "desktop-product":
      return [...base, "tauri-v2"];
    default:
      return base;
  }
}

function metadataForTier(
  tier: FoundationBlueprintTier,
): FoundationBlueprintDecisionMetadata {
  if (tier === "minimal") {
    return {
      complexity: "low",
      reversibility: "easy",
      migrationNotes: ["Single package can be split later into a workspace."],
      deferredDecisions: ["Multi-package boundaries", "Specialized pack depth"],
    };
  }
  if (tier === "extensible") {
    return {
      complexity: "high",
      reversibility: "moderate",
      migrationNotes: [
        "Workspace layout assumes future package growth.",
        "Initial scaffold may include placeholder packages.",
      ],
      deferredDecisions: [
        "Exact package graph",
        "Cross-package release cadence",
      ],
    };
  }
  return {
    complexity: "medium",
    reversibility: "easy",
    migrationNotes: [
      "Recommended topology matches current foundation signals.",
    ],
    deferredDecisions: ["Provider-specific adapters beyond selected packs"],
  };
}

function rationaleForTier(
  tier: FoundationBlueprintTier,
  topology: BlueprintTopology,
): string {
  if (tier === "minimal") {
    return "Smallest viable TypeScript package with strict engineering defaults.";
  }
  if (tier === "extensible") {
    return "Workspace-oriented composition prepared for additional packages and packs.";
  }
  return `Recommended ${topology} topology derived from foundation workshop signals.`;
}

function topologyForTier(
  tier: FoundationBlueprintTier,
  recommendedTopology: BlueprintTopology,
): BlueprintTopology {
  if (tier === "minimal") return "single-package";
  if (tier === "extensible") {
    return recommendedTopology === "single-package"
      ? "pnpm-workspace"
      : recommendedTopology;
  }
  return recommendedTopology;
}

function buildBlueprintCandidate(
  workshop: FoundationWorkshopState,
  tier: FoundationBlueprintTier,
  recommendedTopology: BlueprintTopology,
): FoundationBlueprintCandidate {
  const topology = topologyForTier(tier, recommendedTopology);
  const recommendedPacks = [...packsForTopology(topology)];
  if (tier === "extensible" && !recommendedPacks.includes("pnpm-workspaces")) {
    recommendedPacks.push("pnpm-workspaces");
  }

  const partialBlueprint = {
    id: `bp_${workshop.id}_${tier}`,
    name: `${tier} blueprint for ${workshop.idea}`,
    topology,
    recommendedPacks,
    qualityProfile: "strict-engineering",
    frameworkNeutral: true,
    alternatives: [],
    createdAt: Date.now(),
  };
  const digest = computeBlueprintDigest(partialBlueprint);
  const blueprint: ProjectBlueprint = { ...partialBlueprint, digest };

  return {
    tier,
    blueprint,
    metadata: metadataForTier(tier),
    rationale: rationaleForTier(tier, topology),
  };
}

export function proposeFoundationBlueprints(
  workshopId: string,
): FoundationBlueprintProposalResult {
  const before = getFoundationWorkshop(workshopId);
  const recommendedTopology = resolveFoundationBlueprintTopology(before);
  const candidates = TIERS.map((tier) =>
    buildBlueprintCandidate(before, tier, recommendedTopology),
  );
  const recommended = candidates.find(
    (candidate) => candidate.tier === "recommended",
  );
  if (!recommended) {
    throw new Error("foundation blueprint proposal missing recommended tier");
  }
  const alternatives = candidates.filter(
    (candidate) => candidate.tier !== "recommended",
  );

  const result: FoundationBlueprintProposalResult = {
    schemaVersion: FOUNDATION_BLUEPRINT_PROPOSAL_SCHEMA_URN,
    workshopId,
    recommendedTopology,
    recommended,
    alternatives,
    digest: recommended.blueprint.digest,
    workshopUnchanged: true,
  };

  validateFoundationBlueprintProposalResult(result);
  const after = getFoundationWorkshop(workshopId);
  if (JSON.stringify(before) !== JSON.stringify(after)) {
    throw new Error(
      "foundation blueprint proposal must not mutate workshop state",
    );
  }
  return result;
}

export function compareFoundationBlueprintTiers(
  workshopId: string,
  leftTier: FoundationBlueprintTier,
  rightTier: FoundationBlueprintTier,
): FoundationBlueprintCompareResult {
  const proposal = proposeFoundationBlueprints(workshopId);
  const left = [...proposal.alternatives, proposal.recommended].find(
    (candidate) => candidate.tier === leftTier,
  );
  const right = [...proposal.alternatives, proposal.recommended].find(
    (candidate) => candidate.tier === rightTier,
  );
  if (!left || !right) {
    throw new Error("compareFoundationBlueprintTiers requires valid tiers");
  }

  const comparison = compareProjectBlueprints(left.blueprint, right.blueprint);
  const result: FoundationBlueprintCompareResult = {
    schemaVersion: FOUNDATION_BLUEPRINT_COMPARE_SCHEMA_URN,
    workshopId,
    leftTier,
    rightTier,
    topologyMatch: comparison.topologyMatch,
    packDifferences: comparison.packDifferences,
  };
  return validateFoundationBlueprintCompareResult(result);
}

export function approveFoundationBlueprint(
  workshopId: string,
  tier: FoundationBlueprintTier,
  approver?: string,
) {
  const proposal = proposeFoundationBlueprints(workshopId);
  const candidate = [...proposal.alternatives, proposal.recommended].find(
    (entry) => entry.tier === tier,
  );
  if (!candidate) {
    throw new Error(`Unknown blueprint tier '${tier}'`);
  }

  const approval = approveBlueprint(
    candidate.blueprint,
    ...(approver !== undefined ? [{ approver }] : []),
  );
  const record = validateFoundationBlueprintApprovalRecord({
    schemaVersion: FOUNDATION_BLUEPRINT_APPROVAL_SCHEMA_URN,
    workshopId,
    tier,
    approval,
  });
  return setFoundationBlueprintApproval(record);
}

export function revokeFoundationBlueprintApproval(workshopId: string) {
  const existing = getFoundationBlueprintApproval(workshopId);
  if (!existing) {
    throw new Error(`No blueprint approval found for workshop '${workshopId}'`);
  }
  const record = validateFoundationBlueprintApprovalRecord({
    ...existing,
    approval: revokeBlueprintApproval(existing.approval),
  });
  return setFoundationBlueprintApproval(record);
}

export function clearFoundationBlueprintStore(): void {
  clearFoundationBlueprintApprovals();
}

export { deleteFoundationBlueprintApproval, getFoundationBlueprintApproval };
