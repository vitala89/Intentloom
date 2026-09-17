import { describe, expect, it } from "vitest";
import {
  attachNeutronGraphMutationEvidence,
  collectNeutronGraphMutationCandidates,
  createMemoryNeutronGraphMutationPayloadStore,
  materializeNeutronGraphMutationReview,
  NEUTRON_MUTATION_PROPOSAL_CAPABILITY,
} from "../packages/application/src/neutron-scheduler.js";
import { aggregateNeutronTaskGraphResults } from "../packages/application/src/neutron-scheduler.js";
import { digestContentBoundApplyPlan } from "../packages/validator/src/neutron-mutation.js";
import { digestGeneratedFileContent } from "../packages/validator/src/neutron-mutation.js";
import {
  SLICE5_CONTENT_A,
  SLICE5_NOW,
  slice5CandidateOutput,
  slice5Execution,
  slice5Graph,
  slice5Node,
  slice5Outcome,
  slice5Session,
} from "./neutron-mutation-slice5-support.js";

const PERMISSION = {
  sessionProposalCapabilities: [NEUTRON_MUTATION_PROPOSAL_CAPABILITY],
};

function collect(input: {
  readonly nodes: ReturnType<typeof slice5Node>[];
  readonly outcomes: ReturnType<typeof slice5Outcome>[];
}) {
  return collectNeutronGraphMutationCandidates({
    graph: slice5Graph(input.nodes),
    graphId: "graph-slice5",
    outcomes: input.outcomes,
    permission: PERMISSION,
    session: slice5Session(),
  });
}

