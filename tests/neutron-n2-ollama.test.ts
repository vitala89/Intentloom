import { createServer, type IncomingMessage, type Server } from "node:http";
import { describe, expect, it } from "vitest";
import {
  createMemoryFileSystem,
  inspectProject,
} from "../packages/application/src/index.js";
import { runNeutronN2ReadOnlyLoop } from "../packages/application/src/neutron-n2-loop.js";
import { OllamaModelAdapter } from "../packages/application/src/ollama-model-adapter.js";
import { NeutronN2Error } from "../packages/validator/src/neutron-runtime-n2.js";
import { discloseNeutronN2Network } from "../packages/validator/src/neutron-runtime-n2.js";

describe("Neutron N2 Ollama adapter", () => {
  it("refuses a non-loopback base URL", () => {
    expect(() => constructAdapter("http://8.8.8.8:11434")).toThrow(
      NeutronN2Error,
    );
    expect(() => constructAdapter("https://example.com")).toThrow(
      NeutronN2Error,
    );
    expect(caughtCode("https://example.com")).toBe("network-forbidden");
  });

  it("discloses scheme, host, and port without credentials", () => {
    expect(discloseNeutronN2Network("http://127.0.0.1:11434")).toEqual({
      scheme: "http",
      host: "127.0.0.1",
      port: "11434",
      networkMode: "explicit-egress",
    });
  });

  it("maps an unreachable loopback daemon to adapter-unconfigured", async () => {
    const adapter = new OllamaModelAdapter({
      baseUrl: "http://127.0.0.1:1",
    });
    await expect(
      adapter.executeTurn({
        schemaVersion: 1,
        sessionId: "session-down",
        messages: [{ role: "user", content: "inspect" }],
      }),
    ).rejects.toMatchObject({ code: "adapter-unconfigured" });
  });

  it("runs inspect through a fake Ollama and leaves project bytes unchanged", async () => {
    const server = await listenFakeOllama();
    const fs = createMemoryFileSystem({
      "/project/package.json": JSON.stringify({
        devDependencies: { typescript: "5.0.0" },
      }),
      "/project/README.md": "safe",
    });
    const before = fingerprint(fs);
    const adapter = new OllamaModelAdapter({
      baseUrl: `http://127.0.0.1:${String(server.port)}`,
      modelId: "fixture-model",
    });

    const result = await runNeutronN2ReadOnlyLoop({
      root: "/project",
      sessionId: "session-n2",
      projectId: "project-n2",
      prompt: "Inspect this project",
      adapter,
      runTool: async (toolName, args) => {
        expect(toolName).toBe("inspect");
        expect(args.root).toBe("/project");
        return inspectProject("/project", fs);
      },
      fingerprintProject: async () => fingerprint(fs),
    });

    expect(result.session.mutationAllowed).toBe(false);
    expect(result.adapter.providerKind).toBe("ollama");
    expect(result.adapter.networkMode).toBe("explicit-egress");
    expect(result.tool.invocation.toolName).toBe("inspect");
    expect(result.responseText).toBe("Inspection complete");
    expect(result.projectFingerprintAfter).toBe(before);
    expect(fingerprint(fs)).toBe(before);
    await server.close();
  });

  it("rejects a write-capable tool name from the model", async () => {
    const server = await listenFakeOllama({ toolName: "apply" });
    const adapter = new OllamaModelAdapter({
      baseUrl: `http://127.0.0.1:${String(server.port)}`,
    });
    await expect(
      runNeutronN2ReadOnlyLoop({
        root: "/project",
        sessionId: "session-apply",
        projectId: "project-n2",
        prompt: "apply changes",
        adapter,
        runTool: async () => {
          throw new Error("must not run");
        },
        fingerprintProject: async () => "x",
      }),
    ).rejects.toMatchObject({ code: "unsupported-tool" });
    await server.close();
  });
});

function fingerprint(fs: { files: Map<string, string> }): string {
  return [...fs.files.entries()]
    .toSorted(([left], [right]) => left.localeCompare(right))
    .map(([path, content]) => `${path}:${content}`)
    .join("\n");
}

function constructAdapter(baseUrl: string): OllamaModelAdapter {
  return new OllamaModelAdapter({ baseUrl });
}

function caughtCode(baseUrl: string): string | undefined {
  try {
    constructAdapter(baseUrl);
    return undefined;
  } catch (error) {
    return error instanceof NeutronN2Error ? error.code : undefined;
  }
}

async function listenFakeOllama(
  options: { toolName?: string } = {},
): Promise<{ port: number; close: () => Promise<void> }> {
  const server: Server = createServer((req, res) => {
    void readBody(req).then((body) => {
      const payload = JSON.parse(body) as {
        messages?: readonly { role?: string }[];
      };
      const hasTool = payload.messages?.some(
        (message) => message.role === "tool",
      );
      const message = hasTool
        ? { role: "assistant", content: "Inspection complete", tool_calls: [] }
        : {
            role: "assistant",
            content: "",
            tool_calls: [
              {
                id: "call-inspect",
                function: {
                  name: options.toolName ?? "inspect",
                  arguments: { root: "/project" },
                },
              },
            ],
          };
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ message }));
    });
  });
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("expected TCP address");
  }
  return {
    port: address.port,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}
