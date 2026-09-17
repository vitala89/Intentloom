import { describe, expect, it } from "vitest";
import {
  neutronNodeMayPropose,
  NEUTRON_MUTATION_PROPOSAL_CAPABILITY,
} from "../packages/application/src/neutron-scheduler.js";

describe("Neutron mutation Slice 5 proposal capability", () => {
  it("permits an explicit feature-builder grant", () => {
    expect(
      neutronNodeMayPropose({
        role: "feature-builder",
        nodeRequiredCapabilities: [
          "inspect",
          NEUTRON_MUTATION_PROPOSAL_CAPABILITY,
        ],
        sessionProposalCapabilities: [NEUTRON_MUTATION_PROPOSAL_CAPABILITY],
      }),
    ).toBe(true);
  });

  it("denies unpermitted roles even with the capability string", () => {
    for (const role of [
      "context-scout",
      "test-engineer",
      "reviewer",
      "release-analyst",
    ]) {
      expect(
        neutronNodeMayPropose({
          role,
          nodeRequiredCapabilities: [NEUTRON_MUTATION_PROPOSAL_CAPABILITY],
          sessionProposalCapabilities: [NEUTRON_MUTATION_PROPOSAL_CAPABILITY],
        }),
      ).toBe(false);
    }
  });

  it("does not let a child widen parent authority", () => {
    expect(
      neutronNodeMayPropose({
        role: "feature-builder",
        nodeRequiredCapabilities: [NEUTRON_MUTATION_PROPOSAL_CAPABILITY],
        parentRequiredCapabilities: ["inspect"],
        sessionProposalCapabilities: [NEUTRON_MUTATION_PROPOSAL_CAPABILITY],
      }),
    ).toBe(false);
  });

  it("clamps to session, profile, and ceiling intersection", () => {
    expect(
      neutronNodeMayPropose({
        role: "feature-builder",
        nodeRequiredCapabilities: [NEUTRON_MUTATION_PROPOSAL_CAPABILITY],
        sessionProposalCapabilities: [NEUTRON_MUTATION_PROPOSAL_CAPABILITY],
        profileProposalCapabilities: ["inspect"],
      }),
    ).toBe(false);
    expect(
      neutronNodeMayPropose({
        role: "feature-builder",
        nodeRequiredCapabilities: [NEUTRON_MUTATION_PROPOSAL_CAPABILITY],
        sessionProposalCapabilities: [NEUTRON_MUTATION_PROPOSAL_CAPABILITY],
        capabilityCeiling: ["inspect"],
      }),
    ).toBe(false);
  });
});
