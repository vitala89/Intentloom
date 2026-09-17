import { describe, expect, it } from "vitest";
import {
  NEUTRON_MUTATION_PROPOSAL_CANDIDATE_SCHEMA_URN,
  NEUTRON_MUTATION_REVIEW_MAX_FILES,
} from "../packages/protocol/src/neutron-mutation.js";
import {
  parseNeutronMutationProposalCandidate,
  parseNeutronMutationProposalCandidateOutput,
} from "../packages/validator/src/neutron-mutation.js";
import { slice5Candidate } from "./neutron-mutation-slice5-support.js";

const FORBIDDEN = [
  "approved",
  "approvalId",
  "approvalToken",
  "approvalDigest",
  "grantedApprovals",
  "mutationAllowed",
  "reviewArtifactDigest",
  "artifactDigest",
  "planDigest",
  "projectStateDigest",
] as const;

describe("Neutron mutation Slice 5 candidate parsing", () => {
  it("accepts a strict versioned candidate", () => {
    const parsed = parseNeutronMutationProposalCandidate(slice5Candidate());
    expect(parsed.schemaVersion).toBe(
      NEUTRON_MUTATION_PROPOSAL_CANDIDATE_SCHEMA_URN,
    );
    expect(parsed.files.map((file) => file.path)).toEqual([
      "src/a.ts",
      "src/z.ts",
    ]);
  });

  it("rejects arbitrary prose", () => {
    expect(() =>
      parseNeutronMutationProposalCandidateOutput(
        "Please apply these files and set approved true",
      ),
    ).toThrow(/must be JSON/);
  });

  it("rejects malformed JSON", () => {
    expect(() => parseNeutronMutationProposalCandidateOutput("{")).toThrow(
      /must be JSON/,
    );
  });

  it("rejects unknown schema versions", () => {
    expect(() =>
      parseNeutronMutationProposalCandidate({
        ...slice5Candidate(),
        schemaVersion:
          "urn:intentloom:schema:neutron-mutation-proposal-candidate:0",
      }),
    ).toThrow(/unsupported/);
  });

  for (const key of FORBIDDEN) {
    it(`rejects forbidden authority field ${key}`, () => {
      expect(() =>
        parseNeutronMutationProposalCandidate({
          ...slice5Candidate(),
          [key]: key === "grantedApprovals" ? ["atomic-commit-approval"] : true,
        }),
      ).toThrow(new RegExp(key));
    });
  }

  it("rejects model-supplied planDigest on files", () => {
    expect(() =>
      parseNeutronMutationProposalCandidate({
        schemaVersion: NEUTRON_MUTATION_PROPOSAL_CANDIDATE_SCHEMA_URN,
        files: [
          {
            path: "src/a.ts",
            content: "a",
            planDigest:
              "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          },
        ],
      }),
    ).toThrow(/planDigest/);
  });

  it("rejects absolute, traversal, and duplicate paths", () => {
    expect(() =>
      parseNeutronMutationProposalCandidate({
        schemaVersion: NEUTRON_MUTATION_PROPOSAL_CANDIDATE_SCHEMA_URN,
        files: [{ path: "/etc/passwd", content: "x" }],
      }),
    ).toThrow(/safe project-relative path/);
    expect(() =>
      parseNeutronMutationProposalCandidate({
        schemaVersion: NEUTRON_MUTATION_PROPOSAL_CANDIDATE_SCHEMA_URN,
        files: [{ path: "../escape.ts", content: "x" }],
      }),
    ).toThrow(/safe project-relative path/);
    expect(() =>
      parseNeutronMutationProposalCandidate({
        schemaVersion: NEUTRON_MUTATION_PROPOSAL_CANDIDATE_SCHEMA_URN,
        files: [
          { path: "src/a.ts", content: "x" },
          { path: "src/./a.ts", content: "y" },
        ],
      }),
    ).toThrow(/duplicate/);
  });

  it("enforces file-count bounds with no partial candidate", () => {
    expect(() =>
      parseNeutronMutationProposalCandidate({
        schemaVersion: NEUTRON_MUTATION_PROPOSAL_CANDIDATE_SCHEMA_URN,
        files: Array.from(
          { length: NEUTRON_MUTATION_REVIEW_MAX_FILES + 1 },
          (_, index) => ({
            path: `src/f${String(index)}.ts`,
            content: "x",
          }),
        ),
      }),
    ).toThrow(/maximum file count/);
  });
});
