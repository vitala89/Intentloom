import {
  createConnection,
  createServer,
  type Server,
  type Socket,
} from "node:net";
import { isAbsolute } from "node:path";
import {
  ProtocolValidationError,
  createDoctorResponse,
  parseDoctorRequest,
  parseDoctorResponse,
  type DoctorRequest,
  type DoctorResult,
} from "../../protocol/src/index.js";

const maxMessageBytes = 1024 * 1024;

export interface DaemonOptions {
  readonly endpoint: string;
  readonly sessionToken: string;
  readonly maxConnections?: number;
  readonly requestTimeoutMs?: number;
  readonly shutdownTimeoutMs?: number;
  readonly doctor: (
    request: DoctorRequest,
  ) => Promise<Omit<DoctorResult, "protocolVersion">>;
}

export interface LocalDaemon {
  readonly endpoint: string;
  close(): Promise<void>;
}

export interface DaemonClientOptions {
  readonly endpoint: string;
  readonly sessionToken: string;
  readonly request: DoctorRequest;
  readonly requestTimeoutMs?: number;
}

function localEndpoint(endpoint: string): boolean {
  return (
    endpoint.length > 0 &&
    (process.platform === "win32"
      ? endpoint.startsWith("\\\\.\\pipe\\")
      : isAbsolute(endpoint))
  );
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
  if (!localEndpoint(options.endpoint))
    throw new Error("endpoint must be an absolute local IPC path");
  const sockets = new Set<Socket>();
  let closePromise: Promise<void> | undefined;
  const server: Server = createServer((socket) => {
    sockets.add(socket);
    socket.setTimeout(options.requestTimeoutMs ?? 30_000, () =>
      socket.destroy(),
    );
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
      if (closePromise !== undefined) return closePromise;
      closePromise = new Promise<void>((resolve, reject) => {
        let timedOut = false;
        const timeout = setTimeout(() => {
          timedOut = true;
          for (const socket of sockets) socket.destroy();
        }, options.shutdownTimeoutMs ?? 5_000);
        server.close((error) => {
          clearTimeout(timeout);
          if (error && !timedOut) reject(error);
          else resolve();
        });
      });
      return closePromise;
    },
  };
}

export async function requestDaemonDoctor(
  options: DaemonClientOptions,
): Promise<DoctorResult> {
  if (!localEndpoint(options.endpoint))
    throw new Error("endpoint must be an absolute local IPC path");
  if (options.sessionToken.length < 32)
    throw new Error("session token is too short");
  return new Promise<DoctorResult>((resolve, reject) => {
    const socket = createConnection(options.endpoint);
    let output = "";
    const fail = (error: Error) => {
      socket.destroy();
      reject(error);
    };
    socket.setTimeout(options.requestTimeoutMs ?? 30_000, () =>
      fail(new Error("daemon request timed out")),
    );
    socket.once("connect", () =>
      socket.write(
        `${JSON.stringify({ token: options.sessionToken, request: options.request })}\n`,
      ),
    );
    socket.on("data", (chunk: Buffer) => {
      output += chunk.toString("utf8");
      if (Buffer.byteLength(output) > maxMessageBytes)
        fail(new Error("daemon response too large"));
    });
    socket.once("error", (error) => reject(error));
    socket.once("end", () => {
      try {
        const line = output.indexOf("\n");
        if (line < 0) throw new Error("daemon returned an incomplete response");
        resolve(parseDoctorResponse(JSON.parse(output.slice(0, line))).result);
      } catch {
        reject(new Error("daemon returned an invalid response"));
      }
    });
  });
}
