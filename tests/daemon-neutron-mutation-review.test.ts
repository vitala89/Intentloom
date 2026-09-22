import { createConnection } from "node:net";
import { randomUUID } from "node:crypto";
import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import {
  NEUTRON_MUTATION_REVIEW_GET_METHOD,
  NEUTRON_MUTATION_REVIEW_LIST_METHOD,
  createNeutronGraphExecuteRequest,
  createNeutronMutationReviewGetRequest,
  createNeutronMutationReviewListRequest,
  createNeutronSessionCreateRequest,
  parseDaemonRequest,
} from "@intentloom/protocol";
import type { ModelAdapter } from "../packages/application/src/model-adapter.js";
import { createNeutronSessionRuntime } from "../packages/application/src/neutron-session-runtime.js";
import { NEUTRON_MUTATION_PROPOSAL_CAPABILITY } from "../packages/application/src/neutron-mutation-proposal-capability.js";
import { fingerprintNeutronProjectRoot } from "../packages/application/src/neutron-session-fingerprint.js";
import { startLocalDaemon } from "../packages/daemon/src/index.js";
import { bindNeutronSessionHandlers } from "../packages/daemon/src/neutron-session-handlers.js";
import {
  slice5CandidateOutput,
  slice5Node,
} from "./neutron-mutation-slice5-support.js";
import {
  reviewProject,
  SLICE5_CONTENT_A,
} from "./neutron-mutation-review-support.js";
import { neutronMutationReviewLeakKeys } from "../packages/application/src/neutron-mutation-review-leak.js";
import { NEUTRON_READ_ONLY_TOOLS } from "../packages/protocol/src/neutron-runtime.js";

const daemons: { close(): Promise<void> }[] = [];

afterEach(async () => {
  await Promise.all(daemons.splice(0).map((daemon) => daemon.close()));
});

function countingAdapter(root: string, calls: { count: number }): ModelAdapter {
  return {
    getCapabilities: () => ({
      providerKind: "deterministic-test",
      modelId: "fixture-d1",
      supportsStreaming: false,
      supportsToolCalls: true,
      supportsVision: false,
      maxContextTokens: 1024,
      maxOutputTokens: 256,
    }),
    executeTurn: async (request) => {
      calls.count += 1;
      const sawTool = request.messages.some(
        (message) => message.role === "tool",
      );
      if (!sawTool) {
        return {
          diagnostics: [],
          responseText: "",
          schemaVersion: 1,
          sessionId: request.sessionId,
          stopReason: "tool_call",
          toolCalls: [
            {
              argumentsJson: JSON.stringify({ root }),
              id: "call-inspect",
              name: "inspect",
            },
          ],
          usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
        };
      }
      return {
        diagnostics: [],
        responseText: slice5CandidateOutput(),
        schemaVersion: 1,
        sessionId: request.sessionId,
        stopReason: "stop",
        toolCalls: [],
        usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
      };
    },
  };
}

function throwingAdapter(): ModelAdapter {
  return {
    getCapabilities: () =>
      countingAdapter("/unused", { count: 0 }).getCapabilities(),
    executeTurn: async () => {
      throw new Error("model must not be called during review retrieval");
    },
  };
}

function endpoint(directory: string): string {
  return process.platform === "win32"
    ? `\\\\.\\pipe\\intentloom-d1-${process.pid}-${randomUUID()}`
    : join(directory, "daemon.sock");
}

function rawRequest(
  socketPath: string,
  request: object,
  token: string,
): Promise<unknown> {
  return new Promise((resolvePromise, reject) => {
    const socket = createConnection(socketPath);
    let output = "";
    socket.once("connect", () =>
      socket.write(`${JSON.stringify({ token, request })}\n`),
    );
    socket.on("data", (chunk) => (output += chunk.toString()));
    socket.once("error", reject);
    socket.once("end", () => resolvePromise(JSON.parse(output)));
  });
}

