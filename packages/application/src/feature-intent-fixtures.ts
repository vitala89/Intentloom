import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createMemoryFileSystem, type FileSystem } from "./index.js";

export interface FeatureIntentFixtureExpectation {
  readonly title: string;
  readonly packageCount: number;
  readonly expectedPackages: readonly string[];
  readonly publicApiCount: number;
  readonly specializedPackIds: readonly string[];
  readonly foundationPresent: boolean;
  readonly alternativeCount: number;
  readonly mutationAllowed: false;
}

export interface FeatureIntentFixtureEntry {
  readonly fixtureId: string;
  readonly root: string;
  readonly title: string;
  readonly summary: string;
  readonly initialTree: Readonly<Record<string, string>>;
  readonly expected: FeatureIntentFixtureExpectation;
}

export interface FeatureIntentFixtureCatalog {
  readonly fixtures: readonly FeatureIntentFixtureEntry[];
}

export const FEATURE_INTENT_FIXTURE_IDS = [
  "feature-fixture-generic-logging",
  "feature-fixture-typescript-api",
  "feature-fixture-tauri-window",
] as const;

export type FeatureIntentFixtureId =
  (typeof FEATURE_INTENT_FIXTURE_IDS)[number];

export function parseFeatureIntentFixtureCatalog(
  raw: unknown,
): FeatureIntentFixtureCatalog {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error("Invalid feature intent fixture catalog: expected object");
  }
  const record = raw as { fixtures?: unknown };
  if (!Array.isArray(record.fixtures)) {
    throw new Error(
      "Invalid feature intent fixture catalog: fixtures must be array",
    );
  }
  const fixtures = record.fixtures.map((entry) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      throw new Error("Invalid feature intent fixture entry: expected object");
    }
    const fixture = entry as FeatureIntentFixtureEntry;
    if (typeof fixture.fixtureId !== "string") {
      throw new Error("Invalid fixture entry: fixtureId required");
    }
    if (typeof fixture.root !== "string") {
      throw new Error("Invalid fixture entry: root required");
    }
    if (typeof fixture.title !== "string") {
      throw new Error("Invalid fixture entry: title required");
    }
    if (typeof fixture.summary !== "string") {
      throw new Error("Invalid fixture entry: summary required");
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

export function loadFeatureIntentFixtureCatalog(
  path = resolve(
    process.cwd(),
    "tests/fixtures/feature-intent/workspace-states.v1.json",
  ),
): FeatureIntentFixtureCatalog {
  return parseFeatureIntentFixtureCatalog(
    JSON.parse(readFileSync(path, "utf8")) as unknown,
  );
}

export function getFeatureIntentFixture(
  catalog: FeatureIntentFixtureCatalog,
  fixtureId: FeatureIntentFixtureId,
): FeatureIntentFixtureEntry {
  const entry = catalog.fixtures.find(
    (fixture) => fixture.fixtureId === fixtureId,
  );
  if (entry === undefined) {
    throw new Error(`unknown feature intent fixture '${fixtureId}'`);
  }
  return entry;
}

export function createFeatureIntentFixtureFileSystem(
  entry: FeatureIntentFixtureEntry,
): FileSystem & { files: Map<string, string> } {
  const root = resolve(entry.root);
  const initial: Record<string, string> = {};
  for (const [relativePath, content] of Object.entries(entry.initialTree)) {
    initial[join(root, relativePath)] = content;
  }
  return createMemoryFileSystem(initial);
}
