import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import * as application from "@intentloom/application";
import {
  acceptSecurityRisk,
  checkSecurityPolicyAndBaseline,
  createMemoryFileSystem,
  dismissSecurityFinding,
  getSecurityCoverageReport,
  getSecurityFinding,
  importSarifSecurityReport,
  listSecurityFindings,
  runLocalSecurityAdapters,
  updateSecurityBaseline,
  type FileSystem,
  type SecurityFindingSeverity,
  type SecurityFindingState,
} from "@intentloom/application";
import { measureProductionSource } from "../scripts/production-file-metrics.mjs";
import {
  applicationCycles,
  relativeSpecifiers,
} from "./application-source-cycles.js";
import { securityFindingPath } from "../packages/application/src/security/security-finding-store.js";

const root = "/project";

const publicNames = [
  "getSecurityFinding",
  "listSecurityFindings",
  "dismissSecurityFinding",
  "acceptSecurityRisk",
  "getSecurityCoverageReport",
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

const outsideComponents = [
  "host-file-system.ts",
  "project-path.ts",
  "security/security-finding-store.ts",
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

function findingFile(id: string): string {
  return resolve(root, `.aif/security/findings/${id}.json`);
}

async function seedFinding(
  fs: ReturnType<typeof createMemoryFileSystem>,
  id: string,
  overrides: Record<string, unknown> = {},
): Promise<void> {
  await fs.write(
    findingFile(id),
    `${JSON.stringify(findingRecord(id, overrides), null, 2)}\n`,
  );
}

function countingFileSystem(
  fs: ReturnType<typeof createMemoryFileSystem>,
): FileSystem & {
  mkdirCalls: number;
  writes: { path: string; content: string }[];
} {
  const writes: { path: string; content: string }[] = [];
  let mkdirCalls = 0;
  return {
    ...fs,
    get mkdirCalls() {
      return mkdirCalls;
    },
    writes,
    async mkdir(path) {
      mkdirCalls += 1;
      await fs.mkdir(path);
    },
    async write(path, content) {
      writes.push({ path, content });
      await fs.write(path, content);
    },
  };
}

describe("P1H.4a security finding store and coverage", () => {
  it("keeps the five operations on the package root and leaves the export map unchanged", () => {
    for (const name of publicNames) {
      expect(typeof application[name]).toBe("function");
    }
    expect(application).not.toHaveProperty("securityFindingPath");
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
    expect(exceptions).not.toContain("security-finding-store");
    expect(exceptions).not.toContain("security-coverage");
  });

  it("resolves finding paths with the existing containment helper", () => {
    expect(securityFindingPath(root, "finding-a")).toBe(
      resolve(root, ".aif/security/findings/finding-a.json"),
    );
    expect(() => securityFindingPath(root, "../../../../outside")).toThrow(
      "path traversal: .aif/security/findings/../../../../outside.json",
    );
  });

  it("returns null for missing, malformed, and rejected findings", async () => {
    const fs = createMemoryFileSystem();
    await seedFinding(fs, "valid");
    await fs.write(findingFile("malformed"), "{");
    await fs.write(
      findingFile("rejected"),
      `${JSON.stringify({ schemaVersion: "2" })}\n`,
    );

    expect(await getSecurityFinding("missing", { root }, fs)).toBeNull();
    expect(await getSecurityFinding("malformed", { root }, fs)).toBeNull();
    expect(await getSecurityFinding("rejected", { root }, fs)).toBeNull();
    expect((await getSecurityFinding("valid", { root }, fs))?.id).toBe("valid");
    await expect(
      getSecurityFinding("../../../../outside", { root }, fs),
    ).rejects.toThrow(
      "path traversal: .aif/security/findings/../../../../outside.json",
    );

    const tempRoot = await mkdtemp(resolve(tmpdir(), "intentloom-p1h4a-"));
    try {
      expect(await getSecurityFinding("absent", { root: tempRoot })).toBeNull();
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("filters and orders listed findings while skipping corrupt records", async () => {
    const fs = createMemoryFileSystem();
    await seedFinding(fs, "id-2", { severity: "high", state: "open" });
    await seedFinding(fs, "id-10", { severity: "low", state: "verified" });
    await seedFinding(fs, "nested/child", {
      severity: "medium",
      state: "open",
      scanner: "nested-scanner",
    });
    await fs.write(findingFile("broken"), "{");
    await fs.write(resolve(root, "notes.json"), "{}\n");

    const listed = await listSecurityFindings({ root }, fs);
    expect(listed.map((finding) => finding.id)).toEqual([
      "id-10",
      "id-2",
      "nested/child",
    ]);

    const high = await listSecurityFindings({ root, severity: "high" }, fs);
    expect(high.map((finding) => finding.id)).toEqual(["id-2"]);
    const open = await listSecurityFindings({ root, state: "open" }, fs);
    expect(open.map((finding) => finding.id)).toEqual(["id-2", "nested/child"]);
    const none = await listSecurityFindings(
      { root, severity: "not-a-severity" as SecurityFindingSeverity },
      fs,
    );
    expect(none).toEqual([]);

    const relativeListing: FileSystem = {
      ...fs,
      async list() {
        return [
          ".aif/security/findings/id-10.json",
          ".aif\\security\\findings\\id-2.json",
        ];
      },
    };
    const fromRelative = await listSecurityFindings({ root }, relativeListing);
    expect(fromRelative.map((finding) => finding.id)).toEqual([
      "id-10",
      "id-2",
    ]);
    const filtered = await listSecurityFindings(
      {
        root,
        severity: "low",
        state: "verified" satisfies SecurityFindingState,
      },
      relativeListing,
    );
    expect(filtered.map((finding) => finding.id)).toEqual(["id-10"]);
  });

  it("preserves dismissal and risk-acceptance metadata in pretty JSON", async () => {
    const fs = createMemoryFileSystem();
    await seedFinding(fs, "tracked", {
      dismissalReason: "earlier note",
      acceptedRisk: {
        approvedBy: "earlier-reviewer",
        reason: "earlier reason",
        approvedAt: "2026-01-02T00:00:00.000Z",
      },
    });
    const recording = countingFileSystem(fs);

    await expect(
      dismissSecurityFinding("missing", { root, reason: "gone" }, recording),
    ).rejects.toThrow("security finding not found: missing");
    const dismissed = await dismissSecurityFinding(
      "tracked",
      { root, reason: "False positive" },
      recording,
    );
    expect(dismissed.state).toBe("dismissed");
    expect(dismissed.dismissalReason).toBe("False positive");
    expect(dismissed.acceptedRisk?.approvedBy).toBe("earlier-reviewer");
    expect(dismissed.createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(recording.writes[0]).toEqual({
      path: findingFile("tracked"),
      content: `${JSON.stringify(dismissed, null, 2)}\n`,
    });

    const accepted = await acceptSecurityRisk(
      "tracked",
      {
        root,
        approvedBy: "maintainer",
        reason: "Compensating control",
        expiresAt: "2030-01-01T00:00:00.000Z",
      },
      recording,
    );
    expect(accepted.state).toBe("accepted-risk");
    expect(accepted.dismissalReason).toBe("False positive");
    expect(accepted.acceptedRisk).toMatchObject({
      approvedBy: "maintainer",
      reason: "Compensating control",
      expiresAt: "2030-01-01T00:00:00.000Z",
    });
    expect(recording.writes[1]?.content.endsWith("\n")).toBe(true);
    expect(recording.writes[1]?.content).toBe(
      `${JSON.stringify(accepted, null, 2)}\n`,
    );
    expect(recording.mkdirCalls).toBe(0);

    await seedFinding(fs, "blank-reason");
    const blank = await dismissSecurityFinding(
      "blank-reason",
      { root, reason: "" },
      recording,
    );
    expect(blank.state).toBe("dismissed");
    expect(blank).not.toHaveProperty("dismissalReason");

    await seedFinding(fs, "no-expiry");
    const openEnded = await acceptSecurityRisk(
      "no-expiry",
      { root, approvedBy: "maintainer", reason: "Accepted", expiresAt: "" },
      recording,
    );
    expect(openEnded.acceptedRisk).not.toHaveProperty("expiresAt");
    await expect(
      acceptSecurityRisk(
        "absent",
        { root, approvedBy: "maintainer", reason: "missing" },
        recording,
      ),
    ).rejects.toThrow("security finding not found: absent");
  });

  it("counts coverage from the finding list and sorts scanner names", async () => {
    const fs = createMemoryFileSystem();
    await seedFinding(fs, "zeta-high", {
      severity: "high",
      state: "open",
      scanner: "zeta",
    });
    await seedFinding(fs, "alpha-low", {
      severity: "low",
      state: "dismissed",
      scanner: "alpha",
    });
    await seedFinding(fs, "alpha-again", {
      severity: "info",
      state: "remediated",
      scanner: "alpha",
    });

    const report = await getSecurityCoverageReport(
      { root, projectId: "project-coverage" },
      fs,
    );
    expect(report.projectId).toBe("project-coverage");
    expect(report.totalFindings).toBe(3);
    expect(report.findingsBySeverity).toEqual({
      critical: 0,
      high: 1,
      medium: 0,
      low: 1,
      info: 1,
    });
    expect(report.findingsByState).toEqual({
      open: 1,
      verified: 0,
      dismissed: 1,
      "accepted-risk": 0,
      remediated: 1,
    });
    expect(report.scanners).toEqual(["alpha", "zeta"]);
    expect(Number.isNaN(Date.parse(report.reportedAt))).toBe(false);
  });

  it("keeps SARIF import, policy, baseline, and local adapters on stored findings", async () => {
    const fs = createMemoryFileSystem();
    const imported = await importSarifSecurityReport(
      JSON.stringify({
        runs: [
          {
            tool: { driver: { name: "DemoScanner" } },
            results: [
              {
                ruleId: "demo/rule",
                level: "error",
                message: { text: "Demo finding" },
                locations: [
                  {
                    physicalLocation: {
                      artifactLocation: { uri: "src/app.ts" },
                    },
                  },
                ],
              },
            ],
          },
        ],
      }),
      "reports/demo.sarif.json",
      { root },
      fs,
    );
    expect(imported.importedCount).toBe(1);
    const stored = await fs.read(findingFile("sarif-finding-1"));
    expect(stored.endsWith("\n")).toBe(true);
    expect(stored).toBe(`${JSON.stringify(JSON.parse(stored), null, 2)}\n`);
    expect(
      (await listSecurityFindings({ root }, fs)).map((finding) => finding.id),
    ).toEqual(["sarif-finding-1"]);

    const check = await checkSecurityPolicyAndBaseline(
      { root, projectId: "project-policy" },
      fs,
    );
    expect(check.projectId).toBe("project-policy");
    expect(check.newFindings.map((finding) => finding.id)).toEqual([
      "sarif-finding-1",
    ]);
    expect(check.policyViolations.map((finding) => finding.id)).toEqual([
      "sarif-finding-1",
    ]);
    const baseline = await updateSecurityBaseline(
      { root, projectId: "project-policy" },
      fs,
    );
    expect(baseline.acceptedFindings.map((finding) => finding.id)).toEqual([
      "sarif-finding-1",
    ]);

    await fs.write(
      resolve(root, "package.json"),
      `${JSON.stringify({ dependencies: { lodash: "*" } })}\n`,
    );
    const adapters = await runLocalSecurityAdapters(
      { root, categories: ["dependency"] },
      fs,
    );
    expect(adapters[0]?.findings[0]?.ruleId).toBe("dep/unpinned-wildcard");
    const saved = await listSecurityFindings({ root }, fs);
    expect(saved.map((finding) => finding.ruleId)).toContain(
      "dep/unpinned-wildcard",
    );
  });

  it("keeps the new security modules outside every source cycle", () => {
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
    expect(
      relativeSpecifiers("security/security-finding-store.ts", true),
    ).not.toContain("../index.js");
    expect(relativeSpecifiers("security/security-coverage.ts", true)).toContain(
      "./security-finding-store.js",
    );
    expect(
      relativeSpecifiers("security/security-coverage.ts", true),
    ).not.toContain("../index.js");
    expect(relativeSpecifiers("index.ts", false)).toContain(
      "./security/security-finding-store.js",
    );
    expect(relativeSpecifiers("index.ts", true)).toContain(
      "./security/security-coverage.js",
    );
    expect(relativeSpecifiers("index.ts", false)).not.toContain(
      "./security/security-coverage.js",
    );

    const indexMetrics = measureProductionSource(
      readFileSync("packages/application/src/index.ts", "utf8"),
      "packages/application/src/index.ts",
    );
    const storeMetrics = measureProductionSource(
      readFileSync(
        "packages/application/src/security/security-finding-store.ts",
        "utf8",
      ),
      "packages/application/src/security/security-finding-store.ts",
    );
    const coverageMetrics = measureProductionSource(
      readFileSync(
        "packages/application/src/security/security-coverage.ts",
        "utf8",
      ),
      "packages/application/src/security/security-coverage.ts",
    );
    expect(indexMetrics.effectiveCodeLines).toBeLessThan(5339);
    expect(indexMetrics.physicalLines).toBeLessThan(5620);
    expect(storeMetrics.effectiveCodeLines).toBeLessThanOrEqual(250);
    expect(coverageMetrics.effectiveCodeLines).toBeLessThanOrEqual(250);
    expect(storeMetrics.physicalLines).toBeLessThanOrEqual(700);
    expect(coverageMetrics.physicalLines).toBeLessThanOrEqual(700);
  });
});
