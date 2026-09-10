import {
  diffProject,
  doctorProject,
  evaluateProjectEngineeringConformance,
  listSecurityFindings,
  searchPersistentMemory,
  timelineProject,
  type FileSystem,
} from "./index.js";
import type { GitRunner } from "@intentloom/evidence-git";
import type {
  EngineeringConformanceReport,
  EngineeringWorkflowPolicy,
  GenericTimeline,
} from "../../protocol/src/index.js";
import type { NeutronReadOnlyTool } from "../../protocol/src/neutron-runtime.js";
import {
  NEUTRON_TOOL_MAX_DIFF_CHANGES,
  NEUTRON_TOOL_MAX_FINDINGS,
  NEUTRON_TOOL_MAX_TIMELINE_EVENTS,
  type NeutronToolDispatch,
} from "./neutron-tool-input.js";

const READ_ONLY_DOCTOR_INIT = {
  profile: "generic",
  adapters: ["codex"] as const,
  dryRun: true as const,
};

const DEFAULT_CONFORMANCE_POLICY: EngineeringWorkflowPolicy = {
  schemaVersion: "1",
  policyId: "policy:default-engineering-conformance",
  description: "Default Intentloom engineering workflow policy",
  rules: [
    {
      ruleId: "rule:require-commit-evidence",
      caseType: "pull-request",
      severity: "error",
      title: "Commit Evidence Presence",
      condition: { type: "required-activity", activity: "commit" },
    },
  ],
};

export interface NeutronReadOnlyDispatchOptions {
  readonly fs: FileSystem;
  readonly inspect: (root: string) => Promise<unknown>;
  readonly timelineRun?: GitRunner;
}

function boundList<T>(
  items: readonly T[],
  max: number,
): {
  readonly items: readonly T[];
  readonly truncated: boolean;
} {
  return {
    items: items.slice(0, max),
    truncated: items.length > max,
  };
}

function mapDoctor(result: Awaited<ReturnType<typeof doctorProject>>): unknown {
  const findings = boundList(result.findings, NEUTRON_TOOL_MAX_FINDINGS);
  return {
    findings: findings.items,
    errors: result.errors,
    diagnostics: result.diagnostics,
    changes: result.changes.map(({ path, kind, reason }) => ({
      path,
      kind,
      reason,
    })),
    truncated: findings.truncated,
    readOnly: true,
  };
}

function mapDiff(result: Awaited<ReturnType<typeof diffProject>>): unknown {
  const changes = boundList(
    result.changes.map(({ path, kind, reason }) => ({ path, kind, reason })),
    NEUTRON_TOOL_MAX_DIFF_CHANGES,
  );
  return {
    changes: changes.items,
    diagnostics: result.diagnostics,
    truncated: changes.truncated,
    applied: false,
  };
}

function mapConformance(report: EngineeringConformanceReport): unknown {
  const findings = boundList(report.findings, NEUTRON_TOOL_MAX_FINDINGS);
  return {
    operationVersion: report.operationVersion,
    policyId: report.policyId,
    caseType: report.caseType,
    caseId: report.caseId,
    summary: report.summary,
    findings: findings.items,
    truncated: findings.truncated,
  };
}

export function createNeutronReadOnlyDispatch(
  options: NeutronReadOnlyDispatchOptions,
): NeutronToolDispatch {
  return async (toolName, args) => {
    const root = requireRoot(args);
    switch (toolName) {
      case "inspect":
        return options.inspect(root);
      case "doctor":
        return mapDoctor(
          await doctorProject({ ...READ_ONLY_DOCTOR_INIT, root }, options.fs),
        );
      case "projectDiff":
        return mapDiff(
          await diffProject({ ...READ_ONLY_DOCTOR_INIT, root }, options.fs),
        );
      case "timeline":
        return mapTimeline(await runTimeline(root, args, options.timelineRun));
      case "memorySearch":
        return searchPersistentMemory(
          String(args.query),
          {
            root,
            projectId: String(args.projectId),
            maxItems: Number(args.maxItems),
          },
          options.fs,
        );
      case "conformance":
        return mapConformance(await runConformance(root, args, options));
      case "securityAudit":
        return mapSecurity(root, args, options.fs);
      default: {
        const unexpected: never = toolName;
        throw new Error(`Unexpected tool ${String(unexpected)}`);
      }
    }
  };
}

function requireRoot(args: Record<string, unknown>): string {
  if (typeof args.root !== "string" || args.root.length === 0) {
    throw new Error("dispatch requires session root");
  }
  return args.root;
}

async function runTimeline(
  root: string,
  args: Record<string, unknown>,
  run: GitRunner | undefined,
) {
  return timelineProject({
    root,
    caseId: String(args.caseId),
    ...(typeof args.limit === "number" ? { limit: args.limit } : {}),
    ...(run !== undefined ? { run } : {}),
  });
}

function mapTimeline(
  result: Awaited<ReturnType<typeof timelineProject>>,
): unknown {
  const events = boundList(result.events, NEUTRON_TOOL_MAX_TIMELINE_EVENTS);
  return {
    root: result.root,
    caseId: result.caseId,
    caseType: result.caseType,
    quality: result.quality,
    events: events.items,
    diagnostics: result.diagnostics,
    truncated: events.truncated,
  };
}

async function runConformance(
  root: string,
  args: Record<string, unknown>,
  options: NeutronReadOnlyDispatchOptions,
): Promise<EngineeringConformanceReport> {
  const policy =
    (args.policy as EngineeringWorkflowPolicy | undefined) ??
    DEFAULT_CONFORMANCE_POLICY;
  const timeline =
    (args.timeline as GenericTimeline | undefined) ??
    (await timelineFromProject(root, String(args.caseId), options.timelineRun));
  return evaluateProjectEngineeringConformance({ root, timeline, policy });
}

async function timelineFromProject(
  root: string,
  caseId: string,
  run: GitRunner | undefined,
): Promise<GenericTimeline> {
  const projectTimeline = await timelineProject({
    root,
    caseId,
    ...(run !== undefined ? { run } : {}),
  });
  return {
    caseType: "pull-request",
    caseId,
    events: projectTimeline.events.map((event) => ({
      activity: "commit",
      source: "git",
      sourceId: event.commitId,
      commitIds: [event.commitId],
    })),
  };
}

async function mapSecurity(
  root: string,
  args: Record<string, unknown>,
  fs: FileSystem,
): Promise<unknown> {
  const findings = await listSecurityFindings({ root }, fs);
  const max =
    typeof args.maxFindings === "number"
      ? args.maxFindings
      : NEUTRON_TOOL_MAX_FINDINGS;
  const bounded = boundList(findings, max);
  return {
    projectId: String(args.projectId),
    findings: bounded.items,
    total: findings.length,
    truncated: bounded.truncated,
  };
}

export function createNeutronInspectDispatch(
  inspect: (root: string) => Promise<unknown>,
): NeutronToolDispatch {
  return async (toolName: NeutronReadOnlyTool, args) => {
    if (toolName !== "inspect") {
      throw new Error(`Unexpected tool ${toolName}`);
    }
    const root = requireRoot(args);
    return inspect(root);
  };
}
