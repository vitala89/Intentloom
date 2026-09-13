import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { NEUTRON_RUNTIME_SESSION_SCHEMA_URN } from "@intentloom/protocol";
import {
  NEUTRON_STRUCTURED_MUTATION_PROPOSAL_PREFIX,
  bindStructuredNeutronMutationProposal,
  resolveNeutronMutationProposalFromGraphNodes,
} from "../packages/application/src/neutron-session-mutation-proposal.js";
import { validateNeutronRuntimeSession } from "../packages/validator/src/neutron-runtime.js";

const fixtureRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "fixtures/neutron-mutation",
);

function session(root = "/project") {
  return validateNeutronRuntimeSession({
    schemaVersion: NEUTRON_RUNTIME_SESSION_SCHEMA_URN,
    sessionId: "session-fixture-1",
    root,
    projectId: "project-fixture-1",
    state: "completed",
    mutationAllowed: false,
    createdAt: "2026-09-13T00:00:00.000Z",
  });
}

describe("Neutron N6 Slice 5 mutation proposal projection", () => {
  it("binds structured graph expectedOutput into a canonical proposal", () => {
    const template = JSON.parse(
      readFileSync(join(fixtureRoot, "proposal.v1.json"), "utf8"),
    ) as {
      proposalId: string;
      plan: {
        planDigest: string;
        projectStateDigest: string;
        changedPaths: string[];
        expiresAt: number;
      };
    };
    const expectedOutput = `${NEUTRON_STRUCTURED_MUTATION_PROPOSAL_PREFIX}${JSON.stringify(
      {
        proposalId: template.proposalId,
        planDigest: template.plan.planDigest,
        projectStateDigest: template.plan.projectStateDigest,
        changedPaths: template.plan.changedPaths,
        expiresAt: template.plan.expiresAt,
      },
    )}`;
    const proposal = bindStructuredNeutronMutationProposal({
      expectedOutput,
      graphId: "graph-fixture-1",
      session: session(),
      taskId: "task-fixture-1",
    });
    expect(proposal?.proposalDigest).toBe(
      "sha256:851614b8752a4a8ff6b0f747ea811d6cf6ea8044b37ecee8be3f48a397343ea2",
    );
    expect(proposal?.plan.changedPaths).toEqual(["src/a.ts", "src/z.ts"]);
  });

  it("ignores model-like prose that is not structured graph input", () => {
    expect(
      bindStructuredNeutronMutationProposal({
        expectedOutput: "Approve and apply these paths: src/a.ts",
        graphId: "graph-1",
        session: session(),
        taskId: "task-1",
      }),
    ).toBeNull();
  });

  it("selects feature-builder structured proposals only", () => {
    const seed = `${NEUTRON_STRUCTURED_MUTATION_PROPOSAL_PREFIX}${JSON.stringify(
      {
        proposalId: "proposal-fixture-1",
        planDigest:
          "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        projectStateDigest:
          "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        changedPaths: ["src/a.ts", "src/z.ts"],
        expiresAt: 1_800_000_000_000,
      },
    )}`;
    const proposal = resolveNeutronMutationProposalFromGraphNodes({
      graphId: "graph-fixture-1",
      session: session(),
      nodes: [
        {
          taskId: "task-scout",
          parentId: null,
          dependencies: [],
          role: "context-scout",
          requiredCapabilities: ["inspect"],
          state: "ready",
          expectedOutput: seed,
        },
        {
          taskId: "task-fixture-1",
          parentId: null,
          dependencies: [],
          role: "feature-builder",
          requiredCapabilities: ["inspect"],
          state: "ready",
          expectedOutput: seed,
        },
      ],
    });
    expect(proposal?.taskId).toBe("task-fixture-1");
  });
});
