import { createConnection } from "node:net";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import * as application from "@intentloom/application";
import * as protocol from "@intentloom/protocol";
import * as foundationHandlers from "../packages/daemon/src/foundation-handlers.js";
import { startLocalDaemon } from "../packages/daemon/src/index.js";

const fixturePath = resolve(
  process.cwd(),
  "tests/fixtures/foundation/workshop-states.v1.json",
);

const daemons: { close(): Promise<void> }[] = [];

afterEach(async () => {
  application.clearFoundationWorkshopStore();
  await Promise.all(daemons.splice(0).map((daemon) => daemon.close()));
});

function rawRequest(
  endpoint: string,
  request: object,
  token: string,
): Promise<unknown> {
  return new Promise((resolvePromise, reject) => {
    const socket = createConnection(endpoint);
    let output = "";
    socket.once("connect", () =>
      socket.write(`${JSON.stringify({ token, request })}\n`),
    );
    socket.on("data", (chunk) => (output += chunk.toString()));
    socket.once("error", reject);
    socket.once("end", () => resolvePromise(JSON.parse(output)));
  });
}

function responseViewmodel(value: unknown): Record<string, unknown> {
  const payload = (value as { result?: { viewmodel?: unknown } }).result
    ?.viewmodel;
  if (payload === null || typeof payload !== "object" || Array.isArray(payload))
    throw new Error("daemon viewmodel is not an object");
  return payload as Record<string, unknown>;
}

function daemonEndpoint(directory: string): string {
  return process.platform === "win32"
    ? `\\\\.\\pipe\\intentloom-foundation-${process.pid}-${randomUUID()}`
    : join(directory, "daemon.sock");
}

async function startFoundationDaemon() {
  const directory = await mkdtemp(
    join(tmpdir(), "intentloom-foundation-endpoint-"),
  );
  const token = "f".repeat(32);
  const daemon = await startLocalDaemon({
    endpoint: daemonEndpoint(directory),
    sessionToken: token,
    enforceCanonicalRoots: false,
    foundationWorkshopCreate: foundationHandlers.handleFoundationWorkshopCreate,
    foundationWorkshopGet: foundationHandlers.handleFoundationWorkshopGet,
    foundationQuestionsList: foundationHandlers.handleFoundationQuestionsList,
    foundationAnswerRecord: foundationHandlers.handleFoundationAnswerRecord,
    foundationUnderstandingSummarize:
      foundationHandlers.handleFoundationUnderstandingSummarize,
    foundationConflictsIdentify:
      foundationHandlers.handleFoundationConflictsIdentify,
    foundationReadinessEvaluate:
      foundationHandlers.handleFoundationReadinessEvaluate,
    foundationWorkshopExport: foundationHandlers.handleFoundationWorkshopExport,
    foundationWorkshopDelete: foundationHandlers.handleFoundationWorkshopDelete,
    foundationDiscoveryQuestions:
      foundationHandlers.handleFoundationDiscoveryQuestions,
    foundationDiscoveryTurn: foundationHandlers.handleFoundationDiscoveryTurn,
  });
  daemons.push({
    async close() {
      await daemon.close();
      await rm(directory, { recursive: true, force: true });
    },
  });
  return { endpoint: daemon.endpoint, token };
}

