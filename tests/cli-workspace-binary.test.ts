import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  clearFoundationBlueprintStore,
  clearFoundationWorkshopStore,
  clearInceptionSessionStore,
  compareFoundationBlueprintTiers,
  createFoundationWorkshop,
  identifyFoundationWorkshopConflicts,
  identifyInceptionSessionConflicts,
  installFoundationFixtureCatalog,
  installInceptionFixtureCatalog,
  loadFoundationFixtureCatalog,
  loadInceptionFixtureCatalog,
  recordFoundationWorkshopAnswer,
  summarizeFoundationUnderstandingViewmodel,
  summarizeInceptionSessionViewmodel,
} from "@intentloom/application";
import { runCliEntry } from "../packages/cli/src/cli-entry.js";

const inceptionFixturePath = resolve(
  process.cwd(),
  "tests/fixtures/inception/session-states.v1.json",
);
const foundationFixturePath = resolve(
  process.cwd(),
  "tests/fixtures/foundation/workshop-states.v1.json",
);
const catalogRoot = resolve(process.cwd(), "catalog");

afterEach(() => {
  clearInceptionSessionStore();
  clearFoundationWorkshopStore();
  clearFoundationBlueprintStore();
});

describe("Engineering Workspace W5: inception binary CLI routing", () => {
  it("routes get/summarize/conflicts through intentloom inception", async () => {
    const catalog = await loadInceptionFixtureCatalog(inceptionFixturePath);
    installInceptionFixtureCatalog(catalog);

    const empty = await runBinaryJson([
      "inception",
      "get",
      "--session-id",
      "inc_fixture_empty_discovering",
      "--json",
    ]);
    expect(empty.schemaVersion).toBe(
      "urn:intentloom:schema:inception-session:1",
    );

    const summary = await runBinaryJson([
      "inception",
      "summarize",
      "--session-id",
      "inc_fixture_summary_complete",
      "--json",
    ]);
    expect(summary).toEqual(
      summarizeInceptionSessionViewmodel("inc_fixture_summary_complete"),
    );

    const conflicts = await runBinaryJson([
      "inception",
      "conflicts",
      "--session-id",
      "inc_fixture_conflict_warning",
      "--json",
    ]);
    expect(conflicts).toEqual(
      identifyInceptionSessionConflicts("inc_fixture_conflict_warning"),
    );
  });

  it("creates, exports, and deletes a session through the binary CLI", async () => {
    const binaryStart = await runBinaryJson([
      "inception",
      "start",
      "--root",
      "/tmp/inception-binary-start",
      "--idea",
      "Binary start test",
      "--json",
    ]);
    const sessionId = (binaryStart as { session: { id: string } }).session.id;

    const binaryExport = await runBinaryJson([
      "inception",
      "export",
      "--session-id",
      sessionId,
      "--json",
    ]);
    expect(binaryExport).toMatchObject({
      schemaVersion: "urn:intentloom:schema:inception-session-export:1",
      session: { id: sessionId },
    });

    const binaryDelete = await runBinaryJson([
      "inception",
      "delete",
      "--session-id",
      sessionId,
      "--json",
    ]);
    expect(binaryDelete).toMatchObject({
      schemaVersion: "urn:intentloom:schema:inception-session-delete:1",
      sessionId,
      deleted: true,
    });

    const missing = await runBinary([
      "inception",
      "get",
      "--session-id",
      sessionId,
      "--json",
    ]);
    expect(missing.exitCode).toBe(2);
  });

  it("rejects unknown inception subcommands with usage", async () => {
    const stderr: string[] = [];
    const exitCode = await runCliEntry(
      ["inception", "unknown"],
      { catalogRoot },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );
    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toContain("Usage: intentloom inception");
  });
});

describe("Engineering Workspace W5: foundation binary CLI routing", () => {
  it("routes get/summarize/conflicts/readiness through intentloom foundation", async () => {
    const catalog = loadFoundationFixtureCatalog(foundationFixturePath);
    installFoundationFixtureCatalog(catalog);

    const empty = await runBinaryJson([
      "foundation",
      "get",
      "--workshop-id",
      "fnd_fixture_empty_draft",
      "--json",
    ]);
    expect(empty.schemaVersion).toBe(
      "urn:intentloom:schema:foundation-workshop:1",
    );

    const summary = await runBinaryJson([
      "foundation",
      "summarize",
      "--workshop-id",
      "fnd_fixture_readiness_ready",
      "--json",
    ]);
    expect(summary).toEqual(
      summarizeFoundationUnderstandingViewmodel("fnd_fixture_readiness_ready"),
    );

    const conflicts = await runBinaryJson([
      "foundation",
      "conflicts",
      "--workshop-id",
      "fnd_fixture_conflict_warning",
      "--json",
    ]);
    expect(conflicts).toEqual(
      identifyFoundationWorkshopConflicts("fnd_fixture_conflict_warning"),
    );

    const readiness = await runBinaryJson([
      "foundation",
      "readiness",
      "--workshop-id",
      "fnd_fixture_readiness_blocking",
      "--json",
    ]);
    expect(readiness).toMatchObject({
      schemaVersion: "urn:intentloom:schema:foundation-readiness-report:1",
      workshopId: "fnd_fixture_readiness_blocking",
      readinessStatus: "blocked",
      blockingCount: expect.any(Number),
    });
  });

  it("creates, exports, and deletes a workshop through the binary CLI", async () => {
    const binaryStart = await runBinaryJson([
      "foundation",
      "start",
      "--root",
      "/tmp/foundation-binary-start",
      "--idea",
      "Binary foundation start",
      "--json",
    ]);
    const workshopId = (binaryStart as { workshop: { id: string } }).workshop
      .id;

    const binaryExport = await runBinaryJson([
      "foundation",
      "export",
      "--workshop-id",
      workshopId,
      "--json",
    ]);
    expect(binaryExport).toMatchObject({
      schemaVersion: "urn:intentloom:schema:foundation-workshop-export:1",
      workshop: { id: workshopId },
    });

    const binaryDelete = await runBinaryJson([
      "foundation",
      "delete",
      "--workshop-id",
      workshopId,
      "--json",
    ]);
    expect(binaryDelete).toMatchObject({
      schemaVersion: "urn:intentloom:schema:foundation-workshop-delete:1",
      workshopId,
      deleted: true,
    });

    const missing = await runBinary([
      "foundation",
      "get",
      "--workshop-id",
      workshopId,
      "--json",
    ]);
    expect(missing.exitCode).toBe(2);
  });

  it("rejects unknown foundation subcommands with usage", async () => {
    const stderr: string[] = [];
    const exitCode = await runCliEntry(
      ["foundation", "unknown"],
      { catalogRoot },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );
    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toContain("Usage: intentloom foundation");
  });
});

