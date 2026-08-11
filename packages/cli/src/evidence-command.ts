import { cwd } from "node:process";
import { resolve } from "node:path";
import { readFile } from "node:fs/promises";
import {
  collectGitEvidence,
  createReleaseTimeline,
} from "@intentloom/evidence-git";
import {
  fetchLiveProviderEvidence,
  importProviderExport,
  type ProviderEvidenceResult,
  type ProviderName,
} from "@intentloom/evidence-provider";
import { analyzeReleaseEvidence } from "@intentloom/evidence-analysis";
import { formatProviderEvidence, formatReleaseAnalysis } from "./formatters.js";

export type EvidenceCliExitCode = 0 | 2 | 3;

export interface EvidenceCliIo {
  readonly stdout: (message: string) => void;
  readonly stderr: (message: string) => void;
}

const evidenceUsage =
  "Usage: intentloom evidence <fetch|import|analyze> --provider github|gitlab --project-key KEY [--file PATH] [--root PATH] [--case-id ID] [--token TOKEN] [--json]";

interface EvidenceArguments {
  readonly subcommand: "fetch" | "import" | "analyze";
  readonly provider: ProviderName;
  readonly projectKey: string;
  readonly root: string;
  readonly json: boolean;
  readonly file?: string;
  readonly caseId?: string;
  readonly token?: string;
}

function parseEvidenceArguments(args: readonly string[]): EvidenceArguments {
  const subcommand = args[1];
  if (
    subcommand !== "fetch" &&
    subcommand !== "import" &&
    subcommand !== "analyze"
  ) {
    throw new Error("evidence requires fetch, import, or analyze");
  }

  let root = cwd();
  let provider: string | undefined;
  let projectKey: string | undefined;
  let file: string | undefined;
  let caseId: string | undefined;
  let token: string | undefined;
  let json = false;

  for (let index = 2; index < args.length; index += 1) {
    const tokenName = args[index];
    if (tokenName === "--json") {
      if (json) throw new Error("evidence --json specified more than once");
      json = true;
      continue;
    }
    if (
      tokenName !== "--root" &&
      tokenName !== "--provider" &&
      tokenName !== "--project-key" &&
      tokenName !== "--file" &&
      tokenName !== "--case-id" &&
      tokenName !== "--token"
    ) {
      throw new Error(`unknown evidence option: ${tokenName}`);
    }
    const value = args[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`missing value for ${tokenName}`);
    }
    if (tokenName === "--root") root = value;
    else if (tokenName === "--provider") {
      if (provider !== undefined) {
        throw new Error("evidence --provider specified more than once");
      }
      provider = value;
    } else if (tokenName === "--project-key") {
      if (projectKey !== undefined) {
        throw new Error("evidence --project-key specified more than once");
      }
      projectKey = value;
    } else if (tokenName === "--file") {
      if (file !== undefined) {
        throw new Error("evidence --file specified more than once");
      }
      file = value;
    } else if (tokenName === "--case-id") {
      if (caseId !== undefined) {
        throw new Error("evidence --case-id specified more than once");
      }
      caseId = value;
    } else {
      if (token !== undefined) {
        throw new Error("evidence --token specified more than once");
      }
      token = value;
    }
    index += 1;
  }

  if (provider !== "github" && provider !== "gitlab") {
    throw new Error("--provider must be github or gitlab");
  }
  if (!projectKey) {
    throw new Error(`evidence ${subcommand} requires --project-key`);
  }

  return {
    subcommand,
    provider,
    projectKey,
    root,
    json,
    ...(file !== undefined ? { file } : {}),
    ...(caseId !== undefined ? { caseId } : {}),
    ...(token !== undefined ? { token } : {}),
  };
}

async function runEvidenceImportOrAnalyze(
  parsed: EvidenceArguments,
  io: EvidenceCliIo,
): Promise<EvidenceCliExitCode> {
  if (!parsed.file) {
    throw new Error(
      `evidence ${parsed.subcommand} requires --file and --project-key`,
    );
  }

  let payload: unknown;
  let result: ProviderEvidenceResult;
  try {
    payload = JSON.parse(await readFile(resolve(parsed.file), "utf8"));
  } catch {
    result = {
      operationVersion: 1,
      source: "provider-export",
      provider: parsed.provider,
      projectKey: parsed.projectKey,
      trust: "provider-supplied-unverified",
      status: "invalid",
      events: [],
      diagnostics: ["export-file-unreadable"],
    };
    if (parsed.subcommand === "import") {
      io.stdout(
        parsed.json
          ? JSON.stringify(result, null, 2)
          : formatProviderEvidence(result),
      );
      return 3;
    }
  }

  if (payload !== undefined) {
    result = importProviderExport({
      provider: parsed.provider,
      projectKey: parsed.projectKey,
      payload,
    });
  }

  if (parsed.subcommand === "import") {
    io.stdout(
      parsed.json
        ? JSON.stringify(result!, null, 2)
        : formatProviderEvidence(result!),
    );
    return result!.status === "invalid" ? 3 : 0;
  }

  const timeline = createReleaseTimeline(
    parsed.caseId ?? "release",
    await collectGitEvidence({ root: parsed.root }),
  );
  const report = analyzeReleaseEvidence(
    {
      caseId: timeline.caseId,
      quality: timeline.quality,
      events: timeline.events.map((event) => ({
        commitId: event.commitId,
        timestamp: event.timestamp,
      })),
    },
    {
      provider: result!.provider,
      projectKey: result!.projectKey,
      status: result!.status,
      events: result!.events.map((event) => ({
        eventType: event.eventType,
        sourceId: event.sourceId,
        ...(event.commitIds ? { commitIds: event.commitIds } : {}),
      })),
    },
    parsed.projectKey,
  );
  io.stdout(
    parsed.json
      ? JSON.stringify(report, null, 2)
      : formatReleaseAnalysis(report),
  );
  return report.quality === "conflicted" || report.quality === "unavailable"
    ? 3
    : 0;
}

export async function runEvidenceCommand(
  args: readonly string[],
  io: EvidenceCliIo,
): Promise<EvidenceCliExitCode> {
  try {
    const parsed = parseEvidenceArguments(args);

    if (parsed.subcommand === "fetch") {
      const liveResult = await fetchLiveProviderEvidence({
        provider: parsed.provider,
        projectKey: parsed.projectKey,
        ...(parsed.token ? { token: parsed.token } : {}),
      });
      io.stdout(
        parsed.json
          ? JSON.stringify(liveResult, null, 2)
          : formatProviderEvidence(liveResult),
      );
      return liveResult.status === "invalid" ? 3 : 0;
    }

    return await runEvidenceImportOrAnalyze(parsed, io);
  } catch (error) {
    io.stderr(error instanceof Error ? error.message : evidenceUsage);
    return 2;
  }
}
