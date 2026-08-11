import { afterEach, describe, expect, it } from "vitest";
import {
  approveFoundationBlueprint,
  clearFoundationBlueprintStore,
  clearFoundationWorkshopStore,
  compareFoundationBlueprintTiers,
  createFoundationWorkshop,
  getFoundationWorkshop,
  proposeFoundationBlueprints,
  recordFoundationWorkshopAnswer,
  resolveFoundationBlueprintTopology,
  revokeFoundationBlueprintApproval,
  runFoundationCliCommand,
} from "@intentloom/application";
import {
  FOUNDATION_BLUEPRINT_APPROVAL_SCHEMA_URN,
  FOUNDATION_BLUEPRINT_COMPARE_SCHEMA_URN,
  FOUNDATION_BLUEPRINT_PROPOSAL_SCHEMA_URN,
} from "@intentloom/protocol";

afterEach(() => {
  clearFoundationWorkshopStore();
  clearFoundationBlueprintStore();
});

function seedCliWorkshop(workshopId: string) {
  createFoundationWorkshop({
    root: "/tmp/foundation-blueprint-cli",
    idea: "Local-first desktop planning tool",
    workshopId,
  });
  recordFoundationWorkshopAnswer(workshopId, {
    questionId: "fq8_offline_required",
    value: "yes",
    confidence: "confirmed",
    timestamp: Date.now(),
  });
}

describe("Engineering Workspace W4: foundation blueprint resolver", () => {
  it("proposes minimal, recommended, and extensible candidates without mutating workshop state", () => {
    const workshop = createFoundationWorkshop({
      root: "/tmp/foundation-blueprint-propose",
      idea: "Cross-platform CLI for AST transforms",
      workshopId: "fnd_fixture_blueprint_cli",
    });
    recordFoundationWorkshopAnswer(workshop.id, {
      questionId: "fq5_workflow",
      value: "Run from the command line in CI and locally",
      confidence: "confirmed",
      timestamp: Date.now(),
    });
    const before = getFoundationWorkshop(workshop.id);

    const proposal = proposeFoundationBlueprints(workshop.id);
    expect(proposal.schemaVersion).toBe(
      FOUNDATION_BLUEPRINT_PROPOSAL_SCHEMA_URN,
    );
    expect(proposal.workshopUnchanged).toBe(true);
    expect(proposal.recommended.tier).toBe("recommended");
    expect(proposal.recommended.blueprint.topology).toBe("cli-tool");
    expect(proposal.alternatives.map((entry) => entry.tier)).toEqual([
      "minimal",
      "extensible",
    ]);
    expect(proposal.digest).toMatch(/^[a-f0-9]{64}$/);
    expect(proposal.recommended.metadata.complexity).toBe("medium");
    expect(getFoundationWorkshop(workshop.id)).toEqual(before);
  });

  it("resolves desktop topology from offline/local-first foundation signals", () => {
    const workshop = createFoundationWorkshop({
      root: "/tmp/foundation-blueprint-desktop",
      idea: "Local-first desktop workspace",
      workshopId: "fnd_fixture_blueprint_desktop",
    });
    recordFoundationWorkshopAnswer(workshop.id, {
      questionId: "fq8_offline_required",
      value: "yes",
      confidence: "confirmed",
      timestamp: Date.now(),
    });

    expect(resolveFoundationBlueprintTopology(workshop)).toBe(
      "desktop-product",
    );
    const proposal = proposeFoundationBlueprints(workshop.id);
    expect(proposal.recommendedTopology).toBe("desktop-product");
    expect(proposal.recommended.blueprint.recommendedPacks).toContain(
      "tauri-v2",
    );
  });

  it("compares blueprint tiers and records approval lifecycle without filesystem mutation", () => {
    const workshop = createFoundationWorkshop({
      root: "/tmp/foundation-blueprint-approval",
      idea: "Growing web product",
      workshopId: "fnd_fixture_blueprint_web",
    });
    recordFoundationWorkshopAnswer(workshop.id, {
      questionId: "fq5_workflow",
      value: "Browser-based onboarding workflow",
      confidence: "confirmed",
      timestamp: Date.now(),
    });

    const compare = compareFoundationBlueprintTiers(
      workshop.id,
      "minimal",
      "recommended",
    );
    expect(compare.schemaVersion).toBe(FOUNDATION_BLUEPRINT_COMPARE_SCHEMA_URN);
    expect(compare.topologyMatch).toBe(false);
    expect(compare.packDifferences.length).toBeGreaterThan(0);

    const approval = approveFoundationBlueprint(
      workshop.id,
      "recommended",
      "reviewer",
    );
    expect(approval.schemaVersion).toBe(
      FOUNDATION_BLUEPRINT_APPROVAL_SCHEMA_URN,
    );
    expect(approval.approval.status).toBe("approved");
    expect(approval.approval.approver).toBe("reviewer");

    const revoked = revokeFoundationBlueprintApproval(workshop.id);
    expect(revoked.approval.status).toBe("revoked");
  });

  it("reaches CLI parity for blueprint propose and compare commands", async () => {
    seedCliWorkshop("fnd_fixture_blueprint_cli_parity");

    const cliProposal = await runFoundationCliCommand("blueprint-propose", {
      workshopId: "fnd_fixture_blueprint_cli_parity",
      json: true,
    });
    expect(cliProposal.exitCode).toBe(0);
    const proposalPayload = JSON.parse(cliProposal.stdout);
    const appProposal = proposeFoundationBlueprints(
      "fnd_fixture_blueprint_cli_parity",
    );
    expect(proposalPayload.recommendedTopology).toBe(
      appProposal.recommendedTopology,
    );
    expect(proposalPayload.recommended.tier).toBe("recommended");

    const cliCompare = await runFoundationCliCommand("blueprint-compare", {
      workshopId: "fnd_fixture_blueprint_cli_parity",
      leftTier: "minimal",
      rightTier: "extensible",
      json: true,
    });
    expect(cliCompare.exitCode).toBe(0);
    const comparePayload = JSON.parse(cliCompare.stdout);
    expect(comparePayload.leftTier).toBe("minimal");
    expect(comparePayload.rightTier).toBe("extensible");
  });
});
