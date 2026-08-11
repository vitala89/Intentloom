import { afterEach, describe, expect, it } from "vitest";
import {
  approveFoundationBlueprint,
  buildFoundationBlueprintApprovalViewModel,
  buildFoundationBlueprintCompareViewModel,
  buildFoundationBlueprintProposalViewModel,
  clearFoundationBlueprintStore,
  clearFoundationWorkshopStore,
  compareFoundationBlueprintTiers,
  createFoundationWorkshop,
  proposeFoundationBlueprints,
  recordFoundationWorkshopAnswer,
  renderFoundationBlueprintApprovalText,
  renderFoundationBlueprintCompareText,
  renderFoundationBlueprintProposalText,
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

function seedWorkshop(workshopId: string) {
  createFoundationWorkshop({
    root: "/tmp/foundation-blueprint-client",
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

describe("Engineering Workspace W4 Client: Desktop and TUI blueprint viewmodels", () => {
  it("renders blueprint proposal text with tier candidates and metadata", () => {
    seedWorkshop("fnd_fixture_blueprint_client_proposal");
    const proposal = proposeFoundationBlueprints(
      "fnd_fixture_blueprint_client_proposal",
    );
    const vm = buildFoundationBlueprintProposalViewModel(proposal, "ready");
    const text = renderFoundationBlueprintProposalText(vm);

    expect(text).toContain(
      "Foundation blueprint proposal: fnd_fixture_blueprint_client_proposal",
    );
    expect(text).toContain("Recommended topology: desktop-product");
    expect(text).toContain("Workshop unchanged: yes");
    expect(text).toContain("Candidates: 3");
    expect(text).toContain("[minimal]");
    expect(text).toContain("[recommended]");
    expect(text).toContain("[extensible]");
    expect(text).toContain("Surface state: ready");
  });

  it("renders blueprint compare and approval viewmodels", () => {
    seedWorkshop("fnd_fixture_blueprint_client_lifecycle");
    const compare = compareFoundationBlueprintTiers(
      "fnd_fixture_blueprint_client_lifecycle",
      "minimal",
      "recommended",
    );
    const compareVm = buildFoundationBlueprintCompareViewModel(
      compare,
      "ready",
    );
    expect(compareVm.topologyMatch).toBe(false);
    expect(renderFoundationBlueprintCompareText(compareVm)).toContain(
      "Left tier: minimal",
    );

    const approval = approveFoundationBlueprint(
      "fnd_fixture_blueprint_client_lifecycle",
      "recommended",
      "reviewer",
    );
    expect(approval.schemaVersion).toBe(
      FOUNDATION_BLUEPRINT_APPROVAL_SCHEMA_URN,
    );
    const approvalVm = buildFoundationBlueprintApprovalViewModel(
      approval,
      "ready",
    );
    expect(renderFoundationBlueprintApprovalText(approvalVm)).toContain(
      "Status: approved",
    );
  });

  it("keeps CLI blueprint-propose parity with proposal viewmodels", async () => {
    seedWorkshop("fnd_fixture_blueprint_client_cli");

    const cliProposal = await runFoundationCliCommand("blueprint-propose", {
      workshopId: "fnd_fixture_blueprint_client_cli",
      json: true,
    });
    expect(cliProposal.exitCode).toBe(0);
    const cliPayload = JSON.parse(cliProposal.stdout) as {
      schemaVersion: string;
      recommendedTopology: string;
    };
    expect(cliPayload.schemaVersion).toBe(
      FOUNDATION_BLUEPRINT_PROPOSAL_SCHEMA_URN,
    );

    const appProposal = proposeFoundationBlueprints(
      "fnd_fixture_blueprint_client_cli",
    );
    const vm = buildFoundationBlueprintProposalViewModel(appProposal, "ready");
    expect(vm.recommendedTopology).toBe(cliPayload.recommendedTopology);
    expect(vm.candidates).toHaveLength(3);
  });

  it("keeps CLI blueprint-compare parity with compare viewmodels", async () => {
    seedWorkshop("fnd_fixture_blueprint_client_compare");

    const cliCompare = await runFoundationCliCommand("blueprint-compare", {
      workshopId: "fnd_fixture_blueprint_client_compare",
      leftTier: "minimal",
      rightTier: "extensible",
      json: true,
    });
    expect(cliCompare.exitCode).toBe(0);
    const cliPayload = JSON.parse(cliCompare.stdout) as {
      schemaVersion: string;
      topologyMatch: boolean;
    };
    expect(cliPayload.schemaVersion).toBe(
      FOUNDATION_BLUEPRINT_COMPARE_SCHEMA_URN,
    );

    const appCompare = compareFoundationBlueprintTiers(
      "fnd_fixture_blueprint_client_compare",
      "minimal",
      "extensible",
    );
    const vm = buildFoundationBlueprintCompareViewModel(appCompare, "ready");
    expect(vm.topologyMatch).toBe(cliPayload.topologyMatch);
  });
});