describe("Engineering Workspace W2: foundation daemon RPC", () => {
  it("returns CLI-equivalent viewmodels for frozen fixtures", async () => {
    const catalog = application.loadFoundationFixtureCatalog(fixturePath);
    application.installFoundationFixtureCatalog(catalog);
    const daemon = await startFoundationDaemon();

    const summary = responseViewmodel(
      await rawRequest(
        daemon.endpoint,
        protocol.createFoundationUnderstandingSummarizeRequest(
          "summary",
          "fnd_fixture_readiness_ready",
        ),
        daemon.token,
      ),
    );
    expect(summary).toEqual(
      application.summarizeFoundationUnderstandingViewmodel(
        "fnd_fixture_readiness_ready",
      ),
    );

    const readiness = responseViewmodel(
      await rawRequest(
        daemon.endpoint,
        protocol.createFoundationReadinessEvaluateRequest(
          "readiness",
          "fnd_fixture_readiness_ready",
        ),
        daemon.token,
      ),
    );
    expect(readiness.readinessStatus).toBe("ready");
    expect(readiness.schemaVersion).toBe(
      "urn:intentloom:schema:foundation-readiness-report:1",
    );
    expect(readiness.workshopId).toBe("fnd_fixture_readiness_ready");

    const conflicts = responseViewmodel(
      await rawRequest(
        daemon.endpoint,
        protocol.createFoundationConflictsIdentifyRequest(
          "conflicts",
          "fnd_fixture_conflict_warning",
        ),
        daemon.token,
      ),
    );
    expect(conflicts).toEqual(
      application.identifyFoundationWorkshopConflicts(
        "fnd_fixture_conflict_warning",
      ),
    );
  });

  it("creates a workshop through daemon RPC without writing a project root", async () => {
    const daemon = await startFoundationDaemon();
    const created = responseViewmodel(
      await rawRequest(
        daemon.endpoint,
        protocol.createFoundationWorkshopCreateRequest(
          "create",
          "/tmp/foundation-daemon-create",
          "Daemon create test",
        ),
        daemon.token,
      ),
    );
    const workshopId = (created.workshop as { id: string }).id;
    expect(workshopId.length).toBeGreaterThan(0);

    const exported = responseViewmodel(
      await rawRequest(
        daemon.endpoint,
        protocol.createFoundationWorkshopExportRequest("export", workshopId),
        daemon.token,
      ),
    );
    expect(exported.schemaVersion).toBe(
      "urn:intentloom:schema:foundation-workshop-export:1",
    );
    expect((exported.workshop as { id: string }).id).toBe(workshopId);

    const deleted = responseViewmodel(
      await rawRequest(
        daemon.endpoint,
        protocol.createFoundationWorkshopDeleteRequest("delete", workshopId),
        daemon.token,
      ),
    );
    expect(deleted).toMatchObject({
      schemaVersion: "urn:intentloom:schema:foundation-workshop-delete:1",
      workshopId,
      deleted: true,
    });
    expect(() => application.getFoundationWorkshop(workshopId)).toThrow(
      /unknown foundation workshop/,
    );
  });

  it("returns CLI-equivalent discovery turn viewmodels without mutating workshop state", async () => {
    const workshop = application.createFoundationWorkshop({
      root: "/tmp/foundation-daemon-discovery",
      idea: "Daemon discovery parity",
      workshopId: "fnd_fixture_daemon_discovery",
    });
    const before = application.getFoundationWorkshop(workshop.id);
    const daemon = await startFoundationDaemon();

    const cliTurn = await application.runFoundationDiscoveryTurn(workshop.id, {
      effort: "medium",
    });
    const daemonTurn = responseViewmodel(
      await rawRequest(
        daemon.endpoint,
        protocol.createFoundationDiscoveryTurnRequest("turn", workshop.id, {
          effort: "medium",
        }),
        daemon.token,
      ),
    ) as typeof cliTurn;
    expect(daemonTurn.schemaVersion).toBe(
      "urn:intentloom:schema:foundation-discovery-turn:1",
    );
    expect(daemonTurn.workshopId).toBe(workshop.id);
    expect(daemonTurn.workshopUnchanged).toBe(true);
    expect(daemonTurn.agentStatus).toBe("completed");
    expect(daemonTurn.visibility.networkMode).toBe("disabled");
    expect(daemonTurn.proposedQuestions.map((entry) => entry.question)).toEqual(
      cliTurn.proposedQuestions.map((entry) => entry.question),
    );
    expect(daemonTurn.completeness).toEqual(cliTurn.completeness);
    expect(application.getFoundationWorkshop(workshop.id)).toEqual(before);

    const cliQuestions = application.discoverFoundationAdaptiveQuestions(
      workshop.id,
      { effort: "high" },
    );
    const daemonQuestions = responseViewmodel(
      await rawRequest(
        daemon.endpoint,
        protocol.createFoundationDiscoveryQuestionsRequest(
          "questions",
          workshop.id,
          "high",
        ),
        daemon.token,
      ),
    );
    expect(daemonQuestions).toEqual(cliQuestions);
  });
});
