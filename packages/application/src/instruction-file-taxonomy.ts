import type { AdapterName } from "@intentloom/core";

const inspectionAdapterNames: readonly AdapterName[] = [
  "claude",
  "codex",
  "cursor",
  "copilot",
];

export function copilotInstructionPath(path: string): boolean {
  return (
    path === ".github/copilot-instructions.md" ||
    /^\.github\/instructions\/.+\.instructions\.md$/u.test(path) ||
    /^\.github\/skills\/.+\/SKILL\.md$/u.test(path)
  );
}

export function instructionRootKey(path: string): string | null {
  if (path === "AGENTS.md" || path.startsWith(".agents/")) return "agents";
  if (path === "CLAUDE.md" || path.startsWith(".claude/")) return "claude";
  if (path.startsWith(".cursor/")) return "cursor";
  if (copilotInstructionPath(path)) return "copilot";
  return null;
}

export function instructionAdapters(path: string): AdapterName[] {
  const detected = new Set<AdapterName>();
  if (path === "AGENTS.md" || path.startsWith(".agents/")) {
    detected.add("codex");
    detected.add("cursor");
  }
  if (path === "CLAUDE.md" || path.startsWith(".claude/"))
    detected.add("claude");
  if (path.startsWith(".cursor/")) detected.add("cursor");
  if (copilotInstructionPath(path)) detected.add("copilot");
  return inspectionAdapterNames.filter((adapter) => detected.has(adapter));
}

export function instructionPath(path: string): boolean {
  return (
    path === "AGENTS.md" ||
    path === "CLAUDE.md" ||
    path.startsWith(".claude/") ||
    path.startsWith(".agents/") ||
    path.startsWith(".cursor/") ||
    copilotInstructionPath(path)
  );
}

export function adapterForKnownInstructionPath(
  path: string,
): AdapterName | null {
  if (path === "CLAUDE.md" || path.startsWith(".claude/")) return "claude";
  if (path.startsWith(".cursor/")) return "cursor";
  if (copilotInstructionPath(path)) return "copilot";
  if (path.startsWith(".agents/")) return "codex";
  return null;
}
