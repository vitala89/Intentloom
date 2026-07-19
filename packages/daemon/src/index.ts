import { createServer, type Server, type Socket } from "node:net";
import { rm } from "node:fs/promises";
import {
  ProtocolValidationError,
  createDoctorResponse,
  parseDoctorRequest,
  type DoctorRequest,
  type DoctorResult,
} from "../../protocol/src/index.js";

const maxMessageBytes = 1024 * 1024;

export interface DaemonOptions {
  readonly endpoint: string;
  readonly sessionToken: string;
  readonly maxConnections?: number;
  readonly doctor: (
    request: DoctorRequest,
  ) => Promise<Omit<DoctorResult, "protocolVersion">>;
}

export interface LocalDaemon {
  readonly endpoint: string;
  close(): Promise<void>;
}

function response(socket: Socket, value: object): void {
  socket.end(`${JSON.stringify(value)}\n`);
}

function failure(
  socket: Socket,
  code: -32600 | -32601 | -32602,
  message: string,
): void {
  response(socket, { jsonrpc: "2.0", id: null, error: { code, message } });
}

export async function startLocalDaemon(
  options: DaemonOptions,
): Promise<LocalDaemon> {
  if (options.sessionToken.length < 32)
    throw new Error("session token is too short");
  if (options.endpoint.length === 0) throw new Error("endpoint is required");
  const sockets = new Set<Socket>();
  const server: Server = createServer((socket) => {
    sockets.add(socket);
    socket.setTimeout(30_000, () => socket.destroy());
    let input = "";
    socket.on("data", async (chunk: Buffer) => {
      input += chunk.toString("utf8");
      if (Buffer.byteLength(input) > maxMessageBytes)
        return failure(socket, -32600, "message too large");
      const line = input.indexOf("\n");
      if (line < 0) return;
      socket.pause();
      try {
        const envelope = JSON.parse(input.slice(0, line)) as {
          token?: unknown;
          request?: unknown;
        };
        if (envelope.token !== options.sessionToken)
          return failure(socket, -32600, "authentication failed");
        const request = parseDoctorRequest(envelope.request);
        response(
          socket,
          createDoctorResponse(request.id, await options.doctor(request)),
        );
      } catch (error) {
        if (error instanceof ProtocolValidationError)
          return failure(socket, error.code, error.message);
        return failure(socket, -32600, "invalid request");
      }
    });
    socket.on("close", () => sockets.delete(socket));
  });
  server.maxConnections = options.maxConnections ?? 16;
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.endpoint, () => {
      server.off("error", reject);
      resolve();
    });
  });
  return {
    endpoint: options.endpoint,
    async close(): Promise<void> {
      for (const socket of sockets) socket.destroy();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      if (process.platform !== "win32")
        await rm(options.endpoint, { force: true });
    },
  };
}
