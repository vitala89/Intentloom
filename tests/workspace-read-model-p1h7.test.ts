import { describe, expect, it } from "vitest";
import {
  createMemoryFileSystem,
  getInteractiveWorkspaceState,
  initProject,
  startAgentSession,
  syncLocalWorkspaceState,
  type InteractiveWorkspaceState,
  type LocalWorkspaceSyncState,
} from "@intentloom/application";
import { runCli } from "../packages/cli/src/command.js";
import {
  assembleInteractiveWorkspaceState,
  assembleLocalWorkspaceSyncState,
} from "../packages/application/src/workspace/interactive-workspace-read-model.ts";
import {
  auditReport,
  catalogRoot,
  deferred,
  flush,
  interactiveDependencies,
  interactiveKeys,
  observedFileSystem,
  root,
  syncDependencies,
  syncKeys,
  views,
  writeAudit,
  storedAuditPath,
} from "./workspace-read-model-p1h7-fixtures.ts";

describe("P1H.7 interactive workspace read model", () => {
  it("keeps the public package-root functions and erased result types", async () => {
    const application = await import("@intentloom/application");
    expect(typeof application.getInteractiveWorkspaceState).toBe("function");
    expect(typeof application.syncLocalWorkspaceState).toBe("function");
    expect("InteractiveWorkspaceState" in application).toBe(false);
    expect("LocalWorkspaceSyncState" in application).toBe(false);
    expect(typeof assembleInteractiveWorkspaceState).toBe("function");
    expect(typeof assembleLocalWorkspaceSyncState).toBe("function");

    const fs = createMemoryFileSystem();
    await initProject({ root, adapters: ["codex"] }, fs);
    const interactive: InteractiveWorkspaceState =
      await getInteractiveWorkspaceState({ root }, fs);
    const synced: LocalWorkspaceSyncState = await syncLocalWorkspaceState(
      { root },
      fs,
    );
    expect(Object.keys(interactive)).toEqual([...interactiveKeys]);
    expect(Object.keys(synced)).toEqual([...syncKeys]);
    expect(interactive.projectId).toBe("project-local");
    expect(interactive.activeView).toBe("inspect");
    expect(synced.projectId).toBe("project-local");
    expect(synced.readiness).toBe(interactive.inspect?.readiness);
    expect(synced.findingsCount).toBe(interactive.findings.length);
    expect(synced.securityScore).toBeNull();
    expect(synced.activeConversationsCount).toBe(0);
    expect(synced.subagentTasksCount).toBe(0);
  });

  it("preserves interactive defaults, views, call arguments, and fallbacks", async () => {
    const seenAdapters: readonly string[][] = [];
    let doctorArguments = 0;
    const plan = { changes: [{ path: "kept.ts" }], diagnostics: ["keep-plan"] };
    const timeline = { root, diagnostics: ["keep-timeline"] };
    const dependencies = interactiveDependencies({
      inspectProject: async (projectRoot, fs) => {
        expect(projectRoot).toBe(root);
        expect(fs.files).toBeDefined();
        return {
          readiness: "ready",
          findings: ["inspect-finding"],
        } as Inspection;
      },
      doctorProject: async (options, fs, ...rest) => {
        doctorArguments = rest.length;
        seenAdapters.push(options.adapters);
        expect(options).toEqual({
          root,
          profile: "generic",
          adapters: ["codex"],
        });
        expect(fs.files).toBeDefined();
        return { findings: ["doctor-finding"] };
      },
      diffProject: async (options, _fs, ...rest) => {
        expect(rest).toEqual([]);
        seenAdapters.push(options.adapters);
        expect(options).toEqual({
          root,
          profile: "generic",
          adapters: ["codex"],
          dryRun: true,
        });
        return plan;
      },
      timelineProject: async (options, ...rest) => {
        expect(rest).toEqual([]);
        expect(options).toEqual({
          root,
          caseId: "tui-timeline",
          limit: 50,
        });
        expect(options).not.toHaveProperty("timeoutMs");
        expect(options).not.toHaveProperty("maxOutputBytes");
        expect(options).not.toHaveProperty("run");
        return timeline;
      },
    });
    const { fs } = observedFileSystem();
    const state = await assembleInteractiveWorkspaceState(
      { root, projectId: "workspace-1", activeView: "security" },
      fs,
      dependencies,
    );
    expect(state.projectId).toBe("workspace-1");
    expect(state.activeView).toBe("security");
    expect(state.findings).toEqual(["doctor-finding"]);
    expect(state.inspect).toEqual({
      readiness: "ready",
      findings: ["inspect-finding"],
    });
    expect(state.diff).toBe(plan);
    expect(state.timeline).toBe(timeline);
    expect(doctorArguments).toBe(0);
    expect(seenAdapters).toEqual([["codex"], ["codex"]]);
    expect(seenAdapters[0]).not.toBe(seenAdapters[1]);

    let doctorCalls = 0;
    const counting = interactiveDependencies({
      doctorProject: async () => {
        doctorCalls += 1;
        return { findings: ["doctor-finding"] };
      },
    });
    const omitted = await assembleInteractiveWorkspaceState(
      { root },
      fs,
      counting,
    );
    expect(omitted.projectId).toBe("project-local");
    expect(omitted.activeView).toBe("inspect");
    for (const activeView of views) {
      const viewed = await assembleInteractiveWorkspaceState(
        { root, activeView },
        fs,
        counting,
      );
      expect(viewed.activeView).toBe(activeView);
      expect(viewed.inspect).toEqual({ readiness: "ready" });
      expect(viewed.findings).toEqual(["doctor-finding"]);
    }
    expect(doctorCalls).toBe(views.length + 1);
  });

  it("turns rejected interactive reads into the existing fallbacks and still propagates doctor", async () => {
    const { fs } = observedFileSystem();
    const rejected = await assembleInteractiveWorkspaceState(
      { root },
      fs,
      interactiveDependencies({
        inspectProject: async () => {
          throw new Error("inspect-failed");
        },
        diffProject: async () => {
          throw new Error("diff-failed");
        },
        timelineProject: async () => {
          throw new Error("timeline-failed");
        },
      }),
    );
    expect(rejected.inspect).toBeNull();
    expect(rejected.diff).toBeNull();
    expect(rejected.timeline).toBeNull();
    expect(rejected.findings).toEqual(["doctor-finding"]);

    let othersFinished = 0;
    let release!: () => void;
    const gate = new Promise<void>((resolveGate) => {
      release = resolveGate;
    });
    const pending = assembleInteractiveWorkspaceState(
      { root },
      fs,
      interactiveDependencies({
        inspectProject: async () => {
          await gate;
          othersFinished += 1;
          return { readiness: "ready" };
        },
        doctorProject: async () => {
          throw new Error("doctor-failed");
        },
        diffProject: async () => {
          await gate;
          othersFinished += 1;
          return { changes: [], diagnostics: [] };
        },
        timelineProject: async () => {
          await gate;
          othersFinished += 1;
          return { root, diagnostics: [] };
        },
      }),
    );
    await expect(pending).rejects.toThrow("doctor-failed");
    expect(othersFinished).toBe(0);
    release();
    await flush();
    expect(othersFinished).toBe(3);

    fs.exists = async () => {
      throw new Error("audit-failed");
    };
    fs.list = async () => {
      throw new Error("sessions-failed");
    };
    const caughtReaders = await assembleInteractiveWorkspaceState(
      { root },
      fs,
      interactiveDependencies(),
    );
    expect(caughtReaders.auditReport).toBeNull();
    expect(caughtReaders.sessions).toEqual([]);
  });

  it("starts all six interactive reads before the first one settles", async () => {
    const started: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>((resolveGate) => {
      release = resolveGate;
    });
    const enter = (name: string) => {
      started.push(name);
      return gate;
    };
    const { fs } = observedFileSystem();
    fs.exists = async () => {
      await enter("audit");
      return false;
    };
    fs.list = async () => {
      await enter("sessions");
      return [];
    };
    let finishedAt = 0;
    const pending = assembleInteractiveWorkspaceState(
      { root, activeView: "health" },
      fs,
      interactiveDependencies({
        inspectProject: async () => {
          await enter("inspect");
          finishedAt = Date.now();
          return { readiness: "ready" };
        },
        doctorProject: async () => {
          await enter("doctor");
          finishedAt = Date.now();
          return { findings: [] };
        },
        diffProject: async () => {
          await enter("diff");
          finishedAt = Date.now();
          return { changes: [], diagnostics: [] };
        },
        timelineProject: async () => {
          await enter("timeline");
          finishedAt = Date.now();
          return { root, diagnostics: [] };
        },
      }),
    );
    expect(started).toEqual([
      "inspect",
      "doctor",
      "diff",
      "timeline",
      "audit",
      "sessions",
    ]);
    release();
    const state = await pending;
    expect(state.activeView).toBe("health");
    expect(state.generatedAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u,
    );
    expect(Date.parse(state.generatedAt)).toBeGreaterThanOrEqual(finishedAt);
  });

  it("keeps sync reads sequential, preserves counts and score zero, and stops after a rejection", async () => {
    const { fs, calls } = observedFileSystem();
    const order: string[] = [];
    const inspectStep = deferred<Inspection>();
    const doctorStep = deferred<Doctor>();
    const auditStep = deferred<boolean>();
    const conversationStep =
      deferred<readonly { readonly projectId: string }[]>();
    const taskStep = deferred<readonly { readonly conversationId: string }[]>();
    fs.exists = async () => {
      order.push("audit");
      return auditStep.promise.then(() => false);
    };
    const pending = assembleLocalWorkspaceSyncState(
      { root, projectId: "sync-1" },
      fs,
      {
        inspectProject: () => {
          order.push("inspect");
          return inspectStep.promise;
        },
        doctorProject: (options, _fs, ...rest) => {
          expect(options).toEqual({
            root,
            profile: "generic",
            adapters: ["codex"],
          });
          expect(rest).toEqual([]);
          order.push("doctor");
          return doctorStep.promise;
        },
        listWorkspaceConversations: (options) => {
          expect(options).toEqual({ root });
          order.push("conversations");
          return conversationStep.promise;
        },
        listNeutronSubagentTasks: (options) => {
          expect(options).toEqual({ root });
          expect(options).not.toHaveProperty("conversationId");
          order.push("tasks");
          return taskStep.promise;
        },
      },
    );
    await flush();
    expect(order).toEqual(["inspect"]);
    inspectStep.resolve({ readiness: "ready" });
    await flush();
    expect(order).toEqual(["inspect", "doctor"]);
    doctorStep.resolve({ findings: ["one", "two"] });
    await flush();
    expect(order).toEqual(["inspect", "doctor", "audit"]);
    auditStep.resolve(false);
    await flush();
    expect(order).toEqual(["inspect", "doctor", "audit", "conversations"]);
    conversationStep.resolve([
      { projectId: "other-project" },
      { projectId: "second-project" },
      { projectId: "third-project" },
    ]);
    await flush();
    expect(order).toEqual([
      "inspect",
      "doctor",
      "audit",
      "conversations",
      "tasks",
    ]);
    let finishedAt = 0;
    taskStep.resolve(
      await Promise.resolve([
        { conversationId: "conversation-a" },
        { conversationId: "conversation-b" },
      ]).then((tasks) => {
        finishedAt = Date.now();
        return tasks;
      }),
    );
    const state = await pending;
    expect(Object.keys(state)).toEqual([...syncKeys]);
    expect(state.projectId).toBe("sync-1");
    expect(state.readiness).toBe("ready");
    expect(state.findingsCount).toBe(2);
    expect(state.securityScore).toBeNull();
    expect(state.activeConversationsCount).toBe(3);
    expect(state.subagentTasksCount).toBe(2);
    expect(Date.parse(state.syncedAt)).toBeGreaterThanOrEqual(finishedAt);
    expect(calls.write + calls.mkdir + calls.remove).toBe(0);

    let doctorCalled = false;
    await expect(
      assembleLocalWorkspaceSyncState(
        { root },
        fs,
        syncDependencies({
          inspectProject: async () => {
            throw new Error("inspect-failed");
          },
          doctorProject: async () => {
            doctorCalled = true;
            return { findings: [] };
          },
        }),
      ),
    ).rejects.toThrow("inspect-failed");
    expect(doctorCalled).toBe(false);

    let conversationsCalled = false;
    fs.exists = async () => {
      throw new Error("audit-failed");
    };
    await expect(
      assembleLocalWorkspaceSyncState(
        { root },
        fs,
        syncDependencies({
          listWorkspaceConversations: async () => {
            conversationsCalled = true;
            return [];
          },
        }),
      ),
    ).rejects.toThrow("audit-failed");
    expect(conversationsCalled).toBe(false);
  });

  it("passes a stored score of zero through and does not recompute a present report", async () => {
    const zero = observedFileSystem();
    await writeAudit(zero.fs, 0);
    const zeroState = await assembleLocalWorkspaceSyncState(
      { root },
      zero.fs,
      syncDependencies(),
    );
    expect(zeroState.securityScore).toBe(0);
    const zeroInteractive = await assembleInteractiveWorkspaceState(
      { root },
      zero.fs,
      interactiveDependencies(),
    );
    expect(zeroInteractive.auditReport).toEqual(auditReport(0));

    const kept = observedFileSystem();
    await writeAudit(kept.fs, 17);
    const before = new Map(kept.fs.files);
    const mutationsBefore =
      kept.calls.write + kept.calls.mkdir + kept.calls.remove;
    const interactive = await assembleInteractiveWorkspaceState(
      { root },
      kept.fs,
      interactiveDependencies(),
    );
    const synced = await assembleLocalWorkspaceSyncState(
      { root },
      kept.fs,
      syncDependencies(),
    );
    expect(interactive.auditReport).toEqual(auditReport(17));
    expect(synced.securityScore).toBe(17);
    expect([...kept.fs.files]).toEqual([...before]);
    expect(kept.calls.write + kept.calls.mkdir + kept.calls.remove).toBe(
      mutationsBefore,
    );

    const invalid = observedFileSystem();
    await invalid.fs.write(storedAuditPath(), "{");
    const missingScore = await assembleLocalWorkspaceSyncState(
      { root },
      invalid.fs,
      syncDependencies(),
    );
    expect(missingScore.securityScore).toBeNull();
    const missingInteractive = await assembleInteractiveWorkspaceState(
      { root },
      invalid.fs,
      interactiveDependencies(),
    );
    expect(missingInteractive.auditReport).toBeNull();
  });

  it("passes session records through and does not write during either read", async () => {
    const { fs, calls } = observedFileSystem();
    await startAgentSession(
      { root, projectId: "project-local", activeTask: "review the read model" },
      fs,
    );
    const before = new Map(fs.files);
    const writesBefore = calls.write;
    const mkdirBefore = calls.mkdir;
    const removeBefore = calls.remove;
    const state = await assembleInteractiveWorkspaceState(
      { root, activeView: "sessions" },
      fs,
      interactiveDependencies(),
    );
    expect(state.sessions).toHaveLength(1);
    expect(state.sessions[0]?.activeTask).toBe("review the read model");
    expect(calls.write).toBe(writesBefore);
    expect([...fs.files]).toEqual([...before]);

    const synced = await assembleLocalWorkspaceSyncState(
      { root },
      fs,
      syncDependencies(),
    );
    expect(synced.securityScore).toBeNull();
    expect(calls.write).toBe(writesBefore);
    expect(calls.mkdir).toBe(mkdirBefore);
    expect(calls.remove).toBe(removeBefore);
    expect([...fs.files]).toEqual([...before]);
  });

  it("keeps CLI ui and neutron sync on the public read model", async () => {
    const fs = createMemoryFileSystem();
    await initProject({ root, adapters: ["codex"] }, fs);
    const before = new Map(fs.files);
    const dependencies = { catalogRoot, fileSystem: fs };
    for (const view of ["doctor", "timeline", "health", "sessions"] as const) {
      let output = "";
      const exitCode = await runCli(
        ["ui", "--root", root, "--view", view, "--json"],
        dependencies,
        {
          stdout: (message) => {
            output += message;
          },
          stderr: () => undefined,
        },
      );
      expect(exitCode).toBe(0);
      const parsed = JSON.parse(output) as InteractiveWorkspaceState;
      expect(parsed.activeView).toBe(view);
      expect(Object.keys(parsed)).toEqual([...interactiveKeys]);
    }

    let syncOutput = "";
    const syncExit = await runCli(
      ["neutron", "sync", root, "--json"],
      dependencies,
      {
        stdout: (message) => {
          syncOutput += message;
        },
        stderr: () => undefined,
      },
    );
    expect(syncExit).toBe(0);
    const synced = JSON.parse(syncOutput) as LocalWorkspaceSyncState;
    expect(synced.projectId).toBe("project-local");
    expect(Object.keys(synced)).toEqual([...syncKeys]);
    expect(synced.subagentTasksCount).toBe(0);
    expect([...fs.files]).toEqual([...before]);
  });
});
