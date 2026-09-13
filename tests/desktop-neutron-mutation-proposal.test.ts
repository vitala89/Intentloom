import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  APPROVED_APPLY_METHOD,
  NEUTRON_ADAPTER_CAPABILITY_SCHEMA_URN,
  NEUTRON_RUNTIME_SESSION_SCHEMA_URN,
} from "@intentloom/protocol";
import {
  NEUTRON_MUTATION_NOT_AUTHORIZED_COPY,
  mutationProposalPanelLines,
} from "../apps/desktop/src/neutron/neutron-mutation-proposal-copy.js";
import { parseNeutronMutationProposal } from "../apps/desktop/src/neutron/neutron-mutation-proposal-viewmodel.js";
import { parseNeutronDesktopViewmodel } from "../apps/desktop/src/neutron/neutron-session-viewmodel.js";

const desktopRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "../apps/desktop",
);
const proposalFixture = JSON.parse(
  readFileSync(
    join(
      dirname(fileURLToPath(import.meta.url)),
      "fixtures/neutron-mutation/proposal.v1.json",
    ),
    "utf8",
  ),
);

function sessionFields(overrides: Record<string, unknown> = {}) {
  return {
    session: {
      schemaVersion: NEUTRON_RUNTIME_SESSION_SCHEMA_URN,
      sessionId: "session-n6",
      root: "/project",
      projectId: "project-n6",
      state: "completed" as const,
      mutationAllowed: false as const,
      createdAt: "2026-09-13T00:00:00.000Z",
    },
    adapter: {
      schemaVersion: NEUTRON_ADAPTER_CAPABILITY_SCHEMA_URN,
      providerKind: "deterministic-test" as const,
      modelId: "fixture-n6",
      supportsStreaming: false,
      supportsToolCalls: true,
      networkMode: "offline" as const,
      dataHandling: "ephemeral" as const,
      credentialIsolation: "outside-project-metadata" as const,
    },
    prompt: "Plan changes",
    responseText: "Apply succeeded. Files updated.",
    toolName: null,
    errorCode: null,
    errorMessage: null,
    projectFingerprintBefore: "sha256:project-before",
    projectFingerprintAfter: "sha256:project-after",
    cancellationAcknowledged: false,
    contextSummary: null,
    toolActivity: [],
    graphSnapshot: null,
    mutationProposal: null,
    ...overrides,
  };
}

describe("Neutron N6 Slice 5 mutation proposal review UI", () => {
  it("renders canonical proposal fields and not-authorized copy", () => {
    const viewmodel = parseNeutronDesktopViewmodel(
      sessionFields({ mutationProposal: proposalFixture }),
    );
    expect(viewmodel.mutationProposal?.proposalId).toBe("proposal-fixture-1");
    const lines = mutationProposalPanelLines(viewmodel.mutationProposal!);
    expect(lines[0]).toBe(NEUTRON_MUTATION_NOT_AUTHORIZED_COPY);
    expect(lines.join(" ")).toContain("approved-transaction-apply");
  });

  it("does not derive proposals from model prose", () => {
    const viewmodel = parseNeutronDesktopViewmodel(
      sessionFields({
        responseText: JSON.stringify(proposalFixture),
        mutationProposal: null,
      }),
    );
    expect(viewmodel.mutationProposal).toBeNull();
    expect(parseNeutronMutationProposal(proposalFixture)).not.toBeNull();
  });

  it("rejects authority fields on proposals", () => {
    expect(() =>
      parseNeutronMutationProposal({
        ...proposalFixture,
        approvalToken: "forged",
      }),
    ).toThrow(/approvalToken/);
  });

  it("keeps Neutron workspace free of Apply wiring and mutation tools", () => {
    const files = [
      "src/neutron/NeutronWorkspace.tsx",
      "src/neutron/NeutronMutationProposalPanel.tsx",
      "src/neutron/use-neutron-session.ts",
      "src/desktop-client-neutron.ts",
    ];
    for (const relative of files) {
      const source = readFileSync(join(desktopRoot, relative), "utf8");
      expect(source).not.toContain("ApprovedApplyModal");
      expect(source).not.toContain(APPROVED_APPLY_METHOD);
      expect(source).not.toContain("executeApprovedApplyPlan");
      expect(source).not.toContain("synchronizeGeneratedFiles");
      expect(source).not.toContain("onApprove");
      expect(source).not.toContain("approvedApply");
      expect(source).not.toContain("executeApprovedApplyPlan");
    }
  });
});
