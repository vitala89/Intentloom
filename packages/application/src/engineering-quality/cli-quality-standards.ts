import type { EngineeringQualityPolicy } from "@intentloom/protocol";
import { QUALITY_POLICY_SCHEMA_URN } from "@intentloom/protocol";
import { validateEngineeringQualityPolicy } from "@intentloom/validator";
import {
  FIRST_PARTY_CATALOG_ENTRIES,
  diffEngineeringQualityPackUpdates,
  inspectEngineeringCatalogEntry,
  searchEngineeringCatalog,
  verifyQuarantineArtifact,
} from "./curated-catalog.js";
import { prepareEngineeringQualityBaseline } from "./baseline-preview.js";
import { prepareEngineeringQualityDecompositionPlan } from "./decomposition-planner.js";

export interface QualityCliResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

export function getEffectiveEngineeringQualityPolicy(): EngineeringQualityPolicy {
  return validateEngineeringQualityPolicy({
    schemaVersion: QUALITY_POLICY_SCHEMA_URN,
    policyId: "balanced",
    name: "balanced",
    profileName: "balanced",
    version: "1.0.0",
    defaultRules: [],
  });
}

export function runQualityCliCommand(
  command:
    "show" | "check" | "explain" | "baseline-preview" | "decomposition-plan",
  args: {
    readonly json?: boolean;
    readonly ruleId?: string;
    readonly filePath?: string;
    readonly fileContent?: string;
    readonly policy?: EngineeringQualityPolicy;
  },
): QualityCliResult {
  const json = args.json ?? false;

  if (command === "show") {
    const policy = args.policy ?? getEffectiveEngineeringQualityPolicy();
    const stdout = json
      ? JSON.stringify(policy, null, 2)
      : `Policy: ${policy.policyId} (v${policy.profileName})`;
    return { exitCode: 0, stdout, stderr: "" };
  }

  if (command === "explain") {
    if (!args.ruleId) {
      return {
        exitCode: 1,
        stdout: "",
        stderr: "Error: --ruleId is required for explain command",
      };
    }
    const explanation = {
      ruleId: args.ruleId,
      summary: `Explanation for rule ${args.ruleId}`,
      severity: "warning",
    };
    const stdout = json
      ? JSON.stringify(explanation, null, 2)
      : `Rule: ${explanation.ruleId}\n${explanation.summary}`;
    return { exitCode: 0, stdout, stderr: "" };
  }

  if (command === "baseline-preview") {
    const preview = prepareEngineeringQualityBaseline({
      projectId: "my-project",
      policyId: "balanced",
      reason: "Legacy baseline snapshot",
      owner: "@team/core",
      findings: [],
    });
    const stdout = json
      ? JSON.stringify(preview, null, 2)
      : `Baseline Preview: ${preview.policyId} (${preview.candidateItems.length} candidate items)`;
    return { exitCode: 0, stdout, stderr: "" };
  }

  if (command === "decomposition-plan") {
    if (!args.filePath || !args.fileContent) {
      return {
        exitCode: 1,
        stdout: "",
        stderr:
          "Error: filePath and fileContent are required for decomposition-plan",
      };
    }
    const plan = prepareEngineeringQualityDecompositionPlan({
      projectId: "my-project",
      taskId: "task-1",
      evidence: {
        artifactPath: args.filePath,
        currentLines: 320,
        preferredLimit: 250,
        hardLimit: 400,
        responsibilities: [
          {
            id: "core-domain",
            name: "core-domain",
            cohesion: "high",
            measuredLines: 120,
            description: "Core domain logic",
            publicApiSymbols: ["CoreModel"],
            testIds: ["test-core"],
          },
          {
            id: "serializer",
            name: "serializer",
            cohesion: "high",
            measuredLines: 100,
            description: "Serialization and mapping",
            publicApiSymbols: ["serialize"],
            testIds: ["test-serializer"],
          },
        ],
        dependencies: [],
        publicApi: [],
        tests: [],
      },
    });
    const stdout = json
      ? JSON.stringify(plan, null, 2)
      : `Decomposition Plan for ${plan.evidence.artifactPath}: ${plan.options.length} options`;
    return { exitCode: 0, stdout, stderr: "" };
  }

  return { exitCode: 1, stdout: "", stderr: `Unknown command: '${command}'` };
}

