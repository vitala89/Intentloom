import type { AgentRoleCapabilities } from "../../protocol/src/index.js";
import {
  NEUTRON_MUTATION_CLASS,
  type NeutronMutationClass,
  type NeutronMutationPreflightRejectionReason,
} from "../../protocol/src/neutron-mutation.js";

export type NeutronMutationAuthorizationInput =
  | {
      readonly kind: "host";
      readonly mutationClass: NeutronMutationClass;
    }
  | {
      readonly kind: "role";
      readonly capabilities: AgentRoleCapabilities;
      readonly role?: string;
    }
  | { readonly kind: "model" }
  | {
      readonly kind: "grantedApprovals";
      readonly grantedApprovals: readonly string[];
    };

export interface NeutronMutationAuthorizationDecision {
  readonly allowed: boolean;
  readonly reason?: Extract<
    NeutronMutationPreflightRejectionReason,
    "capability-denied" | "invalid-approval"
  >;
  readonly capabilityClass: "host" | "denied";
}

export function classifyNeutronMutationRoute(mutationClass: string): {
  readonly mutationClass: string;
  readonly applyAuthorized: false;
  readonly supported: boolean;
} {
  return {
    mutationClass,
    applyAuthorized: false,
    supported: mutationClass === NEUTRON_MUTATION_CLASS,
  };
}

export function resolveNeutronMutationAuthorization(
  authorization: NeutronMutationAuthorizationInput,
  extras?: {
    readonly roleCapabilities?: AgentRoleCapabilities;
    readonly delegatedRole?: string;
  },
): NeutronMutationAuthorizationDecision {
  if (authorization.kind !== "host") {
    return deny(
      authorization.kind === "grantedApprovals"
        ? "invalid-approval"
        : "capability-denied",
    );
  }
  const route = classifyNeutronMutationRoute(authorization.mutationClass);
  if (!route.supported) return deny("capability-denied");
  if (extras?.roleCapabilities?.readOnly === true) {
    return deny("capability-denied");
  }
  if (extras?.delegatedRole !== undefined) return deny("capability-denied");
  return { allowed: true, capabilityClass: "host" };
}

function deny(
  reason: NonNullable<NeutronMutationAuthorizationDecision["reason"]>,
): NeutronMutationAuthorizationDecision {
  return { allowed: false, reason, capabilityClass: "denied" };
}
