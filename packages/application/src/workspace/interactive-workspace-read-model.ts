import type { AdapterName } from "@intentloom/core";
import type {
  AgentSessionItem,
  ContinuousSecurityAuditReport,
} from "@intentloom/protocol";
import { listAgentSessions } from "../agent-session/agent-session.js";
import type { FileSystem } from "../host-file-system.js";
import { getSecurityAuditReport } from "../security/security-audit-report-store.js";

type InteractiveWorkspaceView =
  | "inspect"
  | "doctor"
  | "diff"
  | "timeline"
  | "health"
  | "security"
  | "sessions";

type InteractiveWorkspaceOptions = {
  readonly root: string;
  readonly projectId?: string;
  readonly activeView?: InteractiveWorkspaceView;
};

type LocalWorkspaceSyncOptions = {
  readonly root: string;
  readonly projectId?: string;
};

type WorkspaceProfileOptions = {
  readonly root: string;
  readonly profile: string;
  readonly adapters: readonly AdapterName[];
};

type WorkspaceDiffOptions = WorkspaceProfileOptions & {
  readonly dryRun: boolean;
};

type WorkspaceTimelineOptions = {
  readonly root: string;
  readonly caseId: string;
  readonly limit: number;
};

type WorkspaceRootOptions = {
  readonly root: string;
};

type InteractiveWorkspaceAssembly<TInspection, TFindings, TDiff, TTimeline> = {
  readonly projectId: string;
  readonly root: string;
  readonly activeView: InteractiveWorkspaceView;
  readonly inspect: TInspection | null;
  readonly findings: TFindings;
  readonly diff: TDiff | null;
  readonly timeline: TTimeline | null;
  readonly auditReport: ContinuousSecurityAuditReport | null;
  readonly sessions: readonly AgentSessionItem[];
  readonly generatedAt: string;
};

export interface InteractiveWorkspaceReadDependencies<
  TInspection,
  TDoctor extends { readonly findings: readonly unknown[] },
  TDiff,
  TTimeline,
> {
  inspectProject: (root: string, fs: FileSystem) => Promise<TInspection>;
  doctorProject: (
    options: WorkspaceProfileOptions,
    fs: FileSystem,
  ) => Promise<TDoctor>;
  diffProject: (
    options: WorkspaceDiffOptions,
    fs: FileSystem,
  ) => Promise<TDiff>;
  timelineProject: (options: WorkspaceTimelineOptions) => Promise<TTimeline>;
}

export interface LocalWorkspaceSyncDependencies<
  TInspection extends { readonly readiness: string },
  TDoctor extends { readonly findings: readonly unknown[] },
  TConversations extends readonly unknown[],
  TTasks extends readonly unknown[],
> {
  inspectProject: (root: string, fs: FileSystem) => Promise<TInspection>;
  doctorProject: (
    options: WorkspaceProfileOptions,
    fs: FileSystem,
  ) => Promise<TDoctor>;
  listWorkspaceConversations: (
    options: WorkspaceRootOptions,
    fs: FileSystem,
  ) => Promise<TConversations>;
  listNeutronSubagentTasks: (
    options: WorkspaceRootOptions,
    fs: FileSystem,
  ) => Promise<TTasks>;
}

export interface LocalWorkspaceSyncState {
  readonly projectId: string;
  readonly root: string;
  readonly readiness: string;
  readonly findingsCount: number;
  readonly securityScore: number | null;
  readonly activeConversationsCount: number;
  readonly subagentTasksCount: number;
  readonly syncedAt: string;
}

export async function assembleInteractiveWorkspaceState<
  TInspection,
  TDoctor extends { readonly findings: readonly unknown[] },
  TDiff,
  TTimeline,
>(
  options: InteractiveWorkspaceOptions,
  fs: FileSystem,
  dependencies: InteractiveWorkspaceReadDependencies<
    TInspection,
    TDoctor,
    TDiff,
    TTimeline
  >,
): Promise<
  InteractiveWorkspaceAssembly<
    TInspection,
    TDoctor["findings"],
    TDiff,
    TTimeline
  >
> {
  const projectId = options.projectId ?? "project-local";
  const [inspect, doctor, diff, timeline, auditReport, sessions] =
    await Promise.all([
      dependencies.inspectProject(options.root, fs).catch(() => null),
      dependencies.doctorProject(
        { root: options.root, profile: "generic", adapters: ["codex"] },
        fs,
      ),
      dependencies
        .diffProject(
          {
            root: options.root,
            profile: "generic",
            adapters: ["codex"],
            dryRun: true,
          },
          fs,
        )
        .catch(() => null),
      dependencies
        .timelineProject({
          root: options.root,
          caseId: "tui-timeline",
          limit: 50,
        })
        .catch(() => null),
      getSecurityAuditReport({ root: options.root }, fs).catch(() => null),
      listAgentSessions({ root: options.root }, fs).catch(() => []),
    ]);

  return {
    projectId,
    root: options.root,
    activeView: options.activeView ?? "inspect",
    inspect,
    findings: doctor.findings,
    diff,
    timeline,
    auditReport,
    sessions,
    generatedAt: new Date().toISOString(),
  };
}

export async function assembleLocalWorkspaceSyncState<
  TInspection extends { readonly readiness: string },
  TDoctor extends { readonly findings: readonly unknown[] },
  TConversations extends readonly unknown[],
  TTasks extends readonly unknown[],
>(
  options: LocalWorkspaceSyncOptions,
  fs: FileSystem,
  dependencies: LocalWorkspaceSyncDependencies<
    TInspection,
    TDoctor,
    TConversations,
    TTasks
  >,
): Promise<LocalWorkspaceSyncState> {
  const projectId = options.projectId ?? "project-local";
  const inspection = await dependencies.inspectProject(options.root, fs);
  const doctor = await dependencies.doctorProject(
    { root: options.root, profile: "generic", adapters: ["codex"] },
    fs,
  );
  const auditReport = await getSecurityAuditReport({ root: options.root }, fs);
  const conversations = await dependencies.listWorkspaceConversations(
    { root: options.root },
    fs,
  );
  const tasks = await dependencies.listNeutronSubagentTasks(
    { root: options.root },
    fs,
  );
  return {
    projectId,
    root: options.root,
    readiness: inspection.readiness,
    findingsCount: doctor.findings.length,
    securityScore: auditReport ? auditReport.healthScore : null,
    activeConversationsCount: conversations.length,
    subagentTasksCount: tasks.length,
    syncedAt: new Date().toISOString(),
  };
}