export function runPacksCliCommand(
  command: "list" | "search" | "inspect" | "verify" | "diff",
  args: {
    readonly json?: boolean;
    readonly query?: string;
    readonly entryId?: string;
    readonly quarantineArtifact?: unknown;
    readonly oldVersion?: string;
    readonly newVersion?: string;
  },
): QualityCliResult {
  const json = args.json ?? false;

  if (command === "list") {
    const stdout = json
      ? JSON.stringify(FIRST_PARTY_CATALOG_ENTRIES, null, 2)
      : `Catalog Entries: ${FIRST_PARTY_CATALOG_ENTRIES.length} entries available`;
    return { exitCode: 0, stdout, stderr: "" };
  }

  if (command === "search") {
    const query = args.query !== undefined ? { query: args.query } : {};
    const result = searchEngineeringCatalog(FIRST_PARTY_CATALOG_ENTRIES, query);
    const stdout = json
      ? JSON.stringify(result, null, 2)
      : `Found ${result.total} pack(s)`;
    return { exitCode: 0, stdout, stderr: "" };
  }

  if (command === "inspect") {
    if (!args.entryId) {
      return {
        exitCode: 1,
        stdout: "",
        stderr: "Error: entryId is required for inspect",
      };
    }
    try {
      const entry = inspectEngineeringCatalogEntry(
        FIRST_PARTY_CATALOG_ENTRIES,
        args.entryId,
      );
      const stdout = json
        ? JSON.stringify(entry, null, 2)
        : `Pack: ${entry.id} v${entry.version} (${entry.name})`;
      return { exitCode: 0, stdout, stderr: "" };
    } catch (err: unknown) {
      return { exitCode: 1, stdout: "", stderr: String(err) };
    }
  }

  if (command === "verify") {
    if (!args.entryId) {
      return {
        exitCode: 1,
        stdout: "",
        stderr: "Error: entryId required for verify",
      };
    }
    try {
      const entry = inspectEngineeringCatalogEntry(
        FIRST_PARTY_CATALOG_ENTRIES,
        args.entryId,
      );
      const res = verifyQuarantineArtifact(
        entry,
        args.quarantineArtifact as string,
      );
      const stdout = json
        ? JSON.stringify(res, null, 2)
        : `Verified: ${res.quarantineState}`;
      return {
        exitCode: res.quarantineState === "verified" ? 0 : 1,
        stdout,
        stderr: res.failureReason ?? "",
      };
    } catch (err: unknown) {
      return { exitCode: 1, stdout: "", stderr: String(err) };
    }
  }

  if (command === "diff") {
    if (!args.entryId || !args.oldVersion || !args.newVersion) {
      return {
        exitCode: 1,
        stdout: "",
        stderr: "Error: entryId, oldVersion, and newVersion required for diff",
      };
    }
    try {
      const currentEntry = inspectEngineeringCatalogEntry(
        FIRST_PARTY_CATALOG_ENTRIES,
        args.entryId,
        args.oldVersion,
      );
      const targetEntry = inspectEngineeringCatalogEntry(
        FIRST_PARTY_CATALOG_ENTRIES,
        args.entryId,
        args.newVersion,
      );

      const diff = diffEngineeringQualityPackUpdates(currentEntry, targetEntry);
      const stdout = json
        ? JSON.stringify(diff, null, 2)
        : `Pack Diff: ${diff.packId} (${diff.changeType})`;
      return { exitCode: 0, stdout, stderr: "" };
    } catch (err: unknown) {
      return { exitCode: 1, stdout: "", stderr: String(err) };
    }
  }

  return { exitCode: 1, stdout: "", stderr: `Unknown command: '${command}'` };
}
