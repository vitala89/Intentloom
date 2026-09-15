import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checksum, type GeneratedFile } from "@intentloom/core";
import {
  createMemoryFileSystem,
  planSynchronizeGeneratedFilesWriteSet,
  synchronizeGeneratedFiles,
  GENERATED_FILE_SYNC_DECLARED_PATHS_ONLY,
} from "../packages/application/src/index.js";
import { fingerprintNeutronProjectRoot } from "../packages/application/src/neutron-session-fingerprint.js";
import { verifyMutationPayloadAgainstReviewArtifact } from "../packages/application/src/neutron-mutation-review-payload.js";
import { listRegisteredNeutronTools } from "../packages/application/src/neutron-tool-registry.js";
import {
  NEUTRON_MUTATION_CLASS,
  NEUTRON_MUTATION_PROPOSAL_SCHEMA_URN,
  type NeutronMutationProposal,
} from "../packages/protocol/src/neutron-mutation.js";
import {
  NEUTRON_READ_ONLY_TOOLS,
  NEUTRON_RUNTIME_SESSION_SCHEMA_URN,
} from "../packages/protocol/src/neutron-runtime.js";
import { validateNeutronRuntimeSession } from "../packages/validator/src/neutron-runtime.js";
import {
  assertCanonicalContentBoundPlanDigest,
  digestContentBoundApplyPlan,
  digestGeneratedFileContent,
  digestNeutronMutationProposal,
  exactNeutronMutationPathSetsEqual,
  materializeNeutronMutationReviewArtifact,
  validateNeutronMutationReviewArtifact,
} from "../packages/validator/src/neutron-mutation.js";

function sampleFiles(): GeneratedFile[] {
  return [
    {
      path: "src/a.ts",
      content: "export const a = 1;\n",
      sources: ["review:test"],
      checksum: checksum("export const a = 1;\n"),
    },
    {
      path: "src/z.ts",
      content: "export const z = 2;\n",
      sources: ["review:test"],
      checksum: checksum("export const z = 2;\n"),
    },
  ];
}

function contentBoundProposal(files: GeneratedFile[]): NeutronMutationProposal {
  const bindings = files.map((file) => ({
    path: file.path,
    contentDigest: digestGeneratedFileContent(file.content),
  }));
  const planDigest = digestContentBoundApplyPlan({
    projectStateDigest: `sha256:${"b".repeat(64)}`,
    targetRoot: "/project",
    fileBindings: bindings,
  });
  const facts = {
    proposalId: "proposal-content-bound-1",
    sessionId: "session-fixture-1",
    projectId: "project-fixture-1",
    root: "/project",
    taskId: "task-fixture-1",
    graphId: "graph-fixture-1",
    mutationClass: NEUTRON_MUTATION_CLASS,
    plan: {
      schemaVersion: 1 as const,
      planDigest,
      projectStateDigest: `sha256:${"b".repeat(64)}`,
      targetRoot: "/project",
      changedPaths: ["src/z.ts", "src/a.ts"],
      expiresAt: 1_800_000_000_000,
    },
  };
  return {
    schemaVersion: NEUTRON_MUTATION_PROPOSAL_SCHEMA_URN,
    ...facts,
    proposalDigest: digestNeutronMutationProposal(facts),
  };
}

