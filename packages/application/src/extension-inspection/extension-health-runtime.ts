import type {
  ExtensionCapabilities,
  ExtensionHealthEvidence,
  ExtensionHealthFinding,
  ExtensionLockEntry,
} from "@intentloom/protocol";

function finding(
  extensionId: string,
  code: string,
  severity: ExtensionHealthFinding["severity"],
  path: string,
  message: string,
  remediation: string,
): ExtensionHealthFinding {
  return { extensionId, code, severity, path, message, remediation };
}

function capabilityValues(
  capabilities: ExtensionCapabilities | undefined,
): Record<string, readonly string[]> {
  return {
    "filesystem.read": capabilities?.filesystem?.read ?? [],
    "filesystem.write": capabilities?.filesystem?.write ?? [],
    "process.exec": capabilities?.process?.exec ?? [],
    "network.connect": capabilities?.network?.connect ?? [],
  };
}

function addCapabilityFindings(
  findings: ExtensionHealthFinding[],
  extensionId: string,
  path: string,
  declared: ExtensionCapabilities | undefined,
  granted: ExtensionCapabilities | undefined,
) {
  if (declared === undefined || granted === undefined) return;
  const declaredValues = capabilityValues(declared);
  for (const [kind, values] of Object.entries(capabilityValues(granted))) {
    for (const value of values)
      if (!declaredValues[kind]!.includes(value))
        findings.push(
          finding(
            extensionId,
            "extension-capability-unapproved",
            "error",
            path,
            `${kind} capability is granted without a matching declaration: ${value}`,
            "Review the manifest and re-approve the capability explicitly.",
          ),
        );
  }
}

function addCapabilityDriftFinding(
  findings: ExtensionHealthFinding[],
  extensionId: string,
  path: string,
  expected: ExtensionCapabilities | undefined,
  observed: ExtensionCapabilities | undefined,
) {
  if (observed === undefined) return;
  if (JSON.stringify(expected ?? {}) === JSON.stringify(observed ?? {})) return;
  findings.push(
    finding(
      extensionId,
      "extension-capability-drift",
      "error",
      path,
      "observed granted capabilities differ from the pinned lock state",
      "Stop the extension and review capability approval before continuing.",
    ),
  );
}

function inspectSourceEvidence(
  entry: ExtensionLockEntry,
  path: string,
  evidence: ExtensionHealthEvidence,
): ExtensionHealthFinding[] {
  const findings: ExtensionHealthFinding[] = [];
  if (evidence.sourceStatus === "unavailable")
    findings.push(
      finding(
        entry.extensionId,
        "extension-source-unavailable",
        "warning",
        path,
        "extension source is unavailable",
        "Keep the last known-good artifact and review source availability before updating.",
      ),
    );
  if (
    evidence.sourceStatus === "revoked" ||
    evidence.sourceStatus === "compromised"
  )
    findings.push(
      finding(
        entry.extensionId,
        `extension-source-${evidence.sourceStatus}`,
        "error",
        path,
        `extension source is ${evidence.sourceStatus}`,
        "Disable the extension and follow the security advisory remediation path.",
      ),
    );
  if (
    entry.integrity &&
    evidence.artifactIntegrity &&
    entry.integrity !== evidence.artifactIntegrity
  )
    findings.push(
      finding(
        entry.extensionId,
        "extension-integrity-mismatch",
        "error",
        path,
        "local extension artifact does not match its pinned integrity digest",
        "Stop using the artifact and restore the last verified version.",
      ),
    );
  return findings;
}

function inspectCapabilityEvidence(
  entry: ExtensionLockEntry,
  path: string,
  evidence: ExtensionHealthEvidence,
): ExtensionHealthFinding[] {
  const findings: ExtensionHealthFinding[] = [];
  addCapabilityFindings(
    findings,
    entry.extensionId,
    path,
    evidence.declaredCapabilities,
    evidence.grantedCapabilities,
  );
  addCapabilityDriftFinding(
    findings,
    entry.extensionId,
    path,
    entry.grantedCapabilities,
    evidence.grantedCapabilities,
  );
  return findings;
}

export function inspectRuntimeEvidence(
  entry: ExtensionLockEntry,
  path: string,
  evidence: ExtensionHealthEvidence,
): ExtensionHealthFinding[] {
  const findings = [
    ...inspectSourceEvidence(entry, path, evidence),
    ...inspectCapabilityEvidence(entry, path, evidence),
  ];
  if (
    entry.configDigest &&
    evidence.configDigest &&
    entry.configDigest !== evidence.configDigest
  )
    findings.push(
      finding(
        entry.extensionId,
        "extension-configuration-drift",
        "error",
        path,
        "extension configuration does not match its pinned digest",
        "Review configuration changes and approve a migration explicitly.",
      ),
    );
  if (evidence.entrypointAvailable === false)
    findings.push(
      finding(
        entry.extensionId,
        "extension-entrypoint-unavailable",
        "error",
        path,
        "extension entrypoint command is unavailable",
        "Restore the pinned artifact or disable the extension before use.",
      ),
    );
  if (evidence.healthCheckStatus === "unhealthy")
    findings.push(
      finding(
        entry.extensionId,
        "extension-health-check-failed",
        "error",
        path,
        "extension health check endpoint reported unhealthy",
        "Disable the extension and inspect its last known-good runtime.",
      ),
    );
  if (evidence.healthCheckStatus === "unavailable")
    findings.push(
      finding(
        entry.extensionId,
        "extension-health-check-unavailable",
        "warning",
        path,
        "extension health check endpoint is unavailable",
        "Retry the read-only health check before relying on the extension.",
      ),
    );
  return findings;
}
