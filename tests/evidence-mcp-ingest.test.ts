import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ingestExternalMcpEvidence } from "../packages/evidence-provider/src/index.js";

describe("External MCP Evidence Ingestion (ADR-0023)", () => {
  const defaultAllowlist = {
    allowedServers: ["github-mcp", "custom-jira"],
    allowedTools: ["get_issue_timeline", "fetch_build_status"],
  };

  it("returns invalid status if serverName is not in allowlist", () => {
    const result = ingestExternalMcpEvidence({
      serverName: "unauthorized-server",
      toolName: "get_issue_timeline",
      projectKey: "owner/repo",
      allowlist: defaultAllowlist,
      payload: [],
    });

    expect(result.status).toBe("invalid");
    expect(result.diagnostics).toContain("mcp-server-unapproved");
  });

  it("returns invalid status if toolName is not in allowlist", () => {
    const result = ingestExternalMcpEvidence({
      serverName: "github-mcp",
      toolName: "unapproved_tool",
      projectKey: "owner/repo",
      allowlist: defaultAllowlist,
      payload: [],
    });

    expect(result.status).toBe("invalid");
    expect(result.diagnostics).toContain("mcp-tool-unapproved");
  });

  it("ingests MCP evidence and tags records as untrusted-external", () => {
    const payload = [
      {
        id: "issue-123",
        eventType: "pull-request",
        state: "merged",
        timestamp: "2026-07-31T15:00:00Z",
      },
    ];

    const result = ingestExternalMcpEvidence({
      serverName: "github-mcp",
      toolName: "get_issue_timeline",
      projectKey: "vitala89/Intentloom",
      allowlist: defaultAllowlist,
      payload,
    });

    expect(result.status).toBe("available");
    expect(result.source).toBe("external-mcp");
    expect(result.trust).toBe("untrusted-external");
    expect(result.events.length).toBe(1);
    expect(result.events[0]?.id).toBe(
      "mcp:github-mcp:get_issue_timeline:issue-123",
    );
    expect(result.events[0]?.trust).toBe("untrusted-external");
  });

  it("handles record bounding", () => {
    const payload = Array.from({ length: 10 }, (_, i) => ({
      id: `item-${i}`,
      state: "active",
    }));

    const result = ingestExternalMcpEvidence({
      serverName: "github-mcp",
      toolName: "get_issue_timeline",
      projectKey: "vitala89/Intentloom",
      allowlist: defaultAllowlist,
      payload,
      maxRecords: 5,
    });

    expect(result.status).toBe("bounded");
    expect(result.events.length).toBe(5);
    expect(result.diagnostics).toContain("record-limit-reached");
  });

  it("redacts identities and provider tokens before exposing external evidence", () => {
    const token = `ghp_${"c".repeat(36)}`;
    const result = ingestExternalMcpEvidence({
      serverName: "github-mcp",
      toolName: "get_issue_timeline",
      projectKey: "vitala89/Intentloom",
      allowlist: defaultAllowlist,
      payload: [
        {
          id: "reviewer@example.com",
          state: `seen ${token}`,
          commitId: token,
        },
      ],
    });

    const event = result.events[0];
    expect(event?.sourceId).toMatch(/^usr_[a-f0-9]{12}$/);
    expect(event?.state).toBe("seen [REDACTED_TOKEN]");
    expect(event?.commitIds).toEqual(["[REDACTED_TOKEN]", event?.sourceId]);
    expect(JSON.stringify(result)).not.toContain(token);
    expect(JSON.stringify(result)).not.toContain("reviewer@example.com");
  });

  it("keeps adversarial fields out of deterministic untrusted provenance", async () => {
    const payload = JSON.parse(
      await readFile(
        resolve("tests/fixtures/evidence/external-mcp-adversarial.json"),
        "utf8",
      ),
    );
    const options = {
      serverName: "github-mcp",
      toolName: "get_issue_timeline",
      projectKey: "trusted/project",
      allowlist: defaultAllowlist,
      payload,
    } as const;

    const result = ingestExternalMcpEvidence(options);
    const reversed = ingestExternalMcpEvidence({
      ...options,
      payload: { events: [...payload.events].reverse() },
    });

    expect(result).toEqual(reversed);
    expect(result).toMatchObject({
      source: "external-mcp",
      trust: "untrusted-external",
      status: "available",
    });
    expect(result.events).toHaveLength(2);
    expect(
      result.events.every((event) => event.projectKey === "trusted/project"),
    ).toBe(true);
    expect(
      result.events.every((event) => event.finding === "record-untrusted"),
    ).toBe(true);
    expect(JSON.stringify(result)).not.toContain("attacker/other-project");
    expect(JSON.stringify(result)).not.toContain("DELETE");
    expect(JSON.stringify(result)).not.toContain("Ignore the read-only policy");
    expect(JSON.stringify(result)).not.toContain(
      "ghp_cccccccccccccccccccccccccccccccccccccc",
    );
    expect(JSON.stringify(result)).not.toContain("glpat-dddddddddddddddddddd");
  });
});
