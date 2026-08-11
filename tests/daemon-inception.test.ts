import { createConnection } from "node:net";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import * as application from "@intentloom/application";
import * as protocol from "@intentloom/protocol";
import * as inceptionHandlers from "../packages/daemon/src/inception-handlers.js";
import { startLocalDaemon } from "../packages/daemon/src/index.js";

const fixturePath = resolve(
  process.cwd(),
  "tests/fixtures/inception/session-states.v1.json",
);

const daemons: { close(): Promise<void> }[] = [];

afterEach(async () => {
  application.clearInceptionSessionStore();
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
    ? `\\\\.\\pipe\\intentloom-inception-${process.pid}-${randomUUID()}`
    : join(directory, "daemon.sock");
}

async function startInceptionDaemon() {
  const directory = await mkdtemp(
    join(tmpdir(), "intentloom-inception-endpoint-"),
  );
  const token = "i".repeat(32);
  const daemon = await startLocalDaemon({
    endpoint: daemonEndpoint(directory),
    sessionToken: token,
    enforceCanonicalRoots: false,
    inceptionSessionCreate: inceptionHandlers.handleInceptionSessionCreate,
    inceptionSessionGet: inceptionHandlers.handleInceptionSessionGet,
    inceptionQuestionsList: inceptionHandlers.handleInceptionQuestionsList,
    inceptionAnswerRecord: inceptionHandlers.handleInceptionAnswerRecord,
    inceptionStateSummarize: inceptionHandlers.handleInceptionStateSummarize,
    inceptionConflictsIdentify:
      inceptionHandlers.handleInceptionConflictsIdentify,
    inceptionSessionExport: inceptionHandlers.handleInceptionSessionExport,
    inceptionSessionDelete: inceptionHandlers.handleInceptionSessionDelete,
  });
  daemons.push({
    async close() {
      await daemon.close();
      await rm(directory, { recursive: true, force: true });
    },
  });
  return { endpoint: daemon.endpoint, token };
}

describe("Engineering Workspace W1: inception daemon RPC", () => {
  it("returns CLI-equivalent viewmodels for frozen fixtures", async () => {
    const catalog = await application.loadInceptionFixtureCatalog(fixturePath);
    application.installInceptionFixtureCatalog(catalog);
    const daemon = await startInceptionDaemon();

    const summary = responseViewmodel(
      await rawRequest(
        daemon.endpoint,
        protocol.createInceptionStateSummarizeRequest(
          "summary",
          "inc_fixture_summary_complete",
        ),
        daemon.token,
      ),
    );
    expect(summary).toEqual(
      application.summarizeInceptionSessionViewmodel(
        "inc_fixture_summary_complete",
      ),
    );

    const conflicts = responseViewmodel(
      await rawRequest(
        daemon.endpoint,
        protocol.createInceptionConflictsIdentifyRequest(
          "conflicts",
          "inc_fixture_conflict_warning",
        ),
        daemon.token,
      ),
    );
    expect(conflicts).toEqual(
      application.identifyInceptionSessionConflicts(
        "inc_fixture_conflict_warning",
      ),
    );
  });

  it("creates a session through daemon RPC without writing a project root", async () => {
    const daemon = await startInceptionDaemon();
    const created = responseViewmodel(
      await rawRequest(
        daemon.endpoint,
        protocol.createInceptionSessionCreateRequest(
          "create",
          "/tmp/inception-daemon-create",
          "Daemon create test",
        ),
        daemon.token,
      ),
    );
    const sessionId = (created.session as { id: string }).id;
    expect(sessionId.length).toBeGreaterThan(0);

    const exported = responseViewmodel(
      await rawRequest(
        daemon.endpoint,
        protocol.createInceptionSessionExportRequest("export", sessionId),
        daemon.token,
      ),
    );
    expect(exported.schemaVersion).toBe(
      "urn:intentloom:schema:inception-session-export:1",
    );
    expect((exported.session as { id: string }).id).toBe(sessionId);

    const deleted = responseViewmodel(
      await rawRequest(
        daemon.endpoint,
        protocol.createInceptionSessionDeleteRequest("delete", sessionId),
        daemon.token,
      ),
    );
    expect(deleted).toMatchObject({
      schemaVersion: "urn:intentloom:schema:inception-session-delete:1",
      sessionId,
      deleted: true,
    });
    expect(() => application.getInceptionSession(sessionId)).toThrow(
      /unknown inception session/,
    );
  });
});
