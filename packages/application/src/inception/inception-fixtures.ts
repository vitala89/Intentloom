import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { InceptionSessionState } from "@intentloom/protocol";
import { validateInceptionSessionState } from "@intentloom/validator";
import {
  clearInceptionSessionStore,
  registerInceptionSession,
  seedInceptionSessionStore,
} from "./inception-session-store.js";

export interface InceptionFixtureEntry {
  readonly fixtureId: string;
  readonly session: InceptionSessionState;
}

export interface InceptionFixtureCatalog {
  readonly fixtures: readonly InceptionFixtureEntry[];
}

export const INCEPTION_FIXTURE_IDS = [
  "inception-fixture-empty-discovering",
  "inception-fixture-partial-discovering",
  "inception-fixture-ready-blueprinting",
  "inception-fixture-conflict-warning",
  "inception-fixture-cancelled",
  "inception-fixture-summary-complete",
] as const;

export type InceptionFixtureId = (typeof INCEPTION_FIXTURE_IDS)[number];

export function parseInceptionFixtureCatalog(
  value: unknown,
): InceptionFixtureCatalog {
  if (
    typeof value !== "object" ||
    value === null ||
    !Array.isArray((value as { fixtures?: unknown }).fixtures)
  ) {
    throw new Error("Invalid inception fixture catalog");
  }
  const fixtures = (value as { fixtures: unknown[] }).fixtures.map((entry) => {
    if (typeof entry !== "object" || entry === null) {
      throw new Error("Invalid inception fixture entry");
    }
    const record = entry as { fixtureId?: unknown; session?: unknown };
    if (typeof record.fixtureId !== "string" || record.fixtureId.length === 0) {
      throw new Error("Invalid fixtureId");
    }
    return {
      fixtureId: record.fixtureId,
      session: validateInceptionSessionState(record.session),
    };
  });
  return { fixtures };
}

export async function loadInceptionFixtureCatalog(
  fixturePath = resolve(
    process.cwd(),
    "tests/fixtures/inception/session-states.v1.json",
  ),
): Promise<InceptionFixtureCatalog> {
  const source = await readFile(fixturePath, "utf8");
  return parseInceptionFixtureCatalog(JSON.parse(source));
}

export function getInceptionFixtureSession(
  catalog: InceptionFixtureCatalog,
  fixtureId: InceptionFixtureId,
): InceptionSessionState {
  const entry = catalog.fixtures.find(
    (fixture) => fixture.fixtureId === fixtureId,
  );
  if (entry === undefined) {
    throw new Error(`unknown inception fixture '${fixtureId}'`);
  }
  return entry.session;
}

export function installInceptionFixtureCatalog(
  catalog: InceptionFixtureCatalog,
): void {
  clearInceptionSessionStore();
  seedInceptionSessionStore(catalog.fixtures.map((fixture) => fixture.session));
}

export function installInceptionFixture(
  catalog: InceptionFixtureCatalog,
  fixtureId: InceptionFixtureId,
): InceptionSessionState {
  const session = getInceptionFixtureSession(catalog, fixtureId);
  registerInceptionSession(session);
  return session;
}
