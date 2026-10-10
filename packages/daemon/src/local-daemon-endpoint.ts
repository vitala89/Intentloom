import type { Server, Socket } from "node:net";

export interface LocalDaemonEndpoint {
  readonly endpoint: string;
  close(): Promise<void>;
}

// The close handle exists before bind so a caller can install SIGINT and
// SIGTERM handling while the endpoint is still absent.
export async function listenLocalDaemonEndpoint(input: {
  readonly server: Server;
  readonly sockets: ReadonlySet<Socket>;
  readonly endpoint: string;
  readonly shutdownTimeoutMs?: number;
  readonly beforeListen?: (daemon: LocalDaemonEndpoint) => void;
}): Promise<LocalDaemonEndpoint> {
  let closePromise: Promise<void> | undefined;
  let shutdownRequested = false;
  const daemon: LocalDaemonEndpoint = {
    endpoint: input.endpoint,
    close() {
      shutdownRequested = true;
      closePromise ??= input.server.listening
        ? closeOwnedDaemonEndpoint(input)
        : Promise.resolve();
      return closePromise;
    },
  };
  input.beforeListen?.(daemon);
  if (shutdownRequested) return daemon;
  await new Promise<void>((resolve, reject) => {
    input.server.once("error", reject);
    input.server.listen(input.endpoint, () => {
      input.server.off("error", reject);
      resolve();
    });
  });
  return daemon;
}

function closeOwnedDaemonEndpoint(input: {
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
