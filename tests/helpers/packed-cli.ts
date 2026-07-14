import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

export interface PackedExecution {
  status: number;
  stdout: string;
  stderr: string;
  signal: NodeJS.Signals | null;
  error: string | undefined;
  timedOut: boolean;
}

function execution(result: ReturnType<typeof spawnSync>): PackedExecution {
  return {
    status: result.status ?? -1,
    stdout: result.stdout?.toString() ?? "",
    stderr: result.stderr?.toString() ?? "",
    signal: result.signal,
    error: result.error?.message,
    timedOut: result.error?.code === "ETIMEDOUT",
  };
}

export function resolvePackedCliEntry(runtime: string) {
  const packageJson = join(
    runtime,
    "node_modules",
    "@aif",
    "cli",
    "package.json",
  );
  const manifest = JSON.parse(readFileSync(packageJson, "utf8")) as {
    bin?: string | Record<string, string>;
  };
  const bin =
    typeof manifest.bin === "string" ? manifest.bin : manifest.bin?.aif;
  if (!bin)
    throw new Error(`Packed CLI package has no aif bin: ${packageJson}`);

  const entry = resolve(dirname(packageJson), bin);
  if (!existsSync(entry))
    throw new Error(`Packed CLI entry is missing: ${entry}`);
  return entry;
}

export function packedCommandShim(runtime: string) {
  return join(runtime, "node_modules", ".bin", "aif.cmd");
}

export function runPackedCli(entry: string, args: string[], cwd: string) {
  return execution(
    spawnSync(process.execPath, [entry, ...args], { cwd, encoding: "utf8" }),
  );
}

export function runPackedCommandShim(
  shim: string,
  args: string[],
  cwd: string,
) {
  if (process.platform !== "win32") {
    throw new Error("The packed command shim is only available on Windows.");
  }
  if (args.some((arg) => /[&|<>()^%!"]/u.test(arg))) {
    throw new Error(
      "Windows packed command shim arguments must be shell-safe.",
    );
  }
  const quote = (value: string) => `\"${value.replaceAll('\"', '\"\"')}\"`;
  return execution(
    spawnSync([quote(shim), ...args.map(quote)].join(" "), {
      cwd,
      encoding: "utf8",
      shell: true,
    }),
  );
}
