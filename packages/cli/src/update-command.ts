import { cwd } from "node:process";
import {
  applyProjectAdoption,
  nodeFileSystem,
  planFeature,
  planPackUpdate,
  type FileSystem,
  type TransactionOptions,
} from "@intentloom/application";
import { resolveWithin } from "@intentloom/core";
import {
  parseAdoptionPlan,
  stableStringify,
  type AdoptionPlan,
} from "@intentloom/core/adoption";
import { createCliArtifactValidator } from "./cli-project-metadata.js";
import { formatGovernanceAdoptionPlan } from "./governance-adoption-format.js";
import { formatPlan } from "./formatters.js";
import { conflicts } from "./mutation-outcome.js";
import {
  buildProjectMutationOptions,
  loadInvalidProjectMetadata,
} from "./project-command-context.js";
import { parseUpdateArguments } from "./update-parse.js";

export type UpdateCliExitCode = 0 | 2 | 3 | 4 | 5;

export interface UpdateCliIo {
  readonly stdout: (message: string) => void;
  readonly stderr: (message: string) => void;
}

export interface UpdateCliDependencies {
  readonly catalogRoot: string;
  readonly fileSystem?: FileSystem;
  readonly transactionOptions?: TransactionOptions;
}

export async function runUpdateCommand(
  args: readonly string[],
  dependencies: UpdateCliDependencies,
  io: UpdateCliIo,
): Promise<UpdateCliExitCode> {
  const parsed = parseUpdateArguments(args);
  const fileSystem = dependencies.fileSystem ?? nodeFileSystem;
  const root = parsed.values.get("--root") ?? cwd();
  const validator = await createCliArtifactValidator(dependencies.catalogRoot);
  const invalidMetadata = await loadInvalidProjectMetadata(
    "update",
    root,
    fileSystem,
    validator,
  );

  if (parsed.flags.has("--plan")) {
    const plan = await planPackUpdate({ root }, fileSystem);
    const outputText = parsed.flags.has("--json")
      ? stableStringify(plan)
      : formatGovernanceAdoptionPlan(plan);
    const outputPath = parsed.values.get("--output");
    if (outputPath !== undefined) {
      const targetPath = resolveWithin(root, outputPath);
      await fileSystem.write(targetPath, outputText);
    }
    io.stdout(`${outputText}\n`);
    if (
      parsed.flags.has("--strict") &&
      (!plan.automaticApplyAllowed ||
        plan.findings.some(
          (finding) =>
            finding.status === "ambiguous" || finding.status === "conflicting",
        ))
    ) {
      return 3;
    }
    return 0;
  }

  if (parsed.values.has("--apply")) {
    const planFile = parsed.values.get("--apply")!;
    const planPath = resolveWithin(root, planFile);
    if (!(await fileSystem.exists(planPath))) {
      io.stderr(`Update plan file not found: ${planFile}\n`);
      return 3;
    }
    const rawPlan = await fileSystem.read(planPath);
    let plan: AdoptionPlan;
    try {
      plan = parseAdoptionPlan(rawPlan);
    } catch (err) {
      io.stderr(
        `Invalid update plan file: ${err instanceof Error ? err.message : String(err)}\n`,
      );
      return 3;
    }
    const applyResult = await applyProjectAdoption(
      {
        root,
        plan,
        dryRun: parsed.flags.has("--dry-run"),
      },
      fileSystem,
    );
    if (parsed.flags.has("--json")) {
      io.stdout(`${JSON.stringify(applyResult, null, 2)}\n`);
    } else {
      io.stdout(
        `Pack update apply status: ${applyResult.status}\n` +
          `Applied operations: ${applyResult.appliedOperations.length}\n` +
          `Created files: ${applyResult.createdFiles.length}\n` +
          `Updated files: ${applyResult.updatedFiles.length}\n` +
          (applyResult.error ? `Error: ${applyResult.error}\n` : ""),
      );
    }
    if (
      applyResult.status === "stale-hash" ||
      applyResult.status === "failed"
    ) {
      return 3;
    }
    if (applyResult.status === "rolled-back") {
      return 4;
    }
    return 0;
  }

  await buildProjectMutationOptions({
    command: "update",
    root,
    fileSystem,
    validator,
    catalogRoot: dependencies.catalogRoot,
    dryRun: parsed.flags.has("--dry-run"),
    invalidMetadata,
    profileFlag: parsed.values.get("--profile"),
    profileFlagProvided: parsed.values.has("--profile"),
    adaptersFlag: parsed.values.get("--adapters"),
    mappingValues: parsed.mappingValues,
  });
  const result = await planFeature(
    parsed.values.get("--task") ?? "",
    validator,
  );
  io.stdout(
    parsed.flags.has("--json")
      ? JSON.stringify(result, null, 2)
      : typeof result === "string"
        ? result
        : formatPlan(result),
  );
  return typeof result === "string" || conflicts(result).length === 0 ? 0 : 3;
}
