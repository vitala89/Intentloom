import { execFile } from "node:child_process";
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  readlink,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { promisify } from "node:util";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { INTENTLOOM_VERSION } from "@intentloom/core";

const execute = promisify(execFile);
const repositoryRoot = resolve(import.meta.dirname, "..");
const builtCli = join(repositoryRoot, "packages/cli/dist/intentloom.cjs");
const windows = process.platform === "win32";
const command = (name: string) => (windows ? `${name}.cmd` : name);
let faultRunner = "";
const temporaryRoots: string[] = [];
const privateContents = "PRIVATE-GENERATED-CONTENT-DO-NOT-PRINT\n";

interface ProcessResult {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
}

interface StatefulResult extends ProcessResult {
  readonly before: readonly [string, string][];
  readonly after: readonly [string, string][];
}

interface Scenarios {
  success: ProcessResult;
  noOp: ProcessResult;
  dryRun: StatefulResult;
  dryRunMetadataExists: boolean;
  dryRunConflict: StatefulResult;
  unowned: StatefulResult;
  modified: StatefulResult;
  collision: StatefulResult;
  symlink: StatefulResult;
  externalTarget: string;
  manifestFailure: StatefulResult;
  sourceMapFailure: StatefulResult;
  consistencyFailure: StatefulResult;
  generatedRollbackFailure: StatefulResult;
  manifestRollbackFailure: StatefulResult;
  sourceMapRollbackFailure: StatefulResult;
  invalidOption: ProcessResult;
  missingConfig: ProcessResult;
  help: ProcessResult;
  version: ProcessResult;
  packedSuccess: ProcessResult;
  packedNoOp: ProcessResult;
  packedDryRun: StatefulResult;
  packedVersion: ProcessResult;
  jsonSuccess: ProcessResult;
  jsonConflict: ProcessResult;
  jsonRestoredFailure: ProcessResult;
  jsonIncompleteRollback: ProcessResult;
  adoptionRestoredFailure: StatefulResult;
  adoptionIncompleteRollback: StatefulResult;
}

let scenarios: Scenarios;

async function temporaryDirectory(prefix: string): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), prefix));
  temporaryRoots.push(directory);
  return directory;
}

async function run(
  executable: string,
  args: readonly string[],
  cwd: string,
  env: NodeJS.ProcessEnv = {},
): Promise<ProcessResult> {
  try {
    const result = await execute(executable, [...args], {
      cwd,
      env: { ...process.env, ...env },
      maxBuffer: 10 * 1024 * 1024,
      shell: windows && executable.endsWith(".cmd"),
    });
    return { ...result, exitCode: 0 };
  } catch (error) {
    const failure = error as {
      stdout?: string;
      stderr?: string;
      code?: number;
    };
    return {
      stdout: failure.stdout ?? "",
      stderr: failure.stderr ?? "",
      exitCode: typeof failure.code === "number" ? failure.code : 1,
    };
  }
}

function commandArgs(
  command: "init" | "sync" | "adopt",
  project: string,
  extra: readonly string[] = [],
): string[] {
  return [command, "--root", project, "--adapters", "codex", ...extra];
}

async function runBuiltCli(
  project: string,
  args: readonly string[],
): Promise<ProcessResult> {
  return run(process.execPath, [builtCli, ...args], project);
}

async function runFaultCli(
  project: string,
  env: NodeJS.ProcessEnv,
  extra: readonly string[] = [],
  command: "sync" | "adopt" = "sync",
): Promise<ProcessResult> {
  return run(
    process.execPath,
    [faultRunner, ...commandArgs(command, project, extra)],
    project,
    {
      AIF_TEST_CATALOG_ROOT: join(repositoryRoot, "packages/cli/dist/catalog"),
      ...env,
    },
  );
}

async function initialize(
  executable: string,
  project: string,
  nodeScript = true,
): Promise<void> {
  const args = commandArgs("init", project);
  const result = nodeScript
    ? await run(process.execPath, [executable, ...args], project)
    : await run(executable, args, project);
  if (result.exitCode !== 0)
    throw new Error(`initialization failed: ${result.stderr || result.stdout}`);
}

