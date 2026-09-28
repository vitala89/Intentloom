import { chmod, mkdtemp, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DaemonStartupError,
  NEUTRON_MUTATION_STATE_DIR_FLAG,
  ensureDurableStateDirectory,
  resolveDaemonStartupConfig,
} from "../packages/daemon/src/daemon-startup-config.js";

async function tokenFile(directory: string): Promise<string> {
  const path = join(directory, "token");
  await writeFile(path, "d".repeat(32));
  if (process.platform !== "win32") await chmod(path, 0o600);
  return path;
}

describe("daemon startup durable mutation-state config", () => {
  it("keeps the durable-state flag optional for non-Desktop launches", async () => {
    const directory = await mkdtemp(join(tmpdir(), "daemon-startup-optional-"));
    const config = await resolveDaemonStartupConfig([
      "--endpoint",
      join(directory, "daemon.sock"),
      "--token-file",
      await tokenFile(directory),
      "--catalog-root",
      directory,
    ]);
    expect(config.durableStateDirectory).toBeUndefined();
    expect(config.sessionToken).toHaveLength(32);
  });

  it("resolves a trusted host directory when the Desktop flag is supplied", async () => {
    const directory = await mkdtemp(join(tmpdir(), "daemon-startup-present-"));
    const stateDir = join(directory, "neutron-mutation-state");
    const config = await resolveDaemonStartupConfig([
      "--endpoint",
      join(directory, "daemon.sock"),
      "--token-file",
      await tokenFile(directory),
      "--catalog-root",
      directory,
      NEUTRON_MUTATION_STATE_DIR_FLAG,
      stateDir,
    ]);
    expect(config.durableStateDirectory).toBe(stateDir);
    const details = await stat(stateDir);
    expect(details.isDirectory()).toBe(true);
    if (process.platform !== "win32") {
      expect(details.mode & 0o777).toBe(0o700);
    }
  });

  it("fails closed for empty, file, and missing flag values", async () => {
    const directory = await mkdtemp(join(tmpdir(), "daemon-startup-fail-"));
    const token = await tokenFile(directory);
    const asFile = join(directory, "not-a-directory");
    await writeFile(asFile, "nope\n");
    await expect(
      resolveDaemonStartupConfig([
        "--endpoint",
        join(directory, "daemon.sock"),
        "--token-file",
        token,
        "--catalog-root",
        directory,
        NEUTRON_MUTATION_STATE_DIR_FLAG,
      ]),
    ).rejects.toBeInstanceOf(DaemonStartupError);
    await expect(ensureDurableStateDirectory("   ")).rejects.toMatchObject({
      message: "neutron mutation state directory is unusable",
    });
    await expect(ensureDurableStateDirectory(asFile)).rejects.toMatchObject({
      message: "neutron mutation state path is not a directory",
    });
  });
});