describe("Neutron mutation review artifact", () => {
  it("binds identical paths and content with a stable artifact digest", () => {
    const files = sampleFiles();
    const proposal = contentBoundProposal(files);
    const first = materializeNeutronMutationReviewArtifact({
      proposal,
      files,
      artifactId: "artifact-1",
      transactionId: "txn-1",
    });
    const second = materializeNeutronMutationReviewArtifact({
      proposal,
      files: [...files].reverse(),
      artifactId: "artifact-1",
      transactionId: "txn-1",
    });
    expect(first.artifactDigest).toBe(second.artifactDigest);
    expect(first.planDigest).toBe(proposal.plan.planDigest);
    expect(validateNeutronMutationReviewArtifact(first)).toEqual(first);
  });

  it("rejects a one-byte content swap against the artifact", () => {
    const files = sampleFiles();
    const proposal = contentBoundProposal(files);
    const artifact = materializeNeutronMutationReviewArtifact({
      proposal,
      files,
      artifactId: "artifact-1",
      transactionId: "txn-1",
    });
    const swapped = files.map((file) =>
      file.path === "src/a.ts"
        ? {
            ...file,
            content: "export const a = 2;\n",
            checksum: checksum("export const a = 2;\n"),
          }
        : file,
    );
    const result = verifyMutationPayloadAgainstReviewArtifact({
      artifact,
      files: swapped,
    });
    expect(result.ok).toBe(false);
    expect(result.codes).toContain("content-mismatch");
    expect(result.diagnostics.join(" ")).not.toContain("export const");
  });

  it("rejects empty vs non-empty content for the same path", () => {
    const files = sampleFiles();
    const proposal = contentBoundProposal(files);
    const artifact = materializeNeutronMutationReviewArtifact({
      proposal,
      files,
      artifactId: "artifact-1",
      transactionId: "txn-1",
    });
    const empty = files.map((file) =>
      file.path === "src/a.ts"
        ? { ...file, content: "", checksum: checksum("") }
        : file,
    );
    expect(
      verifyMutationPayloadAgainstReviewArtifact({ artifact, files: empty }).ok,
    ).toBe(false);
  });

  it("rejects tampered planDigest and artifactDigest", () => {
    const files = sampleFiles();
    const proposal = contentBoundProposal(files);
    const artifact = materializeNeutronMutationReviewArtifact({
      proposal,
      files,
      artifactId: "artifact-1",
      transactionId: "txn-1",
    });
    expect(() =>
      validateNeutronMutationReviewArtifact({
        ...artifact,
        planDigest: `sha256:${"c".repeat(64)}`,
      }),
    ).toThrow(/planDigest/);
    expect(() =>
      validateNeutronMutationReviewArtifact({
        ...artifact,
        artifactDigest: `sha256:${"d".repeat(64)}`,
      }),
    ).toThrow(/artifactDigest/);
    expect(() =>
      materializeNeutronMutationReviewArtifact({
        proposal: {
          ...proposal,
          plan: {
            ...proposal.plan,
            planDigest: `sha256:${"e".repeat(64)}`,
          },
        },
        files,
        artifactId: "artifact-1",
        transactionId: "txn-1",
      }),
    ).toThrow(/content-bound/);
  });

  it("enforces exact path sets and rejects traversal or absolute paths", () => {
    expect(exactNeutronMutationPathSetsEqual(["src/a.ts"], ["src/a.ts"])).toBe(
      true,
    );
    expect(exactNeutronMutationPathSetsEqual(["src/a.ts"], ["src/b.ts"])).toBe(
      false,
    );
    expect(() =>
      materializeNeutronMutationReviewArtifact({
        proposal: contentBoundProposal([
          {
            path: "../escape.ts",
            content: "x",
            sources: [],
            checksum: checksum("x"),
          },
        ]),
        files: [
          {
            path: "../escape.ts",
            content: "x",
            sources: [],
            checksum: checksum("x"),
          },
        ],
        artifactId: "artifact-1",
        transactionId: "txn-1",
      }),
    ).toThrow(/path/);
  });

  it("declared-path sync mode does not plan or write undeclared .aif metadata", async () => {
    const files = sampleFiles();
    const planned = planSynchronizeGeneratedFilesWriteSet(files, {
      syncMode: GENERATED_FILE_SYNC_DECLARED_PATHS_ONLY,
    });
    expect(planned).toEqual(["src/a.ts", "src/z.ts"]);
    expect(planned).not.toContain(".aif/manifest.lock.json");

    const defaultPlan = planSynchronizeGeneratedFilesWriteSet(files);
    expect(defaultPlan).toContain(".aif/manifest.lock.json");

    const root = "/project";
    const fs = createMemoryFileSystem();
    await fs.mkdir(root);
    const result = await synchronizeGeneratedFiles(root, files, fs, {
      syncMode: GENERATED_FILE_SYNC_DECLARED_PATHS_ONLY,
    });
    expect(result.status).toBe("success");
    expect(result.manifestUpdated).toBe(false);
    expect(result.sourceMapUpdated).toBe(false);
    expect(await fs.exists(`${root}/.aif/manifest.lock.json`)).toBe(false);
    expect(await fs.exists(`${root}/.aif/source-map.json`)).toBe(false);
  });

  it("does not change project fingerprint when materializing or verifying artifacts", async () => {
    const root = await mkdtemp(join(tmpdir(), "review-artifact-fp-"));
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src/a.ts"), "export const a = 1;\n");
    await writeFile(join(root, "src/z.ts"), "export const z = 2;\n");
    const before = await fingerprintNeutronProjectRoot(root);
    const files = sampleFiles();
    const proposal = contentBoundProposal(files);
    const artifact = materializeNeutronMutationReviewArtifact({
      proposal,
      files,
      artifactId: "artifact-1",
      transactionId: "txn-1",
    });
    verifyMutationPayloadAgainstReviewArtifact({ artifact, files, root });
    const after = await fingerprintNeutronProjectRoot(root);
    expect(after).toBe(before);
  });

  it("keeps mutationAllowed false and N4 catalog read-only", () => {
    const session = validateNeutronRuntimeSession({
      schemaVersion: NEUTRON_RUNTIME_SESSION_SCHEMA_URN,
      sessionId: "s",
      root: "/p",
      projectId: "p",
      state: "planning",
      mutationAllowed: false,
      createdAt: "2026-09-11T00:00:00.000Z",
    });
    expect(session.mutationAllowed).toBe(false);
    expect(() =>
      validateNeutronRuntimeSession({
        ...session,
        mutationAllowed: true as false,
      }),
    ).toThrow(/mutationAllowed/);
    const tools = listRegisteredNeutronTools();
    expect(tools.map((tool) => tool.toolName).sort()).toEqual(
      [...NEUTRON_READ_ONLY_TOOLS].sort(),
    );
    expect(tools.map((tool) => tool.toolName)).not.toContain(
      "applyApprovedTransaction",
    );
    expect(tools.every((tool) => tool.readOnly === true)).toBe(true);
  });

  it("assertCanonicalContentBoundPlanDigest rejects opaque caller plan digests", () => {
    const files = sampleFiles();
    const bindings = files.map((file) => ({
      path: file.path,
      contentDigest: digestGeneratedFileContent(file.content),
    }));
    expect(() =>
      assertCanonicalContentBoundPlanDigest(
        `sha256:${"f".repeat(64)}`,
        bindings,
        `sha256:${"b".repeat(64)}`,
        "/project",
      ),
    ).toThrow(/content-bound/);
  });
});
