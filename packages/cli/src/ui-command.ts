import { cwd } from "node:process";
import {
  getInteractiveWorkspaceState,
  nodeFileSystem,
  type FileSystem,
  type InteractiveWorkspaceState,
} from "@intentloom/application";
import { SchemaCatalogError } from "@intentloom/validator";
import {
  assertDaemonFlagsAllowed,
  CliUsageError,
  createCliArtifactValidator,
} from "./cli-project-metadata.js";

export type UiCliExitCode = 0 | 2 | 3;

export interface UiCliIo {
  readonly stdout: (message: string) => void;
  readonly stderr: (message: string) => void;
}

export interface UiCliDependencies {
  readonly catalogRoot: string;
  readonly fileSystem?: FileSystem;
}

interface UiParsedArguments {
  readonly flags: ReadonlySet<string>;
  readonly values: ReadonlyMap<string, string>;
}

const booleanFlags = new Set([
  "--cache",
  "--dry-run",
  "--force",
  "--json",
  "--plan",
  "--strict",
  "--enable",
  "--disable",
  "--clear",
]);
const valueFlags = new Set([
  "--root",
  "--profile",
  "--adapters",
  "--task",
  "--daemon-endpoint",
  "--daemon-token-file",
  "--case-id",
  "--provider",
  "--file",
  "--project-key",
  "--policy",
  "--timeline",
  "--case-type",
  "--output",
  "--apply",
  "--id",
  "--trust-class",
  "--retention-state",
  "--json-input",
  "--level",
  "--pack",
  "--role",
  "--query",
  "--max-budget",
  "--state",
  "--severity",
  "--reason",
  "--category",
  "--evidence",
  "--proposal-id",
  "--skill-id",
  "--action",
  "--plan-file",
  "--new-intent",
  "--task-id",
  "--name",
  "--max-tokens",
  "--max-items",
  "--approved-by",
  "--project-id",
  "--target",
  "--path",
  "--conversation-id",
  "--content",
  "--mode",
  "--input",
  "--view",
]);
const mappingValueFlags = new Set([
  "--project-owned-mapping",
  "--documentation-mapping",
]);

function parseUiArguments(args: readonly string[]): UiParsedArguments {
  const flags = new Set<string>();
  const values = new Map<string, string>();
  const mappingValues = new Map<string, string[]>();

  for (let index = 1; index < args.length; index += 1) {
    const token = args[index]!;
    if (booleanFlags.has(token)) {
      flags.add(token);
      continue;
    }
    if (!token.startsWith("--")) {
      if (values.has("--root"))
        throw new CliUsageError(`unexpected argument: ${token}`);
      values.set("--root", token);
      continue;
    }
    if (!valueFlags.has(token) && !mappingValueFlags.has(token))
      throw new CliUsageError(`unknown option: ${token}`);
    const value = args[index + 1];
    if (value === undefined || value.startsWith("--"))
      throw new CliUsageError(`missing value for ${token}`);
    if (token === "--root" && values.has("--root"))
      throw new CliUsageError("project path specified more than once");
    if (mappingValueFlags.has(token)) {
      const entries = mappingValues.get(token) ?? [];
      entries.push(value);
      mappingValues.set(token, entries);
    } else values.set(token, value);
    index += 1;
  }

  if (flags.has("--force"))
    throw new CliUsageError("--force is only valid with sync");
  if (mappingValues.size > 0)
    throw new CliUsageError(
      "adoption mappings are only valid with init or adopt",
    );
  assertDaemonFlagsAllowed(
    "ui",
    values.has("--daemon-endpoint"),
    values.has("--daemon-token-file"),
  );
  if (flags.has("--cache"))
    throw new CliUsageError("--cache is only valid with clean");

  return { flags, values };
}

