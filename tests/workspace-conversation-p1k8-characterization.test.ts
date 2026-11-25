import { dirname } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  appendWorkspaceMessage,
  createMemoryFileSystem,
  getWorkspaceConversation,
  initProject,
  listWorkspaceConversations,
  startWorkspaceConversation,
  type FileSystem,
} from "@intentloom/application";
import type { WorkspaceConversationRecord } from "@intentloom/protocol";
import { inside } from "../packages/application/src/project-path.ts";

const root = "/project/p1k8-conversations";

function conversationPath(id: string): string {
  return inside(root, `.aif/workspace/conversations/${id}.json`);
}

function absoluteConversationPath(id: string): string {
  return `${root}/.aif/workspace/conversations/${id}.json`;
}

function recordJson(
  overrides: Partial<WorkspaceConversationRecord> & { id: string },
): string {
  return JSON.stringify({
    schemaVersion: "1",
    projectId: "project-1",
    mode: "discuss",
    messages: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  });
}

function filesystem(
  files: Map<string, string>,
  list: () => Promise<string[]>,
  overrides?: Partial<FileSystem>,
): FileSystem {
  return {
    async exists(path) {
      return files.has(path);
    },
    async read(path) {
      const content = files.get(path);
      if (content === undefined) throw new Error(`missing ${path}`);
      return content;
    },
    async write(path, content) {
      files.set(path, content);
    },
    async mkdir() {},
    async remove() {},
    list,
    async realpath(path) {
      return path;
    },
    async isSymbolicLink() {
      return false;
    },
    ...overrides,
  };
}

