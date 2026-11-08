import { dirname } from "node:path";
import {
  validateSarifImportResult,
  validateSecurityFinding,
  type SarifImportResult,
  type SecurityEvidence,
  type SecurityFinding,
  type SecurityFindingSeverity,
} from "@intentloom/protocol";
import { nodeFileSystem, type FileSystem } from "../host-file-system.js";
import { secretLikePath } from "../project-path.js";
import { securityFindingPath } from "./security-finding-store.js";

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function importSarifSecurityReport(
  reportContent: string,
  reportPath: string,
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<SarifImportResult> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(reportContent);
  } catch {
    throw new Error("malformed SARIF JSON document");
  }

  if (!isObjectRecord(parsed) || !Array.isArray(parsed.runs)) {
    throw new Error("invalid SARIF structure: missing runs array");
  }

  const now = new Date().toISOString();
  const findings: SecurityFinding[] = [];

  let findingCounter = 1;
  for (const run of parsed.runs) {
    if (!isObjectRecord(run)) continue;
    const toolObj = isObjectRecord(run.tool) ? run.tool : {};
    const driverObj = isObjectRecord(toolObj.driver) ? toolObj.driver : {};
    const scannerName =
      typeof driverObj.name === "string" ? driverObj.name : "sarif-scanner";

    const results = Array.isArray(run.results) ? run.results : [];
    for (const result of results) {
      if (!isObjectRecord(result)) continue;
      const ruleId =
        typeof result.ruleId === "string" ? result.ruleId : "SARIF-RULE";
      const messageObj = isObjectRecord(result.message) ? result.message : {};
      const title =
        typeof messageObj.text === "string" ? messageObj.text : "SARIF Finding";
      const level =
        typeof result.level === "string"
          ? result.level.toLowerCase()
          : "warning";

      let severity: SecurityFindingSeverity = "medium";
      if (level === "error") severity = "high";
      else if (level === "warning") severity = "medium";
      else if (level === "note") severity = "low";
      else severity = "info";

      const locations = Array.isArray(result.locations) ? result.locations : [];
      const evidence: SecurityEvidence[] = locations.map((loc: unknown) => {
        if (!isObjectRecord(loc)) return { path: "unknown" };
        const phys = isObjectRecord(loc.physicalLocation)
          ? loc.physicalLocation
          : {};
        const art = isObjectRecord(phys.artifactLocation)
          ? phys.artifactLocation
          : {};
        const rawUri = typeof art.uri === "string" ? art.uri : "unknown";
        const region = isObjectRecord(phys.region) ? phys.region : {};
        const startLine =
          typeof region.startLine === "number" ? region.startLine : undefined;
        const endLine =
          typeof region.endLine === "number" ? region.endLine : undefined;
        const snippetObj = isObjectRecord(region.snippet) ? region.snippet : {};
        const snippetText =
          typeof snippetObj.text === "string" ? snippetObj.text : undefined;

        const path = secretLikePath(rawUri) ? "[REDACTED]" : rawUri;
        return {
          path,
          ...(startLine !== undefined ? { startLine } : {}),
          ...(endLine !== undefined ? { endLine } : {}),
          ...(snippetText !== undefined
            ? {
                snippet: secretLikePath(snippetText)
                  ? "[REDACTED]"
                  : snippetText,
              }
            : {}),
        };
      });

      const findingId = `sarif-finding-${findingCounter++}`;
      const finding: SecurityFinding = validateSecurityFinding({
        schemaVersion: "1",
        id: findingId,
        ruleId,
        title: secretLikePath(title) ? "[REDACTED]" : title,
        severity,
        state: "open",
        category: "vulnerability",
        description: `Imported from ${scannerName}`,
        scanner: scannerName,
        evidence,
        trustClass: "verified-evidence",
        createdAt: now,
        updatedAt: now,
      });

      const path = securityFindingPath(options.root, findingId);
      if (!(await fs.exists(dirname(path)))) {
        await fs.mkdir(dirname(path));
      }
      await fs.write(path, `${JSON.stringify(finding, null, 2)}\n`);
      findings.push(finding);
    }
  }

  const result: SarifImportResult = validateSarifImportResult({
    schemaVersion: "1",
    reportPath,
    importedCount: findings.length,
    findings,
    importedAt: now,
  });

  return result;
}
