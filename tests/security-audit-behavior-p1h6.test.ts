import { createHash } from "node:crypto";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve, sep } from "node:path";
import { describe, expect, it } from "vitest";
import * as application from "@intentloom/application";
import {
  checkSecurityPolicyAndBaseline,
  createMemoryFileSystem,
  getInteractiveWorkspaceState,
  getSecurityAuditReport,
  runContinuousSecurityAudit,
  syncLocalWorkspaceState,
  updateSecurityBaseline,
  writeSandboxCapabilityPolicy,
  writeSecurityPolicy,
  type FileSystem,
  type SandboxCapabilityPolicy,
  type SecurityPolicy,
} from "@intentloom/application";
import { inside } from "../packages/application/src/project-path.ts";
import { buildSecurityInvariantChecks } from "../packages/application/src/security/security-audit-invariants.ts";

const root = "/project";
const projectId = "audit-project";

const staticChecks: readonly (readonly [number, string, string])[] = [
  [
    2,
    "Pure validation path for mutating paths",
    "Dry-run and validation functions available across application operations",
  ],
  [
    3,
    "Traceable generated artifacts",
    "Checksum manifests and source map resolution verified",
  ],
  [
    4,
    "Human confirmation required for non-identical replacement",
    "Adoption and proposal confirmation contracts enforced",
  ],
  [
    5,
    "Security-sensitive provider behavior documented",
    "Provider capability declarations verified",
  ],
  [
    6,
    "Metadata write paths reject symlinks",
    "Symlink resolution bounds enforced on file writes",
  ],
  [
    7,
    "Symlink loops fail safely",
    "Loop detection active in filesystem security traversal",
  ],
  [8, "Destination collisions abort", "Collision abort contracts active"],
  [
    9,
    "Transaction consistency",
    "Source map and manifest consistency verified",
  ],
  [
    10,
    "Post-write corruption handling",
    "Post-write consistency checkers active",
  ],
  [11, "Post-write diagnostics path safety", "Secret path redaction verified"],
  [
    12,
    "Adoption dry-run and doctor read-only",
    "Read-only guarantees verified for dry-run and doctor",
  ],
  [
    13,
    "Profile detection bounded",
    "Profile definition schema validation active",
  ],
  [14, "Daemon IPC authentication", "IPC authentication contracts active"],
  [
    15,
    "Inspection/conformance read-only bound",
    "Project inspection operations bound to project root",
  ],
  [
    16,
    "Local Git read-only commands",
    "Fixed read-only git collection commands active",
  ],
  [
    17,
    "Provider/MCP untrusted evidence",
    "Untrusted evidence proposal pattern enforced",
  ],
  [
    18,
    "MCP typed capabilities",
    "MCP capability declarations typed and bounded",
  ],
  [
    19,
    "MCP-triggered mutation proposal requirement",
    "Proposal plan and approval required for MCP mutations",
  ],
  [
    20,
    "Credentials outside project config",
    "Secret redaction filter active for configuration paths",
  ],
  [
    21,
    "Persistent-memory proposal status",
    "Memory proposals store proposal state prior to acceptance",
  ],
  [
    22,
    "Persistent-memory explicit approval",
    "Memory acceptance requires explicit approval evidence",
  ],
  [
    23,
    "Derived memory indexes deletable",
    "Memory search indexes detachable without affecting canonical state",
  ],
  [
    24,
    "Agent session lifecycle local storage",
    "Agent session states stored locally under .aif/memory/sessions/",
  ],
  [
    25,
    "Security finding SARIF untrusted input",
    "SARIF reports parsed as untrusted input with secret redaction",
  ],
  [
    26,
    "Local security adapters read-only execution",
    "Built-in security adapters execute strictly read-only file checks",
  ],
];

function reportPath(projectRoot = root): string {
  return inside(projectRoot, ".aif/security/audit-report.json");
}

