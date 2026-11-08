import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import * as application from "@intentloom/application";
import {
  checkSecurityPolicyAndBaseline,
  createMemoryFileSystem,
  getSecurityBaseline,
  getSecurityPolicy,
  listSecurityFindings,
  runContinuousSecurityAudit,
  updateSecurityBaseline,
  writeSecurityPolicy,
  type FileSystem,
  type SecurityPolicy,
} from "@intentloom/application";
import { runCli } from "../packages/cli/src/command.js";
import { measureProductionSource } from "../scripts/production-file-metrics.mjs";
import {
  applicationCycles,
  relativeSpecifiers,
} from "./application-source-cycles.js";

const root = "/project";
const catalogRoot = resolve("catalog");
const policyPath = resolve(root, ".aif/security/policy.json");
const baselinePath = resolve(root, ".aif/security/baseline.json");

const publicNames = [
  "getSecurityPolicy",
  "writeSecurityPolicy",
  "getSecurityBaseline",
  "updateSecurityBaseline",
  "checkSecurityPolicyAndBaseline",
] as const;

const applicationExportKeys = [
  ".",
  "./model-adapter",
  "./ollama-model-adapter",
  "./neutron-runtime",
  "./neutron-n2",
  "./neutron-context-assembly",
  "./neutron-n4",
  "./neutron-scheduler",
  "./neutron-graph-mutation",
  "./neutron-session",
  "./engineering-assessment",
  "./engineering-quality",
];

const newModules = [
  "security/security-policy.ts",
  "security/security-baseline.ts",
  "security/security-policy-evaluation.ts",
] as const;

