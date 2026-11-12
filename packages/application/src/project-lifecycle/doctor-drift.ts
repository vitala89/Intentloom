import type { AdapterName } from "@intentloom/core";
import { copilotInstructionPath } from "../instruction-file-taxonomy.js";
import type { Change } from "../project-change.js";
import {
  lockPath,
  sourceMapPath,
} from "../generated-file/transaction-metadata.js";
import {
  configPath,
  type DoctorFinding,
  type InitOptions,
} from "./project-lifecycle-contracts.js";
import type { MetadataPresence } from "./doctor-metadata.js";

export function adapterForDoctorPath(
  path: string,
  selectedAdapters: readonly AdapterName[],
): AdapterName | null {
  if (path === "CLAUDE.md" || path.startsWith(".claude/")) return "claude";
  if (path.startsWith(".agents/")) {
    const owners = selectedAdapters.filter(
      (adapter) => adapter === "codex" || adapter === "cursor",
    );
    return owners.length === 1 ? owners[0]! : null;
  }
  if (path.startsWith(".cursor/")) return "cursor";
  if (copilotInstructionPath(path)) return "copilot";
  if (path === "AGENTS.md")
    return (
      selectedAdapters.find((adapter) => adapter !== "claude") ??
      selectedAdapters[0] ??
      null
    );
  return null;
}

interface DriftCode {
  readonly code: string;
  readonly category: DoctorFinding["category"];
  readonly remediation: string;
}

function driftCodeForChange(kind: Change["kind"]): DriftCode {
  if (kind === "modified")
    return {
      code: "generated-checksum-drift",
      category: "drift",
      remediation:
        "Restore the generated file or explicitly regenerate it after review.",
    };
  if (kind === "missing")
    return {
      code: "generated-file-missing",
      category: "generated-file",
      remediation:
        "Review a sync dry-run and restore the missing generated output.",
    };
  if (kind === "stale")
    return {
      code: "adapter-output-stale",
      category: "drift",
      remediation: "Review and apply a transactional sync.",
    };
  if (kind === "security-error")
    return {
      code: "path-security-violation",
      category: "security",
      remediation: "Remove the unsafe path or symlink before retrying.",
    };
  return {
    code: "unowned-generated-destination",
    category: "ownership",
    remediation:
      "Keep the file project-owned or resolve the destination manually.",
  };
}

export function driftFindings(
  changes: readonly Change[],
  presence: readonly MetadataPresence[],
  options: InitOptions,
  selectedAdapters: readonly AdapterName[],
): DoctorFinding[] {
  const findings: DoctorFinding[] = [];
  const blockingChanges = changes.filter((change) =>
    ["conflict", "modified", "missing", "stale", "security-error"].includes(
      change.kind,
    ),
  );
  for (const change of blockingChanges) {
    if (
      !presence.every((item) => item.present) &&
      change.kind !== "security-error"
    )
      continue;
    if (
      [configPath, lockPath, sourceMapPath].includes(change.path) &&
      change.kind !== "security-error"
    )
      continue;
    const definition = driftCodeForChange(change.kind);
    findings.push({
      code: definition.code,
      severity: "error",
      category: definition.category,
      path: change.path,
      message: change.reason,
      remediation: [definition.remediation],
      readOnly: true,
      adapter: adapterForDoctorPath(change.path, selectedAdapters),
      profile: options.profile,
    });
  }
  return findings;
}
