import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  appendWorkspaceMessage,
  createMemoryFileSystem,
  getWorkspaceConversation,
  initProject,
  listWorkspaceConversations,
  startWorkspaceConversation,
} from "@intentloom/application";
import { runCli } from "../packages/cli/src/command.js";

describe("Agent Workspace: Discuss and Inspect Modes", () => {
  it("starts a new workspace conversation in discuss or inspect mode", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project";
    await initProject({ root, adapters: ["codex"] }, fs);

    const conv = await startWorkspaceConversation(
      { root, projectId: "p-agent", mode: "discuss" },
      fs,
    );
    expect(conv.id).toMatch(/^conv-/);
    expect(conv.projectId).toBe("p-agent");
    expect(conv.mode).toBe("discuss");
    expect(conv.messages).toEqual([]);
  });

  it("appends user and assistant messages with secret redaction", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project";
    await initProject({ root, adapters: ["codex"] }, fs);

    const conv = await startWorkspaceConversation(
      { root, projectId: "p-agent", mode: "inspect" },
      fs,
    );

    const secretContent =
      "Here is my secret token: ghp_1234567890abcdef1234567890abcdef";
    const updated = await appendWorkspaceMessage(
      {
        root,
        conversationId: conv.id,
        role: "user",
        content: secretContent,
      },
      fs,
    );

    expect(updated.messages.length).toBe(1);
    expect(updated.messages[0].content).not.toContain(
      "ghp_1234567890abcdef1234567890abcdef",
    );
    expect(updated.messages[0].content).toContain("[REDACTED]");
  });

  it("retrieves and lists workspace conversations", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project";
    await initProject({ root, adapters: ["codex"] }, fs);

    const conv1 = await startWorkspaceConversation(
      { root, projectId: "p-agent", mode: "discuss" },
      fs,
    );
    const conv2 = await startWorkspaceConversation(
      { root, projectId: "p-agent", mode: "inspect" },
      fs,
    );

    const fetched = await getWorkspaceConversation(
      { root, conversationId: conv1.id },
      fs,
    );
    expect(fetched?.id).toBe(conv1.id);

    const list = await listWorkspaceConversations({ root }, fs);
    expect(list.length).toBe(2);
    expect(list.map((c) => c.id)).toContain(conv1.id);
    expect(list.map((c) => c.id)).toContain(conv2.id);
  });

  it("routes workspace subcommands via CLI", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project";
    await initProject({ root, adapters: ["codex"] }, fs);

    const dependencies = { catalogRoot: resolve("catalog"), fileSystem: fs };
    let startOutput = "";
    const stdoutStart = (msg: string) => {
      startOutput += `${msg}\n`;
    };

    const exitCodeStart = await runCli(
      ["workspace", "start", "--mode", "discuss", "--root", root, "--json"],
      dependencies,
      { stdout: stdoutStart, stderr: () => undefined },
    );
    expect(exitCodeStart).toBe(0);

    const startedConv = JSON.parse(startOutput);
    expect(startedConv.mode).toBe("discuss");

    let appendOutput = "";
    const stdoutAppend = (msg: string) => {
      appendOutput += `${msg}\n`;
    };

    const exitCodeAppend = await runCli(
      [
        "workspace",
        "append",
        "--conversation-id",
        startedConv.id,
        "--content",
        "Discussing requirements",
        "--root",
        root,
        "--json",
      ],
      dependencies,
      { stdout: stdoutAppend, stderr: () => undefined },
    );
    expect(exitCodeAppend).toBe(0);

    const appendedConv = JSON.parse(appendOutput);
    expect(appendedConv.messages.length).toBe(1);
    expect(appendedConv.messages[0].content).toBe("Discussing requirements");
  });
});
