import { spawn } from "node:child_process";
import { chmod, mkdtemp, stat, writeFile } from "node:fs/promises";
import { createConnection } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const children: ReturnType<typeof spawn>[] = [];
afterEach(() => children.splice(0).forEach((child) => child.kill("SIGTERM")));

async function waitForSocket(endpoint: string): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      await stat(endpoint);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
  throw new Error("daemon socket did not appear");
}

async function request(
  endpoint: string,
  token: string,
  root: string,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const socket = createConnection(endpoint);
    let output = "";
    socket.on("connect", () =>
      socket.write(
        `${JSON.stringify({
          token,
          request: {
            jsonrpc: "2.0",
            id: 1,
            method: "intentloom.project.doctor.v1",
            params: {
              protocolVersion: 1,
              root,
              profile: "generic",
              adapters: [],
            },
          },
        })}\n`,
      ),
    );
    socket.on("data", (chunk: Buffer) => {
      output += chunk.toString("utf8");
    });
    socket.on("end", () => resolve(JSON.parse(output)));
    socket.on("error", reject);
  });
}

describe.skipIf(process.platform === "win32")("intentloomd binary", () => {
  it("starts with a token file and stops on SIGTERM", async () => {
    const directory = await mkdtemp(join(tmpdir(), "intentloomd-bin-"));
    const tokenFile = join(directory, "token");
    await writeFile(tokenFile, "d".repeat(32));
    await chmod(tokenFile, 0o600);
    const child = spawn(
      process.execPath,
      [
        resolve("packages/daemon/dist/intentloomd.cjs"),
        "--endpoint",
        join(directory, "daemon.sock"),
        "--token-file",
        tokenFile,
        "--catalog-root",
        resolve("catalog"),
      ],
      { stdio: ["ignore", "ignore", "pipe"] },
    );
    children.push(child);
    let stderr = "";
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    const endpoint = join(directory, "daemon.sock");
    await waitForSocket(endpoint);
    expect({ exitCode: child.exitCode, stderr }).toEqual({
      exitCode: null,
      stderr: "",
    });
    await expect(
      request(endpoint, "d".repeat(32), directory),
    ).resolves.toMatchObject({
      id: 1,
      result: { protocolVersion: 1 },
    });
    child.kill("SIGTERM");
    await new Promise<void>((resolve) => child.once("exit", () => resolve()));
    await expect(stat(endpoint)).rejects.toThrow();
  });
});
