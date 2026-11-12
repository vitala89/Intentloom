import type { OwnershipClass, RoleCandidate } from "@intentloom/core/adoption";

export function ownershipClassForPath(path: string): OwnershipClass {
  if (path.startsWith(".aif/") || path.startsWith("catalog/"))
    return "intentloom-managed";
  if (
    path.startsWith(".claude/") ||
    path === "CLAUDE.md" ||
    path.startsWith(".cursor/") ||
    path === ".cursorrules" ||
    path.includes("copilot-instructions.md")
  )
    return "provider-derivative";
  return "project-owned";
}

export function roleCandidatesForPath(path: string): RoleCandidate[] {
  return [
    ...operationalRoleCandidates(path),
    ...agreementRoleCandidates(path),
    ...providerRoleCandidates(path),
    ...durableContextRoleCandidates(path),
  ];
}

function operationalRoleCandidates(path: string): RoleCandidate[] {
  const roleCandidates: RoleCandidate[] = [];
  if (path === "docs/product/CURRENT_STATE.md" || path === "CURRENT_STATE.md") {
    roleCandidates.push({
      role: "operational-project-state",
      confidence: 1.0,
      evidence: [`filename match: ${path}`],
    });
  }
  if (path === "PROJECT_STATE.md") {
    roleCandidates.push({
      role: "operational-project-state",
      confidence: 1.0,
      evidence: [`filename match: ${path}`],
    });
  }
  if (path === "AGENT_START_HERE.md") {
    roleCandidates.push({
      role: "agent-entrypoint",
      confidence: 1.0,
      evidence: [`filename match: ${path}`],
    });
  }
  if (path === "DUTY_WATCH.md") {
    roleCandidates.push({
      role: "duty-watch-log",
      confidence: 1.0,
      evidence: [`filename match: ${path}`],
    });
  }
  return roleCandidates;
}

function agreementRoleCandidates(path: string): RoleCandidate[] {
  const roleCandidates: RoleCandidate[] = [];
  if (path === "AGENTS.md") {
    roleCandidates.push({
      role: "working-agreement",
      confidence: 0.9,
      evidence: [`filename match: ${path}`],
    });
  }
  if (path === "ROADMAP.md") {
    roleCandidates.push({
      role: "roadmap",
      confidence: 1.0,
      evidence: [`filename match: ${path}`],
    });
  }
  if (path === "CHANGELOG.md") {
    roleCandidates.push({
      role: "changelog",
      confidence: 1.0,
      evidence: [`filename match: ${path}`],
    });
  }
  if (path === "SECURITY.md") {
    roleCandidates.push({
      role: "security-policy",
      confidence: 1.0,
      evidence: [`filename match: ${path}`],
    });
  }
  if (
    path === "docs/governance/ENGINEERING_PRINCIPLES.md" ||
    path.endsWith("ENGINEERING_PRINCIPLES.md")
  ) {
    roleCandidates.push({
      role: "validation-policy",
      confidence: 0.9,
      evidence: [`filename match: ${path}`],
    });
  }
  return roleCandidates;
}

function providerRoleCandidates(path: string): RoleCandidate[] {
  const roleCandidates: RoleCandidate[] = [];
  if (path.startsWith(".claude") || path === "CLAUDE.md") {
    roleCandidates.push({
      role: "provider-instructions:claude",
      confidence: 1.0,
      evidence: ["provider file: claude"],
    });
  }
  if (path.startsWith(".cursor") || path === ".cursorrules") {
    roleCandidates.push({
      role: "provider-instructions:cursor",
      confidence: 1.0,
      evidence: ["provider file: cursor"],
    });
  }
  if (path.includes("copilot-instructions.md")) {
    roleCandidates.push({
      role: "provider-instructions:copilot",
      confidence: 1.0,
      evidence: ["provider file: copilot"],
    });
  }
  return roleCandidates;
}

function durableContextRoleCandidates(path: string): RoleCandidate[] {
  const roleCandidates: RoleCandidate[] = [];
  if (path.startsWith("docs/decisions/")) {
    roleCandidates.push({
      role: "durable-project-context",
      confidence: 0.8,
      evidence: ["directory pattern: decisions"],
    });
  }
  if (path.startsWith("docs/specs/")) {
    roleCandidates.push({
      role: "durable-project-context",
      confidence: 0.8,
      evidence: ["directory pattern: specs"],
    });
  }
  return roleCandidates;
}
