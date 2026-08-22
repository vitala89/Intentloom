import { cwd } from "node:process";
import {
  collectGitEvidence,
  createReleaseTimeline,
} from "@intentloom/evidence-git";
import { formatTimeline } from "./formatters.js";

export type TimelineCliExitCode = 0 | 2 | 3;

export interface TimelineCliIo {
  readonly stdout: (message: string) => void;
  readonly stderr: (message: string) => void;
}

interface TimelineArguments {
  readonly root: string;
  readonly caseId: string;
  readonly json: boolean;
}

const legacyBooleanFlags = new Set([
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
const valueFlags = new Set(["--root", "--case-id"]);

const timelineUsage =
  "Usage: intentloom timeline [PROJECT_PATH|--root PATH] [--case-id ID] [--json]";

function parseTimelineArguments(args: readonly string[]): TimelineArguments {
  const flags = new Set<string>();
  const values = new Map<string, string>();

  for (let index = 1; index < args.length; index += 1) {
    const token = args[index]!;
    if (legacyBooleanFlags.has(token)) {
      flags.add(token);
      continue;
    }
    if (!token.startsWith("--")) {
      if (values.has("--root"))
        throw new Error("project path specified more than once");
      values.set("--root", token);
      continue;
    }
    if (!valueFlags.has(token)) throw new Error(`unknown option: ${token}`);
    const value = args[index + 1];
    if (value === undefined || value.startsWith("--"))
      throw new Error(`missing value for ${token}`);
    if (token === "--root" && values.has("--root"))
      throw new Error("project path specified more than once");
    values.set(token, value);
    index += 1;
  }

  return {
    root: values.get("--root") ?? cwd(),
    caseId: values.get("--case-id") ?? "release",
    json: flags.has("--json"),
  };
}

export async function runTimelineCommand(
  args: readonly string[],
  _dependencies: Record<string, never>,
  io: TimelineCliIo,
): Promise<TimelineCliExitCode> {
  try {
    const parsed = parseTimelineArguments(args);
    const evidence = await collectGitEvidence({ root: parsed.root });
    const timeline = createReleaseTimeline(parsed.caseId, evidence);
    io.stdout(
      parsed.json
        ? JSON.stringify(timeline, null, 2)
        : formatTimeline(timeline),
    );
    return timeline.quality === "unavailable" ? 3 : 0;
  } catch (error) {
    io.stderr(error instanceof Error ? error.message : timelineUsage);
    return 2;
  }
}
