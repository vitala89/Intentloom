import type { NxWorkspaceMetadata } from "@intentloom/protocol";
import { prepareProjectPinnedEslint } from "./checker-execution.js";
import { ingestEngineeringQualityCheckerReport } from "./checker-report-ingestion.js";
import { createGraphSnapshotFromTypeScriptWorkspace } from "./graph-provider.js";
import {
  acquireNxGraphSnapshot,
  detectNxWorkspace,
  resolveNxAffectedProjects,
} from "./nx-graph.js";
import type { QualityCliResult } from "./cli-quality-standards.js";

export function runCheckersCliCommand(
  command: "list" | "inspect" | "consume" | "run",
  args: {
    readonly json?: boolean;
    readonly adapterId?: string;
    readonly rawReport?: string;
    readonly projectRoot?: string;
  },
): QualityCliResult {
  const json = args.json ?? false;

  const builtInAdapters = [
    {
      adapterId: "eslint-json",
      adapterName: "ESLint JSON Reporter Ingestion",
      supportedReportFormats: ["eslint-json"],
    },
    {
      adapterId: "typescript-tsc",
      adapterName: "TypeScript Diagnostics Ingestion",
      supportedReportFormats: ["tsc-json"],
    },
    {
      adapterId: "sarif-v2.1.0",
      adapterName: "SARIF Report Ingestion",
      supportedReportFormats: ["sarif-json"],
    },
    {
      adapterId: "clippy-json",
      adapterName: "Clippy Cargo JSON Ingestion",
      supportedReportFormats: ["clippy-json"],
    },
  ];

  if (command === "list") {
    const stdout = json
      ? JSON.stringify(builtInAdapters, null, 2)
      : `Built-in Checkers: ${builtInAdapters.length} adapters`;
    return { exitCode: 0, stdout, stderr: "" };
  }

  if (command === "inspect") {
    if (!args.adapterId) {
      return {
        exitCode: 1,
        stdout: "",
        stderr: "Error: adapterId is required for inspect",
      };
    }
    const adapter = builtInAdapters.find((a) => a.adapterId === args.adapterId);
    if (!adapter) {
      return {
        exitCode: 1,
        stdout: "",
        stderr: `Adapter not found: '${args.adapterId}'`,
      };
    }
    const stdout = json
      ? JSON.stringify(adapter, null, 2)
      : `Checker Adapter: ${adapter.adapterId} (${adapter.adapterName})`;
    return { exitCode: 0, stdout, stderr: "" };
  }

  if (command === "consume") {
    if (!args.adapterId || !args.rawReport) {
      return {
        exitCode: 1,
        stdout: "",
        stderr: "Error: adapterId and rawReport required for consume",
      };
    }
    const result = ingestEngineeringQualityCheckerReport({
      source: args.adapterId === "eslint-json" ? "eslint" : "sarif",
      input: args.rawReport,
    });
    const stdout = json
      ? JSON.stringify(result, null, 2)
      : `Normalized Result: ${result.findings.length} finding(s)`;
    return { exitCode: 0, stdout, stderr: "" };
  }

  if (command === "run") {
    if (!args.projectRoot) {
      return {
        exitCode: 1,
        stdout: "",
        stderr: "Error: projectRoot required for run",
      };
    }
    const runPreview = prepareProjectPinnedEslint({
      projectRoot: args.projectRoot,
      candidate: {
        relativeEntryPath: "node_modules/eslint/bin/eslint.js",
        version: "8.57.0",
      },
    });
    const stdout = json
      ? JSON.stringify(runPreview, null, 2)
      : `Checker Run Preview: ${runPreview.candidate.relativeEntryPath}`;
    return { exitCode: 0, stdout, stderr: "" };
  }

  return { exitCode: 1, stdout: "", stderr: `Unknown command: '${command}'` };
}

export function runGraphCliCommand(
  command: "detect" | "inspect" | "affected",
  args: {
    readonly json?: boolean;
    readonly workspaceRoot?: string;
    readonly files?: readonly string[];
    readonly providerKind?: "typescript-workspace" | "nx-workspace";
    readonly nxMetadata?: NxWorkspaceMetadata;
    readonly changedPaths?: readonly string[];
  },
): QualityCliResult {
  const json = args.json ?? false;

  if (command === "detect") {
    const res = detectNxWorkspace({
      workspaceRoot: args.workspaceRoot ?? "/workspace",
      files: args.files ?? [],
    });
    const stdout = json
      ? JSON.stringify(res, null, 2)
      : `Nx Detected: ${res.detected} (${res.acquisitionMode})`;
    return { exitCode: 0, stdout, stderr: "" };
  }

  if (command === "inspect") {
    const providerKind = args.providerKind ?? "nx-workspace";
    if (providerKind === "nx-workspace" && args.nxMetadata) {
      const snapshot = acquireNxGraphSnapshot(args.nxMetadata);
      const stdout = json
        ? JSON.stringify(snapshot, null, 2)
        : `Graph Snapshot: ${snapshot.snapshotId} (${snapshot.nodes.length} nodes)`;
      return { exitCode: 0, stdout, stderr: "" };
    }
    const tsSnapshot = createGraphSnapshotFromTypeScriptWorkspace({
      projectRoot: args.workspaceRoot ?? "/workspace",
      packages: [{ name: "core", path: "packages/core" }],
    });
    const stdout = json
      ? JSON.stringify(tsSnapshot, null, 2)
      : `TS Graph Snapshot: ${tsSnapshot.snapshotId} (${tsSnapshot.nodes.length} nodes)`;
    return { exitCode: 0, stdout, stderr: "" };
  }

  if (command === "affected") {
    if (!args.nxMetadata || !args.changedPaths) {
      return {
        exitCode: 1,
        stdout: "",
        stderr: "Error: nxMetadata and changedPaths required for affected",
      };
    }
    const affected = resolveNxAffectedProjects(
      args.nxMetadata,
      args.changedPaths,
    );
    const stdout = json
      ? JSON.stringify(affected, null, 2)
      : `Affected Projects: ${affected.join(", ")}`;
    return { exitCode: 0, stdout, stderr: "" };
  }

  return { exitCode: 1, stdout: "", stderr: `Unknown command: '${command}'` };
}