async function pruneToConfig(project: string): Promise<void> {
  for (const entry of await readdir(project)) {
    const path = join(project, entry);
    if (entry !== ".aif") await rm(path, { recursive: true, force: true });
  }
  const aifDirectory = join(project, ".aif");
  for (const entry of await readdir(aifDirectory))
    if (entry !== "config.yaml")
      await rm(join(aifDirectory, entry), { recursive: true, force: true });
}

async function snapshot(
  root: string,
  current = root,
): Promise<readonly [string, string][]> {
  const result: [string, string][] = [];
  for (const entry of (await readdir(current, { withFileTypes: true })).sort(
    (left, right) => left.name.localeCompare(right.name),
  )) {
    const path = join(current, entry.name);
    const projectPath = relative(root, path);
    const stats = await lstat(path);
    if (stats.isSymbolicLink())
      result.push([projectPath, `symlink:${await readlink(path)}`]);
    else if (entry.isDirectory()) result.push(...(await snapshot(root, path)));
    else result.push([projectPath, (await readFile(path)).toString("base64")]);
  }
  return result;
}

async function stateful(
  project: string,
  executeCommand: () => Promise<ProcessResult>,
): Promise<StatefulResult> {
  const before = await snapshot(project);
  const result = await executeCommand();
  const after = await snapshot(project);
  return { ...result, before, after };
}

async function initializedProject(prune = false): Promise<string> {
  const project = await temporaryDirectory("aif-cli-process-");
  await initialize(builtCli, project);
  if (prune) await pruneToConfig(project);
  return project;
}

async function faultScenario(
  env: NodeJS.ProcessEnv,
  extra: readonly string[] = [],
): Promise<StatefulResult> {
  const project = await initializedProject();
  return stateful(project, () => runFaultCli(project, env, extra));
}

async function adoptionFaultScenario(
  env: NodeJS.ProcessEnv,
  extra: readonly string[] = [],
): Promise<StatefulResult> {
  const project = await temporaryDirectory("aif-cli-adoption-fault-");
  return stateful(project, () => runFaultCli(project, env, extra, "adopt"));
}

async function installPackedCli(): Promise<string> {
  const packRoot = await temporaryDirectory("aif-cli-packed-");
  await run(
    command("pnpm"),
    ["--filter", "./packages/cli", "pack", "--pack-destination", packRoot],
    repositoryRoot,
  );
  const tarball = join(
    packRoot,
    (await readdir(packRoot)).find((entry) => entry.endsWith(".tgz"))!,
  );
  const runtime = join(packRoot, "runtime");
  await mkdir(runtime);
  const installed = await run(
    command("npm"),
    [
      "install",
      "--cache",
      join(packRoot, "npm-cache"),
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      tarball,
    ],
    runtime,
  );
  if (installed.exitCode !== 0) throw new Error(installed.stderr);
  return join(runtime, `node_modules/.bin/intentloom${windows ? ".cmd" : ""}`);
}

