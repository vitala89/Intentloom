import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  clearFoundationWorkshopStore,
  identifyFoundationWorkshopConflicts,
  installFoundationFixtureCatalog,
  loadFoundationFixtureCatalog,
  runFoundationCliCommand,
  summarizeFoundationUnderstandingViewmodel,
} from "@intentloom/application";

const fixturePath = resolve(
  process.cwd(),
  "tests/fixtures/foundation/workshop-states.v1.json",
);

afterEach(() => {
  clearFoundationWorkshopStore();
});

describe("Engineering Workspace W2: foundation CLI JSON surface", () => {
  it("loads frozen fixture catalog and serves get/summarize/conflicts/readiness via CLI", async () => {
    const catalog = loadFoundationFixtureCatalog(fixturePath);
    installFoundationFixtureCatalog(catalog);

    const empty = await runResult("get", {
      workshopId: "fnd_fixture_empty_draft",
    });
    expect(empty.schemaVersion).toBe(
      "urn:intentloom:schema:foundation-workshop:1",
    );

    const summary = await runResult("summarize", {
      workshopId: "fnd_fixture_readiness_ready",
    });
    expect(summary).toEqual(
      summarizeFoundationUnderstandingViewmodel("fnd_fixture_readiness_ready"),
    );

    const conflicts = await runResult("conflicts", {
      workshopId: "fnd_fixture_conflict_warning",
    });
    expect(conflicts).toEqual(
      identifyFoundationWorkshopConflicts("fnd_fixture_conflict_warning"),
    );
    expect(
      (conflicts as { conflicts: readonly unknown[] }).conflicts.length,
    ).toBeGreaterThan(0);

    const readiness = await runResult("readiness", {
      workshopId: "fnd_fixture_readiness_ready",
    });
    expect(readiness).toMatchObject({
      schemaVersion: "urn:intentloom:schema:foundation-readiness-report:1",
      workshopId: "fnd_fixture_readiness_ready",
      readinessStatus: "ready",
      blockingCount: 0,
    });
  });

  it("creates, exports, and deletes a workshop without project-root writes", async () => {
    const started = await runResult("start", {
      root: "/tmp/foundation-cli-start",
      idea: "CLI start test",
    });
    const workshopId = (started as { workshop: { id: string } }).workshop.id;

    const exported = await runResult("export", { workshopId });
    expect(exported).toMatchObject({
      schemaVersion: "urn:intentloom:schema:foundation-workshop-export:1",
      workshop: { id: workshopId },
    });

    const deleted = await runResult("delete", { workshopId });
    expect(deleted).toMatchObject({
      schemaVersion: "urn:intentloom:schema:foundation-workshop-delete:1",
      workshopId,
      deleted: true,
    });

    const missing = await runFoundationCliCommand("get", {
      workshopId,
      json: true,
    });
    expect(missing.exitCode).toBe(1);
  });
});

async function runResult(
  command: Parameters<typeof runFoundationCliCommand>[0],
  args: Parameters<typeof runFoundationCliCommand>[1],
): Promise<unknown> {
  const result = await runFoundationCliCommand(command, {
    ...args,
    json: true,
  });
  expect(result.exitCode).toBe(0);
  return JSON.parse(result.stdout);
}
