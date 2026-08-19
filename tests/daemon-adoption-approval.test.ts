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
  createExistingProjectAdoptionApproveRequest,
  createExistingProjectAdoptionPlanRequest,
  createExistingProjectAdoptionPrepareRequest,
  parseExistingProjectAdoptionApproveViewModel,
  parseExistingProjectAdoptionPlanViewModel,
  parseExistingProjectAdoptionPrepareViewModel,
} from "@intentloom/protocol";
import { handleExistingProjectAdoptionPlan } from "../packages/daemon/src/existing-project-handlers.js";
import {
  handleExistingProjectAdoptionApprove,
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
    ? `\\\\.\\pipe\\il-aa-d-${process.pid}-${randomUUID()}`
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

describe("existing-project adoption approve daemon RPC", () => {
  it("approves a revalidated plan without mutating or applying", async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), "il-aa-d-root-"));
    await writeTree(projectRoot, tree);
    const before = await digestTree(projectRoot);
    const directory = await mkdtemp(join(tmpdir(), "il-aa-d-ep-"));
    const token = "a".repeat(32);
    const daemon = await startLocalDaemon({
      endpoint: daemonEndpoint(directory),
      sessionToken: token,
      enforceCanonicalRoots: false,
      existingProjectAdoptionPlan: handleExistingProjectAdoptionPlan,
      existingProjectAdoptionPrepare: handleExistingProjectAdoptionPrepare,
      existingProjectAdoptionRevalidate:
        handleExistingProjectAdoptionRevalidate,
      existingProjectAdoptionApprove: handleExistingProjectAdoptionApprove,
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
    const approved = parseExistingProjectAdoptionApproveViewModel(
      (
        (await rawRequest(
          daemon.endpoint,
          createExistingProjectAdoptionApproveRequest(
            3,
            projectRoot,
            prepared.plan!.preparedPlanId,
            prepared.plan!.planDigest,
            prepared.plan!,
          ),
          token,
        )) as { result: { viewmodel: unknown } }
      ).result.viewmodel,
    );
    expect(approved.status).toBe("approved");
    expect(approved.applied).toBe(false);
    expect(approved.changesApplied).toBe(0);
    expect(await digestTree(projectRoot)).toBe(before);
    await writeFile(join(projectRoot, "AGENTS.md"), "changed\n", "utf8");
    const stale = parseExistingProjectAdoptionApproveViewModel(
      (
        (await rawRequest(
          daemon.endpoint,
          createExistingProjectAdoptionApproveRequest(
            4,
            projectRoot,
            prepared.plan!.preparedPlanId,
            prepared.plan!.planDigest,
            prepared.plan!,
          ),
          token,
        )) as { result: { viewmodel: unknown } }
      ).result.viewmodel,
    );
    expect(stale.status).toBe("denied");
    await rm(projectRoot, { recursive: true, force: true });
    await rm(directory, { recursive: true, force: true });
  });

  it("fails closed without the approve capability and without auth", async () => {
    const directory = await mkdtemp(join(tmpdir(), "il-aa-d-un-"));
    const token = "b".repeat(32);
    const daemon = await startLocalDaemon({
      endpoint: daemonEndpoint(directory),
      sessionToken: token,
      enforceCanonicalRoots: false,
      existingProjectAdoptionPrepare: handleExistingProjectAdoptionPrepare,
      existingProjectAdoptionRevalidate:
        handleExistingProjectAdoptionRevalidate,
    });
    daemons.push(daemon);
    const sample = createExistingProjectAdoptionApproveRequest(
      2,
      "/tmp/project",
      "prepared-plan-aaaaaaaaaaaaaaaaaaaaaaaa",
      "b".repeat(64),
      {
        schemaVersion: 1,
        readOnly: true,
        classification: "read-only",
        applied: false,
        changesApplied: 0,
        approved: false,
        root: "/tmp/project",
        projectId: "vii-like",
        profile: "typescript",
        workspaceTopology: "nx",
        detectedAdapters: [],
        previewIdentity: "a".repeat(64),
        preparedPlanId: "prepared-plan-aaaaaaaaaaaaaaaaaaaaaaaa",
        planDigest: "b".repeat(64),
        projectFingerprint: "c".repeat(64),
        createdAt: 1_700_000_000_000,
        expiresAt: 1_700_000_900_000,
        decisions: [],
        affectedPaths: [],
        plannedActions: [],
        diagnostics: [],
        remainingManualDecisionPaths: [],
      },
    );
    const unsupported = await rawRequest(daemon.endpoint, sample, token);
    expect((unsupported as { error?: { code?: number } }).error?.code).toBe(
      -32601,
    );
    const unauth = await rawRequest(daemon.endpoint, sample, "c".repeat(32));
    expect((unauth as { error?: { code?: number } }).error).toBeTruthy();
    await rm(directory, { recursive: true, force: true });
  });
});