function findingRecord(
  id: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    schemaVersion: "1",
    id,
    ruleId: "rule/example",
    title: "Example finding",
    severity: "critical",
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

async function seedFinding(
  fs: FileSystem,
  id: string,
  overrides: Record<string, unknown> = {},
): Promise<void> {
  const path = inside(root, `.aif/security/findings/${id}.json`);
  await fs.write(
    path,
    `${JSON.stringify(findingRecord(id, overrides), null, 2)}\n`,
  );
}

function sandbox(
  overrides: Record<string, unknown> = {},
): SandboxCapabilityPolicy {
  return {
    schemaVersion: "1",
    projectId: "stored-project",
    mode: "proposal-only",
    pathRules: [{ pathPrefix: "src/", allowWrite: true, allowDelete: false }],
    commandRules: [{ commandPrefix: "pnpm test" }],
    allowNetwork: false,
    updatedAt: "2026-02-02T00:00:00.000Z",
    ...overrides,
  } as SandboxCapabilityPolicy;
}

function policy(overrides: Record<string, unknown> = {}): SecurityPolicy {
  return {
    schemaVersion: "1",
    projectId: "stored-project",
    defaultEnforcement: "ignore",
    rules: [{ target: "critical", enforcement: "warn" }],
    updatedAt: "2026-02-02T00:00:00.000Z",
    ...overrides,
  } as SecurityPolicy;
}

function checkHash(checks: readonly { invariantId: number }[]): string {
  return createHash("sha256").update(JSON.stringify(checks)).digest("hex");
}

function recording(fs: FileSystem): FileSystem & { calls: string[] } {
  const calls: string[] = [];
  return {
    ...fs,
    calls,
    async exists(path) {
      calls.push(`exists ${path}`);
      return fs.exists(path);
    },
    async read(path) {
      calls.push(`read ${path}`);
      return fs.read(path);
    },
    async write(path, content) {
      calls.push(`write ${path}`);
      return fs.write(path, content);
    },
    async mkdir(path) {
      calls.push(`mkdir ${path}`);
      return fs.mkdir(path);
    },
    async list(path) {
      calls.push(`list ${path}`);
      return fs.list(path);
    },
    remove: (path) => fs.remove(path),
    realpath: (path) => fs.realpath(path),
    isSymbolicLink: (path) => fs.isSymbolicLink(path),
  };
}

describe("P1H.6 continuous security audit behavior", () => {
  it("keeps both audit operations on the package root and hides the helpers", () => {
    expect(typeof application.getSecurityAuditReport).toBe("function");
    expect(typeof application.runContinuousSecurityAudit).toBe("function");
    expect(application).not.toHaveProperty("securityAuditReportPath");
    expect(application).not.toHaveProperty("writeSecurityAuditReport");
    expect(application).not.toHaveProperty("buildSecurityInvariantChecks");
    expect(application).not.toHaveProperty("networkAccessInvariant");
    expect(application).not.toHaveProperty("policyViolationInvariant");
    expect(application).not.toHaveProperty("sandboxModeInvariant");
  });

  it("returns null for a missing, malformed, or rejected report and coerces accepted fields", async () => {
    const fs = createMemoryFileSystem();
    expect(await getSecurityAuditReport({ root }, fs)).toBeNull();

    const path = reportPath();
    await fs.write(path, "{");
    expect(await getSecurityAuditReport({ root }, fs)).toBeNull();
    await fs.write(
      path,
      JSON.stringify({ schemaVersion: "2", projectId, auditHash: "abc" }),
    );
    expect(await getSecurityAuditReport({ root }, fs)).toBeNull();
    await fs.write(path, JSON.stringify({ schemaVersion: "1" }));
    expect(await getSecurityAuditReport({ root }, fs)).toBeNull();

    await fs.write(
      path,
      JSON.stringify({
        schemaVersion: "1",
        projectId,
        healthScore: "not-a-number",
        invariantChecks: [
          {
            invariantId: "not-a-number",
            title: "Kept title",
            status: "passed",
            details: "Kept details",
            extra: true,
          },
        ],
        auditHash: "abc",
        auditedAt: "2026-01-01T00:00:00.000Z",
        extra: true,
      }),
    );
    expect(await getSecurityAuditReport({ root }, fs)).toEqual({
      schemaVersion: "1",
      projectId,
      healthScore: 0,
      invariantChecks: [
        {
          invariantId: 0,
          title: "Kept title",
          status: "passed",
          details: "Kept details",
        },
      ],
      auditHash: "abc",
      auditedAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("round-trips a validated report without recomputing the score or hash", async () => {
    const fs = createMemoryFileSystem();
    const written = await runContinuousSecurityAudit({ root, projectId }, fs);
    const raw = await fs.read(reportPath());
    expect(raw).toBe(`${JSON.stringify(written, null, 2)}\n`);
    expect(raw.endsWith("\n")).toBe(true);
    const read = await getSecurityAuditReport({ root }, fs);
    expect(read).toEqual(written);
    expect(read?.healthScore).toBe(written.healthScore);
    expect(read?.auditHash).toBe(written.auditHash);
    expect(Object.keys(read ?? {})).toEqual([
      "schemaVersion",
      "projectId",
      "healthScore",
      "invariantChecks",
      "auditHash",
      "auditedAt",
    ]);
  });

  it("preserves all 28 checks, static passed rows, and dynamic status rules", async () => {
    const fs = createMemoryFileSystem();
    const report = await runContinuousSecurityAudit({ root, projectId }, fs);
    expect(report.invariantChecks.map((check) => check.invariantId)).toEqual(
      Array.from({ length: 28 }, (_, index) => index + 1),
    );
    expect(report.invariantChecks[0]).toEqual({
      invariantId: 1,
      title: "No implicit network request or telemetry",
      status: "passed",
      details: "Network access disabled by default in sandbox policy",
    });
    for (const [id, title, details] of staticChecks) {
      expect(report.invariantChecks[id - 1]).toEqual({
        invariantId: id,
        title,
        status: "passed",
        details,
      });
    }
    expect(report.invariantChecks[26]).toEqual({
      invariantId: 27,
      title: "Security policies and baselines enforcement",
      status: "passed",
      details: "Policy enforced (default: warn, baseline: missing)",
    });
    expect(report.invariantChecks[27]).toEqual({
      invariantId: 28,
      title: "Agent mutation proposals sandbox capability bounds",
      status: "passed",
      details: "Sandbox active (mode: proposal-only, pathRules: 2)",
    });
    for (const check of report.invariantChecks) {
      expect(Object.keys(check)).toEqual([
        "invariantId",
        "title",
        "status",
        "details",
      ]);
    }

    await writeSandboxCapabilityPolicy(
      sandbox({ allowNetwork: true, mode: "mutating", pathRules: [] }),
      { root },
      fs,
    );
    const network = await runContinuousSecurityAudit({ root, projectId }, fs);
    expect(network.invariantChecks[0]).toMatchObject({
      status: "warning",
      details: "Network access is enabled in sandbox policy",
    });
    expect(network.invariantChecks[27]).toMatchObject({
      status: "passed",
      details: "Sandbox active (mode: mutating, pathRules: 0)",
    });

    await writeSandboxCapabilityPolicy(
      sandbox({ allowNetwork: false, mode: "read-only", pathRules: [] }),
      { root },
      fs,
    );
    const readOnly = await runContinuousSecurityAudit({ root, projectId }, fs);
    expect(readOnly.invariantChecks[0]?.status).toBe("passed");
    expect(readOnly.invariantChecks[27]).toMatchObject({
      status: "warning",
      details: "Sandbox active (mode: read-only, pathRules: 0)",
    });

    await updateSecurityBaseline({ root, projectId }, fs);
    const withBaseline = await runContinuousSecurityAudit(
      { root, projectId },
      fs,
    );
    expect(withBaseline.invariantChecks[26]?.details).toBe(
      "Policy enforced (default: warn, baseline: present)",
    );
  });

  it("fails invariant 27 from the violation count, including warn on critical", async () => {
    const fs = createMemoryFileSystem();
    await writeSecurityPolicy(policy(), { root }, fs);
    await seedFinding(fs, "crit-1");
    const compared = await checkSecurityPolicyAndBaseline(
      { root, projectId },
      fs,
    );
    expect(compared.exitCode).toBe(0);
    expect(compared.policyViolations).toHaveLength(1);
    const warned = await runContinuousSecurityAudit({ root, projectId }, fs);
    expect(warned.invariantChecks[26]).toMatchObject({
      status: "failed",
      details: "1 policy violations detected",
    });
    expect(warned.invariantChecks[0]?.status).not.toBe("failed");

    await seedFinding(fs, "crit-2");
    const two = await runContinuousSecurityAudit({ root, projectId }, fs);
    expect(two.invariantChecks[26]?.details).toBe(
      "2 policy violations detected",
    );

    await writeSecurityPolicy(
      policy({
        defaultEnforcement: "fail",
        rules: [],
      }),
      { root },
      fs,
    );
    const failed = await checkSecurityPolicyAndBaseline(
      { root, projectId },
      fs,
    );
    expect(failed.exitCode).toBe(3);
    const audited = await runContinuousSecurityAudit({ root, projectId }, fs);
    expect(audited.invariantChecks[26]?.status).toBe("failed");
  });

  it("keeps the unweighted score and a hash of the sorted checks only", async () => {
    const empty = createMemoryFileSystem();
    const perfect = await runContinuousSecurityAudit(
      { root, projectId },
      empty,
    );
    expect(perfect.healthScore).toBe(100);
    expect(perfect.auditHash).toBe(checkHash(perfect.invariantChecks));
    expect(perfect.auditedAt.length).toBeGreaterThan(0);

    const one = createMemoryFileSystem();
    await writeSandboxCapabilityPolicy(
      sandbox({ allowNetwork: true }),
      { root },
      one,
    );
    const warned = await runContinuousSecurityAudit({ root, projectId }, one);
    expect(warned.healthScore).toBe(96);

    const two = createMemoryFileSystem();
    await writeSandboxCapabilityPolicy(
      sandbox({ allowNetwork: true, mode: "read-only" }),
      { root },
      two,
    );
    const both = await runContinuousSecurityAudit({ root, projectId }, two);
    expect(both.healthScore).toBe(93);

    await writeSecurityPolicy(policy(), { root }, two);
    await seedFinding(two, "crit-1");
    const three = await runContinuousSecurityAudit({ root, projectId }, two);
    expect(three.healthScore).toBe(89);
    expect(three.auditHash).toBe(checkHash(three.invariantChecks));
    expect(three.auditHash).not.toBe(both.auditHash);

    const again = await runContinuousSecurityAudit({ root, projectId }, two);
    expect(again.auditHash).toBe(three.auditHash);
    expect(again.invariantChecks).toEqual(three.invariantChecks);
    const rewritten = {
      ...again,
      auditedAt: "1999-01-01T00:00:00.000Z",
      healthScore: 0,
      projectId: "other-project",
      schemaVersion: "1" as const,
    };
    expect(checkHash(rewritten.invariantChecks)).toBe(again.auditHash);
  });

  it("copies static checks so a caller cannot change the next audit", () => {
    const input = {
      allowNetwork: false,
      policyViolationCount: 0,
      defaultEnforcement: "warn" as const,
      baselinePresent: false,
      sandboxMode: "proposal-only" as const,
      pathRuleCount: 2,
    };
    const first = buildSecurityInvariantChecks(input);
    expect(first).toHaveLength(28);
    const staticCheck = first[1] as { status: string } | undefined;
    expect(staticCheck).toBeDefined();
    if (!staticCheck) return;
    staticCheck.status = "failed";
    const second = buildSecurityInvariantChecks({
      ...input,
      allowNetwork: true,
      policyViolationCount: 3,
      sandboxMode: "read-only",
    });
    expect(second[1]?.status).toBe("passed");
    expect(
      second
        .filter((check) => check.invariantId >= 2 && check.invariantId <= 26)
        .every((check) => check.status === "passed"),
    ).toBe(true);
    expect(second[0]?.status).toBe("warning");
    expect(second[26]?.status).toBe("failed");
    expect(second[27]?.status).toBe("warning");
  });

  it("validates before writing and preserves filesystem failure behavior", async () => {
    const watched = recording(createMemoryFileSystem());
    await runContinuousSecurityAudit({ root, projectId }, watched);
    const policyPath = inside(root, ".aif/security/policy.json");
    const baselinePath = inside(root, ".aif/security/baseline.json");
    const sandboxPath = inside(root, ".aif/security/sandbox.json");
    const parent = dirname(reportPath());
    const existsPaths = watched.calls
      .filter((call) => call.startsWith("exists "))
      .map((call) => call.slice("exists ".length));
    expect(existsPaths).toEqual([
      policyPath,
      baselinePath,
      sandboxPath,
      policyPath,
      baselinePath,
      parent,
    ]);
    expect(watched.calls.filter((call) => call.startsWith("list "))).toEqual([
      `list ${root}`,
    ]);
    expect(watched.calls.filter((call) => call.startsWith("write "))).toEqual([
      `write ${reportPath()}`,
    ]);
    expect(watched.calls.indexOf(`mkdir ${parent}`)).toBeLessThan(
      watched.calls.indexOf(`write ${reportPath()}`),
    );

    const rejected = recording(createMemoryFileSystem());
    await expect(
      runContinuousSecurityAudit({ root, projectId: "" }, rejected),
    ).rejects.toThrow("projectId must be a non-empty string");
    expect(rejected.calls.some((call) => call.startsWith("write "))).toBe(
      false,
    );
    expect(rejected.calls.some((call) => call.startsWith("exists "))).toBe(
      true,
    );

    const mkdirFs = createMemoryFileSystem();
    await expect(
      runContinuousSecurityAudit(
        { root, projectId },
        {
          ...mkdirFs,
          async exists() {
            return false;
          },
          async mkdir() {
            throw new Error("mkdir failed");
          },
        },
      ),
    ).rejects.toThrow("mkdir failed");

    const stored = createMemoryFileSystem();
    await runContinuousSecurityAudit({ root, projectId }, stored);
    const previous = await stored.read(reportPath());
    await expect(
      runContinuousSecurityAudit(
        { root, projectId },
        {
          ...stored,
          async write() {
            throw new Error("write failed");
          },
        },
      ),
    ).rejects.toThrow("write failed");
    expect(await stored.read(reportPath())).toBe(previous);

    expect(
      await getSecurityAuditReport(
        { root },
        {
          ...stored,
          async read() {
            throw new Error("read failed");
          },
        },
      ),
    ).toBeNull();
    await expect(
      getSecurityAuditReport(
        { root },
        {
          ...stored,
          async exists() {
            throw new Error("exists failed");
          },
        },
      ),
    ).rejects.toThrow("exists failed");

    const tempRoot = await mkdtemp(resolve(tmpdir(), "intentloom-p1h6-"));
    expect(await getSecurityAuditReport({ root: tempRoot })).toBeNull();
    expect(reportPath(tempRoot).split(sep).slice(-3)).toEqual([
      ".aif",
      "security",
      "audit-report.json",
    ]);
    expect(() => inside(tempRoot, "../audit-report.json")).toThrow(
      "path traversal: ../audit-report.json",
    );
  });

  it("still feeds the persisted report to the workspace readers", async () => {
    const fs = createMemoryFileSystem();
    const missingState = await getInteractiveWorkspaceState(
      { root, projectId },
      fs,
    );
    expect(missingState.auditReport).toBeNull();
    const missingSync = await syncLocalWorkspaceState({ root, projectId }, fs);
    expect(missingSync.securityScore).toBeNull();

    const report = await runContinuousSecurityAudit({ root, projectId }, fs);
    const presentState = await getInteractiveWorkspaceState(
      { root, projectId },
      fs,
    );
    expect(presentState.auditReport).toEqual(report);
    const presentSync = await syncLocalWorkspaceState({ root, projectId }, fs);
    expect(presentSync.securityScore).toBe(report.healthScore);
  });
});