beforeAll(async () => {
  const build = await run(command("pnpm"), ["build"], repositoryRoot);
  if (build.exitCode !== 0) throw new Error(build.stderr || build.stdout);
  const faultBuildRoot = await temporaryDirectory("aif-cli-fault-runner-");
  faultRunner = join(faultBuildRoot, "cli-fault-runner.cjs");
  const faultBuild = await run(
    command("pnpm"),
    [
      "exec",
      "esbuild",
      "tests/fixtures/cli-fault-runner.ts",
      "--bundle",
      "--platform=node",
      "--format=cjs",
      "--target=node22",
      `--outfile=${faultRunner}`,
    ],
    repositoryRoot,
  );
  if (faultBuild.exitCode !== 0)
    throw new Error(faultBuild.stderr || faultBuild.stdout);

  const successProject = await initializedProject(true);
  const success = await runBuiltCli(
    successProject,
    commandArgs("sync", successProject),
  );
  const noOp = await runBuiltCli(
    successProject,
    commandArgs("sync", successProject),
  );

  const dryRunProject = await initializedProject(true);
  const dryRun = await stateful(dryRunProject, () =>
    runBuiltCli(
      dryRunProject,
      commandArgs("sync", dryRunProject, ["--dry-run"]),
    ),
  );
  const dryRunMetadataExists = [
    ".aif/manifest.lock.json",
    ".aif/source-map.json",
  ].some((path) => dryRun.after.some(([candidate]) => candidate === path));

  const dryRunConflictProject = await initializedProject(true);
  await writeFile(join(dryRunConflictProject, "AGENTS.md"), privateContents);
  const dryRunConflict = await stateful(dryRunConflictProject, () =>
    runBuiltCli(
      dryRunConflictProject,
      commandArgs("sync", dryRunConflictProject, ["--dry-run"]),
    ),
  );

  const unownedProject = await initializedProject(true);
  await writeFile(join(unownedProject, "AGENTS.md"), privateContents);
  const unowned = await stateful(unownedProject, () =>
    runBuiltCli(unownedProject, commandArgs("sync", unownedProject)),
  );

  const modifiedProject = await initializedProject();
  await writeFile(join(modifiedProject, "AGENTS.md"), privateContents);
  const modified = await stateful(modifiedProject, () =>
    runBuiltCli(modifiedProject, commandArgs("sync", modifiedProject)),
  );

  const collisionProject = await initializedProject();
  const collision = await stateful(collisionProject, () =>
    runBuiltCli(collisionProject, [
      "sync",
      "--root",
      collisionProject,
      "--adapters",
      "claude,codex",
    ]),
  );

  const symlinkProject = await initializedProject(true);
  const externalRoot = await temporaryDirectory("aif-cli-external-");
  const externalTarget = join(externalRoot, "private-target.txt");
  await writeFile(externalTarget, privateContents);
  await symlink(externalTarget, join(symlinkProject, "AGENTS.md"));
  const symlinkResult = await stateful(symlinkProject, () =>
    runBuiltCli(symlinkProject, commandArgs("sync", symlinkProject)),
  );

  const manifestFailure = await faultScenario({
    AIF_TEST_FAIL_AT: "manifest-finalize",
  });
  const sourceMapFailure = await faultScenario({
    AIF_TEST_FAIL_AT: "source-map-finalize",
  });
  const consistencyFailure = await faultScenario({
    AIF_TEST_CORRUPT: "manifest",
  });
  const generatedRollbackFailure = await faultScenario({
    AIF_TEST_FAIL_AT: "source-map-finalize",
    AIF_TEST_ROLLBACK_PATHS: "AGENTS.md",
  });
  const manifestRollbackFailure = await faultScenario({
    AIF_TEST_FAIL_AT: "source-map-finalize",
    AIF_TEST_ROLLBACK_PATHS: ".aif/manifest.lock.json",
  });
  const sourceMapRollbackFailure = await faultScenario({
    AIF_TEST_FAIL_AT: "post-write-consistency",
    AIF_TEST_ROLLBACK_PATHS: ".aif/source-map.json",
  });

  const usageProject = await temporaryDirectory("aif-cli-usage-");
  const invalidOption = await runBuiltCli(usageProject, ["sync", "--unknown"]);
  const missingConfig = await runBuiltCli(
    usageProject,
    commandArgs("sync", usageProject),
  );
  const help = await runBuiltCli(usageProject, ["--help"]);
  const version = await runBuiltCli(usageProject, ["--version"]);

  const packedCli = await installPackedCli();
  const packedProject = await temporaryDirectory("aif-cli-packed-project-");
  await initialize(packedCli, packedProject, false);
  await pruneToConfig(packedProject);
  const packedSuccess = await run(
    packedCli,
    commandArgs("sync", packedProject),
    packedProject,
  );
  const packedNoOp = await run(
    packedCli,
    commandArgs("sync", packedProject),
    packedProject,
  );
  const packedDryRun = await stateful(packedProject, () =>
    run(
      packedCli,
      commandArgs("sync", packedProject, ["--dry-run"]),
      packedProject,
    ),
  );
  const packedVersion = await run(packedCli, ["--version"], packedProject);

  const jsonSuccess = await runBuiltCli(successProject, [
    ...commandArgs("sync", successProject),
    "--json",
  ]);
  const jsonConflict = await runBuiltCli(unownedProject, [
    ...commandArgs("sync", unownedProject),
    "--json",
  ]);
  const jsonRestoredFailure = await faultScenario(
    { AIF_TEST_FAIL_AT: "manifest-finalize" },
    ["--json"],
  );
  const jsonIncompleteRollback = await faultScenario(
    {
      AIF_TEST_FAIL_AT: "source-map-finalize",
      AIF_TEST_ROLLBACK_PATHS: "AGENTS.md",
    },
    ["--json"],
  );
  const adoptionRestoredFailure = await adoptionFaultScenario({
    AIF_TEST_FAIL_AT: "manifest-finalize",
  });
  const adoptionIncompleteRollback = await adoptionFaultScenario(
    {
      AIF_TEST_FAIL_AT: "source-map-finalize",
      AIF_TEST_ROLLBACK_PATHS: "AGENTS.md",
    },
    ["--json"],
  );

  scenarios = {
    success,
    noOp,
    dryRun,
    dryRunMetadataExists,
    dryRunConflict,
    unowned,
    modified,
    collision,
    symlink: symlinkResult,
    externalTarget,
    manifestFailure,
    sourceMapFailure,
    consistencyFailure,
    generatedRollbackFailure,
    manifestRollbackFailure,
    sourceMapRollbackFailure,
    invalidOption,
    missingConfig,
    help,
    version,
    packedSuccess,
    packedNoOp,
    packedDryRun,
    packedVersion,
    jsonSuccess,
    jsonConflict,
    jsonRestoredFailure,
    jsonIncompleteRollback,
    adoptionRestoredFailure,
    adoptionIncompleteRollback,
  };
}, 120_000);