describe("P1K.8 workspace conversation store behavior", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates conversations in discuss and inspect modes with defaults", async () => {
    const fs = createMemoryFileSystem();
    await initProject({ root, adapters: ["codex"] }, fs);

    const now = vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
    const random = vi.spyOn(Math, "random").mockReturnValue(0.123_456_789);
    const iso = vi
      .spyOn(Date.prototype, "toISOString")
      .mockReturnValue("2023-11-14T22:13:20.000Z");
    try {
      const discuss = await startWorkspaceConversation(
        { root, projectId: "proj-1", mode: "discuss" },
        fs,
      );
      expect(discuss.id).toBe("conv-1700000000000-4fzzzx");
      expect(discuss.mode).toBe("discuss");
      expect(discuss.projectId).toBe("proj-1");
      expect(discuss.messages).toEqual([]);
      expect(discuss.schemaVersion).toBe("1");
      expect(discuss.createdAt).toBe("2023-11-14T22:13:20.000Z");
      expect(discuss.updatedAt).toBe("2023-11-14T22:13:20.000Z");

      const inspect = await startWorkspaceConversation(
        { root, projectId: "proj-2", mode: "inspect" },
        fs,
      );
      expect(inspect.mode).toBe("inspect");
    } finally {
      now.mockRestore();
      random.mockRestore();
      iso.mockRestore();
    }
  });

  it("defaults mode to discuss when omitted", async () => {
    const fs = createMemoryFileSystem();
    await initProject({ root, adapters: ["codex"] }, fs);
    const conv = await startWorkspaceConversation(
      { root, projectId: "proj-default" },
      fs,
    );
    expect(conv.mode).toBe("discuss");
  });

  it("uses the conv- timestamp-random id format and persists formatted JSON", async () => {
    const fs = createMemoryFileSystem();
    await initProject({ root, adapters: ["codex"] }, fs);
    const conv = await startWorkspaceConversation(
      { root, projectId: "proj-3" },
      fs,
    );
    expect(conv.id).toMatch(/^conv-\d+-[a-z0-9]{6}$/u);

    const path = conversationPath(conv.id);
    const stored = fs.files.get(path);
    expect(stored).toBe(`${JSON.stringify(conv, null, 2)}\n`);
    expect(path).toBe(absoluteConversationPath(conv.id));
  });

  it("creates the conversations directory only when absent", async () => {
    const convDir = dirname(conversationPath("unused"));
    const directories = new Set<string>();
    const files = new Map<string, string>();
    const fs = filesystem(files, async () => [], {
      async exists(path) {
        return files.has(path) || directories.has(path);
      },
      async mkdir(path) {
        directories.add(path);
      },
      async write(path, content) {
        files.set(path, content);
      },
    });
    let mkdirForConv = 0;
    const mkdir = fs.mkdir.bind(fs);
    fs.mkdir = async (path) => {
      if (path === convDir) mkdirForConv += 1;
      return mkdir(path);
    };
    await startWorkspaceConversation({ root, projectId: "a" }, fs);
    await startWorkspaceConversation({ root, projectId: "b" }, fs);
    expect(mkdirForConv).toBe(1);
    expect(directories.has(convDir)).toBe(true);
  });

  it("rejects invalid records before persistence", async () => {
    const fs = createMemoryFileSystem();
    vi.spyOn(
      await import("@intentloom/protocol"),
      "validateWorkspaceConversationRecord",
    ).mockImplementation(() => {
      throw new Error("validation failed");
    });
    await expect(
      startWorkspaceConversation({ root, projectId: "bad" }, fs),
    ).rejects.toThrow("validation failed");
    expect(
      [...fs.files.keys()].filter((p) =>
        p.includes(".aif/workspace/conversations/"),
      ),
    ).toEqual([]);
  });

  it("propagates write failures from start", async () => {
    const fs = createMemoryFileSystem();
    await initProject({ root, adapters: ["codex"] }, fs);
    fs.write = async () => {
      throw new Error("write failed");
    };
    await expect(
      startWorkspaceConversation({ root, projectId: "w" }, fs),
    ).rejects.toThrow("write failed");
  });

  it("gets an existing conversation and returns null when missing", async () => {
    const fs = createMemoryFileSystem();
    await initProject({ root, adapters: ["codex"] }, fs);
    const created = await startWorkspaceConversation(
      { root, projectId: "proj-get" },
      fs,
    );
    const fetched = await getWorkspaceConversation(
      { root, conversationId: created.id },
      fs,
    );
    expect(fetched).toEqual(created);
    expect(
      await getWorkspaceConversation({ root, conversationId: "missing" }, fs),
    ).toBeNull();
  });

  it("returns null for malformed JSON, invalid records, and read errors inside catch", async () => {
    const fs = createMemoryFileSystem();
    await fs.write(conversationPath("malformed"), "{");
    await fs.write(conversationPath("invalid"), '{"schemaVersion":"9"}');
    expect(
      await getWorkspaceConversation({ root, conversationId: "malformed" }, fs),
    ).toBeNull();
    expect(
      await getWorkspaceConversation({ root, conversationId: "invalid" }, fs),
    ).toBeNull();

    const reading = filesystem(
      new Map([[conversationPath("readable"), "{}"]]),
      async () => [],
    );
    reading.read = async () => {
      throw new Error("read failed");
    };
    reading.exists = async () => true;
    expect(
      await getWorkspaceConversation(
        { root, conversationId: "readable" },
        reading,
      ),
    ).toBeNull();
  });

  it("propagates exists failures and path traversal before the read catch", async () => {
    const exists = filesystem(new Map(), async () => []);
    exists.exists = async () => {
      throw new Error("exists failed");
    };
    await expect(
      getWorkspaceConversation({ root, conversationId: "conv-1" }, exists),
    ).rejects.toThrow("exists failed");

    const fs = createMemoryFileSystem();
    await expect(
      getWorkspaceConversation(
        { root, conversationId: "../../../../outside" },
        fs,
      ),
    ).rejects.toThrow(/path traversal/);
  });

  it("appends user and assistant messages with msg- ids and preserved history", async () => {
    const fs = createMemoryFileSystem();
    await initProject({ root, adapters: ["codex"] }, fs);
    const conv = await startWorkspaceConversation(
      { root, projectId: "proj-append" },
      fs,
    );

    const msgNow = vi.spyOn(Date, "now").mockReturnValue(1_800_000_000_000);
    const msgRandom = vi.spyOn(Math, "random").mockReturnValue(0.987_654_321);
    const msgIso = vi
      .spyOn(Date.prototype, "toISOString")
      .mockReturnValue("2027-01-15T12:00:00.000Z");
    try {
      const user = await appendWorkspaceMessage(
        {
          root,
          conversationId: conv.id,
          role: "user",
          content: "hello",
        },
        fs,
      );
      expect(user.messages[0]?.id).toMatch(/^msg-1800000000000-[a-z0-9]{6}$/u);
      expect(user.messages[0]?.role).toBe("user");
      expect(user.messages).toHaveLength(1);

      const assistant = await appendWorkspaceMessage(
        {
          root,
          conversationId: conv.id,
          role: "assistant",
          content: "reply",
        },
        fs,
      );
      expect(assistant.messages).toHaveLength(2);
      expect(assistant.messages[0]?.content).toBe("hello");
      expect(assistant.messages[1]?.role).toBe("assistant");
      expect(assistant.updatedAt).toBe("2027-01-15T12:00:00.000Z");

      const persisted = await getWorkspaceConversation(
        { root, conversationId: conv.id },
        fs,
      );
      expect(persisted?.messages).toEqual(assistant.messages);
      const stored = fs.files.get(conversationPath(conv.id));
      expect(stored).toBe(`${JSON.stringify(assistant, null, 2)}\n`);
    } finally {
      msgNow.mockRestore();
      msgRandom.mockRestore();
      msgIso.mockRestore();
    }
  });

  it("throws when appending to a missing conversation", async () => {
    const fs = createMemoryFileSystem();
    await expect(
      appendWorkspaceMessage(
        {
          root,
          conversationId: "conv-missing",
          role: "user",
          content: "x",
        },
        fs,
      ),
    ).rejects.toThrow("Conversation conv-missing not found");
  });

  it("propagates write failures from append", async () => {
    const fs = createMemoryFileSystem();
    await initProject({ root, adapters: ["codex"] }, fs);
    const conv = await startWorkspaceConversation(
      { root, projectId: "proj-write" },
      fs,
    );
    fs.write = async () => {
      throw new Error("append write failed");
    };
    await expect(
      appendWorkspaceMessage(
        {
          root,
          conversationId: conv.id,
          role: "user",
          content: "data",
        },
        fs,
      ),
    ).rejects.toThrow("append write failed");
  });

  it("redacts GitHub, sk-, assignment-style, and PEM secrets without altering benign text", async () => {
    const fs = createMemoryFileSystem();
    await initProject({ root, adapters: ["codex"] }, fs);
    const conv = await startWorkspaceConversation(
      { root, projectId: "proj-redact" },
      fs,
    );

    const ghpToken = `ghp_${"a".repeat(36)}`;
    const githubPat = `github_pat_${"b".repeat(22)}_${"c".repeat(59)}`;
    const skToken = `sk-${"d".repeat(32)}`;
    const pem = [
      "-----BEGIN RSA PRIVATE KEY-----",
      "line-one",
      "-----END RSA PRIVATE KEY-----",
    ].join("\n");
    const benign = "We can discuss tokens and passwords in prose safely.";

    const cases: { input: string; expected: string }[] = [
      { input: ghpToken, expected: "[REDACTED_SECRET]" },
      { input: githubPat, expected: "[REDACTED_SECRET]" },
      { input: skToken, expected: "[REDACTED_SECRET]" },
      { input: "API-KEY: synthetic", expected: "[REDACTED]" },
      { input: "token=synthetic", expected: "[REDACTED]" },
      { input: "password: hidden", expected: "[REDACTED]" },
      { input: "secret=myvalue", expected: "[REDACTED]" },
      { input: pem, expected: "[REDACTED PRIVATE KEY]" },
      { input: benign, expected: benign },
    ];

    for (const { input, expected } of cases) {
      const updated = await appendWorkspaceMessage(
        {
          root,
          conversationId: conv.id,
          role: "user",
          content: input,
        },
        fs,
      );
      const message = updated.messages.at(-1);
      expect(message?.content).toBe(expected);
      expect(message?.content).not.toContain(ghpToken.slice(0, 8));
    }

    const multi = `${ghpToken} and token=inline and ${pem}`;
    const multiUpdated = await appendWorkspaceMessage(
      {
        root,
        conversationId: conv.id,
        role: "assistant",
        content: multi,
      },
      fs,
    );
    const multiContent = multiUpdated.messages.at(-1)?.content ?? "";
    expect(multiContent).toContain("[REDACTED_SECRET]");
    expect(multiContent).toContain("[REDACTED]");
    expect(multiContent).toContain("[REDACTED PRIVATE KEY]");
    expect(multiContent).not.toContain(ghpToken);

    const storedRaw = fs.files.get(conversationPath(conv.id)) ?? "";
    expect(storedRaw).not.toContain(ghpToken);
    expect(storedRaw).toContain("[REDACTED_SECRET]");
  });

  it("lists conversations with path normalization, filters, and updatedAt sort", async () => {
    const files = new Map<string, string>([
      [
        conversationPath("conv-new"),
        recordJson({
          id: "conv-new",
          updatedAt: "2026-03-02T00:00:00.000Z",
        }),
      ],
      [
        conversationPath("conv-old"),
        recordJson({
          id: "conv-old",
          updatedAt: "2026-01-01T00:00:00.000Z",
        }),
      ],
      [
        conversationPath("conv-tie-a"),
        recordJson({
          id: "conv-tie-a",
          updatedAt: "2026-02-02T00:00:00.000Z",
        }),
      ],
      [
        conversationPath("conv-tie-b"),
        recordJson({
          id: "conv-tie-b",
          updatedAt: "2026-02-02T00:00:00.000Z",
        }),
      ],
      [conversationPath("conv-bad"), "{"],
      [conversationPath("conv-invalid"), '{"schemaVersion":"9"}'],
      [`${root}/.aif/workspace/other.json`, "{}"],
      [`${root}/.aif/workspace/conversations/readme.txt`, "text"],
    ]);
    const fs = filesystem(files, async () => [
      absoluteConversationPath("conv-new"),
      ".aif/workspace/conversations/conv-old.json",
      ".aif\\workspace\\conversations\\conv-tie-a.json",
      absoluteConversationPath("conv-tie-b"),
      absoluteConversationPath("conv-bad"),
      ".aif/workspace/conversations/conv-invalid.json",
      `${root}/.aif/workspace/other.json`,
      ".aif/workspace/conversations/readme.txt",
    ]);

    const listed = await listWorkspaceConversations({ root }, fs);
    expect(listed.map((record) => record.id)).toEqual([
      "conv-new",
      "conv-tie-a",
      "conv-tie-b",
      "conv-old",
    ]);
  });

  it("propagates list failures from the filesystem", async () => {
    const fs = filesystem(new Map(), async () => {
      throw new Error("list failed");
    });
    await expect(listWorkspaceConversations({ root }, fs)).rejects.toThrow(
      "list failed",
    );
  });

  it("validates the full record before writing on append", async () => {
    const fs = createMemoryFileSystem();
    const conv = await startWorkspaceConversation(
      { root, projectId: "proj-validate" },
      fs,
    );
    const protocol = await import("@intentloom/protocol");
    const real = protocol.validateWorkspaceConversationRecord;
    let appendValidation = false;
    const spy = vi
      .spyOn(protocol, "validateWorkspaceConversationRecord")
      .mockImplementation((raw) => {
        if (
          appendValidation &&
          typeof raw === "object" &&
          raw !== null &&
          "messages" in raw &&
          Array.isArray((raw as WorkspaceConversationRecord).messages) &&
          (raw as WorkspaceConversationRecord).messages.length > 0
        ) {
          throw new Error("append validation failed");
        }
        return real(raw);
      });
    try {
      appendValidation = true;
      await expect(
        appendWorkspaceMessage(
          {
            root,
            conversationId: conv.id,
            role: "user",
            content: "trigger",
          },
          fs,
        ),
      ).rejects.toThrow("append validation failed");
      const unchanged = await getWorkspaceConversation(
        { root, conversationId: conv.id },
        fs,
      );
      expect(unchanged?.messages).toEqual([]);
    } finally {
      spy.mockRestore();
    }
  });
});
