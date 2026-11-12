import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createMemoryFileSystem,
  evaluateProposalAgainstSandbox,
  reviewWorkspaceProposal,
  runContinuousSecurityAudit,
  writeSandboxCapabilityPolicy,
  type SandboxCapabilityPolicy,
  type SandboxEvaluationResult,
} from "@intentloom/application";
import { validateSandboxEvaluationResult } from "@intentloom/protocol";
import { measureProductionSource } from "../scripts/production-file-metrics.mjs";
import {
  applicationCycles,
  relativeSpecifiers,
} from "./application-source-cycles.js";

const root = "/project";
const readOnlyMessage =
  "Sandbox policy is in read-only mode: all mutation proposals are rejected";

const newModules = [
  "security/sandbox-capability-policy.ts",
  "security/sandbox-proposal-evaluation.ts",
] as const;

const outsideComponents = [
  "host-file-system.ts",
  "project-path.ts",
  ...newModules,
  "security/security-policy.ts",
  "security/security-baseline.ts",
  "security/security-policy-evaluation.ts",
  "security/security-finding-store.ts",
  "security/sarif-security-import.ts",
  "security/security-coverage.ts",
  "agent-session/agent-session.ts",
  "memory/persistent-memory-store.ts",
  "memory/persistent-memory-lifecycle.ts",
  "memory/persistent-memory-retrieval.ts",
  "skills/skill-progressive-parse.ts",
  "skills/skill-discovery.ts",
  "skills/skill-proposal-store.ts",
  "skills/skill-evaluation.ts",
  "skills/skill-mutation.ts",
  "skills/skill-procedural-memory.ts",
];

type LooseProposal = {
  actions?:
    | readonly {
        type?: string;
        path?: string;
        command?: string;
        networkAccess?: boolean;
      }[]
    | null;
  changes?: readonly { type?: string; path?: string }[];
};

function policy(
  overrides: Record<string, unknown> = {},
): SandboxCapabilityPolicy {
  return {
    schemaVersion: "1",
    projectId: "stored-project",
    mode: "proposal-only",
    pathRules: [{ pathPrefix: "src/", allowWrite: true, allowDelete: false }],
    commandRules: [
      { commandPrefix: "pnpm test" },
      { commandPrefix: "pnpm lint" },
      { commandPrefix: "git diff" },
    ],
    allowNetwork: false,
    updatedAt: "2026-02-02T00:00:00.000Z",
    ...overrides,
  } as SandboxCapabilityPolicy;
}

async function evaluate(
  proposal: LooseProposal,
  fs = createMemoryFileSystem(),
  projectId = "caller-project",
): Promise<SandboxEvaluationResult> {
  return evaluateProposalAgainstSandbox(
    proposal as Parameters<typeof evaluateProposalAgainstSandbox>[0],
    { root, projectId },
    fs,
  );
}

