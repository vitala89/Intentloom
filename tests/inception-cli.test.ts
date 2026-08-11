import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  clearInceptionSessionStore,
  identifyInceptionSessionConflicts,
  installInceptionFixtureCatalog,
  loadInceptionFixtureCatalog,
  runInceptionCliCommand,
  summarizeInceptionSessionViewmodel,
} from "@intentloom/application";

const fixturePath = resolve(
  process.cwd(),
  "tests/fixtures/inception/session-states.v1.json",
);

afterEach(() => {
  clearInceptionSessionStore();
});

describe("Engineering Workspace W1: inception CLI JSON surface", () => {
  it("loads frozen fixture catalog and serves get/summarize/conflicts via CLI", async () => {
    const catalog = await loadInceptionFixtureCatalog(fixturePath);
    installInceptionFixtureCatalog(catalog);

    const empty = await runResult("get", {
      sessionId: "inc_fixture_empty_discovering",
    });
    expect(empty.schemaVersion).toBe(
      "urn:intentloom:schema:inception-session:1",
    );

    const summary = await runResult("summarize", {
      sessionId: "inc_fixture_summary_complete",
    });
    expect(summary).toEqual(
      summarizeInceptionSessionViewmodel("inc_fixture_summary_complete"),
    );

    const conflicts = await runResult("conflicts", {
      sessionId: "inc_fixture_conflict_warning",
    });
    expect(conflicts).toEqual(
      identifyInceptionSessionConflicts("inc_fixture_conflict_warning"),
    );
    expect(
      (conflicts as { conflicts: readonly unknown[] }).conflicts.length,
    ).toBeGreaterThan(0);
  });

  it("creates, exports, and deletes a session without project-root writes", async () => {
    const started = await runResult("start", {
      root: "/tmp/inception-cli-start",
      idea: "CLI start test",
    });
    const sessionId = (started as { session: { id: string } }).session.id;

    const exported = await runResult("export", { sessionId });
    expect(exported).toMatchObject({
      schemaVersion: "urn:intentloom:schema:inception-session-export:1",
      session: { id: sessionId },
    });

    const deleted = await runResult("delete", { sessionId });
    expect(deleted).toMatchObject({
      schemaVersion: "urn:intentloom:schema:inception-session-delete:1",
      sessionId,
      deleted: true,
    });

    const missing = runInceptionCliCommand("get", { sessionId, json: true });
    expect(missing.exitCode).toBe(1);
  });
});

async function runResult(
  command: Parameters<typeof runInceptionCliCommand>[0],
  args: Parameters<typeof runInceptionCliCommand>[1],
): Promise<unknown> {
  const result = runInceptionCliCommand(command, { ...args, json: true });
  expect(result.exitCode).toBe(0);
  return JSON.parse(result.stdout);
}
