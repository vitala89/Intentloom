import type {
  NeutronMutationPreflightRejectionReason,
  NeutronMutationPreflightRequest,
} from "../../protocol/src/neutron-mutation.js";
import type { NeutronRuntimeSession } from "../../protocol/src/neutron-runtime.js";
import { validateNeutronRuntimeSession } from "../../validator/src/neutron-runtime.js";
import { validateNeutronMutationPreflightRequest } from "../../validator/src/neutron-mutation.js";
import {
  buildNeutronMutationPreflightOutcome,
  type NeutronMutationPreflightOutcome,
} from "./neutron-mutation-diagnostics.js";

const FALLBACK_DIGEST = `sha256:${"0".repeat(64)}`;

export function parseNeutronMutationPreflightRequest(value: unknown): {
  readonly request?: NeutronMutationPreflightRequest;
  readonly reason?: NeutronMutationPreflightRejectionReason;
} {
  try {
    return { request: validateNeutronMutationPreflightRequest(value) };
  } catch {
    return { reason: "invalid-approval" };
  }
}

export function parseNeutronMutationPreflightSession(
  session: NeutronRuntimeSession | undefined,
): {
  readonly value?: NeutronRuntimeSession;
  readonly reason?: NeutronMutationPreflightRejectionReason;
} {
  if (session === undefined) return {};
  try {
    return { value: validateNeutronRuntimeSession(session) };
  } catch {
    return { reason: "invalid-approval" };
  }
}

export function neutronMutationUnknownIds(request: unknown): {
  readonly proposalDigest: string;
  readonly approvalId: string;
} {
  if (typeof request !== "object" || request === null) {
    return { proposalDigest: FALLBACK_DIGEST, approvalId: "invalid-approval" };
  }
  const record = request as Record<string, unknown>;
  return {
    proposalDigest: readDigest(record.proposal, "proposalDigest"),
    approvalId: readId(record.approval, "approvalId"),
  };
}

export function rejectedNeutronMutationOutcome(
  ids: { readonly proposalDigest: string; readonly approvalId: string },
  affectedPaths: readonly string[],
  capabilityClass: "host" | "denied",
  checkedAt: number,
  reasons: readonly NeutronMutationPreflightRejectionReason[],
): NeutronMutationPreflightOutcome {
  return buildNeutronMutationPreflightOutcome({
    decision: "rejected",
    reasons,
    ...ids,
    affectedPaths,
    capabilityClass,
    checkedAt,
  });
}

function readDigest(container: unknown, field: string): string {
  if (typeof container !== "object" || container === null) {
    return FALLBACK_DIGEST;
  }
  const value = (container as Record<string, unknown>)[field];
  return typeof value === "string" && /^sha256:[0-9a-f]{64}$/u.test(value)
    ? value
    : FALLBACK_DIGEST;
}

function readId(container: unknown, field: string): string {
  if (typeof container !== "object" || container === null) {
    return "invalid-approval";
  }
  const value = (container as Record<string, unknown>)[field];
  return typeof value === "string" && value.length > 0
    ? value
    : "invalid-approval";
}
