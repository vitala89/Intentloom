import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  inspectHarnessScorecard,
  replayHarnessScorecard,
} from "../packages/application/src/index.js";
import {
  handleMcpRequest,
  HARNESS_INSPECT_TOOL,
  HARNESS_REPLAY_TOOL,
} from "../packages/mcp-server/src/index.js";
import type { HarnessScorecard } from "../packages/protocol/src/index.js";

const sampleScorecard: HarnessScorecard = {
  schemaVersion: 1,
  scorecardId: "sc-mcp-test-1",
  scenarioId: "scenario:sec-1",
  requestId: "req:mcp-test-1",
  status: "passed",
  overallScore: 1,
  passedAssertions: 2,
  totalAssertions: 2,
  durationMs: 150,
  scores: [
    {
      metric: "security-gate",
      value: 1,
      evidenceClass: "deterministic",
    },
  ],
  events: [
    {
      eventId: "evt-1",
      category: "observation",
      source: "test",
      trust: "trusted",
      timestamp: "2026-08-03T12:00:00.000Z",
    },
  ],
  artifacts: [],
  diagnostics: [],
};

describe("MCP harness inspect and replay tools", () => {
  it("advertises harness inspect and replay tools in tools/list", async () => {
    const response = await handleMcpRequest(
      { jsonrpc: "2.0", id: 1, method: "tools/list" },
      { root: process.cwd() },
    );
    const tools =
      (response?.result?.tools as {
        name: string;
        outputSchema?: { $id?: string };
      }[]) ?? [];
    const names = tools.map(({ name }) => name);
    expect(names).toContain(HARNESS_INSPECT_TOOL);
    expect(names).toContain(HARNESS_REPLAY_TOOL);

    const inspectDescriptor = tools.find(
      ({ name }) => name === HARNESS_INSPECT_TOOL,
    );
    const replayDescriptor = tools.find(
      ({ name }) => name === HARNESS_REPLAY_TOOL,
    );

    expect(inspectDescriptor?.outputSchema?.$id).toBe(
      "urn:intentloom:mcp:harness-inspect:output:1",
    );
    expect(replayDescriptor?.outputSchema?.$id).toBe(
      "urn:intentloom:mcp:harness-replay:output:1",
    );
  });

  it("inspects a valid scorecard file via MCP and matches application output", async () => {
    const root = await mkdtemp(join(tmpdir(), "intentloom-mcp-harness-"));
    try {
      const file = "scorecard.json";
      await writeFile(join(root, file), JSON.stringify(sampleScorecard));

      const expected = inspectHarnessScorecard(sampleScorecard);

      const response = await handleMcpRequest(
        {
          jsonrpc: "2.0",
          id: "inspect-1",
          method: "tools/call",
          params: {
            name: HARNESS_INSPECT_TOOL,
            arguments: { file },
          },
        },
        { root },
      );

      expect(response).toMatchObject({
        result: {
          structuredContent: expected,
        },
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("replays a valid scorecard file via MCP in simulate and strict modes", async () => {
    const root = await mkdtemp(join(tmpdir(), "intentloom-mcp-harness-"));
    try {
      const file = "scorecard.json";
      await writeFile(join(root, file), JSON.stringify(sampleScorecard));

      const expectedSimulate = replayHarnessScorecard(
        sampleScorecard,
        "simulate",
      );
      const expectedStrict = replayHarnessScorecard(sampleScorecard, "strict");

      const responseSimulate = await handleMcpRequest(
        {
          jsonrpc: "2.0",
          id: "replay-sim",
          method: "tools/call",
          params: {
            name: HARNESS_REPLAY_TOOL,
            arguments: { file, mode: "simulate" },
          },
        },
        { root },
      );

      const responseStrict = await handleMcpRequest(
        {
          jsonrpc: "2.0",
          id: "replay-strict",
          method: "tools/call",
          params: {
            name: HARNESS_REPLAY_TOOL,
            arguments: { file, mode: "strict" },
          },
        },
        { root },
      );

      expect(responseSimulate).toMatchObject({
        result: { structuredContent: expectedSimulate },
      });
      expect(responseStrict).toMatchObject({
        result: { structuredContent: expectedStrict },
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects path traversal outside project root", async () => {
    const root = await mkdtemp(join(tmpdir(), "intentloom-mcp-harness-"));
    try {
      const response = await handleMcpRequest(
        {
          jsonrpc: "2.0",
          id: "traversal",
          method: "tools/call",
          params: {
            name: HARNESS_INSPECT_TOOL,
            arguments: { file: "../outside.json" },
          },
        },
        { root },
      );

      expect(response).toMatchObject({
        result: {
          isError: true,
          structuredContent: {
            schemaVersion: 1,
            code: "arguments-invalid",
          },
        },
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects invalid JSON or non-existent scorecard files", async () => {
    const root = await mkdtemp(join(tmpdir(), "intentloom-mcp-harness-"));
    try {
      await writeFile(join(root, "invalid.json"), "not json");

      const resMissing = await handleMcpRequest(
        {
          jsonrpc: "2.0",
          id: "missing",
          method: "tools/call",
          params: {
            name: HARNESS_INSPECT_TOOL,
            arguments: { file: "missing.json" },
          },
        },
        { root },
      );

      const resInvalidJson = await handleMcpRequest(
        {
          jsonrpc: "2.0",
          id: "invalid-json",
          method: "tools/call",
          params: {
            name: HARNESS_INSPECT_TOOL,
            arguments: { file: "invalid.json" },
          },
        },
        { root },
      );

      expect(resMissing).toMatchObject({
        result: {
          isError: true,
          structuredContent: { code: "arguments-invalid" },
        },
      });
      expect(resInvalidJson).toMatchObject({
        result: {
          isError: true,
          structuredContent: { code: "arguments-invalid" },
        },
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects symlink project root", async () => {
    const parent = await mkdtemp(
      join(tmpdir(), "intentloom-mcp-symlink-harness-"),
    );
    const target = join(parent, "target");
    const root = join(parent, "project");
    await mkdir(target);
    await symlink(target, root);
    try {
      const response = await handleMcpRequest(
        {
          jsonrpc: "2.0",
          id: "symlink-root",
          method: "tools/call",
          params: {
            name: HARNESS_INSPECT_TOOL,
            arguments: { file: "scorecard.json" },
          },
        },
        { root },
      );

      expect(response).toMatchObject({
        result: {
          isError: true,
          structuredContent: {
            schemaVersion: 1,
            code: "root-symlink",
          },
        },
      });
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  });
});
