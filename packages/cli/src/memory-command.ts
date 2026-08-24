import { cwd } from "node:process";
import {
  acceptPersistentMemory,
  clearPersistentMemoryIndex,
  exportPersistentMemory,
  forgetPersistentMemory,
  getPersistentMemoryItem,
  importPersistentMemory,
  inspectProceduralMemory,
  listPersistentMemoryItems,
  listProceduralMemorySummary,
  nodeFileSystem,
  proposePersistentMemory,
  rebuildPersistentMemoryIndex,
  renderPersistentMemoryContext,
  searchPersistentMemory,
  type FileSystem,
} from "@intentloom/application";
import {
  CliUsageError,
  createCliArtifactValidator,
} from "./cli-project-metadata.js";
import { parseMemoryArguments } from "./memory-parse.js";

export type MemoryCliExitCode = 0 | 2 | 3;

export interface MemoryCliIo {
  readonly stdout: (message: string) => void;
  readonly stderr: (message: string) => void;
}

export interface MemoryCliDependencies {
  readonly catalogRoot: string;
  readonly fileSystem?: FileSystem;
}

export async function runMemoryCommand(
  args: readonly string[],
  dependencies: MemoryCliDependencies,
  io: MemoryCliIo,
): Promise<MemoryCliExitCode> {
  const parsed = parseMemoryArguments(args);
  await createCliArtifactValidator(dependencies.catalogRoot);
  const fileSystem = dependencies.fileSystem ?? nodeFileSystem;
  const root = parsed.values.get("--root") ?? cwd();
  const subcommand = parsed.subcommand;

  if (subcommand === "summary") {
    const summary = await listProceduralMemorySummary({ root }, fileSystem);
    io.stdout(
      parsed.flags.has("--json")
        ? JSON.stringify(summary, null, 2)
        : `Procedural Memory Summary:\n- Total Proposals: ${summary.totalProposals}\n- Active Skills: ${summary.activeSkillsCount}\n- Evaluations: ${summary.totalEvaluations} (Pass Rate: ${summary.evaluationPassRate}%)\n- Lock Status: ${summary.extensionLockStatus}`,
    );
    return 0;
  }
  if (subcommand === "inspect") {
    const inspection = await inspectProceduralMemory({ root }, fileSystem);
    if (parsed.flags.has("--json")) {
      io.stdout(JSON.stringify(inspection, null, 2));
    } else {
      const lines = [
        `Procedural Memory Inspection:`,
        `- Total Proposals: ${inspection.summary.totalProposals}`,
        `- Active Skills: ${inspection.summary.activeSkillsCount}`,
        `- Evaluation Pass Rate: ${inspection.summary.evaluationPassRate}%`,
        `- Lock Status: ${inspection.summary.extensionLockStatus}`,
        "",
        `Issues (${inspection.issues.length}):`,
        ...(inspection.issues.length > 0
          ? inspection.issues.map((i) => `  - ${i}`)
          : ["  - None"]),
      ];
      io.stdout(lines.join("\n"));
    }
    return 0;
  }
  if (subcommand === "list") {
    const items = await listPersistentMemoryItems({ root }, fileSystem);
    io.stdout(
      parsed.flags.has("--json")
        ? JSON.stringify(items, null, 2)
        : items
            .map(
              (item) =>
                `[${item.id}] ${item.lifecycleState} ${item.classification}`,
            )
            .join("\n"),
    );
    return 0;
  }
  if (subcommand === "review") {
    const id = parsed.values.get("--id") ?? args[2];
    if (!id) throw new CliUsageError("memory review requires --id <id>");
    const item = await getPersistentMemoryItem(id, { root }, fileSystem);
    if (!item) return 3;
    io.stdout(
      parsed.flags.has("--json")
        ? JSON.stringify(item, null, 2)
        : `[${item.id}] ${item.lifecycleState}\n${item.content}`,
    );
    return 0;
  }
  if (subcommand === "propose") {
    const raw = parsed.values.get("--json-input");
    if (!raw)
      throw new CliUsageError("memory propose requires --json-input <json>");
    const input = JSON.parse(raw);
    const item = await proposePersistentMemory(input, { root }, fileSystem);
    io.stdout(
      parsed.flags.has("--json")
        ? JSON.stringify(item, null, 2)
        : `Proposed persistent memory [${item.id}]`,
    );
    return 0;
  }
  if (subcommand === "accept") {
    const id = parsed.values.get("--id") ?? args[2];
    const approvedBy = parsed.values.get("--approved-by");
    const evidence = parsed.values.get("--evidence");
    if (!id || !approvedBy || !evidence)
      throw new CliUsageError(
        "memory accept requires --id, --approved-by, and --evidence",
      );
    const item = await acceptPersistentMemory(
      id,
      { approvedBy, evidence },
      { root },
      fileSystem,
    );
    io.stdout(
      parsed.flags.has("--json")
        ? JSON.stringify(item, null, 2)
        : `Accepted persistent memory [${item.id}]`,
    );
    return 0;
  }
  if (subcommand === "forget") {
    const id = parsed.values.get("--id") ?? args[2];
    if (!id) throw new CliUsageError("memory forget requires --id <id>");
    const item = await forgetPersistentMemory(id, { root }, fileSystem);
    io.stdout(
      parsed.flags.has("--json")
        ? JSON.stringify(item, null, 2)
        : `Forgot persistent memory [${item.id}]`,
    );
    return 0;
  }
  if (subcommand === "export") {
    const projectId = parsed.values.get("--project-id");
    if (!projectId)
      throw new CliUsageError("memory export requires --project-id <id>");
    const bundle = await exportPersistentMemory(
      { root, projectId },
      fileSystem,
    );
    io.stdout(JSON.stringify(bundle, null, 2));
    return 0;
  }
  if (subcommand === "import") {
    const projectId = parsed.values.get("--project-id");
    const raw = parsed.values.get("--json-input");
    if (!projectId || !raw)
      throw new CliUsageError(
        "memory import requires --project-id and --json-input <json>",
      );
    const items = await importPersistentMemory(
      JSON.parse(raw),
      { root, projectId },
      fileSystem,
    );
    io.stdout(
      parsed.flags.has("--json")
        ? JSON.stringify(items, null, 2)
        : `Imported ${items.length} persistent memory proposals`,
    );
    return 0;
  }
  if (subcommand === "search" || subcommand === "render") {
    const projectId = parsed.values.get("--project-id");
    const query = parsed.values.get("--query");
    if (!projectId || !query)
      throw new CliUsageError(
        `memory ${subcommand} requires --project-id and --query`,
      );
    if (subcommand === "search") {
      io.stdout(
        JSON.stringify(
          await searchPersistentMemory(query, { root, projectId }, fileSystem),
          null,
          2,
        ),
      );
    } else {
      const target = parsed.values.get("--target") as any;
      if (!target) throw new CliUsageError("memory render requires --target");
      const result = await renderPersistentMemoryContext(
        target,
        query,
        { root, projectId },
        fileSystem,
      );
      io.stdout(
        parsed.flags.has("--json")
          ? JSON.stringify(result, null, 2)
          : result.content,
      );
    }
    return 0;
  }
  if (subcommand === "index") {
    if (parsed.flags.has("--clear")) {
      await clearPersistentMemoryIndex({ root }, fileSystem);
      io.stdout("Cleared persistent memory index");
      return 0;
    }
    const projectId = parsed.values.get("--project-id");
    if (!projectId)
      throw new CliUsageError("memory index requires --project-id");
    io.stdout(
      JSON.stringify(
        await rebuildPersistentMemoryIndex({ root, projectId }, fileSystem),
        null,
        2,
      ),
    );
    return 0;
  }
  throw new CliUsageError(`unsupported memory subcommand: ${subcommand}`);
}
