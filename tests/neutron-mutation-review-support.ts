import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  nodeFileSystem,
  type FileSystem,
} from "../packages/application/src/index.js";
import {
  collectNeutronGraphMutationCandidates,
  createMemoryNeutronGraphMutationPayloadStore,
  materializeNeutronGraphMutationReview,
  NEUTRON_MUTATION_PROPOSAL_CAPABILITY,
} from "../packages/application/src/neutron-scheduler.js";
import type { NeutronGraphMutationReviewBundle } from "../packages/application/src/neutron-graph-mutation-store.js";
import type { NeutronMutationProposalCandidate } from "../packages/protocol/src/neutron-mutation-proposal-candidate.js";
import { NEUTRON_MUTATION_PROPOSAL_CANDIDATE_SCHEMA_URN } from "../packages/protocol/src/neutron-mutation-proposal-candidate.js";
import {
  SLICE5_CONTENT_A,
  SLICE5_CONTENT_Z,
  SLICE5_FINGERPRINT,
  SLICE5_NOW,
  slice5Candidate,
  slice5Execution,
  slice5Graph,
  slice5Node,
  slice5Outcome,
  slice5Session,
} from "./neutron-mutation-slice5-support.js";

export const REVIEW_GRAPH_ID = "graph-slice5";

export async function reviewProject(
  files?: Record<string, string>,
): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "neutron-d1-review-"));
  await mkdir(join(root, "src"), { recursive: true });
  const contents = files ?? {
    "src/a.ts": "old a\n",
    "src/z.ts": SLICE5_CONTENT_Z,
  };
  for (const [relative, content] of Object.entries(contents)) {
    await writeFile(join(root, relative), content);
  }
  await writeFile(join(root, "package.json"), '{"name":"d1-review"}\n');
  await writeFile(join(root, "README.md"), "safe\n");
  return root;
}

export function reviewCandidate(
  files: NeutronMutationProposalCandidate["files"] = slice5Candidate().files,
): NeutronMutationProposalCandidate {
  return {
    schemaVersion: NEUTRON_MUTATION_PROPOSAL_CANDIDATE_SCHEMA_URN,
    files,
  };
}

export function materializeReviewBundle(input: {
  readonly root: string;
  readonly fingerprint?: string;
  readonly candidate?: NeutronMutationProposalCandidate;
  readonly taskId?: string;
  readonly store?: ReturnType<
    typeof createMemoryNeutronGraphMutationPayloadStore
  >;
}): {
  readonly bundle: NeutronGraphMutationReviewBundle;
  readonly store: ReturnType<
    typeof createMemoryNeutronGraphMutationPayloadStore
  >;
} {
  const output = JSON.stringify(input.candidate ?? slice5Candidate());
  const records = collectNeutronGraphMutationCandidates({
    currentProjectFingerprint: input.fingerprint ?? SLICE5_FINGERPRINT,
    graph: slice5Graph([slice5Node(input.taskId ?? "task-build")], input.root),
    graphId: REVIEW_GRAPH_ID,
    outcomes: [
      slice5Outcome({
        execution: slice5Execution({
          fingerprint: input.fingerprint ?? SLICE5_FINGERPRINT,
          output,
          root: input.root,
          taskId: input.taskId ?? "task-build",
        }),
        output,
        taskId: input.taskId ?? "task-build",
      }),
    ],
    permission: {
      sessionProposalCapabilities: [NEUTRON_MUTATION_PROPOSAL_CAPABILITY],
    },
    session: slice5Session(input.root),
    stale: null,
  });
  const store = input.store ?? createMemoryNeutronGraphMutationPayloadStore();
  const bundle = materializeNeutronGraphMutationReview({
    currentProjectFingerprint: input.fingerprint ?? SLICE5_FINGERPRINT,
    now: () => SLICE5_NOW,
    record: records[0]!,
    session: slice5Session(input.root),
    store,
  });
  return { bundle, store };
}

export function reviewInputBase(input: {
  readonly root: string;
  readonly store?: ReturnType<
    typeof createMemoryNeutronGraphMutationPayloadStore
  >;
  readonly fingerprint?: string;
  readonly fs?: FileSystem;
  readonly graphId?: string;
  readonly now?: number;
}) {
  return {
    currentProjectFingerprint: input.fingerprint ?? SLICE5_FINGERPRINT,
    fs: input.fs ?? nodeFileSystem,
    now: input.now ?? SLICE5_NOW,
    request: {
      projectId: slice5Session(input.root).projectId,
      root: input.root,
      sessionId: slice5Session(input.root).sessionId,
      ...(input.graphId === undefined ? {} : { graphId: input.graphId }),
    },
    session: slice5Session(input.root),
    store: input.store,
  };
}

export { SLICE5_CONTENT_A, SLICE5_CONTENT_Z, SLICE5_FINGERPRINT, SLICE5_NOW };
