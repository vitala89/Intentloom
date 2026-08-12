import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { ExistingProjectScanScope } from "@intentloom/protocol";
import { createMemoryFileSystem, type FileSystem } from "./index.js";

export interface ExistingProjectFixtureExpectation {
  readonly inspectProfile: string;
  readonly inspectReadiness: string;
  readonly inspectFindingCount: number;
  readonly specializedCandidateCount: number;
  readonly compatiblePackIds: readonly string[];
  readonly adoptionOperationCount?: number;
  readonly assessmentFindingsCount?: number;
  readonly doctorFindingCount?: number;
}

export interface ExistingProjectFixtureEntry {
  readonly fixtureId: string;
  readonly root: string;
  readonly scope: ExistingProjectScanScope;
  readonly initialTree: Readonly<Record<string, string>>;
  readonly expected: ExistingProjectFixtureExpectation;
}

export interface ExistingProjectFixtureCatalog {
  readonly fixtures: readonly ExistingProjectFixtureEntry[];
}

export const EXISTING_PROJECT_FIXTURE_IDS = [
  "existing-fixture-generic-uninitialized",
  "existing-fixture-typescript-ready",
  "existing-fixture-tauri-detected",
] as const;

export type ExistingProjectFixtureId =
  (typeof EXISTING_PROJECT_FIXTURE_IDS)[number];

export function parseExistingProjectFixtureCatalog(
  raw: unknown,
): ExistingProjectFixtureCatalog {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error(
      "Invalid existing project fixture catalog: expected object",
    );
  }
  const record = raw as { fixtures?: unknown };
  if (!Array.isArray(record.fixtures)) {
    throw new Error(
      "Invalid existing project fixture catalog: fixtures must be array",
    );
  }
  const fixtures = record.fixtures.map((entry) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      throw new Error(
        "Invalid existing project fixture entry: expected object",
      );
    }
    const fixture = entry as ExistingProjectFixtureEntry;
    if (typeof fixture.fixtureId !== "string") {
      throw new Error("Invalid fixture entry: fixtureId required");
    }
    if (typeof fixture.root !== "string") {
      throw new Error("Invalid fixture entry: root required");
    }
    if (
      fixture.scope !== "quick" &&
      fixture.scope !== "standard" &&
      fixture.scope !== "deep"
    ) {
      throw new Error("Invalid fixture entry: scope required");
    }
    if (
      typeof fixture.initialTree !== "object" ||
      fixture.initialTree === null
    ) {
      throw new Error("Invalid fixture entry: initialTree required");
    }
    return fixture;
  });
  return { fixtures };
}

export function loadExistingProjectFixtureCatalog(
  path = resolve(
    process.cwd(),
    "tests/fixtures/existing-project/workspace-states.v1.json",
  ),
): ExistingProjectFixtureCatalog {
  return parseExistingProjectFixtureCatalog(
    JSON.parse(readFileSync(path, "utf8")) as unknown,
  );
}

export function getExistingProjectFixture(
  catalog: ExistingProjectFixtureCatalog,
  fixtureId: ExistingProjectFixtureId,
): ExistingProjectFixtureEntry {
  const entry = catalog.fixtures.find(
    (fixture) => fixture.fixtureId === fixtureId,
  );
  if (entry === undefined) {
    throw new Error(`unknown existing project fixture '${fixtureId}'`);
  }
  return entry;
}

export function createExistingProjectFixtureFileSystem(
  entry: ExistingProjectFixtureEntry,
): FileSystem & { files: Map<string, string> } {
  const initial: Record<string, string> = {};
  for (const [relativePath, content] of Object.entries(entry.initialTree)) {
    initial[join(entry.root, relativePath)] = content;
  }
  return createMemoryFileSystem(initial);
}