afterAll(async () => {
  await Promise.all(
    temporaryRoots.map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("real CLI transactional sync", () => {
  it("successful sync returns exit code 0", () => {
    expect(scenarios.success.exitCode).toBe(0);
  });

  it("successful sync prints created, updated, and unchanged counts", () => {
    expect(scenarios.success.stdout).toMatch(/Created: \d+/u);
    expect(scenarios.success.stdout).toMatch(/Updated: \d+/u);
    expect(scenarios.success.stdout).toMatch(/Unchanged: \d+/u);
  });

  it("successful sync reports manifest and source-map updates", () => {
    expect(scenarios.success.stdout).toContain("Manifest updated: yes");
    expect(scenarios.success.stdout).toContain("Source map updated: yes");
  });

  it("successful sync reports consistency validation passed", () => {
    expect(scenarios.success.stdout).toContain(
      "Consistency validation: passed",
    );
  });

  it("second sync is a no-op with exit code 0", () => {
    expect(scenarios.noOp.exitCode).toBe(0);
  });

  it("no-op output states that no changes are required", () => {
    expect(scenarios.noOp.stdout).toContain("No changes required.");
  });

  it("valid dry-run returns exit code 0", () => {
    expect(scenarios.dryRun.exitCode).toBe(0);
  });

  it("valid dry-run changes no project files", () => {
    expect(scenarios.dryRun.after).toEqual(scenarios.dryRun.before);
  });

  it("valid dry-run creates no manifest or source map", () => {
    expect(scenarios.dryRunMetadataExists).toBe(false);
  });

  it("dry-run conflict returns exit code 3", () => {
    expect(scenarios.dryRunConflict.exitCode).toBe(3);
  });

  it("dry-run conflict changes no project files", () => {
    expect(scenarios.dryRunConflict.after).toEqual(
      scenarios.dryRunConflict.before,
    );
  });

  it("unowned destination conflict returns exit code 3", () => {
    expect(scenarios.unowned.exitCode).toBe(3);
  });

  it("manually modified generated-file conflict returns exit code 3", () => {
    expect(scenarios.modified.exitCode).toBe(3);
  });

  it("destination collision returns exit code 3", () => {
    expect(scenarios.collision.exitCode).toBe(3);
  });

  it("symlink path-security validation returns exit code 3", () => {
    expect(scenarios.symlink.exitCode).toBe(3);
  });

  it("conflict output contains project-relative paths only", () => {
    expect(scenarios.symlink.stdout).toContain("AGENTS.md");
    expect(scenarios.symlink.stdout).not.toContain(scenarios.externalTarget);
  });

  it("manifest finalization failure returns exit code 4", () => {
    expect(scenarios.manifestFailure.exitCode).toBe(4);
  });

  it("source-map finalization failure returns exit code 4", () => {
    expect(scenarios.sourceMapFailure.exitCode).toBe(4);
  });

  it("post-write consistency failure returns exit code 4", () => {
    expect(scenarios.consistencyFailure.exitCode).toBe(4);
  });

  it("recoverable transaction failure states rollback completed", () => {
    expect(scenarios.manifestFailure.stdout).toContain("Rollback: completed");
  });

  it("recoverable transaction failure states project state was restored", () => {
    expect(scenarios.manifestFailure.stdout).toContain(
      "Project state was restored.",
    );
  });

  it("recoverable transaction failure restores the initial filesystem", () => {
    expect(scenarios.consistencyFailure.after).toEqual(
      scenarios.consistencyFailure.before,
    );
  });

  it("generated-file restore failure returns exit code 5", () => {
    expect(scenarios.generatedRollbackFailure.exitCode).toBe(5);
  });

  it("manifest restore failure returns exit code 5", () => {
    expect(scenarios.manifestRollbackFailure.exitCode).toBe(5);
  });

  it("source-map restore failure returns exit code 5", () => {
    expect(scenarios.sourceMapRollbackFailure.exitCode).toBe(5);
  });

  it("incomplete rollback output states rollback incomplete", () => {
    expect(scenarios.generatedRollbackFailure.stdout).toContain(
      "Rollback: incomplete",
    );
  });

  it("incomplete rollback output requires manual inspection", () => {
    expect(scenarios.generatedRollbackFailure.stdout).toContain(
      "Manual inspection is required.",
    );
  });

  it("incomplete rollback output includes failed project-relative paths", () => {
    expect(scenarios.generatedRollbackFailure.stdout).toContain("AGENTS.md");
  });

  it("incomplete rollback output never claims project state was restored", () => {
    expect(scenarios.generatedRollbackFailure.stdout).not.toContain(
      "Project state was restored.",
    );
  });

  it("private generated-file contents do not appear in stdout", () => {
    expect(scenarios.modified.stdout).not.toContain(privateContents.trim());
  });

  it("private generated-file contents do not appear in stderr", () => {
    expect(scenarios.modified.stderr).not.toContain(privateContents.trim());
  });

  it("external absolute target paths do not appear in normal output", () => {
    expect(
      `${scenarios.symlink.stdout}${scenarios.symlink.stderr}`,
    ).not.toContain(scenarios.externalTarget);
  });

  it("original failed stage is preserved in CLI output", () => {
    expect(scenarios.manifestFailure.stdout).toContain(
      "failed during: manifest-finalize",
    );
  });

  it("original transaction and rollback failure codes are both represented", () => {
    expect(scenarios.generatedRollbackFailure.stdout).toContain(
      "Error: injected:source-map-finalize",
    );
    expect(scenarios.generatedRollbackFailure.stdout).toContain(
      "Rollback error: transaction-rollback-incomplete",
    );
  });

  it("normal CLI errors contain no raw stack trace", () => {
    expect(
      `${scenarios.generatedRollbackFailure.stdout}${scenarios.generatedRollbackFailure.stderr}`,
    ).not.toMatch(/\n\s+at /u);
  });

  it("invalid sync option returns exit code 2", () => {
    expect(scenarios.invalidOption.exitCode).toBe(2);
  });

  it("missing project configuration returns exit code 2", () => {
    expect(scenarios.missingConfig.exitCode).toBe(2);
  });

  it("help remains exit code 0", () => {
    expect(scenarios.help.exitCode).toBe(0);
  });

  it("version remains exit code 0", () => {
    expect(scenarios.version.exitCode).toBe(0);
  });

  it("packed CLI performs successful sync outside the monorepo", () => {
    expect(scenarios.packedSuccess.exitCode).toBe(0);
    expect(scenarios.packedSuccess.stdout).toContain(
      "Intentloom sync completed.",
    );
  });

  it("packed CLI performs a second no-op sync", () => {
    expect(scenarios.packedNoOp.exitCode).toBe(0);
    expect(scenarios.packedNoOp.stdout).toContain("No changes required.");
  });

  it("packed CLI dry-run changes nothing", () => {
    expect(scenarios.packedDryRun.exitCode).toBe(0);
    expect(scenarios.packedDryRun.after).toEqual(scenarios.packedDryRun.before);
  });

  it("packed CLI reports current version", () => {
    expect(scenarios.packedVersion.exitCode).toBe(0);
    expect(scenarios.packedVersion.stdout.trim()).toBe(INTENTLOOM_VERSION);
  });

  it("JSON success uses the same exit code and structured outcome", () => {
    expect(scenarios.jsonSuccess.exitCode).toBe(0);
    expect(JSON.parse(scenarios.jsonSuccess.stdout)).toMatchObject({
      status: "success",
      rollbackAttempted: false,
      consistencyValidated: true,
    });
  });

  it("JSON conflict uses exit code 3 and safe relative paths", () => {
    expect(scenarios.jsonConflict.exitCode).toBe(3);
    expect(JSON.parse(scenarios.jsonConflict.stdout)).toMatchObject({
      status: "conflict",
      conflicts: ["AGENTS.md"],
    });
  });

  it("JSON restored failure uses exit code 4", () => {
    expect(scenarios.jsonRestoredFailure.exitCode).toBe(4);
    expect(JSON.parse(scenarios.jsonRestoredFailure.stdout)).toMatchObject({
      status: "failed",
      failedStage: "manifest-finalize",
      rollbackCompleted: true,
    });
  });

  it("JSON incomplete rollback uses exit code 5", () => {
    expect(scenarios.jsonIncompleteRollback.exitCode).toBe(5);
    expect(JSON.parse(scenarios.jsonIncompleteRollback.stdout)).toMatchObject({
      status: "failed",
      rollbackCompleted: false,
      rollbackErrorCode: "transaction-rollback-incomplete",
      rollbackFailures: ["AGENTS.md"],
    });
  });

  it("adoption restored failure preserves diagnostics and exits 4", () => {
    expect(scenarios.adoptionRestoredFailure.exitCode).toBe(4);
    expect(scenarios.adoptionRestoredFailure.stdout).toContain(
      "Transaction failed during: manifest-finalize",
    );
    expect(scenarios.adoptionRestoredFailure.stdout).toContain(
      "Rollback: completed",
    );
    expect(scenarios.adoptionRestoredFailure.after).toEqual(
      scenarios.adoptionRestoredFailure.before,
    );
  });

  it("adoption incomplete rollback preserves affected paths and exits 5", () => {
    expect(scenarios.adoptionIncompleteRollback.exitCode).toBe(5);
    expect(
      JSON.parse(scenarios.adoptionIncompleteRollback.stdout),
    ).toMatchObject({
      applicationStatus: "failed-incomplete",
      transactionOutcome: {
        status: "failed",
        failedStage: "source-map-finalize",
        rollbackCompleted: false,
        rollbackFailures: ["AGENTS.md"],
      },
    });
  });
});
