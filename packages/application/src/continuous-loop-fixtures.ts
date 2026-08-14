import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type {
  ContinuousLoopChangeKind,
  ContinuousLoopSnapshot,
} from "@intentloom/protocol";
import { createMemoryFileSystem, type FileSystem } from "./index.js";

export interface ContinuousLoopFixtureExpectation {
  readonly loopGate: string;
  readonly mutationAllowed: boolean;
  readonly diagnosticIncludes?: string;
}

export interface ContinuousLoopFixtureEntry {
  readonly fixtureId: string;
  readonly root: string;
  readonly previous: ContinuousLoopSnapshot;
  readonly current: ContinuousLoopSnapshot;
  readonly initialTree: Readonly<Record<string, string>>;
  readonly projectId?: string;
  readonly changeKind?: ContinuousLoopChangeKind;
  readonly memoryContent?: string;
  readonly applyRequested?: boolean;
  readonly grantedApprovals?: readonly string[];
  readonly expected: ContinuousLoopFixtureExpectation;
}

export interface ContinuousLoopFixtureCatalog {
  readonly fixtures: readonly ContinuousLoopFixtureEntry[];
}

export const CONTINUOUS_LOOP_FIXTURE_IDS = [
  "loop-fixture-ready-memory",
  "loop-fixture-blocked-unapproved",
  "loop-fixture-incompatible-history",
  "loop-fixture-model-interpretation",
] as const;

export type ContinuousLoopFixtureId =
  (typeof CONTINUOUS_LOOP_FIXTURE_IDS)[number];

export function parseContinuousLoopFixtureCatalog(
  raw: unknown,
): ContinuousLoopFixtureCatalog {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error("Invalid continuous loop fixture catalog: expected object");
  }
  const record = raw as { fixtures?: unknown };
  if (!Array.isArray(record.fixtures)) {
    throw new Error(
      "Invalid continuous loop fixture catalog: fixtures must be array",
    );
  }
  const fixtures = record.fixtures.map((entry) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      throw new Error("Invalid continuous loop fixture entry: expected object");
    }
    const fixture = entry as ContinuousLoopFixtureEntry;
    if (typeof fixture.fixtureId !== "string") {
      throw new Error("Invalid fixture entry: fixtureId required");
    }
    if (typeof fixture.root !== "string") {
      throw new Error("Invalid fixture entry: root required");
    }
    return fixture;
  });
  return { fixtures };
}

export function loadContinuousLoopFixtureCatalog(
  path = resolve(
    process.cwd(),
    "tests/fixtures/continuous-loop/workspace-states.v1.json",
  ),
): ContinuousLoopFixtureCatalog {
  return parseContinuousLoopFixtureCatalog(
    JSON.parse(readFileSync(path, "utf8")) as unknown,
  );
}

export function getContinuousLoopFixture(
  catalog: ContinuousLoopFixtureCatalog,
  fixtureId: ContinuousLoopFixtureId,
): ContinuousLoopFixtureEntry {
  const entry = catalog.fixtures.find(
    (fixture) => fixture.fixtureId === fixtureId,
  );
  if (entry === undefined) {
    throw new Error(`unknown continuous loop fixture '${fixtureId}'`);
  }
  return entry;
}

export function createContinuousLoopFixtureFileSystem(
  entry: ContinuousLoopFixtureEntry,
): FileSystem & { files: Map<string, string> } {
  const root = resolve(entry.root);
  const initial: Record<string, string> = {};
  for (const [relativePath, content] of Object.entries(entry.initialTree)) {
    initial[join(root, relativePath)] = content;
  }
  return createMemoryFileSystem(initial);
}
