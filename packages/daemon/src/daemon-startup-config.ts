import { chmod, mkdir, readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

export const NEUTRON_MUTATION_STATE_DIR_FLAG = "--neutron-mutation-state-dir";

export class DaemonStartupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DaemonStartupError";
  }
}

export interface DaemonStartupConfig {
  readonly endpoint: string;
  readonly catalogRoot: string;
  readonly sessionToken: string;
  readonly durableStateDirectory?: string;
}

export async function resolveDaemonStartupConfig(
  args: readonly string[],
): Promise<DaemonStartupConfig> {
  const endpoint = requiredArg(args, "--endpoint");
  const tokenFile = requiredArg(args, "--token-file");
  const catalogRoot = requiredArg(args, "--catalog-root");
  const sessionToken = await readSessionToken(tokenFile);
  const durableStateDirectory = await optionalDurableStateDirectory(args);
  return {
    endpoint,
    catalogRoot,
    sessionToken,
    ...(durableStateDirectory === undefined ? {} : { durableStateDirectory }),
  };
}

export function requiredArg(args: readonly string[], flag: string): string {
  const index = args.indexOf(flag);
  const candidate = index < 0 ? undefined : args[index + 1];
  if (candidate === undefined || candidate.startsWith("--") || candidate === "")
    throw new DaemonStartupError(`missing ${flag}`);
  return candidate;
}

export async function ensureDurableStateDirectory(
  value: string,
): Promise<string> {
  if (value.trim() === "") {
    throw new DaemonStartupError(
      "neutron mutation state directory is unusable",
    );
  }
  const directory = resolve(value);
  let metadata;
  try {
    metadata = await stat(directory);
  } catch {
    return createDurableStateDirectory(directory);
  }
  if (!metadata.isDirectory()) {
    throw new DaemonStartupError(
      "neutron mutation state path is not a directory",
    );
  }
  await protectDurableStateDirectory(directory);
  return directory;
}

async function optionalDurableStateDirectory(
  args: readonly string[],
): Promise<string | undefined> {
  if (!args.includes(NEUTRON_MUTATION_STATE_DIR_FLAG)) return undefined;
  return ensureDurableStateDirectory(
    requiredArg(args, NEUTRON_MUTATION_STATE_DIR_FLAG),
  );
}

async function createDurableStateDirectory(directory: string): Promise<string> {
  try {
    await mkdir(directory, { recursive: true, mode: 0o700 });
  } catch {
    throw new DaemonStartupError(
      "neutron mutation state directory is unusable",
    );
  }
  await protectDurableStateDirectory(directory);
  return directory;
}

async function protectDurableStateDirectory(directory: string): Promise<void> {
  if (process.platform === "win32") return;
  try {
    await chmod(directory, 0o700);
  } catch {
    throw new DaemonStartupError(
      "neutron mutation state directory is unusable",
    );
  }
}

async function readSessionToken(tokenFile: string): Promise<string> {
  const tokenStats = await stat(tokenFile);
  if (!tokenStats.isFile())
    throw new DaemonStartupError("token file must be a regular file");
  if (process.platform !== "win32" && (tokenStats.mode & 0o077) !== 0) {
    throw new DaemonStartupError(
      "token file must not be accessible to group or other users",
    );
  }
  return (await readFile(tokenFile, "utf8")).trim();
}