describe("P1H.5b sandbox proposal evaluation", () => {
  it("keeps read-only as the first violation and treats the other modes the same", async () => {
    const fs = createMemoryFileSystem();
    await writeSandboxCapabilityPolicy(
      policy({ mode: "read-only" }),
      { root },
      fs,
    );
    const readOnly = await evaluate(
      {
        actions: [
          {
            type: "write",
            path: "secret/key",
            command: "curl https://example.test",
            networkAccess: true,
          },
        ],
      },
      fs,
    );
    expect(readOnly.allowed).toBe(false);
    expect(readOnly.violations).toEqual([
      readOnlyMessage,
      "Path 'secret/key' is outside allowed sandbox path rules",
      "Command 'curl https://example.test' is not in allowed sandbox command rules",
      "Action requires network access, which is disabled by sandbox policy (allowNetwork: false)",
    ]);

    for (const mode of ["proposal-only", "mutating"] as const) {
      const modeFs = createMemoryFileSystem();
      await writeSandboxCapabilityPolicy(policy({ mode }), { root }, modeFs);
      const result = await evaluate(
        { actions: [{ type: "write", path: "src/app.ts" }] },
        modeFs,
      );
      expect(result.violations).toEqual([]);
      expect(result.allowed).toBe(true);
      expect(result.violations.join("\n")).not.toContain("read-only");
    }
  });

  it("lets actions override changes, including an empty actions array", async () => {
    const hidden = await evaluate({
      actions: [{ type: "write", path: "src/app.ts" }],
      changes: [{ type: "write", path: "/etc/passwd" }],
    });
    expect(hidden.allowed).toBe(true);
    expect(hidden.violations).toEqual([]);

    const emptyWins = await evaluate({
      actions: [],
      changes: [{ type: "write", path: "/etc/passwd" }],
    });
    expect(emptyWins.allowed).toBe(true);
    expect(emptyWins.violations).toEqual([]);

    const changesOnly = await evaluate({
      changes: [{ type: "delete", path: "src/app.ts" }],
    });
    expect(changesOnly.violations).toEqual([
      "Delete operation on path 'src/app.ts' violates sandbox policy (allowDelete: false)",
    ]);

    const nullActions = await evaluate({
      actions: null,
      changes: [{ type: "write", path: "outside.txt" }],
    });
    expect(nullActions.violations).toEqual([
      "Path 'outside.txt' is outside allowed sandbox path rules",
    ]);
  });

  it("preserves path prefix matching, wildcard priority, and the exact messages", async () => {
    const normalized = await evaluate({
      actions: [{ type: "write", path: "src\\app.ts" }],
    });
    expect(normalized.allowed).toBe(true);
    expect(normalized.violations).toEqual([]);

    const outside = await evaluate({
      actions: [{ path: "SRC/app.ts" }, { type: "", path: "notes\\readme.md" }],
    });
    expect(outside.violations).toEqual([
      "Path 'SRC/app.ts' is outside allowed sandbox path rules",
      "Path 'notes/readme.md' is outside allowed sandbox path rules",
    ]);
    expect(outside.allowed).toBe(false);

    const fs = createMemoryFileSystem();
    await writeSandboxCapabilityPolicy(
      policy({
        pathRules: [
          { pathPrefix: "src/lib/", allowWrite: false, allowDelete: true },
          { pathPrefix: "src/", allowWrite: true, allowDelete: false },
          { pathPrefix: "*", allowWrite: false, allowDelete: false },
        ],
      }),
      { root },
      fs,
    );
    const priority = await evaluate(
      {
        actions: [
          { type: "write", path: "src/lib/a.ts" },
          { type: "remove", path: "src/lib/a.ts" },
          { type: "delete", path: "src/app.ts" },
          { type: "write", path: "other/file.ts" },
        ],
      },
      fs,
    );
    expect(priority.violations).toEqual([
      "Write operation on path 'src/lib/a.ts' violates sandbox policy (allowWrite: false)",
      "Delete operation on path 'src/app.ts' violates sandbox policy (allowDelete: false)",
      "Write operation on path 'other/file.ts' violates sandbox policy (allowWrite: false)",
    ]);

    const starFs = createMemoryFileSystem();
    await writeSandboxCapabilityPolicy(
      policy({
        pathRules: [
          { pathPrefix: "*", allowWrite: false, allowDelete: false },
          { pathPrefix: "src/", allowWrite: true, allowDelete: true },
        ],
      }),
      { root },
      starFs,
    );
    const starFirst = await evaluate(
      { actions: [{ type: "write", path: "src/app.ts" }] },
      starFs,
    );
    expect(starFirst.violations).toEqual([
      "Write operation on path 'src/app.ts' violates sandbox policy (allowWrite: false)",
    ]);
  });

  it("locks unsafe prefix matches as inherited behavior", async () => {
    // Preserved limitation: matching is a string prefix. It is not
    // path.resolve, a component boundary, or traversal detection.
    const traversalLooking = await evaluate({
      actions: [
        { type: "write", path: "src/../secret" },
        { type: "write", path: "./src/app.ts" },
      ],
    });
    expect(traversalLooking.violations).toEqual([
      "Path './src/app.ts' is outside allowed sandbox path rules",
    ]);

    // Preserved limitation: command matching is a string prefix. It
    // does not parse a shell, tokenize arguments, or read allowArgs.
    const fs = createMemoryFileSystem();
    await writeSandboxCapabilityPolicy(
      policy({
        commandRules: [
          { commandPrefix: "pnpm test", allowArgs: ["--only"] },
          { commandPrefix: "git diff" },
        ],
      }),
      { root },
      fs,
    );
    const prefixed = await evaluate(
      {
        actions: [
          { type: "run", command: "pnpm test; rm -rf /" },
          { type: "run", command: "pnpm testing" },
          { type: "run", command: "git difftool" },
          { type: "run", command: "npm test" },
        ],
      },
      fs,
    );
    expect(prefixed.violations).toEqual([
      "Command 'npm test' is not in allowed sandbox command rules",
    ]);

    const wildFs = createMemoryFileSystem();
    await writeSandboxCapabilityPolicy(
      policy({ commandRules: [{ commandPrefix: "*" }] }),
      { root },
      wildFs,
    );
    const wildcard = await evaluate(
      { actions: [{ type: "run", command: "curl https://example.test" }] },
      wildFs,
    );
    expect(wildcard.allowed).toBe(true);
  });

  it("adds a network violation only when networkAccess is true and the policy denies it", async () => {
    const denied = await evaluate({
      actions: [
        { type: "run", command: "pnpm test", networkAccess: true },
        { type: "run", command: "pnpm test", networkAccess: false },
        { type: "run", command: "curl https://example.test" },
      ],
    });
    expect(denied.violations).toEqual([
      "Action requires network access, which is disabled by sandbox policy (allowNetwork: false)",
      "Command 'curl https://example.test' is not in allowed sandbox command rules",
    ]);

    const fs = createMemoryFileSystem();
    await writeSandboxCapabilityPolicy(
      policy({ allowNetwork: true }),
      { root },
      fs,
    );
    const allowed = await evaluate(
      { actions: [{ type: "run", command: "pnpm test", networkAccess: true }] },
      fs,
    );
    expect(allowed.violations).toEqual([]);
    expect(allowed.allowed).toBe(true);
  });

  it("returns a validated result whose allowed flag follows the violation list", async () => {
    const result = await evaluate({
      actions: [{ type: "write", path: "src/app.ts" }],
    });
    expect(result.schemaVersion).toBe("1");
    expect(result.projectId).toBe("caller-project");
    expect(result.allowed).toBe(result.violations.length === 0);
    expect(result.evaluatedAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
    expect(validateSandboxEvaluationResult(result)).toEqual(result);

    const fs = createMemoryFileSystem();
    await writeSandboxCapabilityPolicy(policy(), { root }, fs);
    const callerId = await evaluate(
      { actions: [{ type: "write", path: "missing.txt" }] },
      fs,
      "caller-project",
    );
    expect(callerId.projectId).toBe("caller-project");
    expect(callerId.allowed).toBe(false);
    expect(callerId.allowed).toBe(callerId.violations.length === 0);
  });

  it("still feeds sandbox evaluation into workspace review and sandbox policy into continuous audit", async () => {
    const reviewFs = createMemoryFileSystem();
    const proposalId = "prop-sandbox";
    await reviewFs.write(
      resolve(root, `.aif/proposals/${proposalId}.json`),
      `${JSON.stringify({ items: [{ path: "notes/readme.md" }] })}\n`,
    );
    const deniedReview = await reviewWorkspaceProposal(
      { root, proposalId },
      reviewFs,
    );
    expect(deniedReview.sandboxEvaluation.projectId).toBe(proposalId);
    expect(deniedReview.sandboxEvaluation.violations).toEqual([
      "Path 'notes/readme.md' is outside allowed sandbox path rules",
    ]);
    expect(deniedReview.readyToApply).toBe(
      deniedReview.sandboxEvaluation.allowed,
    );
    expect(deniedReview.readyToApply).toBe(false);

    await reviewFs.write(
      resolve(root, `.aif/proposals/${proposalId}.json`),
      `${JSON.stringify({ items: [{ path: "src/app.ts" }] })}\n`,
    );
    const allowedReview = await reviewWorkspaceProposal(
      { root, proposalId },
      reviewFs,
    );
    expect(allowedReview.sandboxEvaluation.violations).toEqual([]);
    expect(allowedReview.readyToApply).toBe(true);

    const auditFs = createMemoryFileSystem();
    const defaultAudit = await runContinuousSecurityAudit(
      { root, projectId: "audit-project" },
      auditFs,
    );
    const network = defaultAudit.invariantChecks.find(
      (check) => check.invariantId === 1,
    );
    const sandbox = defaultAudit.invariantChecks.find(
      (check) => check.invariantId === 28,
    );
    expect(network).toMatchObject({
      status: "passed",
      details: "Network access disabled by default in sandbox policy",
    });
    expect(sandbox).toMatchObject({
      status: "passed",
      details: "Sandbox active (mode: proposal-only, pathRules: 2)",
    });

    await writeSandboxCapabilityPolicy(
      policy({ mode: "read-only", allowNetwork: true, pathRules: [] }),
      { root },
      auditFs,
    );
    const customAudit = await runContinuousSecurityAudit(
      { root, projectId: "audit-project" },
      auditFs,
    );
    expect(
      customAudit.invariantChecks.find((check) => check.invariantId === 1),
    ).toMatchObject({
      status: "warning",
      details: "Network access is enabled in sandbox policy",
    });
    expect(
      customAudit.invariantChecks.find((check) => check.invariantId === 28),
    ).toMatchObject({
      status: "warning",
      details: "Sandbox active (mode: read-only, pathRules: 0)",
    });
  });

  it("keeps the sandbox modules outside every source cycle and within the file budget", () => {
    const importComponents = applicationCycles(false);
    const reexportComponents = applicationCycles(true);
    expect(importComponents.map((component) => component.length)).toEqual([3]);
    expect(reexportComponents.map((component) => component.length)).toEqual([
      4, 27, 3,
    ]);
    expect(importComponents).toEqual([
      [
        "neutron/mutation/apply/neutron-mutation-apply-durable-record.ts",
        "neutron/mutation/apply/neutron-mutation-apply-store.ts",
        "neutron/mutation/verification/neutron-mutation-verification-retry-eligibility.ts",
      ],
    ]);
    expect(reexportComponents[0]).toEqual([
      "apply-extension-update.ts",
      "discover-and-apply-extension-update.ts",
      "extension-update-files.ts",
      "propose-and-apply-extension-adoption.ts",
    ]);
    expect(reexportComponents[1]).toEqual([
      "approved-apply-engine.ts",
      "bounded-execution-apply.ts",
      "bounded-execution-w11.ts",
      "bounded-execution-workspace-cli.ts",
      "bounded-execution-workspace.ts",
      "engineering-quality-entry.ts",
      "engineering-quality/cli-specialized-packs-external.ts",
      "engineering-quality/index.ts",
      "engineering-quality/specialized-pack-external-apply.ts",
      "engineering-quality/specialized-pack-external-viewmodel.ts",
      "existing-project-adoption-apply-gates.ts",
      "existing-project-adoption-apply-health.ts",
      "existing-project-adoption-apply.ts",
      "existing-project-adoption-approval.ts",
      "existing-project-adoption-decisions.ts",
      "existing-project-adoption-plan.ts",
      "existing-project-adoption-prepared-plan-revalidate.ts",
      "existing-project-adoption-prepared-plan.ts",
      "existing-project-w9.ts",
      "existing-project-workspace-cli.ts",
      "existing-project-workspace.ts",
      "foundation-flow.ts",
      "harness/harness-benchmark-sample.ts",
      "harness/harness-benchmark.ts",
      "harness/harness.ts",
      "inception-flow.ts",
      "index.ts",
    ]);

    expect(reexportComponents[1]).toContain("index.ts");
    expect(reexportComponents[2]).toEqual(importComponents[0]);
    const members = new Set(
      [...importComponents, ...reexportComponents].flat(),
    );
    for (const file of outsideComponents) {
      expect(members.has(file)).toBe(false);
    }

    for (const file of newModules) {
      const specs = relativeSpecifiers(file, true);
      expect(specs).not.toContain("../index.js");
      expect(specs.join("\n")).not.toMatch(
        /security-policy|security-baseline|security-finding-store|sarif-security-import/,
      );
      expect(specs.join("\n")).not.toMatch(
        /@intentloom\/(cli|daemon|mcp)|apps\/desktop/,
      );
    }
    expect(
      relativeSpecifiers("security/sandbox-capability-policy.ts", true),
    ).toEqual([
      "node:path",
      "@intentloom/protocol",
      "../host-file-system.js",
      "../project-path.js",
    ]);
    expect(
      relativeSpecifiers("security/sandbox-proposal-evaluation.ts", true),
    ).toEqual([
      "@intentloom/protocol",
      "../host-file-system.js",
      "./sandbox-capability-policy.js",
    ]);
    const indexValueImports = relativeSpecifiers("index.ts", false);
    expect(indexValueImports).toContain(
      "./security/sandbox-proposal-evaluation.js",
    );
    expect(indexValueImports).not.toContain(
      "./security/sandbox-capability-policy.js",
    );
    expect(relativeSpecifiers("index.ts", true)).toContain(
      "./security/sandbox-capability-policy.js",
    );
    const evaluationSource = readFileSync(
      "packages/application/src/security/sandbox-proposal-evaluation.ts",
      "utf8",
    );
    expect(evaluationSource).not.toContain("path.resolve");
    expect(evaluationSource).not.toContain("realpath");
    expect(evaluationSource).not.toContain("allowArgs");

    const indexMetrics = measureProductionSource(
      readFileSync("packages/application/src/index.ts", "utf8"),
      "packages/application/src/index.ts",
    );
    expect(indexMetrics.effectiveCodeLines).toBeLessThan(4833);
    expect(indexMetrics.physicalLines).toBeLessThan(5064);
    expect(
      measureProductionSource(
        readFileSync(
          "packages/application/src/security/sandbox-capability-policy.ts",
          "utf8",
        ),
        "packages/application/src/security/sandbox-capability-policy.ts",
      ),
    ).toMatchObject({ effectiveCodeLines: 52, physicalLines: 56 });
    expect(
      measureProductionSource(
        evaluationSource,
        "packages/application/src/security/sandbox-proposal-evaluation.ts",
      ),
    ).toMatchObject({ effectiveCodeLines: 84, physicalLines: 92 });
    const functionSource = evaluationSource.slice(
      evaluationSource.indexOf(
        "export async function evaluateProposalAgainstSandbox",
      ),
    );
    expect(
      measureProductionSource(
        functionSource,
        "packages/application/src/security/sandbox-proposal-evaluation.ts",
      ).effectiveCodeLines,
    ).toBe(78);
    for (const file of newModules) {
      const metrics = measureProductionSource(
        readFileSync(`packages/application/src/${file}`, "utf8"),
        `packages/application/src/${file}`,
      );
      expect(metrics.effectiveCodeLines).toBeLessThanOrEqual(250);
      expect(metrics.physicalLines).toBeLessThanOrEqual(700);
    }
  });
});
