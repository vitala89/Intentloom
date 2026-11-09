import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import * as application from "@intentloom/application";
import {
  createMemoryFileSystem,
  getSandboxCapabilityPolicy,
  writeSandboxCapabilityPolicy,
  type FileSystem,
  type SandboxCapabilityPolicy,
} from "@intentloom/application";

const root = "/project";
const sandboxPath = resolve(root, ".aif/security/sandbox.json");

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

function storedPolicy(
  overrides: Record<string, unknown> = {},
): SandboxCapabilityPolicy {
  return {
    schemaVersion: "1",
    projectId: "stored-project",
    mode: "mutating",
    pathRules: [{ pathPrefix: "lib/", allowWrite: true, allowDelete: true }],
    commandRules: [{ commandPrefix: "git status", allowArgs: ["--short"] }],
    allowNetwork: true,
    updatedAt: "2026-02-02T00:00:00.000Z",
    ...overrides,
  } as SandboxCapabilityPolicy;
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
      if (mkdirCalls > 0 && path === dirname(sandboxPath)) return true;
      return fs.exists(path);
    },
    async mkdir(path) {
      mkdirCalls += 1;
      await fs.mkdir(path);
    },
  };
}

describe("P1H.5b sandbox capability policy", () => {
  it("keeps the public sandbox operations on the package root", () => {
    expect(typeof application.getSandboxCapabilityPolicy).toBe("function");
    expect(typeof application.writeSandboxCapabilityPolicy).toBe("function");
    expect(typeof application.evaluateProposalAgainstSandbox).toBe("function");
    expect(application).not.toHaveProperty("sandboxCapabilityPolicyPath");
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
    expect(exceptions).not.toContain("sandbox-capability-policy.ts");
    expect(exceptions).not.toContain("sandbox-proposal-evaluation.ts");
    const indexSource = readFileSync(
      "packages/application/src/index.ts",
      "utf8",
    );
    const auditSource = readFileSync(
      "packages/application/src/security/continuous-security-audit.ts",
      "utf8",
    );
    expect(auditSource).toContain(
      'import { getSandboxCapabilityPolicy } from "./sandbox-capability-policy.js"',
    );
    expect(indexSource).not.toContain(
      'import { getSandboxCapabilityPolicy } from "./security/sandbox-capability-policy.js"',
    );
    expect(indexSource).toContain(
      'from "./security/sandbox-capability-policy.js"',
    );
    expect(indexSource).toContain(
      'import { evaluateProposalAgainstSandbox } from "./security/sandbox-proposal-evaluation.js"',
    );
    expect(indexSource).toContain(
      'import { securityFindingPath } from "./security/security-finding-store.js"',
    );
    expect(indexSource).not.toContain("function sandboxCapabilityPolicyPath");
    expect(indexSource).not.toContain("function getSandboxCapabilityPolicy");
    expect(indexSource).not.toContain("function writeSandboxCapabilityPolicy");
    expect(indexSource).not.toContain(
      "function evaluateProposalAgainstSandbox",
    );
    expect(indexSource).not.toContain("validateSandboxCapabilityPolicy");
    expect(indexSource).not.toContain("validateSandboxEvaluationResult");
    const policySource = readFileSync(
      "packages/application/src/security/sandbox-capability-policy.ts",
      "utf8",
    );
    expect(policySource).toContain("function sandboxCapabilityPolicyPath");
    expect(policySource).not.toContain(
      "export function sandboxCapabilityPolicyPath",
    );
    expect(policySource).not.toContain("index.ts");
  });

  it("falls back to the default policy when the file is missing, unreadable, or invalid", async () => {
    const fs = createMemoryFileSystem();
    const missing = await getSandboxCapabilityPolicy({ root }, fs);
    expect(missing).toMatchObject({
      schemaVersion: "1",
      projectId: "project-local",
      mode: "proposal-only",
      allowNetwork: false,
      pathRules: [
        { pathPrefix: "src/", allowWrite: true, allowDelete: false },
        { pathPrefix: ".aif/", allowWrite: true, allowDelete: false },
      ],
      commandRules: [
        { commandPrefix: "pnpm test" },
        { commandPrefix: "pnpm lint" },
        { commandPrefix: "git diff" },
      ],
    });
    expect(missing.updatedAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );

    const named = await getSandboxCapabilityPolicy(
      { root, projectId: "caller" },
      fs,
    );
    expect(named.projectId).toBe("caller");
    expect(named.mode).toBe("proposal-only");

    await fs.write(sandboxPath, "{");
    expect((await getSandboxCapabilityPolicy({ root }, fs)).projectId).toBe(
      "project-local",
    );
    await fs.write(sandboxPath, JSON.stringify({ schemaVersion: "2" }));
    expect((await getSandboxCapabilityPolicy({ root }, fs)).mode).toBe(
      "proposal-only",
    );

    const unreadable = {
      ...fs,
      async read(path: string) {
        if (path === sandboxPath) throw new Error("unreadable sandbox policy");
        return fs.read(path);
      },
    };
    const fallback = await getSandboxCapabilityPolicy({ root }, unreadable);
    expect(fallback.projectId).toBe("project-local");
    expect(fallback.allowNetwork).toBe(false);
    expect(fallback.commandRules.map((rule) => rule.commandPrefix)).toEqual([
      "pnpm test",
      "pnpm lint",
      "git diff",
    ]);
  });

  it("writes pretty JSON after validation and leaves a good file unchanged on validator failure", async () => {
    const fs = createMemoryFileSystem();
    const counting = countingFileSystem(fs);
    const written = await writeSandboxCapabilityPolicy(
      storedPolicy(),
      { root },
      counting,
    );
    expect(counting.mkdirCalls).toBe(1);
    expect(written.updatedAt).toBe("2026-02-02T00:00:00.000Z");
    expect(written.projectId).toBe("stored-project");
    expect(written.commandRules[0]).toEqual({
      commandPrefix: "git status",
      allowArgs: ["--short"],
    });
    const raw = await fs.read(sandboxPath);
    expect(raw.endsWith("\n")).toBe(true);
    expect(raw).toBe(`${JSON.stringify(written, null, 2)}\n`);

    const again = await writeSandboxCapabilityPolicy(
      storedPolicy(),
      { root },
      counting,
    );
    expect(counting.mkdirCalls).toBe(1);
    expect(again.updatedAt).toBe("2026-02-02T00:00:00.000Z");

    const reread = await getSandboxCapabilityPolicy(
      { root, projectId: "ignored-on-read" },
      fs,
    );
    expect(reread).toEqual(written);
    expect(reread.projectId).toBe("stored-project");

    await expect(
      writeSandboxCapabilityPolicy(
        { schemaVersion: "2" } as SandboxCapabilityPolicy,
        { root },
        fs,
      ),
    ).rejects.toThrow("unsupported sandbox capability policy schema version");
    expect(await fs.read(sandboxPath)).toBe(raw);
  });
});
