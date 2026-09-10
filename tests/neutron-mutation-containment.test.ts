import {
  mkdir,
  mkdtemp,
  realpath,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  assertNeutronMutationPathContained,
  isCanonicalPathInsideRoot,
  type NeutronMutationPathFilesystem,
} from "../packages/application/src/neutron-mutation-containment.js";
import { preflightNeutronMutation } from "../packages/application/src/neutron-mutation-preflight.js";
import {
  NEUTRON_MUTATION_CLASS,
  type NeutronMutationApproval,
  type NeutronMutationPreflightRequest,
  type NeutronMutationProposal,
} from "../packages/protocol/src/neutron-mutation.js";
import {
  digestNeutronMutationApproval,
  digestNeutronMutationProposal,
  expectedNeutronMutationApprovalToken,
} from "../packages/validator/src/neutron-mutation.js";

function loadRequest(): NeutronMutationPreflightRequest {
  return structuredClone(
    JSON.parse(
      readFileSync(
        resolve("tests/fixtures/neutron-mutation/preflight-request.v1.json"),
        "utf8",
      ),
    ),
  ) as NeutronMutationPreflightRequest;
}

function nodePathFs(): NeutronMutationPathFilesystem {
  return {
    async exists(path) {
      try {
        await stat(path);
        return true;
      } catch {
        return false;
      }
    },
    realpath,
  };
}

function resignProposal(
  proposal: NeutronMutationProposal,
): NeutronMutationProposal {
  return {
    ...proposal,
    proposalDigest: digestNeutronMutationProposal(proposal),
  };
}

function resignApproval(
  approval: NeutronMutationApproval,
): NeutronMutationApproval {
  const { approvalDigest: _omit, ...unsigned } = approval;
  return {
    ...unsigned,
    approvalDigest: digestNeutronMutationApproval(unsigned),
  };
}

function bindRequest(
  root: string,
  changedPaths: readonly string[],
): NeutronMutationPreflightRequest {
  const base = loadRequest();
  const proposal = resignProposal({
    ...base.proposal,
    root,
    plan: {
      ...base.proposal.plan,
      targetRoot: root,
      changedPaths: [...changedPaths],
    },
  });
  const approval = resignApproval({
    ...base.approval,
    root,
    changedPaths: [...changedPaths],
    proposalDigest: proposal.proposalDigest,
    approvalToken: expectedNeutronMutationApprovalToken(
      proposal.proposalDigest,
    ),
  });
  return { ...base, proposal, approval };
}

async function preflightAt(
  root: string,
  changedPaths: readonly string[],
  fs: NeutronMutationPathFilesystem = nodePathFs(),
) {
  return preflightNeutronMutation({
    request: bindRequest(root, changedPaths),
    authorization: {
      kind: "host",
      mutationClass: NEUTRON_MUTATION_CLASS,
    },
    fs,
    actualRoot: root,
    now: () => 1_750_000_000_000,
  });
}

describe("Neutron mutation path containment", () => {
  it("does not treat a sibling prefix as inside the root", () => {
    expect(
      isCanonicalPathInsideRoot("/tmp/project", "/tmp/project-evil/file.ts"),
    ).toBe(false);
    expect(
      isCanonicalPathInsideRoot("/tmp/project", "/tmp/project/src/file.ts"),
    ).toBe(true);
  });

  it("allows an existing in-root file and a non-existing file in a safe directory", async () => {
    const sandbox = await mkdtemp(join(tmpdir(), "neutron-contain-"));
    const root = join(sandbox, "project");
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src", "file.ts"), "export {};\n");
    const existing = await assertNeutronMutationPathContained(
      await realpath(root),
      "src/file.ts",
      nodePathFs(),
    );
    const missing = await assertNeutronMutationPathContained(
      await realpath(root),
      "src/new.ts",
      nodePathFs(),
    );
    expect(existing).toBe(true);
    expect(missing).toBe(true);
    const outcome = await preflightAt(root, ["src/file.ts", "src/new.ts"]);
    expect(outcome.result.decision).toBe("eligible");
  });

  it("rejects traversal, absolute paths, and symlink escape", async () => {
    const sandbox = await mkdtemp(join(tmpdir(), "neutron-escape-"));
    const root = join(sandbox, "project");
    const outside = join(sandbox, "outside");
    await mkdir(join(root, "src"), { recursive: true });
    await mkdir(outside);
    await writeFile(join(outside, "secret.ts"), "secret\n");
    await symlink(outside, join(root, "link"), "dir");
    const canonicalRoot = await realpath(root);
    expect(
      await assertNeutronMutationPathContained(
        canonicalRoot,
        "../outside.ts",
        nodePathFs(),
      ),
    ).toBe(false);
    expect(
      await assertNeutronMutationPathContained(
        canonicalRoot,
        "/etc/passwd",
        nodePathFs(),
      ),
    ).toBe(false);
    expect(
      await assertNeutronMutationPathContained(
        canonicalRoot,
        "link/secret.ts",
        nodePathFs(),
      ),
    ).toBe(false);
    const escaped = await preflightAt(root, ["link/secret.ts"]);
    expect(escaped.result.reasons).toEqual(["affected-path-mismatch"]);
  });

  it("rejects a nested symlink that escapes the project root", async () => {
    const sandbox = await mkdtemp(join(tmpdir(), "neutron-nested-"));
    const root = join(sandbox, "project");
    const outside = join(sandbox, "outside");
    await mkdir(join(root, "src", "nested"), { recursive: true });
    await mkdir(outside);
    await writeFile(join(outside, "file.ts"), "escaped\n");
    await symlink(outside, join(root, "src", "nested", "link"), "dir");
    const escaped = await preflightAt(root, ["src/nested/link/file.ts"]);
    expect(escaped.result.reasons).toEqual(["affected-path-mismatch"]);
  });

  it("fails closed when realpath cannot establish safety", async () => {
    const request = loadRequest();
    const failing: NeutronMutationPathFilesystem = {
      async exists() {
        return true;
      },
      async realpath() {
        throw new Error("EPERM");
      },
    };
    const outcome = await preflightNeutronMutation({
      request,
      authorization: {
        kind: "host",
        mutationClass: NEUTRON_MUTATION_CLASS,
      },
      fs: failing,
      now: () => 1_750_000_000_000,
    });
    expect(outcome.result.decision).toBe("rejected");
    expect(outcome.result.reasons).toEqual(["root-mismatch"]);
  });
});