function formatInteractiveWorkspaceText(
  state: InteractiveWorkspaceState,
): string {
  const lines = [
    `Intentloom Interactive Terminal UI - Workspace (${state.projectId})`,
    `Root: ${state.root}`,
    `Active View: ${state.activeView.toUpperCase()}  |  Read-only Mode`,
    `─`.repeat(72),
  ];

  if (state.activeView === "inspect" && state.inspect) {
    lines.push(`[INSPECT VIEW]`);
    lines.push(
      `  Selected Profile: ${state.inspect.profileDetection.selectedProfile}`,
    );
    lines.push(
      `  Detected Adapters: ${state.inspect.detectedAdapters.join(", ") || "None"}`,
    );
    lines.push(
      `  Instruction Paths: ${state.inspect.instructionPaths.join(", ") || "None"}`,
    );
    lines.push(`  Inspection Findings: ${state.inspect.findings.length}`);
  } else if (state.activeView === "doctor" || state.activeView === "health") {
    const errors = state.findings.filter((f) => f.severity === "error").length;
    const warnings = state.findings.filter(
      (f) => f.severity === "warning",
    ).length;
    lines.push(
      `[DOCTOR VIEW]  Errors: ${errors} | Warnings: ${warnings} | Total: ${state.findings.length}`,
    );
    if (state.findings.length === 0) {
      lines.push(`  ✓ No health findings recorded for this project.`);
    } else {
      state.findings.slice(0, 10).forEach((f) => {
        lines.push(
          `  [${f.severity.toUpperCase()}] ${f.category}: ${f.message}`,
        );
        if (f.path) lines.push(`    Path: ${f.path}`);
        if (f.remediation) lines.push(`    Fix:  ${f.remediation}`);
      });
    }
  } else if (state.activeView === "diff" && state.diff) {
    lines.push(`[DIFF REVIEW]  Changes: ${state.diff.changes.length} file(s)`);
    if (state.diff.changes.length === 0) {
      lines.push(`  ✓ Clean working tree — no uncommitted changes.`);
    } else {
      state.diff.changes.forEach((c) => {
        lines.push(`  [${c.kind.toUpperCase()}] ${c.path} (${c.reason})`);
      });
    }
  } else if (state.activeView === "timeline" && state.timeline) {
    lines.push(
      `[TIMELINE]  Case ID: ${state.timeline.caseId} | Quality: ${state.timeline.quality}`,
    );
    if (state.timeline.events.length === 0) {
      lines.push(`  No timeline events recorded.`);
    } else {
      state.timeline.events.slice(0, 10).forEach((e) => {
        const time = new Date(e.timestamp).toISOString().slice(0, 19);
        lines.push(`  ${time} | [${e.source}] ${e.commitId.slice(0, 9)}`);
      });
    }
  } else {
    lines.push(`[SUMMARY]`);
    lines.push(`  Doctor Findings: ${state.findings.length}`);
    lines.push(
      `  Security Health: ${state.auditReport ? `${state.auditReport.healthScore}%` : "Not audited"}`,
    );
    lines.push(`  Agent Sessions:  ${state.sessions.length}`);
  }
  lines.push(`─`.repeat(72));
  lines.push(`Generated At: ${state.generatedAt}`);
  return lines.join("\n");
}

export async function runUiCommand(
  args: readonly string[],
  dependencies: UiCliDependencies,
  io: UiCliIo,
): Promise<UiCliExitCode> {
  try {
    const parsed = parseUiArguments(args);
    await createCliArtifactValidator(dependencies.catalogRoot);
    const fileSystem = dependencies.fileSystem ?? nodeFileSystem;
    const root = parsed.values.get("--root") ?? cwd();
    const projectId = parsed.values.get("--project-id") ?? "project-local";
    const requestedView = (parsed.values.get("--view") ?? "inspect") as
      "inspect" | "doctor" | "diff" | "timeline" | "security" | "sessions";
    const state = await getInteractiveWorkspaceState(
      { root, projectId, activeView: requestedView },
      fileSystem,
    );
    if (parsed.flags.has("--json")) {
      io.stdout(JSON.stringify(state, null, 2));
    } else {
      io.stdout(formatInteractiveWorkspaceText(state));
    }
    return 0;
  } catch (error) {
    if (error instanceof SchemaCatalogError) {
      const payload = {
        status: "invalid",
        errorCode: error.code,
        schemaFile: error.schemaFile,
      };
      const output = args.includes("--json")
        ? JSON.stringify(payload, null, 2)
        : `Intentloom schema catalog validation failed: ${error.schemaFile} [${error.code}]`;
      io.stderr(output);
      return 3;
    }
    io.stderr(error instanceof Error ? error.message : "configuration error");
    return 2;
  }
}
