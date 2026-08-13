import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createMemoryFileSystem, type FileSystem } from "./index.js";

export interface BoundedExecutionFixtureExpectation {
  readonly executionGate: string;
  readonly mutationAllowed: boolean;
  readonly diagnosticIncludes?: string;
}

export interface BoundedExecutionFixtureEntry {
  readonly fixtureId: string;
  readonly root: string;
  readonly title: string;
  readonly summary: string;
  readonly initialTree: Readonly<Record<string, string>>;
  readonly planApproval?: string;
  readonly requestedNetworkAccess?: boolean;
  readonly requestedProcessExecution?: boolean;
  readonly requestedAllowedCommands?: readonly string[];
  readonly requestedAllowedPaths?: readonly string[];
  readonly requestedRoot?: string;
  readonly proposedPaths?: readonly string[];
  readonly applyRequested?: boolean;
  readonly grantedApprovals?: readonly string[];
  readonly applyFiles?: readonly {
    readonly path: string;
    readonly content: string;
  }[];
  readonly expected: BoundedExecutionFixtureExpectation;
}

export interface BoundedExecutionFixtureCatalog {
  readonly fixtures: readonly BoundedExecutionFixtureEntry[];
}

export const BOUNDED_EXECUTION_FIXTURE_IDS = [
  "bounded-fixture-ready-logging",
  "bounded-fixture-blocked-unapproved",
  "bounded-fixture-unsupported-network",
  "bounded-fixture-path-widening",
] as const;

export type BoundedExecutionFixtureId =
  (typeof BOUNDED_EXECUTION_FIXTURE_IDS)[number];

export function parseBoundedExecutionFixtureCatalog(
  raw: unknown,
): BoundedExecutionFixtureCatalog {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error(
      "Invalid bounded execution fixture catalog: expected object",
    );
  }
  const record = raw as { fixtures?: unknown };
  if (!Array.isArray(record.fixtures)) {
    throw new Error(
      "Invalid bounded execution fixture catalog: fixtures must be array",
    );
  }
  const fixtures = record.fixtures.map((entry) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      throw new Error(
        "Invalid bounded execution fixture entry: expected object",
      );
    }
    const fixture = entry as BoundedExecutionFixtureEntry;
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
    return fixture;
  });
  return { fixtures };
}

export function loadBoundedExecutionFixtureCatalog(
  path = resolve(
    process.cwd(),
    "tests/fixtures/bounded-execution/workspace-states.v1.json",
  ),
): BoundedExecutionFixtureCatalog {
  return parseBoundedExecutionFixtureCatalog(
    JSON.parse(readFileSync(path, "utf8")) as unknown,
  );
}

export function getBoundedExecutionFixture(
  catalog: BoundedExecutionFixtureCatalog,
  fixtureId: BoundedExecutionFixtureId,
): BoundedExecutionFixtureEntry {
  const entry = catalog.fixtures.find(
    (fixture) => fixture.fixtureId === fixtureId,
  );
  if (entry === undefined) {
    throw new Error(`unknown bounded execution fixture '${fixtureId}'`);
  }
  return entry;
}

export function createBoundedExecutionFixtureFileSystem(
  entry: BoundedExecutionFixtureEntry,
): FileSystem & { files: Map<string, string> } {
  const root = resolve(entry.root);
  const initial: Record<string, string> = {};
  for (const [relativePath, content] of Object.entries(entry.initialTree)) {
    initial[join(root, relativePath)] = content;
  }
  return createMemoryFileSystem(initial);
}
