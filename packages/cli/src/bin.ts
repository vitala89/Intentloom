#!/usr/bin/env node
import { cwd } from "node:process";
import {
  adoptProject,
  diffProject,
  doctorProject,
  initProject,
  nodeFileSystem,
  planFeature,
  syncProject,
} from "./index.js";

const [command, ...args] = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const value = (name: string, fallback?: string) =>
  args[args.indexOf(name) + 1] ?? fallback;
const root = value("--root", cwd())!;
const profile = value("--profile", "generic")!;
const adapters = value("--adapters", "claude,codex,cursor,copilot")!.split(
  ",",
) as never;
const options = {
  root,
  profile,
  adapters,
  dryRun: flag("--dry-run"),
  catalogRoot: new URL("../../../catalog", import.meta.url).pathname,
};
try {
  const result =
    command === "init"
      ? await initProject(options, nodeFileSystem)
      : command === "adopt"
        ? await adoptProject(options, nodeFileSystem)
        : command === "sync"
          ? await syncProject(
              { ...options, force: flag("--force") },
              nodeFileSystem,
            )
          : command === "diff"
            ? await diffProject(options, nodeFileSystem)
            : command === "doctor"
              ? await doctorProject(options, nodeFileSystem)
              : command === "plan"
                ? await planFeature(value("--task") ?? "")
                : undefined;
  if (result === undefined)
    throw new Error("usage: aif <init|adopt|plan|diff|sync|doctor>");
  console.log(
    flag("--json")
      ? JSON.stringify(result, null, 2)
      : typeof result === "string"
        ? result
        : result.changes
            .map(
              (change) =>
                `${change.kind.padEnd(8)} ${change.path} — ${change.reason}`,
            )
            .join("\n"),
  );
  process.exitCode =
    typeof result === "string" ||
    !result.changes.some((change) => change.kind === "conflict")
      ? 0
      : 2;
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
