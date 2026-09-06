import type { NeutronRuntimeSession } from "../../protocol/src/neutron-runtime.js";

export type NeutronAbortKind = "cancelled" | "timeout" | "lease-lost";

export function isNeutronSessionCancelled(
  session: NeutronRuntimeSession,
  signal?: AbortSignal,
): boolean {
  return session.state === "cancelled" || signal?.aborted === true;
}

export function neutronAbortKind(
  signal?: AbortSignal,
): NeutronAbortKind | null {
  if (signal?.aborted !== true) return null;
  const reason = signal.reason;
  if (reason === "timeout" || isCoded(reason, "timeout")) return "timeout";
  if (reason === "lease-lost" || isCoded(reason, "lease-lost")) {
    return "lease-lost";
  }
  return "cancelled";
}

export function composeNeutronAbortSignals(
  signals: readonly (AbortSignal | undefined)[],
): AbortSignal | undefined {
  const active = signals.filter((signal): signal is AbortSignal => {
    return signal !== undefined;
  });
  if (active.length === 0) return undefined;
  if (active.length === 1) return active[0];
  return AbortSignal.any(active);
}

function isCoded(value: unknown, code: string): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    (value as { code: unknown }).code === code
  );
}
