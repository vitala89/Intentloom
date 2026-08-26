import { cwd } from "node:process";
import {
  ArtifactValidationFailure,
  adoptProject,
  nodeFileSystem,
  planFeature,
  planProjectAdoption,
  applyProjectAdoption,
  planPackUpdate,
  syncProject,
  getTaskSummary,
  listTaskSummaries,
  recordTaskSummary,
  discoverSkills,
  createSkillProposal,
  listSkillProposals,
  getSkillProposal,
  updateSkillProposalState,
  evaluateSkillProposal,
  listSkillEvaluations,
  prepareSkillMutationPlan,
  applySkillMutationPlan,
  createTaskCheckpoint,
  pauseTask,
  cancelTask,
  redirectTask,
  resumeTask,
  listTaskCheckpoints,
  deleteTaskCheckpoint,
  rankProceduralMemory,
  getSemanticRankingConfig,
  updateSemanticRankingConfig,
  createProfile,
  getProfile,
  listProfiles,
  delegateTaskRole,
  getBoundedProjectContext,
  type SkillLoadingLevel,
  type SkillProposalState,
  type SemanticRankingProvider,
  type DelegatedAgentRole,
  type TrustClass,
  type RetentionState,
  type FileSystem,
  type AdoptionProposal,
  type TransactionOptions,
} from "@intentloom/application";
import { type ProviderCacheStore } from "@intentloom/evidence-provider";
import { runCleanCommand } from "./clean-command.js";
import { runConformanceCommand } from "./conformance-command.js";
import { runDoctorCommand } from "./doctor-command.js";
import { runInspectCommand } from "./inspect-command.js";
import { runTimelineCommand } from "./timeline-command.js";
import { runUiCommand } from "./ui-command.js";
import { runWorkspaceCommand } from "./workspace-command.js";
import { runNeutronCommand } from "./neutron-command.js";
import { runMemoryCommand } from "./memory-command.js";
import { runSessionCommand } from "./session-command.js";
import { runSecurityCommand } from "./security-command.js";
import { runDiffCommand } from "./diff-command.js";
import { runInitCommand } from "./init-command.js";
import { runPlanCommand } from "./plan-command.js";
import { runEvidenceCommand } from "./evidence-command.js";
import { runHarnessCommand } from "./harness-command.js";
import {
  assertDaemonFlagsAllowed,
  CliProjectValidationError,
  CliUsageError,
  createCliArtifactValidator,
  formatValidationFailure,
} from "./cli-project-metadata.js";
import { formatGovernanceAdoptionPlan } from "./governance-adoption-format.js";
import {
  conflicts,
  formatHumanOutcome,
  formatJsonOutcome,
  mapDryRunToCliOutcome,
  mapTransactionResultToCliOutcome,
} from "./mutation-outcome.js";
import {
  buildProjectMutationOptions,
  loadInvalidProjectMetadata,
  metadataBlocksMutationCommand,
  type ProjectMutationCommand,
} from "./project-command-context.js";
import { usage } from "./usage.js";
import { formatAdoptionProposal, formatPlan } from "./formatters.js";
import { INTENTLOOM_VERSION, resolveWithin } from "@intentloom/core";
import {
  parseAdoptionPlan,
  stableStringify,
  type AdoptionPlan,
} from "@intentloom/core/adoption";
import { SchemaCatalogError } from "@intentloom/validator";

export type CliExitCode = 0 | 2 | 3 | 4 | 5;

export interface CliIo {
  readonly stdout: (message: string) => void;
  readonly stderr: (message: string) => void;
}

export interface CliDependencies {
  readonly catalogRoot: string;
  readonly fileSystem?: FileSystem;
  readonly providerCacheStore?: ProviderCacheStore;
  readonly transactionOptions?: TransactionOptions;
}

interface ParsedArguments {
  readonly command: string;
  readonly flags: ReadonlySet<string>;
  readonly values: ReadonlyMap<string, string>;
  readonly mappingValues: ReadonlyMap<string, readonly string[]>;
}

const commands = new Set([
  "adopt",
  "update",
  "sync",
  "evidence",
  "summary",
  "skill",
  "proposal",
  "evaluate",
  "checkpoint",
  "rank",
  "profile",
  "delegate",
  "context",
]);
const projectPathCommands = new Set(["adopt", "update", "sync"]);
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

