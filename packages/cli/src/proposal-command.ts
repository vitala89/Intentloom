import { cwd } from "node:process";
import {
  applySkillMutationPlan,
  createSkillProposal,
  getSkillProposal,
  listSkillProposals,
  nodeFileSystem,
  prepareSkillMutationPlan,
  updateSkillProposalState,
  type FileSystem,
  type SkillProposalState,
  type TrustClass,
} from "@intentloom/application";
import { resolveWithin } from "@intentloom/core";
import { CliUsageError } from "./cli-project-metadata.js";
import { parseProposalArguments } from "./proposal-parse.js";

export type ProposalCliExitCode = 0 | 2 | 3;

export interface ProposalCliIo {
  readonly stdout: (message: string) => void;
  readonly stderr: (message: string) => void;
}

export interface ProposalCliDependencies {
  readonly fileSystem?: FileSystem;
}

export async function runProposalCommand(
  args: readonly string[],
  dependencies: ProposalCliDependencies,
  io: ProposalCliIo,
): Promise<ProposalCliExitCode> {
  const parsed = parseProposalArguments(args);
  const fileSystem = dependencies.fileSystem ?? nodeFileSystem;
  const root = parsed.values.get("--root") ?? cwd();
  const subcommand = parsed.subcommand;

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
      await fileSystem.write(targetPath, `${JSON.stringify(plan, null, 2)}\n`);
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
    const updated = await applySkillMutationPlan(plan, { root }, fileSystem);
    io.stdout(
      parsed.flags.has("--json")
        ? JSON.stringify(updated, null, 2)
        : `Applied skill mutation plan: proposal [${updated.id}] state is now ${updated.state}`,
    );
    return 0;
  }
  throw new CliUsageError(`unsupported proposal subcommand: ${subcommand}`);
}
