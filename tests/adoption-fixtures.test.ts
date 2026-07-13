import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  adoptProject,
  createMemoryFileSystem,
  doctorExitCode,
  doctorProject,
  initProject,
  type AdoptionAction,
  type DetectedProfile,
} from "@aif/cli";

interface AdoptionFixture {
  readonly name: string;
  readonly initialTree: Readonly<Record<string, string>>;
  readonly preparation?: string;
  readonly projectOwned: readonly string[];
  readonly expectedProfile: DetectedProfile;
  readonly expectedOwnership: Readonly<Record<string, string>>;
  readonly expectedAdoptionProposal: readonly AdoptionAction[];
  readonly expectedDoctorFindings: readonly string[];
  readonly expectedExitCode: 0 | 3;
  readonly unchangedPaths: readonly string[];
  readonly reportedCases: readonly string[];
  readonly variants?: readonly {
    readonly name: string;
    readonly removeAfterInitialize: readonly string[];
    readonly expectedDoctorFindings: readonly string[];
  }[];
}

const fixtureRoot = resolve("tests/fixtures/adoption");
let fixtures: AdoptionFixture[];

beforeAll(async () => {
  fixtures = await Promise.all(
    (await readdir(fixtureRoot, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()
      .map(async (directory) =>
        JSON.parse(
          await readFile(
            resolve(fixtureRoot, directory, "fixture.json"),
            "utf8",
          ),
        ),
      ),
  );
});

describe("reusable adoption fixture metadata", () => {
  it("independently reports every required repository-state category", () => {
    expect(fixtures).toHaveLength(16);
    const reported = fixtures.flatMap((fixture) => fixture.reportedCases);
    expect(new Set(reported).size).toBeGreaterThanOrEqual(50);
    for (const fixture of fixtures) {
      expect(fixture.name).toBeTruthy();
      expect(fixture.expectedAdoptionProposal.length).toBeGreaterThan(0);
      expect(fixture.expectedDoctorFindings.length).toBeGreaterThan(0);
      expect(new Set(fixture.unchangedPaths).size).toBe(
        fixture.unchangedPaths.length,
      );
    }
  });

  it("runs every directly materialized fixture deterministically and read-only", async () => {
    for (const fixture of fixtures) {
      const initial = Object.fromEntries(
        Object.entries(fixture.initialTree).map(([path, content]) => [
          `/project/${path}`,
          content,
        ]),
      );
      const fs = createMemoryFileSystem(initial);
      const options = {
        root: "/project",
        profile: fixture.expectedProfile,
        adapters: ["codex"] as const,
        dryRun: true,
      };
      if (fixture.preparation === "initialize-codex") {
        await initProject({ ...options, dryRun: false }, fs);
        if (fixture.name === "stale-aif") {
          const manifestPath = "/project/.aif/manifest.lock.json";
          const sourceMapPath = "/project/.aif/source-map.json";
          const manifest = JSON.parse(await fs.read(manifestPath));
          const sourceMap = JSON.parse(await fs.read(sourceMapPath));
          manifest.frameworkVersion = "0.0.1";
          manifest.adapterOutputVersion = "0.0.1";
          manifest.schemaVersion = "2";
          sourceMap.frameworkVersion = "0.0.1";
          sourceMap.adapterOutputVersion = "0.0.1";
          await fs.write(manifestPath, `${JSON.stringify(manifest)}\n`);
          await fs.write(sourceMapPath, `${JSON.stringify(sourceMap)}\n`);
        } else if (fixture.name === "corrupted-aif") {
          await fs.write("/project/.aif/config.yaml", "malformed: [");
          await fs.write("/project/.aif/manifest.lock.json", "{");
          await fs.write("/project/.aif/source-map.json", "{");
        } else if (fixture.name === "conflicting-aif") {
          const manifestPath = "/project/.aif/manifest.lock.json";
          const sourceMapPath = "/project/.aif/source-map.json";
          const manifest = JSON.parse(await fs.read(manifestPath));
          const sourceMap = JSON.parse(await fs.read(sourceMapPath));
          manifest.adapters = [{ id: "claude", version: "0.1.0" }];
          manifest.generated.push({
            path: "orphan.md",
            checksum: "a".repeat(64),
          });
          sourceMap.files.push({
            path: "orphan.md",
            checksum: "a".repeat(64),
            sources: ["policies/core.md"],
            ownership: "aif-owned-generated",
          });
          await fs.write(manifestPath, `${JSON.stringify(manifest)}\n`);
          await fs.write(sourceMapPath, `${JSON.stringify(sourceMap)}\n`);
        }
      }
      const before = [...fs.files.entries()];
      const beforeMap = new Map(before);
      const firstProposal = await adoptProject(options, fs);
      const secondProposal = await adoptProject(options, fs);
      const firstDoctor = await doctorProject(options, fs);
      const secondDoctor = await doctorProject(options, fs);
      expect(firstProposal, fixture.name).toEqual(secondProposal);
      expect(firstDoctor, fixture.name).toEqual(secondDoctor);
      expect([...fs.files.entries()], fixture.name).toEqual(before);
      expect(firstProposal.profileDetection.selectedProfile, fixture.name).toBe(
        fixture.expectedProfile,
      );
      const actions = firstProposal.items.map((item) => item.action);
      for (const action of fixture.expectedAdoptionProposal)
        expect(actions, `${fixture.name}:${action}`).toContain(action);
      for (const item of firstProposal.items.filter(
        (candidate) =>
          candidate.action === "conflict" ||
          candidate.action === "manual-decision-required",
      ))
        expect(item.writeEligible, `${fixture.name}:${item.path}:write`).toBe(
          false,
        );
      for (const [path, classification] of Object.entries(
        fixture.expectedOwnership,
      ))
        expect(
          firstProposal.items.find((item) => item.path === path)
            ?.currentClassification,
          `${fixture.name}:${path}`,
        ).toBe(classification);
      const codes = firstDoctor.findings.map((finding) => finding.code);
      for (const code of fixture.expectedDoctorFindings)
        expect(codes, `${fixture.name}:${code}`).toContain(code);
      expect(doctorExitCode(firstDoctor), fixture.name).toBe(
        fixture.expectedExitCode,
      );
      expect(JSON.stringify(firstProposal), fixture.name).not.toContain(
        "/project/",
      );
      expect(JSON.stringify(firstDoctor), fixture.name).not.toContain(
        "/project/",
      );
      for (const path of fixture.unchangedPaths)
        expect(
          fs.files.get(`/project/${path}`),
          `${fixture.name}:${path}`,
        ).toBe(beforeMap.get(`/project/${path}`));
    }
  });

  it("executes every declared partial-install variant read-only", async () => {
    const fixture = fixtures.find(
      (candidate) => candidate.name === "partial-aif",
    );
    expect(fixture?.variants).toHaveLength(3);
    for (const variant of fixture?.variants ?? []) {
      const fs = createMemoryFileSystem();
      const options = {
        root: "/project",
        profile: "generic" as const,
        adapters: ["codex"] as const,
        dryRun: true,
      };
      await initProject({ ...options, dryRun: false }, fs);
      for (const path of variant.removeAfterInitialize)
        await fs.remove(`/project/${path}`);
      const before = [...fs.files.entries()];
      const firstProposal = await adoptProject(options, fs);
      const secondProposal = await adoptProject(options, fs);
      const firstDoctor = await doctorProject(options, fs);
      const secondDoctor = await doctorProject(options, fs);
      expect(firstProposal, variant.name).toEqual(secondProposal);
      expect(firstDoctor, variant.name).toEqual(secondDoctor);
      expect([...fs.files.entries()], variant.name).toEqual(before);
      const codes = firstDoctor.findings.map((finding) => finding.code);
      for (const code of variant.expectedDoctorFindings)
        expect(codes, `${variant.name}:${code}`).toContain(code);
      expect(doctorExitCode(firstDoctor), variant.name).toBe(3);
    }
  });
});
