import { describe, expect, it } from "vitest";
import { importProviderExport } from "../packages/evidence-provider/src/index.js";

describe("provider export evidence", () => {
  it("normalizes GitHub and GitLab-shaped records deterministically", () => {
    const payload = {
      pullRequests: [
        { number: 4, createdAt: "2026-01-02T00:00:00Z", mergeCommitSha: "abc" },
      ],
      reviews: [
        { id: 8, created_at: "2026-01-02T01:00:00Z", author: "secret" },
      ],
      pipelines: [
        { iid: 2, updated_at: "2026-01-02T02:00:00Z", status: "success" },
      ],
    };
    const github = importProviderExport({
      provider: "github",
      projectKey: "org/repo",
      payload,
    });
    const gitlab = importProviderExport({
      provider: "gitlab",
      projectKey: "group/repo",
      payload,
    });
    expect(github.status).toBe("available");
    expect(github.events.map(({ id }) => id)).toEqual([
      "provider:github:pull-request:4",
      "provider:github:review:8",
      "provider:github:pipeline:2",
    ]);
    expect(gitlab.events[0]?.projectKey).toBe("group/repo");
    expect(JSON.stringify(github)).not.toContain("secret");
  });

  it("bounds untrusted input and reports invalid payloads", () => {
    const bounded = importProviderExport({
      provider: "github",
      projectKey: "org/repo",
      payload: { releases: [{ id: 1 }, { id: 2 }] },
      maxRecords: 1,
    });
    expect(bounded.status).toBe("bounded");
    expect(bounded.diagnostics).toEqual(["record-limit-reached"]);
    expect(
      importProviderExport({
        provider: "gitlab",
        projectKey: "x",
        payload: null,
      }).status,
    ).toBe("invalid");
  });

  it("redacts emails and provider tokens from normalized evidence", () => {
    const githubToken = `ghp_${"a".repeat(36)}`;
    const gitlabToken = `glpat-${"b".repeat(20)}`;
    const result = importProviderExport({
      provider: "github",
      projectKey: "org/repo",
      payload: {
        reviews: [
          {
            id: "alice@example.com",
            status: `token ${githubToken}`,
            commitId: gitlabToken,
          },
        ],
      },
    });

    const event = result.events[0];
    expect(event?.sourceId).toMatch(/^usr_[a-f0-9]{12}$/);
    expect(event?.state).toBe("token [REDACTED_TOKEN]");
    expect(event?.commitIds).toEqual(["[REDACTED_TOKEN]"]);
    expect(JSON.stringify(result)).not.toContain(githubToken);
    expect(JSON.stringify(result)).not.toContain(gitlabToken);
    expect(JSON.stringify(result)).not.toContain("alice@example.com");
  });
});
