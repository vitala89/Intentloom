import type { Server, Socket } from "node:net";

export interface LocalDaemonEndpoint {
  readonly endpoint: string;
  close(): Promise<void>;
}

export async function listenLocalDaemonEndpoint(input: {
  readonly server: Server;
  readonly sockets: ReadonlySet<Socket>;
  readonly endpoint: string;
  readonly shutdownTimeoutMs?: number;
  readonly beforeListen?: (daemon: LocalDaemonEndpoint) => void;
}): Promise<LocalDaemonEndpoint> {
  let closePromise: Promise<void> | undefined;
  const daemon: LocalDaemonEndpoint = {
    endpoint: input.endpoint,
    close: () => {
      closePromise ??= closeDaemonEndpoint(input);
      return closePromise;
    },
  };
  input.beforeListen?.(daemon);
  await new Promise<void>((resolve, reject) => {
    input.server.once("error", reject);
    input.server.listen(input.endpoint, () => {
      input.server.off("error", reject);
      resolve();
    });
  });
  return daemon;
}

function closeDaemonEndpoint(input: {
  readonly server: Server;
  readonly sockets: ReadonlySet<Socket>;
  readonly shutdownTimeoutMs?: number;
}): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      for (const socket of input.sockets) socket.destroy();
    }, input.shutdownTimeoutMs ?? 5_000);
    input.server.close((error) => {
      clearTimeout(timeout);
      if (error && !timedOut) reject(error);
      else resolve();
    });
  });
}
