import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import type { ProjectBlueprint, BlueprintApproval } from "@intentloom/protocol";
import {
  validateProjectBlueprint,
  validateBlueprintApproval,
} from "@intentloom/validator";

export interface ApproveBlueprintOptions {
  readonly approver?: string;
  readonly ttlMs?: number;
}

export interface ApprovalValidationResult {
  readonly isValid: boolean;
  readonly reason?: string;
}

const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function exportBlueprintYaml(blueprint: ProjectBlueprint): string {
  const validated = validateProjectBlueprint(blueprint);
  return stringifyYaml({
    id: validated.id,
    name: validated.name,
    topology: validated.topology,
    recommendedPacks: validated.recommendedPacks,
    qualityProfile: validated.qualityProfile,
    frameworkNeutral: validated.frameworkNeutral,
    digest: validated.digest,
    alternatives: validated.alternatives,
    createdAt: validated.createdAt,
  });
}

export function parseBlueprintYaml(yamlContent: string): ProjectBlueprint {
  if (typeof yamlContent !== "string" || yamlContent.trim().length === 0) {
    throw new Error("parseBlueprintYaml requires non-empty YAML string");
  }

  const parsed = parseYaml(yamlContent);
  return validateProjectBlueprint(parsed);
}

export function approveBlueprint(
  blueprint: ProjectBlueprint,
  options?: ApproveBlueprintOptions,
): BlueprintApproval {
  const validatedBlueprint = validateProjectBlueprint(blueprint);
  const now = Date.now();
  const ttl = options?.ttlMs ?? DEFAULT_TTL_MS;
  const approver = options?.approver ?? "local-user";

  const approval: BlueprintApproval = {
    blueprintId: validatedBlueprint.id,
    blueprintDigest: validatedBlueprint.digest,
    approver,
    approvedAt: now,
    expiry: now + ttl,
    status: "approved",
  };

  return validateBlueprintApproval(approval);
}

export function revokeBlueprintApproval(
  approval: BlueprintApproval,
): BlueprintApproval {
  const validated = validateBlueprintApproval(approval);
  return validateBlueprintApproval({
    ...validated,
    status: "revoked",
  });
}

export function validateBlueprintApprovalState(
  approval: BlueprintApproval,
  blueprint: ProjectBlueprint,
): ApprovalValidationResult {
  const validatedApproval = validateBlueprintApproval(approval);
  const validatedBlueprint = validateProjectBlueprint(blueprint);

  if (validatedApproval.blueprintId !== validatedBlueprint.id) {
    return {
      isValid: false,
      reason: `Blueprint ID mismatch: approval has '${validatedApproval.blueprintId}', blueprint has '${validatedBlueprint.id}'`,
    };
  }

  if (validatedApproval.blueprintDigest !== validatedBlueprint.digest) {
    return {
      isValid: false,
      reason: `Blueprint digest mismatch: approval digest '${validatedApproval.blueprintDigest}' does not match blueprint digest '${validatedBlueprint.digest}'`,
    };
  }

  if (validatedApproval.status === "revoked") {
    return {
      isValid: false,
      reason: "Blueprint approval has been revoked",
    };
  }

  if (Date.now() > validatedApproval.expiry) {
    return {
      isValid: false,
      reason: "Blueprint approval has expired",
    };
  }

  return { isValid: true };
}
