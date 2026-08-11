import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { FoundationWorkshopState } from "@intentloom/protocol";
import { validateFoundationWorkshopState } from "@intentloom/validator";
import { seedFoundationWorkshopStore } from "./foundation-workshop-store.js";

export interface FoundationFixtureEntry {
  readonly fixtureId: string;
  readonly workshop: FoundationWorkshopState;
}

export interface FoundationFixtureCatalog {
  readonly fixtures: readonly FoundationFixtureEntry[];
}

export const FOUNDATION_FIXTURE_IDS = [
  "foundation-fixture-empty-draft",
  "foundation-fixture-partial-discovering",
  "foundation-fixture-readiness-blocking",
  "foundation-fixture-readiness-ready",
  "foundation-fixture-conflict-warning",
  "foundation-fixture-exported",
] as const;

export type FoundationFixtureId = (typeof FOUNDATION_FIXTURE_IDS)[number];

export function parseFoundationFixtureCatalog(
  raw: unknown,
): FoundationFixtureCatalog {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error("Invalid foundation fixture catalog: expected object");
  }
  const record = raw as { fixtures?: unknown };
  if (!Array.isArray(record.fixtures)) {
    throw new Error(
      "Invalid foundation fixture catalog: fixtures must be array",
    );
  }
  const fixtures = record.fixtures.map((entry) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      throw new Error("Invalid foundation fixture entry: expected object");
    }
    const fixture = entry as { fixtureId?: unknown; workshop?: unknown };
    if (typeof fixture.fixtureId !== "string") {
      throw new Error("Invalid foundation fixture entry: fixtureId required");
    }
    return {
      fixtureId: fixture.fixtureId,
      workshop: validateFoundationWorkshopState(fixture.workshop),
    };
  });
  return { fixtures };
}

export function loadFoundationFixtureCatalog(
  path = resolve(
    process.cwd(),
    "tests/fixtures/foundation/workshop-states.v1.json",
  ),
): FoundationFixtureCatalog {
  return parseFoundationFixtureCatalog(
    JSON.parse(readFileSync(path, "utf8")) as unknown,
  );
}

export function getFoundationFixtureWorkshop(
  catalog: FoundationFixtureCatalog,
  fixtureId: FoundationFixtureId,
): FoundationWorkshopState {
  const entry = catalog.fixtures.find(
    (fixture) => fixture.fixtureId === fixtureId,
  );
  if (entry === undefined) {
    throw new Error(`unknown foundation fixture '${fixtureId}'`);
  }
  return entry.workshop;
}

export function installFoundationFixtureCatalog(
  catalog: FoundationFixtureCatalog,
): void {
  seedFoundationWorkshopStore(
    catalog.fixtures.map((fixture) => fixture.workshop),
  );
}

export function installFoundationFixture(
  fixtureId: FoundationFixtureId,
  catalog = loadFoundationFixtureCatalog(),
): FoundationWorkshopState {
  const workshop = getFoundationFixtureWorkshop(catalog, fixtureId);
  seedFoundationWorkshopStore([workshop]);
  return workshop;
}
