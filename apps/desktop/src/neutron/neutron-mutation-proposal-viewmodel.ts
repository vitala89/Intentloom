import type { NeutronMutationProposal } from "@intentloom/protocol/neutron-session";

const NEUTRON_MUTATION_PROPOSAL_SCHEMA_URN =
  "urn:intentloom:schema:neutron-mutation-proposal:1" as const;
const NEUTRON_MUTATION_CLASS = "approved-transaction-apply" as const;
import { DesktopBridgeError } from "../desktop-client.js";

const FORBIDDEN_PROPOSAL_KEYS = [
  "approved",
  "mutationAllowed",
  "grantWrite",
  "grantedApprovals",
  "approvalToken",
  "approvalDigest",
  "approvalId",
  "approvalSource",
] as const;

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new DesktopBridgeError(
      `${field} is missing from the Neutron mutation proposal`,
      "bounded_validation_failed",
    );
  }
  return value;
}

function requiredDigest(value: unknown, field: string): string {
  const digest = requiredString(value, field);
  if (!/^sha256:[a-f0-9]{64}$/.test(digest)) {
    throw new DesktopBridgeError(
      `${field} must be a sha256 digest`,
      "bounded_validation_failed",
    );
  }
  return digest;
}

export function parseNeutronMutationProposal(
  value: unknown,
): NeutronMutationProposal | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new DesktopBridgeError(
      "Neutron mutation proposal must be an object",
      "bounded_validation_failed",
    );
  }
  const record = value as Record<string, unknown>;
  for (const key of FORBIDDEN_PROPOSAL_KEYS) {
    if (Object.hasOwn(record, key)) {
      throw new DesktopBridgeError(
        `Neutron mutation proposal must not include ${key}`,
        "bounded_validation_failed",
      );
    }
  }
  if (record.schemaVersion !== NEUTRON_MUTATION_PROPOSAL_SCHEMA_URN) {
    throw new DesktopBridgeError(
      "Unsupported Neutron mutation proposal schema",
      "bounded_validation_failed",
    );
  }
  if (record.mutationClass !== NEUTRON_MUTATION_CLASS) {
    throw new DesktopBridgeError(
      "Neutron mutation proposal class is invalid",
      "bounded_validation_failed",
    );
  }
  const planRaw = record.plan;
  if (
    typeof planRaw !== "object" ||
    planRaw === null ||
    Array.isArray(planRaw)
  ) {
    throw new DesktopBridgeError(
      "Neutron mutation proposal plan is invalid",
      "bounded_validation_failed",
    );
  }
  const planRecord = planRaw as Record<string, unknown>;
  const changedPathsRaw = planRecord.changedPaths;
  if (!Array.isArray(changedPathsRaw)) {
    throw new DesktopBridgeError(
      "Neutron mutation proposal changedPaths is invalid",
      "bounded_validation_failed",
    );
  }
  const changedPaths = changedPathsRaw.map((entry, index) =>
    requiredString(entry, `plan.changedPaths[${index}]`),
  );
  const root = requiredString(record.root, "root");
  const targetRoot = requiredString(planRecord.targetRoot, "plan.targetRoot");
  if (root !== targetRoot) {
    throw new DesktopBridgeError(
      "Neutron mutation proposal root must match plan.targetRoot",
      "bounded_validation_failed",
    );
  }
  const taskId =
    record.taskId === undefined || record.taskId === null
      ? undefined
      : requiredString(record.taskId, "taskId");
  const graphId =
    record.graphId === undefined || record.graphId === null
      ? undefined
      : requiredString(record.graphId, "graphId");
  return {
    schemaVersion: NEUTRON_MUTATION_PROPOSAL_SCHEMA_URN,
    proposalId: requiredString(record.proposalId, "proposalId"),
    sessionId: requiredString(record.sessionId, "sessionId"),
    projectId: requiredString(record.projectId, "projectId"),
    root,
    ...(taskId !== undefined ? { taskId } : {}),
    ...(graphId !== undefined ? { graphId } : {}),
    mutationClass: NEUTRON_MUTATION_CLASS,
    plan: {
      schemaVersion: 1,
      planDigest: requiredDigest(planRecord.planDigest, "plan.planDigest"),
      projectStateDigest: requiredDigest(
        planRecord.projectStateDigest,
        "plan.projectStateDigest",
      ),
      targetRoot,
      changedPaths,
      expiresAt:
        typeof planRecord.expiresAt === "number"
          ? planRecord.expiresAt
          : Number(requiredString(planRecord.expiresAt, "plan.expiresAt")),
    },
    proposalDigest: requiredDigest(record.proposalDigest, "proposalDigest"),
  };
}
