import { describe, expect, it } from "vitest";
import type { ExtensionLockEntry } from "@intentloom/protocol";
import {
  checkExtensionHealth,
  createMemoryFileSystem,
  doctorExitCode,
  doctorProject,
  initProject,
  SPECIALIZED_PACK_INTEGRITY_INVALID,
  SPECIALIZED_PACK_LOCK_INVALID,
  SPECIALIZED_PACK_PIN_INVALID,
  SPECIALIZED_PACK_TRUST_INVALID,
} from "@intentloom/application";
import {
  activatedPack,
  adoptedProject,
  applyActivatedPack,
  doctorInit,
  findingCodes,
  firstPartyLockEntry,
  gitCommitPin,
  projectFs,
  projectRoot,
  readLock,
  tamperLockEntry,
  writeLock,
} from "./specialized-pack-s8e-doctor-fixture.js";

describe("S8e Doctor specialized-pack lock health", () => {
  it("keeps Doctor unchanged when the project has no external specialized packs", async () => {
    const beforeFs = createMemoryFileSystem({
      [`${projectRoot}/README.md`]: "project",
    });
    const afterFs = createMemoryFileSystem({
      [`${projectRoot}/README.md`]: "project",
    });
    await initProject(doctorInit, beforeFs);
    await initProject(doctorInit, afterFs);
    const before = await doctorProject(doctorInit, beforeFs);
    const after = await doctorProject(doctorInit, afterFs);
    expect(findingCodes(after)).toEqual(findingCodes(before));
    expect(
      findingCodes(after).filter((code) =>
        code.startsWith("specialized-pack-"),
      ),
    ).toEqual([]);
    expect(findingCodes(after)).toContain("installation-healthy");
  });

  it("does not emit specialized-pack errors for a valid S8c git pin", async () => {
    const fs = await adoptedProject(projectFs());
    await applyActivatedPack(
      fs,
      activatedPack(undefined, {
        kind: "git",
        locator: "https://example.invalid/specialized-pack.git",
        pin: gitCommitPin,
      }),
    );
    const before = [...(fs.files?.entries() ?? [])];
    const report = await doctorProject(doctorInit, fs);
    expect(
      findingCodes(report).filter((code) =>
        code.startsWith("specialized-pack-"),
      ),
    ).toEqual([]);
    expect(findingCodes(report)).toContain("installation-healthy");
    expect(doctorExitCode(report)).toBe(0);
    expect([...(fs.files?.entries() ?? [])]).toEqual(before);
  });

  it("reports invalid category, installation type, digest, pin, and schema", async () => {
    const cases: readonly {
      readonly mutate: (entry: ExtensionLockEntry) => ExtensionLockEntry;
      readonly code: string;
    }[] = [
      {
        mutate: (entry) => ({ ...entry, category: "skill" }),
        code: SPECIALIZED_PACK_LOCK_INVALID,
      },
      {
        mutate: (entry) => ({ ...entry, installationType: "downloaded" }),
        code: SPECIALIZED_PACK_LOCK_INVALID,
      },
      {
        mutate: (entry) => ({ ...entry, integrity: "sha256:not-a-digest" }),
        code: SPECIALIZED_PACK_INTEGRITY_INVALID,
      },
      {
        mutate: (entry) => ({
          ...entry,
          source: { ...entry.source!, resolved: "" },
        }),
        code: SPECIALIZED_PACK_PIN_INVALID,
      },
      {
        mutate: (entry) => ({
          ...entry,
          manifestSchemaVersion: "urn:intentloom:schema:not-specialized:1",
        }),
        code: SPECIALIZED_PACK_LOCK_INVALID,
      },
    ];
    for (const testCase of cases) {
      const fs = await adoptedProject(projectFs());
      await applyActivatedPack(fs);
      await tamperLockEntry(fs, testCase.mutate);
      const before = [...(fs.files?.entries() ?? [])];
      const report = await doctorProject(doctorInit, fs);
      expect(findingCodes(report)).toContain(testCase.code);
      expect(findingCodes(report)).not.toContain("installation-healthy");
      expect(doctorExitCode(report)).toBe(3);
      expect([...(fs.files?.entries() ?? [])]).toEqual(before);
    }
  });

  it("fails closed on a malformed extension lock without guessing entries", async () => {
    const fs = await adoptedProject(projectFs());
    await fs.write(`${projectRoot}/.aif/extension-lock.json`, "{broken");
    const report = await doctorProject(doctorInit, fs);
    expect(findingCodes(report)).toContain("extension-lock-malformed");
    expect(
      findingCodes(report).filter((code) =>
        code.startsWith("specialized-pack-"),
      ),
    ).toEqual([]);
    expect(findingCodes(report)).not.toContain("installation-healthy");
  });

  it("reports missing approver, publisher, and license as trust failures", async () => {
    const fs = await adoptedProject(projectFs());
    await applyActivatedPack(fs);
    await tamperLockEntry(fs, (entry) => ({
      ...entry,
      approvedBy: "",
      publisher: { name: "" },
      license: { spdxId: "" },
    }));
    const report = await doctorProject(doctorInit, fs);
    expect(
      report.findings.filter(
        (finding) => finding.code === SPECIALIZED_PACK_TRUST_INVALID,
      ).length,
    ).toBeGreaterThanOrEqual(3);
    expect(findingCodes(report)).not.toContain("installation-healthy");
  });

  it("reports duplicate specialized-pack identities", async () => {
    const fs = await adoptedProject(projectFs());
    await applyActivatedPack(fs);
    const lockfile = await readLock(fs);
    const entry = Object.values(lockfile.extensions)[0]!;
    lockfile.extensions["pack-reviewed-org-mlops-alias"] = {
      ...entry,
      integrity: `sha256:${"b".repeat(64)}`,
    };
    await writeLock(fs, lockfile);
    const report = await doctorProject(doctorInit, fs);
    expect(findingCodes(report)).toContain(SPECIALIZED_PACK_LOCK_INVALID);
    expect(
      report.findings.some((finding) =>
        finding.message.includes("contradictory active entries"),
      ),
    ).toBe(true);
  });

  it("does not classify first-party managed extensions as S8 external packs", async () => {
    const fs = await adoptedProject(projectFs());
    await writeLock(fs, {
      lockVersion: 1,
      updatedAt: "2026-08-21T00:00:00.000Z",
      extensions: {
        [firstPartyLockEntry().extensionId]: firstPartyLockEntry(),
      },
    });
    const report = await doctorProject(doctorInit, fs);
    expect(
      findingCodes(report).filter((code) =>
        code.startsWith("specialized-pack-"),
      ),
    ).toEqual([]);
  });

  it("treats git and package locators as metadata only", async () => {
    const fs = await adoptedProject(projectFs());
    await applyActivatedPack(
      fs,
      activatedPack(undefined, {
        kind: "package",
        locator: "npm:@example/specialized-pack",
        pin: "1.2.3",
      }),
    );
    const before = [...(fs.files?.entries() ?? [])];
    const report = await doctorProject(doctorInit, fs);
    expect(
      findingCodes(report).filter((code) =>
        code.startsWith("specialized-pack-"),
      ),
    ).toEqual([]);
    expect(findingCodes(report)).toContain("installation-healthy");
    expect([...(fs.files?.entries() ?? [])]).toEqual(before);
  });

  it("does not dereference a URL-looking locator as a local path", async () => {
    const fs = await adoptedProject(projectFs());
    await applyActivatedPack(fs);
    await tamperLockEntry(fs, (entry) => ({
      ...entry,
      source: {
        registry: "local",
        package: "https://example.invalid/packs/mlops.json",
        resolved: "local-v1",
      },
    }));
    const before = [...(fs.files?.entries() ?? [])];
    const report = await doctorProject(doctorInit, fs);
    expect(findingCodes(report)).toContain(SPECIALIZED_PACK_LOCK_INVALID);
    expect([...(fs.files?.entries() ?? [])]).toEqual(before);
    expect(await fs.exists("https://example.invalid/packs/mlops.json")).toBe(
      false,
    );
  });

  it("returns the same findings and order on repeated Doctor runs", async () => {
    const fs = await adoptedProject(projectFs());
    await applyActivatedPack(fs);
    await tamperLockEntry(fs, (entry) => ({
      ...entry,
      integrity: "sha256:not-a-digest",
      approvedBy: "",
    }));
    const first = await doctorProject(doctorInit, fs);
    const second = await doctorProject(doctorInit, fs);
    expect(first.findings).toEqual(second.findings);
    expect(first.diagnostics).toEqual(second.diagnostics);
  });

  it("exposes S8e findings through the extension health report", async () => {
    const fs = await adoptedProject(projectFs());
    await applyActivatedPack(fs);
    await tamperLockEntry(fs, (entry) => ({
      ...entry,
      integrity: "sha256:not-a-digest",
    }));
    const health = await checkExtensionHealth({ root: projectRoot }, fs);
    expect(health.status).toBe("failed");
    expect(health.findings.map((item) => item.code)).toContain(
      SPECIALIZED_PACK_INTEGRITY_INVALID,
    );
  });
});
