import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createMemoryFileSystem,
  getSandboxCapabilityPolicy,
  writeSandboxCapabilityPolicy,
  evaluateProposalAgainstSandbox,
} from "@intentloom/application";
import { runCli } from "../packages/cli/src/command.js";
import {
  validateSandboxCapabilityPolicy,
  validateSandboxEvaluationResult,
} from "@intentloom/protocol";

describe("Memory & Security Candidate S4", () => {
  it("validates protocol schemas for sandbox capability policies and evaluation results", () => {
    const policy = validateSandboxCapabilityPolicy({
      schemaVersion: "1",
      projectId: "proj-sbx",
      mode: "mutating",
      pathRules: [{ pathPrefix: "src/", allowWrite: true, allowDelete: false }],
      commandRules: [{ commandPrefix: "pnpm test" }],
      allowNetwork: false,
      updatedAt: new Date().toISOString(),
    });

    expect(policy.projectId).toBe("proj-sbx");
    expect(policy.mode).toBe("mutating");
    expect(policy.pathRules[0]?.allowWrite).toBe(true);

    const result = validateSandboxEvaluationResult({
      schemaVersion: "1",
      projectId: "proj-sbx",
      allowed: false,
      violations: ["Path 'secret.key' is outside allowed sandbox path rules"],
      evaluatedAt: new Date().toISOString(),
    });

    expect(result.allowed).toBe(false);
    expect(result.violations).toHaveLength(1);
  });

  it("manages default reading and custom writing of sandbox capability policies", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project";

    const defaultPolicy = await getSandboxCapabilityPolicy({ root }, fs);
    expect(defaultPolicy.mode).toBe("proposal-only");
    expect(defaultPolicy.allowNetwork).toBe(false);

    const customPolicy = validateSandboxCapabilityPolicy({
      schemaVersion: "1",
      projectId: "proj-custom",
      mode: "read-only",
      pathRules: [{ pathPrefix: "lib/", allowWrite: true, allowDelete: true }],
      commandRules: [{ commandPrefix: "git status" }],
      allowNetwork: true,
      updatedAt: new Date().toISOString(),
    });

    await writeSandboxCapabilityPolicy(customPolicy, { root }, fs);

    const reloaded = await getSandboxCapabilityPolicy({ root }, fs);
    expect(reloaded.mode).toBe("read-only");
    expect(reloaded.allowNetwork).toBe(true);
  });

  it("evaluates agent proposals against sandbox capability policies", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project";

    // In proposal-only mode, src/ is allowed for write, outside paths are blocked
    const validProposal = {
      actions: [
        { type: "write", path: "src/app.ts" },
        { type: "run", command: "pnpm test" },
      ],
    };
    const eval1 = await evaluateProposalAgainstSandbox(
      validProposal,
      { root, projectId: "p1" },
      fs,
    );
    expect(eval1.allowed).toBe(true);
    expect(eval1.violations).toHaveLength(0);

    const invalidProposal = {
      actions: [
        { type: "write", path: "/etc/passwd" },
        { type: "delete", path: "src/app.ts" },
        { type: "run", command: "curl https://malicious.site" },
        { type: "run", command: "pnpm test", networkAccess: true },
      ],
    };
    const eval2 = await evaluateProposalAgainstSandbox(
      invalidProposal,
      { root, projectId: "p1" },
      fs,
    );
    expect(eval2.allowed).toBe(false);
    expect(eval2.violations.length).toBeGreaterThanOrEqual(3);
  });

  it("rejects all mutations in read-only sandbox mode", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project";

    const readOnlyPolicy = validateSandboxCapabilityPolicy({
      schemaVersion: "1",
      projectId: "p1",
      mode: "read-only",
      pathRules: [{ pathPrefix: "src/", allowWrite: true, allowDelete: true }],
      commandRules: [],
      allowNetwork: false,
      updatedAt: new Date().toISOString(),
    });
    await writeSandboxCapabilityPolicy(readOnlyPolicy, { root }, fs);

    const proposal = {
      actions: [{ type: "write", path: "src/app.ts" }],
    };
    const evalResult = await evaluateProposalAgainstSandbox(
      proposal,
      { root, projectId: "p1" },
      fs,
    );
    expect(evalResult.allowed).toBe(false);
    expect(evalResult.violations[0]).toContain("read-only mode");
  });

  it("routes sandbox policy and validate subcommands through CLI", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project";
    const dependencies = { catalogRoot: resolve("catalog"), fileSystem: fs };

    let output = "";
    const stdout = (msg: string) => {
      output += `${msg}\n`;
    };

    const policyExit = await runCli(
      ["security", "sandbox", "policy", "--root", root, "--json"],
      dependencies,
      { stdout, stderr: () => undefined },
    );
    expect(policyExit).toBe(0);
    const parsedPolicy = JSON.parse(output);
    expect(parsedPolicy.mode).toBe("proposal-only");

    output = "";
    const evalExit = await runCli(
      [
        "security",
        "sandbox",
        "validate",
        "--path",
        "src/index.ts",
        "--root",
        root,
        "--json",
      ],
      dependencies,
      { stdout, stderr: () => undefined },
    );
    expect(evalExit).toBe(0);
    const parsedEval = JSON.parse(output);
    expect(parsedEval.allowed).toBe(true);
  });
});
