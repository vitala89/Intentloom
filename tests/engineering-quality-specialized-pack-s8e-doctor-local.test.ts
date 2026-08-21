import { describe, expect, it } from "vitest";
import {
  computeExternalSpecializedPackDigest,
  doctorExitCode,
  doctorProject,
} from "@intentloom/application";
import {
  SPECIALIZED_PACK_LOCK_INVALID,
  SPECIALIZED_PACK_MANIFEST_DIGEST_MISMATCH,
  SPECIALIZED_PACK_MANIFEST_IDENTITY_MISMATCH,
  SPECIALIZED_PACK_MANIFEST_MISSING,
} from "@intentloom/application";
import {
  adoptedProject,
  applyActivatedPack,
  doctorInit,
  externalManifest,
  findingCodes,
  localManifestPath,
  projectFs,
  projectRoot,
  tamperLockEntry,
} from "./specialized-pack-s8e-doctor-fixture.js";

async function writeLocalManifest(
  fs: Awaited<ReturnType<typeof projectFs>>,
  manifest = externalManifest(),
) {
  await fs.write(localManifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

describe("S8e Doctor local specialized-pack manifest health", () => {
  it("accepts a matching local manifest without specialized-pack errors", async () => {
    const fs = await adoptedProject(projectFs());
    const manifest = externalManifest();
    await writeLocalManifest(fs, manifest);
    await applyActivatedPack(fs);
    const report = await doctorProject(doctorInit, fs);
    expect(
      findingCodes(report).filter((code) =>
        code.startsWith("specialized-pack-"),
      ),
    ).toEqual([]);
    expect(findingCodes(report)).toContain("installation-healthy");
    expect(doctorExitCode(report)).toBe(0);
  });

  it("warns when the referenced local manifest is missing", async () => {
    const fs = await adoptedProject(projectFs());
    await applyActivatedPack(fs);
    const report = await doctorProject(doctorInit, fs);
    expect(findingCodes(report)).toContain(SPECIALIZED_PACK_MANIFEST_MISSING);
    expect(
      report.findings.find(
        (finding) => finding.code === SPECIALIZED_PACK_MANIFEST_MISSING,
      )?.severity,
    ).toBe("warning");
    expect(findingCodes(report)).toContain("installation-healthy");
    expect(doctorExitCode(report)).toBe(0);
  });

  it("reports a digest mismatch against the local manifest", async () => {
    const fs = await adoptedProject(projectFs());
    await applyActivatedPack(fs);
    await writeLocalManifest(
      fs,
      externalManifest({ providedRuleIds: ["MLOPS-002-other"] }),
    );
    const report = await doctorProject(doctorInit, fs);
    expect(findingCodes(report)).toContain(
      SPECIALIZED_PACK_MANIFEST_DIGEST_MISMATCH,
    );
    expect(findingCodes(report)).not.toContain("installation-healthy");
    expect(doctorExitCode(report)).toBe(3);
  });

  it("reports a manifest identity mismatch when digest still matches the file", async () => {
    const fs = await adoptedProject(projectFs());
    await applyActivatedPack(fs);
    const other = externalManifest({ id: "pack-other-identity" });
    await writeLocalManifest(fs, other);
    await tamperLockEntry(fs, (entry) => ({
      ...entry,
      integrity: computeExternalSpecializedPackDigest(other),
    }));
    const report = await doctorProject(doctorInit, fs);
    expect(findingCodes(report)).toContain(
      SPECIALIZED_PACK_MANIFEST_IDENTITY_MISMATCH,
    );
    expect(findingCodes(report)).not.toContain("installation-healthy");
  });

  it("reports a version mismatch when the local manifest digest still matches", async () => {
    const fs = await adoptedProject(projectFs());
    await applyActivatedPack(fs);
    const other = externalManifest({ version: "2.0.0" });
    await writeLocalManifest(fs, other);
    await tamperLockEntry(fs, (entry) => ({
      ...entry,
      integrity: computeExternalSpecializedPackDigest(other),
    }));
    const report = await doctorProject(doctorInit, fs);
    expect(findingCodes(report)).toContain(
      SPECIALIZED_PACK_MANIFEST_IDENTITY_MISMATCH,
    );
  });

  it("reports a malformed local manifest without writing", async () => {
    const fs = await adoptedProject(projectFs());
    await applyActivatedPack(fs);
    await fs.write(localManifestPath, "{not-json");
    const before = [...(fs.files?.entries() ?? [])];
    const report = await doctorProject(doctorInit, fs);
    expect(findingCodes(report)).toContain(SPECIALIZED_PACK_LOCK_INVALID);
    expect([...(fs.files?.entries() ?? [])]).toEqual(before);
  });

  it("rejects an oversized local manifest", async () => {
    const fs = await adoptedProject(projectFs());
    await applyActivatedPack(fs);
    await fs.write(localManifestPath, `${"x".repeat(2_000_001)}`);
    const report = await doctorProject(doctorInit, fs);
    expect(findingCodes(report)).toContain(SPECIALIZED_PACK_LOCK_INVALID);
    expect(
      report.findings.some((finding) =>
        finding.message.includes("exceeds the size bound"),
      ),
    ).toBe(true);
  });

  it("does not follow a local path traversal locator", async () => {
    const fs = await adoptedProject(projectFs());
    await applyActivatedPack(fs);
    await fs.write(`${projectRoot}/secret.json`, '{"id":"nope"}');
    await tamperLockEntry(fs, (entry) => ({
      ...entry,
      source: {
        registry: "local",
        package: "./../secret.json",
        resolved: "local-v1",
      },
    }));
    const report = await doctorProject(doctorInit, fs);
    expect(findingCodes(report)).toContain(SPECIALIZED_PACK_LOCK_INVALID);
    expect(findingCodes(report)).not.toContain(
      SPECIALIZED_PACK_MANIFEST_DIGEST_MISMATCH,
    );
  });

  it("rejects a local manifest symbolic link", async () => {
    const fs = await adoptedProject(
      projectFs({}, { symlinkPaths: [localManifestPath] }),
    );
    await writeLocalManifest(fs);
    await applyActivatedPack(fs);
    const report = await doctorProject(doctorInit, fs);
    expect(findingCodes(report)).toContain(SPECIALIZED_PACK_LOCK_INVALID);
    expect(
      report.findings.some((finding) =>
        finding.message.includes("symbolic link"),
      ),
    ).toBe(true);
  });
});
