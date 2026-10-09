import { useState } from "react";
import type { DaemonInfoResult } from "@intentloom/protocol";

export interface WorkspaceStatusState {
  readonly connection: string;
  readonly setConnection: (value: string) => void;
  readonly message: string | null;
  readonly setMessage: (value: string | null) => void;
  readonly daemonInfo: DaemonInfoResult | null;
  readonly setDaemonInfo: (value: DaemonInfoResult | null) => void;
}

export function useWorkspaceStatus(): WorkspaceStatusState {
  const [connection, setConnection] = useState("Not connected");
  const [message, setMessage] = useState<string | null>(null);
  const [daemonInfo, setDaemonInfo] = useState<DaemonInfoResult | null>(null);
  return {
    connection,
    setConnection,
    message,
    setMessage,
    daemonInfo,
    setDaemonInfo,
  };
}
