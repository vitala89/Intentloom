import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ArtifactValidationFailure,
  createMemoryFileSystem,
  diffProject,
  doctorProject,
  initProject,
  inspectProject,
  planFeature,
  syncProject,
} from "../packages/application/src/index.js";
import { ArtifactValidationFailure as OwnerFailure } from "../packages/application/src/artifact-validation-failure.js";

const readFileCalls = vi.hoisted(() => [] as string[]);

vi.mock("node:fs/promises", async () => {
  const actual =
    await vi.importActual<typeof import("node:fs/promises")>(
      "node:fs/promises",
    );
  return {
    ...actual,
    async readFile(...args: Parameters<typeof actual.readFile>) {
      readFileCalls.push(String(args[0]));
      return actual.readFile(...args);
    },
  };
});

const catalogRoot = resolve("catalog");
const projectOptions = {
  root: "/project",
  profile: "generic",
  adapters: ["codex"] as const,
};

function catalogSkillReads(): number {
  return readFileCalls.filter((path) =>
    /skills[/\\][^/\\]+[/\\]SKILL\.md$/u.test(path),
  ).length;
}

describe("P1I.2 project lifecycle behavior", () => {
  beforeEach(() => {
    readFileCalls.length = 0;
  });

  it("keeps the public validation failure constructor", async () => {
    expect(ArtifactValidationFailure).toBe(OwnerFailure);
    const constructed = new ArtifactValidationFailure([]);
    expect(constructed).toBeInstanceOf(ArtifactValidationFailure);
    expect(constructed).toBeInstanceOf(Error);
    expect(constructed.message).toBe("project artifact validation failed");
    expect(constructed.results).toEqual([]);

    const invalid = {
      status: "invalid" as const,
      artifactType: "feature-brief" as const,
      schemaId: "urn:aif:schema:feature-brief:1",
      schemaVersion: "1",
      documentPath: "plans/task.json",
      structuralErrors: [
        { code: "schema-invalid-type", message: "bad", fieldPath: "/" },
      ],
      semanticErrors: [],
      warnings: [],
    };
    await expect(
      planFeature("task", { validate: () => invalid }),
    ).rejects.toBeInstanceOf(ArtifactValidationFailure);
    await expect(
      planFeature("task", { validate: () => invalid }),
    ).rejects.toMatchObject({
      message: "project artifact validation failed",
      results: [invalid, invalid],
    });
  });

  it("evaluates desired state again for sync and doctor", async () => {
    const fs = createMemoryFileSystem();
    const options = { ...projectOptions, catalogRoot, dryRun: true };
    await diffProject(options, fs);
    const once = catalogSkillReads();
    expect(once).toBeGreaterThan(0);

    readFileCalls.length = 0;
    await syncProject(options, fs);
    expect(catalogSkillReads()).toBe(once * 2);

    readFileCalls.length = 0;
    await doctorProject(options, fs);
    expect(catalogSkillReads()).toBe(once * 2);
  });

  it("keeps equal doctor sort keys in discovery order", async () => {
    const fs = createMemoryFileSystem();
    const validationResults = [
      {
        status: "invalid" as const,
        artifactType: "aif-config" as const,
        schemaId: "urn:aif:schema:aif-config:1",
        schemaVersion: "1",
        documentPath: ".aif/config.yaml",
        structuralErrors: [
          { code: "same-code", message: "first", fieldPath: "/" },
          { code: "same-code", message: "second", fieldPath: "/" },
        ],
        semanticErrors: [
          { code: "same-code", message: "third", fieldPath: "/" },
        ],
        warnings: [],
      },
    ];
    const frozen = Object.freeze(validationResults);
    const report = await doctorProject(projectOptions, fs, frozen);
    expect(validationResults).toEqual([validationResults[0]]);
    expect(
      report.findings
        .filter(
          (finding) =>
            finding.code === "same-code" && finding.path === ".aif/config.yaml",
        )
        .map((finding) => finding.message),
    ).toEqual(["first", "second", "third"]);
    const sorted = [...report.findings].sort((left, right) =>
      `${left.code}:${left.path}`.localeCompare(`${right.code}:${right.path}`),
    );
    expect(report.findings).toEqual(sorted);
    expect(report.errors.map((error) => error.message)).toEqual(
      report.findings
        .filter((finding) => finding.severity === "error")
        .map((finding) => finding.message),
    );
    expect(report.diagnostics).toEqual(
      report.errors.map((error) => `${error.path}: ${error.message}`),
    );
    expect(
      report.findings.some((finding) => finding.code === "aif-config-missing"),
    ).toBe(true);
  });

  it("writes ordinary sync through the generated-file transaction", async () => {
    const fs = createMemoryFileSystem();
    const result = await syncProject(projectOptions, fs);
    expect(result).toMatchObject({
      status: "success",
      rollbackAttempted: false,
    });
    expect(fs.files.has("/project/.aif/config.yaml")).toBe(true);
    expect(fs.files.has("/project/.aif/manifest.lock.json")).toBe(true);
    expect(fs.files.has("/project/.aif/source-map.json")).toBe(true);
  });

  it("rolls back created init files and leaves dry runs unwritten", async () => {
    const dry = createMemoryFileSystem();
    const proposal = await initProject(
      { ...projectOptions, dryRun: true },
      dry,
    );
    expect(dry.files.size).toBe(0);
    expect(proposal.changes.some((change) => change.kind === "create")).toBe(
      true,
    );

    const failing = createMemoryFileSystem({}, 1);
    await expect(initProject(projectOptions, failing)).rejects.toThrow(
      "injected write failure",
    );
    expect([...failing.files.keys()]).toEqual([]);
  });

  it("does not write during diff, doctor, or inspection", async () => {
    const fs = createMemoryFileSystem({ "/project/private.txt": "secret" });
    const before = [...fs.files.entries()];
    await diffProject(projectOptions, fs);
    await doctorProject(projectOptions, fs);
    const inspection = await inspectProject("/project", fs);
    expect([...fs.files.entries()]).toEqual(before);
    expect(inspection.readOnly).toBe(true);
    expect(inspection.operationVersion).toBe(1);
    expect(inspection.capabilities).toEqual(["project.files.read"]);
  });
});