describe("Neutron mutation review D1 daemon RPC", () => {
  it("transports authoritative review bytes without mutation or a model call", async () => {
    const root = await reviewProject();
    const before = await fingerprintNeutronProjectRoot(root);
    const directory = await mkdtemp(join(tmpdir(), "intentloom-d1-endpoint-"));
    const token = `d1-token-${"n".repeat(24)}`;
    const calls = { count: 0 };
    const runtime = createNeutronSessionRuntime({
      createAdapter: () => countingAdapter(root, calls),
      sessionProposalCapabilities: [NEUTRON_MUTATION_PROPOSAL_CAPABILITY],
    });
    const daemon = await startLocalDaemon({
      endpoint: endpoint(directory),
      sessionToken: token,
      enforceCanonicalRoots: false,
      ...bindNeutronSessionHandlers(runtime),
    });
    daemons.push(daemon);
    const created = (await rawRequest(
      daemon.endpoint,
      createNeutronSessionCreateRequest(1, root, "project-slice5"),
      token,
    )) as { result: { viewmodel: { session: { sessionId: string } } } };
    const sessionId = created.result.viewmodel.session.sessionId;
    const executed = (await rawRequest(
      daemon.endpoint,
      createNeutronGraphExecuteRequest(2, root, sessionId, "project-slice5", [
        slice5Node("task-build", { state: "ready" }),
      ]),
      token,
    )) as {
      result: {
        viewmodel: {
          mutationProposal: { proposalId: string } | null;
          session: { mutationAllowed: boolean };
        };
      };
    };
    expect(executed.result.viewmodel.session.mutationAllowed).toBe(false);
    const proposalId = executed.result.viewmodel.mutationProposal?.proposalId;
    expect(proposalId).toEqual(expect.any(String));
    const turnsAfterGraph = calls.count;
    expect(turnsAfterGraph).toBeGreaterThan(0);
    const listed = (await rawRequest(
      daemon.endpoint,
      createNeutronMutationReviewListRequest(
        3,
        root,
        sessionId,
        "project-slice5",
      ),
      token,
    )) as { result: { outcome: string; reviews: { proposalId: string }[] } };
    expect(listed.result.outcome).toBe("ok");
    expect(listed.result.reviews).toHaveLength(1);
    expect(listed.result.reviews[0]?.proposalId).toBe(proposalId);
    const got = (await rawRequest(
      daemon.endpoint,
      createNeutronMutationReviewGetRequest(
        4,
        root,
        sessionId,
        "project-slice5",
        proposalId!,
      ),
      token,
    )) as {
      result: {
        outcome: string;
        review?: {
          files: { path: string; proposedContent?: string }[];
          currentness: string;
        };
      };
    };
    expect(got.result.outcome).toBe("ok");
    expect(
      got.result.review?.files.find((file) => file.path === "src/a.ts")
        ?.proposedContent,
    ).toBe(SLICE5_CONTENT_A);
    expect(got.result.review?.currentness).toBe("current");
    expect(calls.count).toBe(turnsAfterGraph);
    expect(await fingerprintNeutronProjectRoot(root)).toBe(before);
    expect(JSON.stringify(got)).not.toContain(token);
    expect(neutronMutationReviewLeakKeys(got)).toEqual([]);
    const info = (await rawRequest(
      daemon.endpoint,
      {
        jsonrpc: "2.0",
        id: 5,
        method: "intentloom.daemon.info.v1",
        params: { protocolVersion: 1, clientProtocolVersion: 1 },
      },
      token,
    )) as {
      result: {
        capabilities: { method: string; classification: string }[];
      };
    };
    const reviewCaps = info.result.capabilities.filter((entry) =>
      entry.method.startsWith("intentloom.neutron.mutation.review."),
    );
    expect(reviewCaps.map((entry) => entry.method).sort()).toEqual([
      NEUTRON_MUTATION_REVIEW_GET_METHOD,
      NEUTRON_MUTATION_REVIEW_LIST_METHOD,
    ]);
    expect(
      reviewCaps.every((entry) => entry.classification === "read-only"),
    ).toBe(true);
    expect(NEUTRON_READ_ONLY_TOOLS).toHaveLength(7);
  });

  it("fails closed after a new daemon process loses in-memory payloads", async () => {
    const root = await reviewProject();
    const directory = await mkdtemp(join(tmpdir(), "intentloom-d1-restart-"));
    const token = "n".repeat(32);
    const first = createNeutronSessionRuntime({
      createAdapter: () => countingAdapter(root, { count: 0 }),
      sessionProposalCapabilities: [NEUTRON_MUTATION_PROPOSAL_CAPABILITY],
    });
    const daemon = await startLocalDaemon({
      endpoint: endpoint(directory),
      sessionToken: token,
      enforceCanonicalRoots: false,
      ...bindNeutronSessionHandlers(first),
    });
    daemons.push(daemon);
    const created = (await rawRequest(
      daemon.endpoint,
      createNeutronSessionCreateRequest(1, root, "project-slice5"),
      token,
    )) as { result: { viewmodel: { session: { sessionId: string } } } };
    await daemon.close();
    daemons.pop();
    const restarted = createNeutronSessionRuntime({
      createAdapter: () => throwingAdapter(),
    });
    const second = await startLocalDaemon({
      endpoint: endpoint(directory),
      sessionToken: token,
      enforceCanonicalRoots: false,
      ...bindNeutronSessionHandlers(restarted),
    });
    daemons.push(second);
    const missing = (await rawRequest(
      second.endpoint,
      createNeutronMutationReviewGetRequest(
        2,
        root,
        created.result.viewmodel.session.sessionId,
        "project-slice5",
        "proposal-missing",
      ),
      token,
    )) as { result?: { outcome?: string } };
    expect(missing.result?.outcome).toBe("session-mismatch");
    expect(
      parseDaemonRequest(
        createNeutronMutationReviewGetRequest(
          3,
          root,
          "s",
          "p",
          "proposal-missing",
        ),
      ).method,
    ).toBe(NEUTRON_MUTATION_REVIEW_GET_METHOD);
  });
});