describe("Neutron mutation Slice 5 graph candidates and provenance", () => {
  it("materializes only the completed authoritative attempt", () => {
    const output = slice5CandidateOutput();
    const execution = slice5Execution({
      attempt: 2,
      output,
      taskId: "task-build",
    });
    const records = collect({
      nodes: [slice5Node("task-build")],
      outcomes: [
        slice5Outcome({
          attempts: [
            {
              attempt: 1,
              completedAt: SLICE5_NOW,
              error: { code: "timeout", message: "stale", stage: "model" },
              leaseId: "lease-1",
              startedAt: SLICE5_NOW,
              state: "stale",
            },
            {
              attempt: 2,
              completedAt: SLICE5_NOW,
              error: null,
              leaseId: "lease-2",
              startedAt: SLICE5_NOW,
              state: "completed",
            },
          ],
          execution,
          output,
          taskId: "task-build",
        }),
      ],
    });
    expect(records).toHaveLength(1);
    expect(records[0]?.attempt).toBe(2);
  });

  it("ignores failed, cancelled, and timed-out attempts", () => {
    for (const state of ["failed", "cancelled", "timed-out"] as const) {
      const records = collect({
        nodes: [slice5Node("task-build", { state })],
        outcomes: [
          slice5Outcome({
            attempts: [
              {
                attempt: 1,
                completedAt: SLICE5_NOW,
                error: {
                  code: "operation-failed",
                  message: state,
                  stage: "model",
                },
                leaseId: "lease-1",
                startedAt: SLICE5_NOW,
                state,
              },
            ],
            execution: slice5Execution({
              output: slice5CandidateOutput(),
              state,
              taskId: "task-build",
            }),
            output: slice5CandidateOutput(),
            taskId: "task-build",
          }),
        ],
      });
      expect(records).toEqual([]);
    }
  });

  it("does not materialize unpermitted roles", () => {
    const records = collect({
      nodes: [slice5Node("task-review", { role: "reviewer" })],
      outcomes: [
        slice5Outcome({
          output: slice5CandidateOutput(),
          taskId: "task-review",
        }),
      ],
    });
    expect(records).toEqual([]);
  });

  it("lists multiple proposals deterministically without first-wins", () => {
    const records = collect({
      nodes: [slice5Node("task-z"), slice5Node("task-a")],
      outcomes: [
        slice5Outcome({ output: slice5CandidateOutput(), taskId: "task-z" }),
        slice5Outcome({ output: slice5CandidateOutput(), taskId: "task-a" }),
      ],
    });
    expect(records.map((item) => item.taskId)).toEqual(["task-a", "task-z"]);
  });

  it("binds host-computed digests and graph identity into review evidence", () => {
    const store = createMemoryNeutronGraphMutationPayloadStore();
    const record = collect({
      nodes: [slice5Node("task-build")],
      outcomes: [
        slice5Outcome({
          output: slice5CandidateOutput(),
          taskId: "task-build",
        }),
      ],
    })[0]!;
    const digest =
      "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
    const bundle = materializeNeutronGraphMutationReview({
      now: () => SLICE5_NOW,
      projectStateDigest: digest,
      record,
      session: slice5Session(),
      store,
    });
    const expectedPlan = digestContentBoundApplyPlan({
      fileBindings: bundle.files.map((file) => ({
        contentDigest: digestGeneratedFileContent(file.content),
        path: file.path,
      })),
      projectStateDigest: digest,
      targetRoot: slice5Session().root,
    });
    expect(bundle.proposal.plan.planDigest).toBe(expectedPlan);
    expect(bundle.proposal.plan.planDigest).toBe(bundle.artifact.planDigest);
    expect(bundle.evidence.graphId).toBe("graph-slice5");
    expect(bundle.evidence.taskId).toBe("task-build");
    expect(bundle.evidence.attempt).toBe(1);
    expect(bundle.evidence.outputDigest).toBe(record.outputDigest);
    expect(bundle.evidence.reviewRequired).toBe(true);
    expect(JSON.stringify(bundle.evidence)).not.toContain(SLICE5_CONTENT_A);
    expect(JSON.stringify(bundle.evidence)).not.toContain("approvalToken");
    const changed = materializeNeutronGraphMutationReview({
      now: () => SLICE5_NOW,
      projectStateDigest: digest,
      record: {
        ...record,
        candidate: {
          ...record.candidate,
          files: record.candidate.files.map((file, index) =>
            index === 0 ? { ...file, content: `${file.content} ` } : file,
          ),
        },
      },
      session: slice5Session(),
      store: createMemoryNeutronGraphMutationPayloadStore(),
    });
    expect(changed.proposal.plan.planDigest).not.toBe(
      bundle.proposal.plan.planDigest,
    );
    expect(changed.artifact.artifactDigest).not.toBe(
      bundle.artifact.artifactDigest,
    );
  });

  it("keeps graph aggregation independent from proposal review", () => {
    const aggregated = aggregateNeutronTaskGraphResults({
      graph: slice5Graph([slice5Node("task-build")]),
      session: slice5Session(),
    });
    expect(aggregated.status).toBe("completed");
    expect(aggregated.accepted).toBe(true);
    expect(aggregated.mutationAttempted).toBe(false);
    expect(aggregated.pendingReviewCount).toBe(0);
    const store = createMemoryNeutronGraphMutationPayloadStore();
    const record = collect({
      nodes: [slice5Node("task-build")],
      outcomes: [
        slice5Outcome({
          output: slice5CandidateOutput(),
          taskId: "task-build",
        }),
      ],
    })[0]!;
    const bundle = materializeNeutronGraphMutationReview({
      now: () => SLICE5_NOW,
      projectStateDigest:
        "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      record,
      session: slice5Session(),
      store,
    });
    const attached = attachNeutronGraphMutationEvidence(aggregated, {
      proposals: [bundle.evidence],
    });
    expect(attached.status).toBe("completed");
    expect(attached.accepted).toBe(true);
    expect(attached.pendingReviewCount).toBe(1);
    expect(attached.nodes[0]?.state).toBe("completed");
    expect(attached.mutationProposals[0]?.proposalId).toBe(
      bundle.proposal.proposalId,
    );
  });
});