function parseArguments(args: readonly string[]): ParsedArguments {
  const command = args[0] ?? "";
  if (!commands.has(command)) throw new CliUsageError(usage);
  if (
    command === "evidence" &&
    !["fetch", "import", "analyze"].includes(args[1] ?? "")
  )
    throw new CliUsageError("evidence requires fetch, import, or analyze");
  if (
    command === "summary" &&
    !["list", "get", "record"].includes(args[1] ?? "")
  )
    throw new CliUsageError("summary requires list, get, or record subcommand");
  if (command === "skill" && args[1] !== "discover")
    throw new CliUsageError("skill requires discover subcommand");
  if (
    command === "proposal" &&
    !["list", "get", "create", "approve", "plan", "apply"].includes(
      args[1] ?? "",
    )
  )
    throw new CliUsageError(
      "proposal requires list, get, create, approve, plan, or apply subcommand",
    );
  if (command === "evaluate" && !["run", "list"].includes(args[1] ?? ""))
    throw new CliUsageError("evaluate requires run or list subcommand");
  if (
    command === "checkpoint" &&
    ![
      "create",
      "pause",
      "cancel",
      "redirect",
      "resume",
      "list",
      "delete",
    ].includes(args[1] ?? "")
  )
    throw new CliUsageError(
      "checkpoint requires create, pause, cancel, redirect, resume, list, or delete subcommand",
    );
  if (
    command === "profile" &&
    !["create", "get", "list"].includes(args[1] ?? "")
  )
    throw new CliUsageError("profile requires create, get, or list subcommand");
  if (command === "context" && args[1] !== "get")
    throw new CliUsageError("context requires get subcommand");
  const flags = new Set<string>();
  const values = new Map<string, string>();
  const mappingValues = new Map<string, string[]>();
  for (
    let index =
      command === "evidence" ||
      command === "summary" ||
      command === "skill" ||
      command === "proposal" ||
      command === "evaluate" ||
      command === "checkpoint" ||
      command === "profile" ||
      command === "context" ||
      (command === "rank" && args[1] !== undefined && !args[1].startsWith("--"))
        ? 2
        : 1;
    index < args.length;
    index += 1
  ) {
    const token = args[index]!;
    if (booleanFlags.has(token)) {
      flags.add(token);
      continue;
    }
    if (!token.startsWith("--")) {
      if (!projectPathCommands.has(command) || values.has("--root"))
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
  if (command !== "sync" && flags.has("--force"))
    throw new CliUsageError("--force is only valid with sync");
  if (mappingValues.size > 0 && command !== "init" && command !== "adopt")
    throw new CliUsageError(
      "adoption mappings are only valid with init or adopt",
    );
  const daemonEndpoint = values.has("--daemon-endpoint");
  const daemonTokenFile = values.has("--daemon-token-file");
  assertDaemonFlagsAllowed(command, daemonEndpoint, daemonTokenFile);
  if (flags.has("--cache")) {
    throw new CliUsageError("--cache is only valid with clean");
  }
  return { command, flags, values, mappingValues };
}

export async function runCli(
  args: readonly string[],
  dependencies: CliDependencies,
  io: CliIo,
): Promise<CliExitCode> {
  if (args.includes("--version") || args[0] === "--version") {
    io.stdout(INTENTLOOM_VERSION);
    return 0;
  }
  if (
    args.includes("--help") ||
    args[0] === "--help" ||
    args[0] === "help" ||
    args.length === 0
  ) {
    io.stdout(usage);
    return 0;
  }
  try {
    if (args[0] === "harness") {
      return await runHarnessCommand(
        args,
        { fileSystem: dependencies.fileSystem ?? nodeFileSystem },
        io,
      );
    }
    if (args[0] === "evidence") {
      return await runEvidenceCommand(args, io);
    }
    if (args[0] === "clean") {
      return runCleanCommand(args, dependencies, io);
    }
    if (args[0] === "inspect") {
      return runInspectCommand(args, dependencies, io);
    }
    if (args[0] === "timeline") {
      return runTimelineCommand(args, {}, io);
    }
    if (args[0] === "conformance") {
      return runConformanceCommand(args, dependencies, io);
    }
    if (args[0] === "doctor") {
      return runDoctorCommand(args, dependencies, io);
    }
    if (args[0] === "ui") {
      return runUiCommand(args, dependencies, io);
    }
    if (args[0] === "workspace") {
      return await runWorkspaceCommand(args, dependencies, io);
    }
    if (args[0] === "neutron") {
      return await runNeutronCommand(args, dependencies, io);
    }
    if (args[0] === "memory") {
      return await runMemoryCommand(args, dependencies, io);
    }
    if (args[0] === "session") {
      return await runSessionCommand(args, dependencies, io);
    }
    if (args[0] === "security") {
      return await runSecurityCommand(args, dependencies, io);
    }
    if (args[0] === "diff") return await runDiffCommand(args, dependencies, io);
    if (args[0] === "plan") return await runPlanCommand(args, dependencies, io);
    if (args[0] === "init") return await runInitCommand(args, dependencies, io);
    const parsed = parseArguments(args);
    const fileSystem = dependencies.fileSystem ?? nodeFileSystem;
    const root = parsed.values.get("--root") ?? cwd();
    const validator = await createCliArtifactValidator(
      dependencies.catalogRoot,
    );
    const invalidMetadata = await loadInvalidProjectMetadata(
      parsed.command as ProjectMutationCommand,
      root,
      fileSystem,
      validator,
    );
    if (parsed.command === "summary") {
      const subcommand = args[1] ?? "list";
      if (subcommand === "list") {
        const trustClass = parsed.values.get("--trust-class") as
          TrustClass | undefined;
        const retentionState = parsed.values.get("--retention-state") as
          RetentionState | undefined;
        const summaries = await listTaskSummaries(
          {
            root,
            ...(trustClass ? { trustClass } : {}),
            ...(retentionState ? { retentionState } : {}),
          },
          fileSystem,
        );
        io.stdout(
          parsed.flags.has("--json")
            ? JSON.stringify(summaries, null, 2)
            : summaries.length === 0
              ? "No task summaries recorded."
              : summaries
                  .map(
                    (s) =>
                      `[${s.id}] ${s.intent} (${s.validationOutcome}) [${s.trustClass}]`,
                  )
                  .join("\n"),
        );
        return 0;
      }
      if (subcommand === "get") {
        const id = parsed.values.get("--id") ?? args[2];
        if (!id) throw new CliUsageError("summary get requires --id <id>");
        const summary = await getTaskSummary(id, { root }, fileSystem);
        if (!summary) {
          io.stderr(`Summary not found: ${id}\n`);
          return 3;
        }
        io.stdout(
          parsed.flags.has("--json")
            ? JSON.stringify(summary, null, 2)
            : `[${summary.id}] ${summary.intent}\nOutcome: ${summary.validationOutcome}\nTrust: ${summary.trustClass}\nCreated: ${summary.createdAt}`,
        );
        return 0;
      }
      if (subcommand === "record") {
        const jsonInput = parsed.values.get("--json-input");
        const jsonFile = parsed.values.get("--file");
        let rawContent = jsonInput;
        if (!rawContent && jsonFile) {
          rawContent = await fileSystem.read(resolveWithin(root, jsonFile));
        }
        if (!rawContent) {
          throw new CliUsageError(
            "summary record requires --json-input <json> or --file <path>",
          );
        }
        const parsedSummary = JSON.parse(rawContent);
        const recorded = await recordTaskSummary(
          parsedSummary,
          { root },
          fileSystem,
        );
        io.stdout(
          parsed.flags.has("--json")
            ? JSON.stringify(recorded, null, 2)
            : `Recorded task summary [${recorded.id}]`,
        );
        return 0;
      }
      throw new CliUsageError(`unsupported summary subcommand: ${subcommand}`);
    }
    if (parsed.command === "skill") {
      const subcommand = args[1];
      if (subcommand === "discover") {
        const rawLevel = parsed.values.get("--level");
        if (
          rawLevel !== undefined &&
          !["catalog", "contract", "procedure"].includes(rawLevel)
        ) {
          throw new CliUsageError(
            "--level must be catalog, contract, or procedure",
          );
        }
        const level = (rawLevel as SkillLoadingLevel | undefined) ?? "catalog";
        const pack = parsed.values.get("--pack");
        const role = parsed.values.get("--role");
        const query = parsed.values.get("--query");
        const rawTrust = parsed.values.get("--trust-class");
        const trustClass = rawTrust as TrustClass | undefined;
        const rawBudget = parsed.values.get("--max-budget");
        const maxBudget = rawBudget ? parseInt(rawBudget, 10) : undefined;

        const result = await discoverSkills(
          {
            root,
            ...(dependencies.catalogRoot !== undefined
              ? { catalogRoot: dependencies.catalogRoot }
              : {}),
            level,
            ...(pack !== undefined ? { pack } : {}),
            ...(role !== undefined ? { role } : {}),
            ...(query !== undefined ? { query } : {}),
            ...(trustClass !== undefined ? { trustClass } : {}),
            ...(maxBudget !== undefined && !Number.isNaN(maxBudget)
              ? { maxBudget }
              : {}),
          },
          fileSystem,
        );

        if (parsed.flags.has("--json")) {
          io.stdout(JSON.stringify(result, null, 2));
        } else {
          const lines = [
            `Discovered ${result.skills.length} skills (Level: ${result.level})`,
            `Total context budget: ${result.totalBudgetEstimate} tokens (Savings: ${result.budgetSavingsPercentage}% vs eager loading)`,
            "",
          ];
          for (const s of result.skills) {
            lines.push(
              `- [${s.id}] ${s.name} (v${s.version}): ${s.description}`,
            );
          }
          io.stdout(lines.join("\n"));
        }
        return 0;
      }
      throw new CliUsageError(`unsupported skill subcommand: ${subcommand}`);
    }
    if (parsed.command === "proposal") {
      const subcommand = args[1];
      if (subcommand === "list") {
        const rawState = parsed.values.get("--state");
        const state = rawState as SkillProposalState | undefined;
        const rawTrust = parsed.values.get("--trust-class");
        const trustClass = rawTrust as TrustClass | undefined;
        const proposals = await listSkillProposals(
          {
            root,
            ...(state !== undefined ? { state } : {}),
            ...(trustClass !== undefined ? { trustClass } : {}),
          },
          fileSystem,
        );
        if (parsed.flags.has("--json")) {
          io.stdout(JSON.stringify(proposals, null, 2));
        } else {
          const lines = proposals.map(
            (p) =>
              `- [${p.id}] ${p.name} (v${p.version}) [State: ${p.state}] (Trust: ${p.trustClass})`,
          );
          io.stdout(lines.join("\n"));
        }
        return 0;
      }
      if (subcommand === "get") {
        const id = parsed.values.get("--id") ?? args[2];
        if (!id) throw new CliUsageError("proposal get requires --id <id>");
        const proposal = await getSkillProposal(id, { root }, fileSystem);
        if (!proposal) {
          io.stderr(`Proposal not found: ${id}\n`);
          return 3;
        }
        io.stdout(
          parsed.flags.has("--json")
            ? JSON.stringify(proposal, null, 2)
            : `[${proposal.id}] ${proposal.name} (v${proposal.version})\nState: ${proposal.state}\nTrust: ${proposal.trustClass}\nObserved Pattern: ${proposal.observedPattern}`,
        );
        return 0;
      }
      if (subcommand === "create") {
        const jsonInput = parsed.values.get("--json-input");
        const jsonFile = parsed.values.get("--file");
        let rawContent = jsonInput;
        if (!rawContent && jsonFile) {
          rawContent = await fileSystem.read(resolveWithin(root, jsonFile));
        }
        if (!rawContent) {
          throw new CliUsageError(
            "proposal create requires --json-input <json> or --file <path>",
          );
        }
        const parsedProposal = JSON.parse(rawContent);
        const created = await createSkillProposal(
          parsedProposal,
          { root },
          fileSystem,
        );
        io.stdout(
          parsed.flags.has("--json")
            ? JSON.stringify(created, null, 2)
            : `Created skill proposal [${created.id}]`,
        );
        return 0;
      }
      if (subcommand === "approve") {
        const id = parsed.values.get("--id") ?? args[2];
        const evidence = parsed.values.get("--evidence");
        if (!id || !evidence) {
          throw new CliUsageError(
            "proposal approve requires --id <id> and --evidence <evidence>",
          );
        }
        const approved = await updateSkillProposalState(
          id,
          "approved",
          { root, approvalEvidence: evidence },
          fileSystem,
        );
        io.stdout(
          parsed.flags.has("--json")
            ? JSON.stringify(approved, null, 2)
            : `Approved skill proposal [${approved.id}]`,
        );
        return 0;
      }
      if (subcommand === "plan") {
        const action = parsed.values.get("--action") as
          "approve" | "activate" | "deprecate" | "rollback" | undefined;
        const id =
          parsed.values.get("--id") ??
          parsed.values.get("--proposal-id") ??
          args[2];
        const evidence = parsed.values.get("--evidence");
        if (!action || !id) {
          throw new CliUsageError(
            "proposal plan requires --action <approve|activate|deprecate|rollback> and --id <id>",
          );
        }
        const plan = await prepareSkillMutationPlan(
          {
            root,
            action,
            proposalId: id,
            ...(evidence !== undefined ? { approvalEvidence: evidence } : {}),
          },
          fileSystem,
        );
        const outputText = parsed.flags.has("--json")
          ? JSON.stringify(plan, null, 2)
          : `Prepared skill mutation plan [${plan.id}] (${plan.action} -> ${plan.targetState}) checksum=${plan.checksum}`;
        const outputPath = parsed.values.get("--output");
        if (outputPath !== undefined) {
          const targetPath = resolveWithin(root, outputPath);
          await fileSystem.write(
            targetPath,
            `${JSON.stringify(plan, null, 2)}\n`,
          );
        }
        io.stdout(`${outputText}\n`);
        return 0;
      }
      if (subcommand === "apply") {
        const planFile =
          parsed.values.get("--plan-file") ??
          parsed.values.get("--file") ??
          args[2];
        if (!planFile) {
          throw new CliUsageError("proposal apply requires --plan-file <path>");
        }
        const planPath = resolveWithin(root, planFile);
        if (!(await fileSystem.exists(planPath))) {
          io.stderr(`Skill mutation plan file not found: ${planFile}\n`);
          return 3;
        }
        const rawPlan = await fileSystem.read(planPath);
        const plan = JSON.parse(rawPlan);
        const updated = await applySkillMutationPlan(
          plan,
          { root },
          fileSystem,
        );
        io.stdout(
          parsed.flags.has("--json")
            ? JSON.stringify(updated, null, 2)
            : `Applied skill mutation plan: proposal [${updated.id}] state is now ${updated.state}`,
        );
        return 0;
      }
      throw new CliUsageError(`unsupported proposal subcommand: ${subcommand}`);
    }
    if (parsed.command === "evaluate") {
      const subcommand = args[1];
      if (subcommand === "run") {
        const proposalId = parsed.values.get("--proposal-id") ?? args[2];
        if (!proposalId) {
          throw new CliUsageError("evaluate run requires --proposal-id <id>");
        }
        const caseId = parsed.values.get("--case-id");
        const evalResult = await evaluateSkillProposal(
          proposalId,
          {
            root,
            ...(caseId !== undefined ? { caseId } : {}),
          },
          fileSystem,
        );
        io.stdout(
          parsed.flags.has("--json")
            ? JSON.stringify(evalResult, null, 2)
            : `Evaluated proposal [${proposalId}]: outcome=${evalResult.outcome}, passed=${evalResult.passed}, securityPass=${evalResult.securityPass}`,
        );
        return 0;
      }
      if (subcommand === "list") {
        const skillId = parsed.values.get("--skill-id");
        const evaluations = await listSkillEvaluations(
          {
            root,
            ...(skillId !== undefined ? { skillId } : {}),
          },
          fileSystem,
        );
        if (parsed.flags.has("--json")) {
          io.stdout(JSON.stringify(evaluations, null, 2));
        } else {
          const lines = evaluations.map(
            (e) =>
              `- [${e.id}] skill=${e.skillId} outcome=${e.outcome} passed=${e.passed}`,
          );
          io.stdout(lines.join("\n"));
        }
        return 0;
      }
      throw new CliUsageError(`unsupported evaluate subcommand: ${subcommand}`);
    }
    if (parsed.command === "checkpoint") {
      const subcommand = args[1];
      if (subcommand === "create") {
        const taskId = parsed.values.get("--task-id") ?? args[2];
        if (!taskId) {
          throw new CliUsageError("checkpoint create requires --task-id <id>");
        }
        const created = await createTaskCheckpoint(
          taskId,
          { root },
          fileSystem,
        );
        io.stdout(
          parsed.flags.has("--json")
            ? JSON.stringify(created, null, 2)
            : `Created task checkpoint [${created.id}] for task [${taskId}]`,
        );
        return 0;
      }
      if (subcommand === "pause") {
        const id = parsed.values.get("--id") ?? args[2];
        if (!id) throw new CliUsageError("checkpoint pause requires --id <id>");
        const paused = await pauseTask(id, { root }, fileSystem);
        io.stdout(
          parsed.flags.has("--json")
            ? JSON.stringify(paused, null, 2)
            : `Paused task checkpoint [${id}]`,
        );
        return 0;
      }
      if (subcommand === "cancel") {
        const id = parsed.values.get("--id") ?? args[2];
        if (!id)
          throw new CliUsageError("checkpoint cancel requires --id <id>");
        const cancelled = await cancelTask(id, { root }, fileSystem);
        io.stdout(
          parsed.flags.has("--json")
            ? JSON.stringify(cancelled, null, 2)
            : `Cancelled task checkpoint [${id}]`,
        );
        return 0;
      }
      if (subcommand === "redirect") {
        const id = parsed.values.get("--id") ?? args[2];
        const newIntent = parsed.values.get("--new-intent");
        if (!id || !newIntent) {
          throw new CliUsageError(
            "checkpoint redirect requires --id <id> and --new-intent <intent>",
          );
        }
        const redirected = await redirectTask(
          id,
          newIntent,
          { root },
          fileSystem,
        );
        io.stdout(
          parsed.flags.has("--json")
            ? JSON.stringify(redirected, null, 2)
            : `Redirected task checkpoint [${id}] to: ${newIntent}`,
        );
        return 0;
      }
      if (subcommand === "resume") {
        const id = parsed.values.get("--id") ?? args[2];
        if (!id)
          throw new CliUsageError("checkpoint resume requires --id <id>");
        const resumed = await resumeTask(id, { root }, fileSystem);
        io.stdout(
          parsed.flags.has("--json")
            ? JSON.stringify(resumed, null, 2)
            : `Resumed task checkpoint [${id}] (invalidated ${resumed.invalidatedCount} stale plans)`,
        );
        return 0;
      }
      if (subcommand === "list") {
        const taskId = parsed.values.get("--task-id");
        const checkpoints = await listTaskCheckpoints(
          { root, ...(taskId !== undefined ? { taskId } : {}) },
          fileSystem,
        );
        if (parsed.flags.has("--json")) {
          io.stdout(JSON.stringify(checkpoints, null, 2));
        } else {
          const lines = checkpoints.map(
            (c) => `- [${c.id}] task=${c.taskId} state=${c.state}`,
          );
          io.stdout(lines.join("\n"));
        }
        return 0;
      }
      if (subcommand === "delete") {
        const id = parsed.values.get("--id") ?? args[2];
        if (!id)
          throw new CliUsageError("checkpoint delete requires --id <id>");
        const deleted = await deleteTaskCheckpoint(id, { root }, fileSystem);
        io.stdout(
          parsed.flags.has("--json")
            ? JSON.stringify({ id, deleted })
            : `Deleted checkpoint [${id}]: ${deleted}`,
        );
        return 0;
      }
      throw new CliUsageError(
        `unsupported checkpoint subcommand: ${subcommand}`,
      );
    }
    if (parsed.command === "profile") {
      const subcommand = args[1];
      if (subcommand === "create") {
        const name = parsed.values.get("--name") ?? args[2];
        if (!name) {
          throw new CliUsageError("profile create requires --name <name>");
        }
        const created = await createProfile(
          {
            schemaVersion: "1",
            name,
            allowedCapabilities: {
              readOnly: false,
              allowedPaths: ["."],
              allowedTools: ["*"],
              maxBudget: 100,
              allowNetwork: true,
            },
            activeRoles: [
              "context-scout",
              "feature-builder",
              "test-engineer",
              "reviewer",
              "release-analyst",
            ],
            createdAt: new Date().toISOString(),
          },
          { root },
          fileSystem,
        );
        io.stdout(
          parsed.flags.has("--json")
            ? JSON.stringify(created, null, 2)
            : `Created profile [${created.name}]`,
        );
        return 0;
      }
      if (subcommand === "get") {
        const name = parsed.values.get("--name") ?? args[2];
        if (!name) {
          throw new CliUsageError("profile get requires --name <name>");
        }
        const profile = await getProfile(name, { root }, fileSystem);
        if (!profile) {
          throw new Error(`Profile not found: ${name}`);
        }
        io.stdout(
          parsed.flags.has("--json")
            ? JSON.stringify(profile, null, 2)
            : `Profile [${profile.name}]: ${profile.activeRoles.join(", ")}`,
        );
        return 0;
      }
      if (subcommand === "list") {
        const profiles = await listProfiles({ root }, fileSystem);
        if (parsed.flags.has("--json")) {
          io.stdout(JSON.stringify(profiles, null, 2));
        } else {
          const lines = profiles.map(
            (p) => `- [${p.name}] roles=${p.activeRoles.join(",")}`,
          );
          io.stdout(lines.join("\n"));
        }
        return 0;
      }
      throw new CliUsageError(`unsupported profile subcommand: ${subcommand}`);
    }
    if (parsed.command === "delegate") {
      const profileName = parsed.values.get("--profile");
      const role = parsed.values.get("--role");
      const parentTaskId = parsed.values.get("--task-id");
      if (!profileName || !role || !parentTaskId) {
        throw new CliUsageError(
          "delegate requires --profile <name>, --role <role>, and --task-id <id>",
        );
      }
      const delegation = await delegateTaskRole(
        {
          schemaVersion: "1",
          profileName,
          role: role as DelegatedAgentRole,
          parentTaskId,
        },
        { root },
        fileSystem,
      );
      io.stdout(
        parsed.flags.has("--json")
          ? JSON.stringify(delegation, null, 2)
          : `Delegated role [${delegation.grantedRole}] under profile [${profileName}] (ID: ${delegation.delegationId})`,
      );
      return 0;
    }
    if (parsed.command === "rank") {
      const subcommand = args[1];
      if (subcommand === "config") {
        let enabled: boolean | undefined;
        if (parsed.flags.has("--enable")) enabled = true;
        if (parsed.flags.has("--disable")) enabled = false;

        const rawProvider = parsed.values.get("--provider");
        const provider = rawProvider as SemanticRankingProvider | undefined;

        if (enabled !== undefined || provider !== undefined) {
          const current = await getSemanticRankingConfig({ root }, fileSystem);
          const updated = await updateSemanticRankingConfig(
            {
              ...current,
              ...(enabled !== undefined ? { enabled } : {}),
              ...(provider !== undefined ? { provider } : {}),
            },
            { root },
            fileSystem,
          );
          io.stdout(
            parsed.flags.has("--json")
              ? JSON.stringify(updated, null, 2)
              : `Updated semantic ranking config: enabled=${updated.enabled}, provider=${updated.provider}`,
          );
          return 0;
        }

        const config = await getSemanticRankingConfig({ root }, fileSystem);
        io.stdout(
          parsed.flags.has("--json")
            ? JSON.stringify(config, null, 2)
            : `Semantic ranking config: enabled=${config.enabled}, provider=${config.provider}`,
        );
        return 0;
      }

      const query = parsed.values.get("--query") ?? args[1];
      if (!query) {
        throw new CliUsageError(
          "rank requires a query string or 'config' subcommand",
        );
      }

      const rawProvider = parsed.values.get("--provider");
      const provider = rawProvider as SemanticRankingProvider | undefined;
      const enabled = parsed.flags.has("--disable") ? false : undefined;

      const result = await rankProceduralMemory(
        query,
        {
          root,
          ...(provider !== undefined ? { provider } : {}),
          ...(enabled !== undefined ? { enabled } : {}),
        },
        fileSystem,
      );

      if (parsed.flags.has("--json")) {
        io.stdout(JSON.stringify(result, null, 2));
      } else {
        const lines = [
          `Semantic Rank Results for: "${result.query}" (Provider: ${result.provider}, Latency: ${result.rankingLatencyMs}ms)`,
          ...result.items.map(
            (item) =>
              `- [${item.score.toFixed(2)}] [${item.type}] ${item.id}: ${item.relevanceReason}`,
          ),
        ];
        io.stdout(lines.join("\n"));
      }
      return 0;
    }
    if (parsed.command === "context") {
      const subcommand = args[1];
      if (subcommand !== "get") {
        throw new CliUsageError("context requires get subcommand");
      }
      const query = parsed.values.get("--query");
      const rawMaxTokens = parsed.values.get("--max-tokens");
      const rawMaxItems = parsed.values.get("--max-items");

      const maxTokens = rawMaxTokens ? parseInt(rawMaxTokens, 10) : undefined;
      const maxItems = rawMaxItems ? parseInt(rawMaxItems, 10) : undefined;

      const result = await getBoundedProjectContext(
        {
          schemaVersion: "1",
          query,
          maxTokens,
          maxItems,
        },
        { root },
        fileSystem,
      );

      if (parsed.flags.has("--json")) {
        io.stdout(JSON.stringify(result, null, 2));
      } else {
        const lines = [
          `Bounded Project Context (Root: ${result.root}, Tokens: ${result.totalTokens}, Excluded: ${result.excludedPathsCount})`,
          ...result.items.map(
            (item) =>
              `- [${item.trustClass}] [${item.type}] ${item.path} (${item.tokenCount} tokens): ${item.summary}`,
          ),
        ];
        io.stdout(lines.join("\n"));
      }
      return 0;
    }
    if (parsed.command === "adopt" && parsed.flags.has("--plan")) {
      const plan = await planProjectAdoption({ root }, fileSystem);
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
              finding.status === "ambiguous" ||
              finding.status === "conflicting",
          ))
      ) {
        return 3;
      }
      return 0;
    }
    if (parsed.command === "adopt" && parsed.values.has("--apply")) {
      const planFile = parsed.values.get("--apply")!;
      const planPath = resolveWithin(root, planFile);
      if (!(await fileSystem.exists(planPath))) {
        io.stderr(`Adoption plan file not found: ${planFile}\n`);
        return 3;
      }
      const rawPlan = await fileSystem.read(planPath);
      let plan: AdoptionPlan;
      try {
        plan = parseAdoptionPlan(rawPlan);
      } catch (err) {
        io.stderr(
          `Invalid adoption plan file: ${err instanceof Error ? err.message : String(err)}\n`,
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
          `Adoption apply status: ${applyResult.status}\n` +
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
    if (parsed.command === "update" && parsed.flags.has("--plan")) {
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
              finding.status === "ambiguous" ||
              finding.status === "conflicting",
          ))
      ) {
        return 3;
      }
      return 0;
    }
    if (parsed.command === "update" && parsed.values.has("--apply")) {
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
    if (
      metadataBlocksMutationCommand(
        parsed.command as ProjectMutationCommand,
        invalidMetadata,
      )
    ) {
      const output = formatValidationFailure(
        invalidMetadata,
        parsed.flags.has("--json"),
      );
      io.stderr(output);
      return 3;
    }
    const options = await buildProjectMutationOptions({
      command: parsed.command as ProjectMutationCommand,
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
    if (parsed.command === "sync") {
      const result = await syncProject(
        { ...options, force: parsed.flags.has("--force") },
        fileSystem,
        dependencies.transactionOptions,
      );
      const outcome =
        "dryRun" in result
          ? mapDryRunToCliOutcome(result)
          : mapTransactionResultToCliOutcome(result);
      io.stdout(
        parsed.flags.has("--json")
          ? formatJsonOutcome(outcome)
          : formatHumanOutcome(outcome),
      );
      return outcome.exitCode;
    }
    const result =
      parsed.command === "adopt"
        ? await adoptProject(
            options,
            fileSystem,
            dependencies.transactionOptions,
          )
        : await planFeature(parsed.values.get("--task") ?? "", validator);
    io.stdout(
      parsed.flags.has("--json")
        ? JSON.stringify(result, null, 2)
        : typeof result === "string"
          ? result
          : parsed.command === "adopt"
            ? formatAdoptionProposal(result as AdoptionProposal)
            : formatPlan(result),
    );
    if (parsed.command === "adopt") {
      const adoption = result as AdoptionProposal;
      if (adoption.transactionOutcome?.status === "failed")
        return adoption.transactionOutcome.rollbackCompleted ? 4 : 5;
      return adoption.applicationStatus === "blocked" ||
        adoption.applicationStatus === "failed-restored" ||
        adoption.applicationStatus === "failed-incomplete" ||
        adoption.diagnostics.length > 0 ||
        adoption.items.some(
          (item) => item.manualDecisionRequired || item.action === "conflict",
        )
        ? 3
        : 0;
    }
    return typeof result === "string" || conflicts(result).length === 0 ? 0 : 3;
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
    if (
      error instanceof CliProjectValidationError ||
      error instanceof ArtifactValidationFailure
    ) {
      const json = args.includes("--json");
      io.stderr(formatValidationFailure(error.results, json));
      return 3;
    }
    io.stderr(error instanceof Error ? error.message : "configuration error");
    return 2;
  }
}
