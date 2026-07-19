#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { doctorProject, nodeFileSystem } from "../../application/dist/index.js";
import { startLocalDaemon } from "./index.js";

function value(args: readonly string[], flag: string): string {
  const index = args.indexOf(flag);
  const candidate = index < 0 ? undefined : args[index + 1];
  if (candidate === undefined || candidate.startsWith("--"))
    throw new Error(`missing ${flag}`);
  return candidate;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const endpoint = value(args, "--endpoint");
  const tokenFile = value(args, "--token-file");
  const catalogRoot = value(args, "--catalog-root");
  const tokenStats = await stat(tokenFile);
  if (!tokenStats.isFile())
    throw new Error("token file must be a regular file");
  if (process.platform !== "win32" && (tokenStats.mode & 0o077) !== 0)
    throw new Error(
      "token file must not be accessible to group or other users",
    );
  const sessionToken = (await readFile(tokenFile, "utf8")).trim();
  const daemon = await startLocalDaemon({
    endpoint,
    sessionToken,
    doctor: async (request) => {
      const report = await doctorProject(
        {
          root: resolve(request.params.root),
          profile: request.params.profile,
          adapters: request.params.adapters as never,
          dryRun: true,
          catalogRoot,
        },
        nodeFileSystem,
      );
      return {
        findings: report.findings.map(
          ({ code, severity, category, path, message }) => ({
            code,
            severity,
            category,
            path,
            message,
          }),
        ),
        diagnostics: report.diagnostics,
        exitCode: report.findings.some(
          (finding) => finding.severity === "error",
        )
          ? 3
          : 0,
      };
    },
  });
  const stop = () => void daemon.close().then(() => process.exit(0));
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
}

void main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : "daemon startup failed"}\n`,
  );
  process.exitCode = 2;
});
