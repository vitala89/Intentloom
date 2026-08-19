import { createConnection } from "node:net";
import { createHash, randomUUID } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import {
  createExistingProjectAdoptionPlanRequest,
  createExistingProjectAdoptionPrepareRequest,
  createExistingProjectAdoptionRevalidateRequest,
  parseExistingProjectAdoptionPlanViewModel,
  parseExistingProjectAdoptionPrepareViewModel,
  parseExistingProjectAdoptionRevalidateViewModel,
} from "@intentloom/protocol";
import { handleExistingProjectAdoptionPlan } from "../packages/daemon/src/existing-project-handlers.js";
import {
  handleExistingProjectAdoptionPrepare,
  handleExistingProjectAdoptionRevalidate,
} from "../packages/daemon/src/existing-project-prepared-plan-handlers.js";
import { startLocalDaemon } from "../packages/daemon/src/index.js";

const daemons: { close(): Promise<void> }[] = [];

afterEach(async () => {
  await Promise.all(daemons.splice(0).map((daemon) => daemon.close()));
});

async function writeTree(
  baseDirectory: string,
  tree: Readonly<Record<string, string>>,
): Promise<void> {
  for (const [relativePath, content] of Object.entries(tree)) {
    const absolutePath = join(baseDirectory, relativePath);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, content, "utf8");
  }
}

async function digestTree(directory: string): Promise<string> {
  const hash = createHash("sha256");
  const walk = async (current: string): Promise<void> => {
    const entries = (await readdir(current, { withFileTypes: true })).sort(
      (left, right) => left.name.localeCompare(right.name),
    );
    for (const entry of entries) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) {
        hash.update(`dir:${path.slice(directory.length)}`);
        await walk(path);
        continue;
      }
      hash.update(`file:${path.slice(directory.length)}`);
      hash.update(await readFile(path));
    }
  };
  await walk(directory);
  return hash.digest("hex");
}

function rawRequest(
  endpoint: string,
  request: object,
  token: string,
): Promise<unknown> {
  return new Promise((resolvePromise, reject) => {
    const socket = createConnection(endpoint);
    let output = "";
    socket.once("connect", () =>
      socket.write(`${JSON.stringify({ token, request })}\n`),
    );
    socket.on("data", (chunk) => (output += chunk.toString()));
    socket.once("error", reject);
    socket.once("end", () => resolvePromise(JSON.parse(output)));
  });
}

function daemonEndpoint(directory: string): string {
  return process.platform === "win32"
    ? `\\\\.\\pipe\\il-ap-d-${process.pid}-${randomUUID()}`
    : join(directory, "daemon.sock");
}

const tree = {
  "nx.json": "{}",
  "package.json": JSON.stringify({
    devDependencies: { nx: "21.0.0", typescript: "5.8.0" },
  }),
  "tsconfig.json": "{}",
  "README.md": "vii workspace\n",
  "AGENTS.md": "project agents\n",
  ".github/workflows/validate.yml": "name: validate\n",
};

describe("existing-project adoption prepared-plan daemon RPC", () => {
  it("prepares and revalidates without mutating the project", async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), "il-ap-d-root-"));
    await writeTree(projectRoot, tree);
    const before = await digestTree(projectRoot);
    const directory = await mkdtemp(join(tmpdir(), "il-ap-d-ep-"));
    const token = "a".repeat(32);
    const daemon = await startLocalDaemon({
      endpoint: daemonEndpoint(directory),
      sessionToken: token,
      enforceCanonicalRoots: false,
      existingProjectAdoptionPlan: handleExistingProjectAdoptionPlan,
      existingProjectAdoptionPrepare: handleExistingProjectAdoptionPrepare,
      existingProjectAdoptionRevalidate:
        handleExistingProjectAdoptionRevalidate,
    });
    daemons.push(daemon);
    const plan = parseExistingProjectAdoptionPlanViewModel(
      (
        (await rawRequest(
          daemon.endpoint,
          createExistingProjectAdoptionPlanRequest(1, projectRoot, "vii-like"),
          token,
        )) as { result: { viewmodel: unknown } }
      ).result.viewmodel,
    );
    const prepared = parseExistingProjectAdoptionPrepareViewModel(
      (
        (await rawRequest(
          daemon.endpoint,
          createExistingProjectAdoptionPrepareRequest(
            2,
            projectRoot,
            plan.previewIdentity,
            [{ path: "AGENTS.md", kind: "keep-project-owned" }],
            "vii-like",
          ),
          token,
        )) as { result: { viewmodel: unknown } }
      ).result.viewmodel,
    );
    expect(prepared.status).toBe("prepared");
    expect(prepared.approved).toBe(false);
    expect(prepared.changesApplied).toBe(0);
    const revalidated = parseExistingProjectAdoptionRevalidateViewModel(
      (
        (await rawRequest(
          daemon.endpoint,
          createExistingProjectAdoptionRevalidateRequest(
            3,
            projectRoot,
            prepared.plan!,
          ),
          token,
        )) as { result: { viewmodel: unknown } }
      ).result.viewmodel,
    );
    expect(revalidated.status).toBe("valid");
    expect(await digestTree(projectRoot)).toBe(before);
    await writeFile(join(projectRoot, "AGENTS.md"), "changed\n", "utf8");
    const stale = parseExistingProjectAdoptionRevalidateViewModel(
      (
        (await rawRequest(
          daemon.endpoint,
          createExistingProjectAdoptionRevalidateRequest(
            4,
            projectRoot,
            prepared.plan!,
          ),
          token,
        )) as { result: { viewmodel: unknown } }
      ).result.viewmodel,
    );
    expect(stale.status).toBe("stale");
    await rm(projectRoot, { recursive: true, force: true });
    await rm(directory, { recursive: true, force: true });
  });

  it("fails closed when prepare is not enabled", async () => {
    const directory = await mkdtemp(join(tmpdir(), "il-ap-d-un-"));
    const token = "b".repeat(32);
    const daemon = await startLocalDaemon({
      endpoint: daemonEndpoint(directory),
      sessionToken: token,
      enforceCanonicalRoots: false,
    });
    daemons.push(daemon);
    const response = await rawRequest(
      daemon.endpoint,
      createExistingProjectAdoptionPrepareRequest(
        2,
        "/tmp/project",
        "a".repeat(64),
        [{ path: "AGENTS.md", kind: "keep-project-owned" }],
      ),
      token,
    );
    expect((response as { error?: { code?: number } }).error?.code).toBe(
      -32601,
    );
    await rm(directory, { recursive: true, force: true });
  });
});
