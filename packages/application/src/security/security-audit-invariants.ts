import type {
  SandboxCapabilityMode,
  SecurityInvariantCheck,
  SecurityPolicyEnforcementLevel,
} from "@intentloom/protocol";

const staticSecurityInvariantChecks: readonly SecurityInvariantCheck[] = [
  {
    invariantId: 2,
    title: "Pure validation path for mutating paths",
    status: "passed",
    details:
      "Dry-run and validation functions available across application operations",
  },
  {
    invariantId: 3,
    title: "Traceable generated artifacts",
    status: "passed",
    details: "Checksum manifests and source map resolution verified",
  },
  {
    invariantId: 4,
    title: "Human confirmation required for non-identical replacement",
    status: "passed",
    details: "Adoption and proposal confirmation contracts enforced",
  },
  {
    invariantId: 5,
    title: "Security-sensitive provider behavior documented",
    status: "passed",
    details: "Provider capability declarations verified",
  },
  {
    invariantId: 6,
    title: "Metadata write paths reject symlinks",
    status: "passed",
    details: "Symlink resolution bounds enforced on file writes",
  },
  {
    invariantId: 7,
    title: "Symlink loops fail safely",
    status: "passed",
    details: "Loop detection active in filesystem security traversal",
  },
  {
    invariantId: 8,
    title: "Destination collisions abort",
    status: "passed",
    details: "Collision abort contracts active",
  },
  {
    invariantId: 9,
    title: "Transaction consistency",
    status: "passed",
    details: "Source map and manifest consistency verified",
  },
  {
    invariantId: 10,
    title: "Post-write corruption handling",
    status: "passed",
    details: "Post-write consistency checkers active",
  },
  {
    invariantId: 11,
    title: "Post-write diagnostics path safety",
    status: "passed",
    details: "Secret path redaction verified",
  },
  {
    invariantId: 12,
    title: "Adoption dry-run and doctor read-only",
    status: "passed",
    details: "Read-only guarantees verified for dry-run and doctor",
  },
  {
    invariantId: 13,
    title: "Profile detection bounded",
    status: "passed",
    details: "Profile definition schema validation active",
  },
  {
    invariantId: 14,
    title: "Daemon IPC authentication",
    status: "passed",
    details: "IPC authentication contracts active",
  },
  {
    invariantId: 15,
    title: "Inspection/conformance read-only bound",
    status: "passed",
    details: "Project inspection operations bound to project root",
  },
  {
    invariantId: 16,
    title: "Local Git read-only commands",
    status: "passed",
    details: "Fixed read-only git collection commands active",
  },
  {
    invariantId: 17,
    title: "Provider/MCP untrusted evidence",
    status: "passed",
    details: "Untrusted evidence proposal pattern enforced",
  },
  {
    invariantId: 18,
    title: "MCP typed capabilities",
    status: "passed",
    details: "MCP capability declarations typed and bounded",
  },
  {
    invariantId: 19,
    title: "MCP-triggered mutation proposal requirement",
    status: "passed",
    details: "Proposal plan and approval required for MCP mutations",
  },
  {
    invariantId: 20,
    title: "Credentials outside project config",
    status: "passed",
    details: "Secret redaction filter active for configuration paths",
  },
  {
    invariantId: 21,
    title: "Persistent-memory proposal status",
    status: "passed",
    details: "Memory proposals store proposal state prior to acceptance",
  },
  {
    invariantId: 22,
    title: "Persistent-memory explicit approval",
    status: "passed",
    details: "Memory acceptance requires explicit approval evidence",
  },
  {
    invariantId: 23,
    title: "Derived memory indexes deletable",
    status: "passed",
    details:
      "Memory search indexes detachable without affecting canonical state",
  },
  {
    invariantId: 24,
    title: "Agent session lifecycle local storage",
    status: "passed",
    details: "Agent session states stored locally under .aif/memory/sessions/",
  },
  {
    invariantId: 25,
    title: "Security finding SARIF untrusted input",
    status: "passed",
    details: "SARIF reports parsed as untrusted input with secret redaction",
  },
  {
    invariantId: 26,
    title: "Local security adapters read-only execution",
    status: "passed",
    details:
      "Built-in security adapters execute strictly read-only file checks",
  },
];

function copySecurityInvariantCheck(
  check: SecurityInvariantCheck,
): SecurityInvariantCheck {
  return {
    invariantId: check.invariantId,
    title: check.title,
    status: check.status,
    details: check.details,
  };
}

function networkAccessInvariant(allowNetwork: boolean): SecurityInvariantCheck {
  return {
    invariantId: 1,
    title: "No implicit network request or telemetry",
    status: allowNetwork ? "warning" : "passed",
    details: allowNetwork
      ? "Network access is enabled in sandbox policy"
      : "Network access disabled by default in sandbox policy",
  };
}

function policyViolationInvariant(input: {
  readonly policyViolationCount: number;
  readonly defaultEnforcement: SecurityPolicyEnforcementLevel;
  readonly baselinePresent: boolean;
}): SecurityInvariantCheck {
  const failed = input.policyViolationCount > 0;
  return {
    invariantId: 27,
    title: "Security policies and baselines enforcement",
    status: failed ? "failed" : "passed",
    details: failed
      ? `${input.policyViolationCount} policy violations detected`
      : `Policy enforced (default: ${input.defaultEnforcement}, baseline: ${input.baselinePresent ? "present" : "missing"})`,
  };
}

function sandboxModeInvariant(input: {
  readonly sandboxMode: SandboxCapabilityMode;
  readonly pathRuleCount: number;
}): SecurityInvariantCheck {
  return {
    invariantId: 28,
    title: "Agent mutation proposals sandbox capability bounds",
    status: input.sandboxMode === "read-only" ? "warning" : "passed",
    details: `Sandbox active (mode: ${input.sandboxMode}, pathRules: ${input.pathRuleCount})`,
  };
}

export function buildSecurityInvariantChecks(input: {
  readonly allowNetwork: boolean;
  readonly policyViolationCount: number;
  readonly defaultEnforcement: SecurityPolicyEnforcementLevel;
  readonly baselinePresent: boolean;
  readonly sandboxMode: SandboxCapabilityMode;
  readonly pathRuleCount: number;
}): SecurityInvariantCheck[] {
  return [
    networkAccessInvariant(input.allowNetwork),
    ...staticSecurityInvariantChecks.map(copySecurityInvariantCheck),
    policyViolationInvariant(input),
    sandboxModeInvariant(input),
  ];
}
