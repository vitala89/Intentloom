import { cwd } from "node:process";
import {
  createProfile,
  getProfile,
  listProfiles,
  nodeFileSystem,
  type FileSystem,
} from "@intentloom/application";
import { CliUsageError } from "./cli-project-metadata.js";
import { parseProfileArguments } from "./profile-parse.js";

export type ProfileCliExitCode = 0 | 2;

export interface ProfileCliIo {
  readonly stdout: (message: string) => void;
  readonly stderr: (message: string) => void;
}

export interface ProfileCliDependencies {
  readonly fileSystem?: FileSystem;
}

export async function runProfileCommand(
  args: readonly string[],
  dependencies: ProfileCliDependencies,
  io: ProfileCliIo,
): Promise<ProfileCliExitCode> {
  const parsed = parseProfileArguments(args);
  const fileSystem = dependencies.fileSystem ?? nodeFileSystem;
  const root = parsed.values.get("--root") ?? cwd();
  const subcommand = parsed.subcommand;

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