describe("Engineering Workspace W5: blueprint binary CLI routing", () => {
  it("routes propose and compare through intentloom blueprint", async () => {
    seedBlueprintWorkshop("fnd_fixture_blueprint_binary");

    const proposal = await runBinaryJson([
      "blueprint",
      "propose",
      "--workshop-id",
      "fnd_fixture_blueprint_binary",
      "--json",
    ]);
    expect(proposal).toMatchObject({
      schemaVersion: "urn:intentloom:schema:foundation-blueprint-proposal:1",
      workshopId: "fnd_fixture_blueprint_binary",
      recommended: { tier: "recommended" },
      workshopUnchanged: true,
    });
    expect(
      (proposal as { alternatives: { tier: string }[] }).alternatives.map(
        (entry) => entry.tier,
      ),
    ).toEqual(["minimal", "extensible"]);

    const compareFlags = await runBinaryJson([
      "blueprint",
      "compare",
      "--workshop-id",
      "fnd_fixture_blueprint_binary",
      "--left-tier",
      "minimal",
      "--right-tier",
      "extensible",
      "--json",
    ]);
    expect(compareFlags).toEqual(
      compareFoundationBlueprintTiers(
        "fnd_fixture_blueprint_binary",
        "minimal",
        "extensible",
      ),
    );

    const comparePositional = await runBinaryJson([
      "blueprint",
      "compare",
      "minimal",
      "recommended",
      "--workshop-id",
      "fnd_fixture_blueprint_binary",
      "--json",
    ]);
    expect(comparePositional).toEqual(
      compareFoundationBlueprintTiers(
        "fnd_fixture_blueprint_binary",
        "minimal",
        "recommended",
      ),
    );
  });

  it("routes approve and revoke through intentloom blueprint", async () => {
    seedBlueprintWorkshop("fnd_fixture_blueprint_binary_lifecycle");

    const approval = await runBinaryJson([
      "blueprint",
      "approve",
      "--workshop-id",
      "fnd_fixture_blueprint_binary_lifecycle",
      "--tier",
      "recommended",
      "--approver",
      "reviewer",
      "--json",
    ]);
    expect(approval).toMatchObject({
      schemaVersion: "urn:intentloom:schema:foundation-blueprint-approval:1",
      approval: { status: "approved", approver: "reviewer" },
    });

    const revoked = await runBinaryJson([
      "blueprint",
      "revoke",
      "--workshop-id",
      "fnd_fixture_blueprint_binary_lifecycle",
      "--json",
    ]);
    expect(revoked).toMatchObject({
      approval: { status: "revoked" },
    });
  });

  it("rejects unknown blueprint subcommands with usage", async () => {
    const stderr: string[] = [];
    const exitCode = await runCliEntry(
      ["blueprint", "unknown"],
      { catalogRoot },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );
    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toContain("Usage: intentloom blueprint");
  });
});

function seedBlueprintWorkshop(workshopId: string) {
  createFoundationWorkshop({
    root: "/tmp/foundation-blueprint-binary",
    idea: "Local-first desktop planning tool",
    workshopId,
  });
  recordFoundationWorkshopAnswer(workshopId, {
    questionId: "fq8_offline_required",
    value: "yes",
    confidence: "confirmed",
    timestamp: Date.now(),
  });
}

async function runBinary(
  args: readonly string[],
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const exitCode = await runCliEntry(
    args,
    { catalogRoot },
    {
      stdout: (message) => stdout.push(message),
      stderr: (message) => stderr.push(message),
    },
  );
  return {
    exitCode,
    stdout: stdout.join("\n"),
    stderr: stderr.join("\n"),
  };
}

async function runBinaryJson(args: readonly string[]): Promise<unknown> {
  const result = await runBinary(args);
  expect(result.exitCode).toBe(0);
  return JSON.parse(result.stdout);
}
