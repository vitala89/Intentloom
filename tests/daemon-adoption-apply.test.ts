import { createConnection } from "node:net";
import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import {
  createExistingProjectAdoptionApplyRequest,
  createExistingProjectAdoptionApproveRequest,
  createExistingProjectAdoptionPlanRequest,
  createExistingProjectAdoptionPrepareRequest,
  parseExistingProjectAdoptionApplyViewModel,
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
import { handleExistingProjectAdoptionApply } from "../packages/daemon/src/existing-project-apply-handlers.js";
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

describe("existing-project adoption apply daemon RPC", () => {
  it("applies an approved plan to a temp project and is ready", async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), "il-ap-d-root-"));
    await writeTree(projectRoot, tree);
    const agents = await readFile(join(projectRoot, "AGENTS.md"), "utf8");
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
      existingProjectAdoptionApprove: handleExistingProjectAdoptionApprove,
      existingProjectAdoptionApply: handleExistingProjectAdoptionApply,
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
    const applied = parseExistingProjectAdoptionApplyViewModel(
      (
        (await rawRequest(
          daemon.endpoint,
          createExistingProjectAdoptionApplyRequest(
            4,
            projectRoot,
            prepared.plan!.preparedPlanId,
            prepared.plan!.planDigest,
            prepared.plan!,
            approved.approval!,
          ),
          token,
        )) as { result: { viewmodel: unknown } }
      ).result.viewmodel,
    );
    expect(applied.status).toBe("applied");
    expect(applied.ready).toBe(true);
    expect(applied.doctor?.errorCount).toBe(0);
    expect(applied.diff?.unmanagedDriftPaths).toEqual([]);
    expect(await readFile(join(projectRoot, "AGENTS.md"), "utf8")).toBe(agents);
    expect(JSON.stringify(applied)).not.toContain("previousContent");
    const replay = parseExistingProjectAdoptionApplyViewModel(
      (
        (await rawRequest(
          daemon.endpoint,
          createExistingProjectAdoptionApplyRequest(
            5,
            projectRoot,
            prepared.plan!.preparedPlanId,
            prepared.plan!.planDigest,
            prepared.plan!,
            approved.approval!,
          ),
          token,
        )) as { result: { viewmodel: unknown } }
      ).result.viewmodel,
    );
    expect(replay.status).toBe("already-applied");
    await rm(projectRoot, { recursive: true, force: true });
    await rm(directory, { recursive: true, force: true });
  });

  it("requires auth and the apply capability", async () => {
    const directory = await mkdtemp(join(tmpdir(), "il-ap-d-un-"));
    const token = "b".repeat(32);
    const daemon = await startLocalDaemon({
      endpoint: daemonEndpoint(directory),
      sessionToken: token,
      enforceCanonicalRoots: false,
      existingProjectAdoptionPrepare: handleExistingProjectAdoptionPrepare,
    });
    daemons.push(daemon);
    const denied = (await rawRequest(
      daemon.endpoint,
      {
        jsonrpc: "2.0",
        id: 1,
        method: "intentloom.existing-project.adoption.apply.v1",
        params: {
          protocolVersion: 1,
          root: "/tmp",
          preparedPlanId: "x",
          planDigest: "b".repeat(64),
        },
      },
      token,
    )) as { error?: { message?: string } };
    expect(denied.error).toBeDefined();
    const unauth = (await rawRequest(
      daemon.endpoint,
      {
        jsonrpc: "2.0",
        id: 2,
        method: "intentloom.daemon.info.v1",
        params: { clientProtocolVersion: 1 },
      },
      "c".repeat(32),
    )) as { error?: { data?: { clientErrorCode?: string } } };
    expect(unauth.error?.data?.clientErrorCode).toBe("authentication_failed");
    await rm(directory, { recursive: true, force: true });
  });
});