const outsideComponents = [
  "host-file-system.ts",
  "project-path.ts",
  ...newModules,
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

function findingRecord(
  id: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    schemaVersion: "1",
    id,
    ruleId: "rule/example",
    title: "Example finding",
    severity: "medium",
    state: "open",
    category: "vulnerability",
    description: "Example description",
    scanner: "example-scanner",
    evidence: [{ path: "src/example.ts" }],
    trustClass: "verified-evidence",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function findingPath(id: string): string {
  return resolve(root, `.aif/security/findings/${id}.json`);
}

async function seedFinding(
  fs: ReturnType<typeof createMemoryFileSystem>,
  id: string,
  overrides: Record<string, unknown> = {},
): Promise<void> {
  await fs.write(
    findingPath(id),
    `${JSON.stringify(findingRecord(id, overrides), null, 2)}\n`,
  );
}

function storedPolicy(overrides: Record<string, unknown> = {}): SecurityPolicy {
  return {
    schemaVersion: "1",
    projectId: "stored-project",
    defaultEnforcement: "ignore",
    rules: [{ target: "custom-rule", enforcement: "warn" }],
    updatedAt: "2026-02-02T00:00:00.000Z",
    ...overrides,
  } as SecurityPolicy;
}

function countingFileSystem(
  fs: FileSystem,
): FileSystem & { mkdirCalls: number } {
  let mkdirCalls = 0;
  return {
    ...fs,
    get mkdirCalls() {
      return mkdirCalls;
    },
    async exists(path) {
      if (mkdirCalls > 0 && path === dirname(policyPath)) return true;
      return fs.exists(path);
    },
    async mkdir(path) {
      mkdirCalls += 1;
      await fs.mkdir(path);
    },
  };
}

describe("P1H.5a security policy, baseline, and evaluation", () => {
  it("keeps the five operations on the package root and leaves the export map unchanged", () => {
    for (const name of publicNames) {
      expect(typeof application[name]).toBe("function");
    }
    expect(application).not.toHaveProperty("securityPolicyPath");
    expect(application).not.toHaveProperty("securityBaselinePath");
    expect(existsSync("packages/application/src/security/index.ts")).toBe(
      false,
    );
    const packageJson = JSON.parse(
      readFileSync("packages/application/package.json", "utf8"),
    ) as { exports: Record<string, string> };
    expect(Object.keys(packageJson.exports)).toEqual(applicationExportKeys);
    expect(packageJson.exports).not.toHaveProperty("./security");
    const exceptions = readFileSync(
      "docs/governance/quality-exceptions.json",
      "utf8",
    );
    expect(exceptions).not.toContain("security-policy.ts");
    expect(exceptions).not.toContain("security-baseline.ts");
    expect(exceptions).not.toContain("security-policy-evaluation.ts");
    const indexSource = readFileSync(
      "packages/application/src/index.ts",
      "utf8",
    );
    expect(indexSource).toContain(
      'import { securityFindingPath } from "./security/security-finding-store.js"',
    );
    expect(indexSource).not.toMatch(
      /import\s*\{[^}]*\blistSecurityFindings\b[^}]*\}\s*from\s*"\.\/security\/security-finding-store\.js"/,
    );
    expect(indexSource).toContain(
      'import { getSecurityPolicy } from "./security/security-policy.js"',
    );
    expect(indexSource).toContain(
      'import { getSecurityBaseline } from "./security/security-baseline.js"',
    );
    expect(indexSource).toContain(
      'import { checkSecurityPolicyAndBaseline } from "./security/security-policy-evaluation.js"',
    );
  });

  it("falls back to the default policy and preserves a validated write", async () => {
    const fs = createMemoryFileSystem();
    const started = Date.now();
    const missing = await getSecurityPolicy({ root }, fs);
    const finished = Date.now();
    expect(missing.projectId).toBe("project-local");
    expect(missing.defaultEnforcement).toBe("warn");
    expect(
      missing.rules.map((rule) => [rule.target, rule.enforcement]),
    ).toEqual([
      ["critical", "fail"],
      ["high", "fail"],
      ["medium", "warn"],
      ["low", "ignore"],
    ]);
    expect(Date.parse(missing.updatedAt)).toBeGreaterThanOrEqual(started);
    expect(Date.parse(missing.updatedAt)).toBeLessThanOrEqual(finished);

    const named = await getSecurityPolicy({ root, projectId: "caller" }, fs);
    expect(named.projectId).toBe("caller");

    await fs.write(policyPath, "{");
    expect((await getSecurityPolicy({ root }, fs)).projectId).toBe(
      "project-local",
    );
    await fs.write(policyPath, JSON.stringify({ schemaVersion: "2" }));
    expect((await getSecurityPolicy({ root }, fs)).defaultEnforcement).toBe(
      "warn",
    );

    const counting = countingFileSystem(fs);
    const written = await writeSecurityPolicy(
      storedPolicy(),
      { root },
      counting,
    );
    expect(counting.mkdirCalls).toBe(1);
    const raw = await fs.read(policyPath);
    expect(raw).toBe(`${JSON.stringify(written, null, 2)}\n`);
    expect(written.updatedAt).toBe("2026-02-02T00:00:00.000Z");
    const reread = await getSecurityPolicy(
      { root, projectId: "ignored-on-read" },
      fs,
    );
    expect(reread).toEqual(written);

    const again = await writeSecurityPolicy(storedPolicy(), { root }, counting);
    expect(counting.mkdirCalls).toBe(1);
    expect(again.projectId).toBe("stored-project");

    await expect(
      writeSecurityPolicy(
        { schemaVersion: "2" } as SecurityPolicy,
        { root },
        fs,
      ),
    ).rejects.toThrow("unsupported security policy schema version");
    expect(await fs.read(policyPath)).toBe(raw);

    const tempRoot = await mkdtemp(resolve(tmpdir(), "intentloom-p1h5a-"));
    try {
      const diskPolicy = await getSecurityPolicy({ root: tempRoot });
      expect(diskPolicy.projectId).toBe("project-local");
      expect(diskPolicy.rules[0]).toEqual({
        target: "critical",
        enforcement: "fail",
      });
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("returns null for a bad baseline and hashes every finding state", async () => {
    const fs = createMemoryFileSystem();
    expect(await getSecurityBaseline({ root }, fs)).toBeNull();
    await fs.write(baselinePath, "{");
    expect(await getSecurityBaseline({ root }, fs)).toBeNull();
    await fs.write(baselinePath, JSON.stringify({ schemaVersion: "2" }));
    expect(await getSecurityBaseline({ root }, fs)).toBeNull();
    await fs.write(
      baselinePath,
      JSON.stringify({
        schemaVersion: "1",
        projectId: "old",
        acceptedFindings: [findingRecord("old")],
        baselineHash: "old-hash",
        createdAt: "2020-01-01T00:00:00.000Z",
        updatedAt: "2020-01-01T00:00:00.000Z",
      }),
    );

    await seedFinding(fs, "b-open", { state: "open", severity: "low" });
    await seedFinding(fs, "a-verified", {
      state: "verified",
      severity: "info",
    });
    await seedFinding(fs, "c-dismissed", {
      state: "dismissed",
      severity: "critical",
      dismissalReason: "noise",
    });
    await seedFinding(fs, "d-risk", {
      state: "accepted-risk",
      severity: "high",
      acceptedRisk: {
        approvedBy: "maintainer",
        reason: "known",
        approvedAt: "2026-01-01T00:00:00.000Z",
      },
    });
    await seedFinding(fs, "e-remediated", {
      state: "remediated",
      severity: "medium",
    });

    const started = Date.now();
    const baseline = await updateSecurityBaseline(
      { root, projectId: "project-baseline" },
      fs,
    );
    const finished = Date.now();
    const listed = await listSecurityFindings({ root }, fs);
    const sorted = [...listed].sort((a, b) => a.id.localeCompare(b.id));
    expect(baseline.schemaVersion).toBe("1");
    expect(baseline.projectId).toBe("project-baseline");
    expect(baseline.acceptedFindings).toEqual(sorted);
    expect(baseline.baselineHash).toBe(
      createHash("sha256").update(JSON.stringify(sorted)).digest("hex"),
    );
    expect(baseline.createdAt).toBe(baseline.updatedAt);
    expect(baseline.createdAt).not.toBe("2020-01-01T00:00:00.000Z");
    expect(Date.parse(baseline.createdAt)).toBeGreaterThanOrEqual(started);
    expect(Date.parse(baseline.createdAt)).toBeLessThanOrEqual(finished);
    expect(baseline.acceptedFindings.map((finding) => finding.state)).toEqual([
      "verified",
      "open",
      "dismissed",
      "accepted-risk",
      "remediated",
    ]);
    expect(await fs.read(baselinePath)).toBe(
      `${JSON.stringify(baseline, null, 2)}\n`,
    );

    const tempRoot = await mkdtemp(resolve(tmpdir(), "intentloom-p1h5a-"));
    try {
      expect(await getSecurityBaseline({ root: tempRoot })).toBeNull();
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("compares findings by id and keeps the first matching rule", async () => {
    const fs = createMemoryFileSystem();
    await seedFinding(fs, "keep", { title: "changed", severity: "low" });
    await seedFinding(fs, "fresh", { severity: "info", state: "open" });
    const listed = await listSecurityFindings({ root }, fs);
    const currentKeep = listed.find((finding) => finding.id === "keep");
    expect(currentKeep).toBeDefined();
    await fs.write(
      baselinePath,
      JSON.stringify({
        schemaVersion: "1",
        projectId: "stored-project",
        acceptedFindings: [
          { ...currentKeep, title: "original", severity: "medium" },
          findingRecord("gone", { severity: "high", state: "open" }),
          findingRecord("dup", { title: "first" }),
          findingRecord("dup", { title: "second" }),
        ],
        baselineHash: "not-checked",
        createdAt: "2020-01-01T00:00:00.000Z",
        updatedAt: "2020-01-01T00:00:00.000Z",
      }),
    );

    const compared = await checkSecurityPolicyAndBaseline(
      { root, projectId: "caller-project" },
      fs,
    );
    expect(compared.projectId).toBe("caller-project");
    expect(compared.newFindings.map((finding) => finding.id)).toEqual([
      "fresh",
    ]);
    expect(compared.resolvedFindings.map((finding) => finding.id)).toEqual([
      "gone",
      "dup",
      "dup",
    ]);
    expect(compared.resolvedFindings.map((finding) => finding.title)).toEqual([
      "Example finding",
      "first",
      "second",
    ]);
    expect(compared.newFindings.some((finding) => finding.id === "keep")).toBe(
      false,
    );
    expect(
      compared.resolvedFindings.some((finding) => finding.id === "keep"),
    ).toBe(false);
    expect(compared.policyViolations).toEqual([]);
    expect(compared.exitCode).toBe(0);
    expect(Number.isNaN(Date.parse(compared.checkedAt))).toBe(false);

    const bare = createMemoryFileSystem();
    await seedFinding(bare, "crit", { severity: "critical", state: "open" });
    await seedFinding(bare, "info", { id: "info", severity: "info" });
    const defaults = await checkSecurityPolicyAndBaseline(
      { root, projectId: "caller-project" },
      bare,
    );
    expect(defaults.newFindings.map((finding) => finding.id)).toEqual([
      "crit",
      "info",
    ]);
    expect(defaults.resolvedFindings).toEqual([]);
    expect(defaults.policyViolations.map((finding) => finding.id)).toEqual([
      "crit",
    ]);
    expect(defaults.exitCode).toBe(3);

    const precedence = createMemoryFileSystem();
    await writeSecurityPolicy(
      storedPolicy({
        defaultEnforcement: "fail",
        rules: [
          { target: "critical", enforcement: "ignore" },
          { target: "rule/specific", enforcement: "fail" },
        ],
      }),
      { root },
      precedence,
    );
    await seedFinding(precedence, "specific", {
      severity: "critical",
      ruleId: "rule/specific",
      state: "open",
    });
    const firstRule = await checkSecurityPolicyAndBaseline(
      { root, projectId: "caller-project" },
      precedence,
    );
    expect(firstRule.policyViolations).toEqual([]);
    expect(firstRule.exitCode).toBe(0);

    const warned = createMemoryFileSystem();
    await writeSecurityPolicy(
      storedPolicy({
        defaultEnforcement: "ignore",
        rules: [{ target: "critical", enforcement: "warn" }],
      }),
      { root },
      warned,
    );
    await seedFinding(warned, "crit", { severity: "critical", state: "open" });
    await seedFinding(warned, "dismissed", {
      severity: "critical",
      state: "dismissed",
    });
    await seedFinding(warned, "accepted", {
      severity: "critical",
      state: "accepted-risk",
    });
    await seedFinding(warned, "fixed", {
      severity: "critical",
      state: "remediated",
    });
    await seedFinding(warned, "verified", {
      severity: "critical",
      state: "verified",
    });
    await seedFinding(warned, "verified-high", {
      severity: "high",
      state: "verified",
    });
    const warnCritical = await checkSecurityPolicyAndBaseline(
      { root, projectId: "caller-project" },
      warned,
    );
    expect(warnCritical.policyViolations.map((finding) => finding.id)).toEqual([
      "crit",
      "verified",
    ]);
    expect(warnCritical.exitCode).toBe(0);
  });

  it("lets the audit and CLI keep using the extracted policy and baseline", async () => {
    const empty = createMemoryFileSystem();
    const quiet = await runContinuousSecurityAudit(
      { root, projectId: "audit-project" },
      empty,
    );
    const quietCheck = quiet.invariantChecks.find(
      (check) => check.invariantId === 27,
    );
    expect(quietCheck?.status).toBe("passed");
    expect(quietCheck?.details).toContain("default: warn");
    expect(quietCheck?.details).toContain("baseline: missing");

    const noisy = createMemoryFileSystem();
    await seedFinding(noisy, "crit", { severity: "critical", state: "open" });
    const failed = await runContinuousSecurityAudit(
      { root, projectId: "audit-project" },
      noisy,
    );
    const failedCheck = failed.invariantChecks.find(
      (check) => check.invariantId === 27,
    );
    expect(failedCheck?.status).toBe("failed");
    expect(failedCheck?.details).toContain("1 policy violations detected");

    const io = {
      stdout: (message: string) => output.push(message),
      stderr: () => undefined,
    };
    const output: string[] = [];
    const policyExit = await runCli(
      ["security", "policy", "--root", root, "--json"],
      { catalogRoot, fileSystem: empty },
      io,
    );
    expect(policyExit).toBe(0);
    const policy = JSON.parse(output.join("\n")) as SecurityPolicy;
    expect(policy.defaultEnforcement).toBe("warn");
    expect(
      policy.rules.map((rule) => `${rule.target}:${rule.enforcement}`),
    ).toEqual(["critical:fail", "high:fail", "medium:warn", "low:ignore"]);

    output.length = 0;
    const checkExit = await runCli(
      ["security", "baseline", "--root", root, "--json"],
      { catalogRoot, fileSystem: noisy },
      io,
    );
    expect(checkExit).toBe(3);
    const check = JSON.parse(output.join("\n")) as {
      exitCode: number;
      policyViolations: { id: string }[];
    };
    expect(check.exitCode).toBe(3);
    expect(check.policyViolations.map((finding) => finding.id)).toEqual([
      "crit",
    ]);

    output.length = 0;
    const updateExit = await runCli(
      ["security", "baseline", "update", "--root", root, "--json"],
      { catalogRoot, fileSystem: noisy },
      io,
    );
    expect(updateExit).toBe(0);
    const updated = JSON.parse(output.join("\n")) as {
      baselineHash: string;
      acceptedFindings: { id: string }[];
    };
    expect(updated.acceptedFindings.map((finding) => finding.id)).toEqual([
      "crit",
    ]);
    expect(updated.baselineHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("keeps the new modules outside every source cycle and within the file budget", () => {
    const importComponents = applicationCycles(false);
    const reexportComponents = applicationCycles(true);
    expect(importComponents.map((component) => component.length)).toEqual([
      3, 3,
    ]);
    expect(reexportComponents.map((component) => component.length)).toEqual([
      4, 29, 3,
    ]);
    expect(importComponents[0]).toEqual([
      "approved-apply-baseline.ts",
      "generated-file-sync-declared.ts",
      "index.ts",
    ]);
    expect(importComponents[1]).toEqual([
      "neutron/mutation/apply/neutron-mutation-apply-durable-record.ts",
      "neutron/mutation/apply/neutron-mutation-apply-store.ts",
      "neutron/mutation/verification/neutron-mutation-verification-retry-eligibility.ts",
    ]);
    expect(reexportComponents[0]).toEqual([
      "apply-extension-update.ts",
      "discover-and-apply-extension-update.ts",
      "extension-update-files.ts",
      "propose-and-apply-extension-adoption.ts",
    ]);
    expect(reexportComponents[1]).toHaveLength(29);
    expect(reexportComponents[1]).toContain("index.ts");
    expect(reexportComponents[2]).toEqual(importComponents[1]);
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
        /@intentloom\/(cli|daemon|desktop|mcp)|apps\/desktop/,
      );
    }
    expect(relativeSpecifiers("security/security-policy.ts", true)).toEqual([
      "node:path",
      "@intentloom/protocol",
      "../host-file-system.js",
      "../project-path.js",
    ]);
    expect(relativeSpecifiers("security/security-baseline.ts", true)).toEqual([
      "node:crypto",
      "node:path",
      "@intentloom/protocol",
      "../host-file-system.js",
      "../project-path.js",
      "./security-finding-store.js",
    ]);
    expect(
      relativeSpecifiers("security/security-policy-evaluation.ts", true),
    ).toEqual([
      "@intentloom/protocol",
      "../host-file-system.js",
      "./security-baseline.js",
      "./security-finding-store.js",
      "./security-policy.js",
    ]);
    expect(
      relativeSpecifiers("security/security-finding-store.ts", true),
    ).not.toContain("./security-policy.js");
    expect(relativeSpecifiers("index.ts", false)).toEqual(
      expect.arrayContaining([
        "./security/security-finding-store.js",
        "./security/security-policy.js",
        "./security/security-baseline.js",
        "./security/security-policy-evaluation.js",
      ]),
    );

    const indexMetrics = measureProductionSource(
      readFileSync("packages/application/src/index.ts", "utf8"),
      "packages/application/src/index.ts",
    );
    expect(indexMetrics.effectiveCodeLines).toBeLessThan(5102);
    expect(indexMetrics.physicalLines).toBeLessThan(5362);
    for (const file of newModules) {
      const metrics = measureProductionSource(
        readFileSync(`packages/application/src/${file}`, "utf8"),
        `packages/application/src/${file}`,
      );
      expect(metrics.effectiveCodeLines).toBeLessThanOrEqual(250);
      expect(metrics.physicalLines).toBeLessThanOrEqual(700);
    }
    const evaluationSource = readFileSync(
      "packages/application/src/security/security-policy-evaluation.ts",
      "utf8",
    );
    const functionSource = evaluationSource.slice(
      evaluationSource.indexOf(
        "export async function checkSecurityPolicyAndBaseline",
      ),
    );
    const functionMetrics = measureProductionSource(
      functionSource,
      "packages/application/src/security/security-policy-evaluation.ts",
    );
    expect(functionMetrics.effectiveCodeLines).toBeLessThanOrEqual(80);
  });
});
