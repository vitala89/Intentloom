import type {
  AcceptedException,
  AdoptionPlan,
  ValidationRequirement,
} from "@intentloom/core/adoption";

export interface PlanProjectAdoptionOptions {
  readonly root: string;
  readonly projectId?: string;
  readonly packId?: string;
  readonly packVersion?: string;
  readonly validations?: readonly ValidationRequirement[];
  readonly exceptions?: readonly AcceptedException[];
}

export interface ApplyProjectAdoptionOptions {
  readonly root: string;
  readonly plan: AdoptionPlan;
  readonly dryRun?: boolean;
}

export interface AdoptionApplyResult {
  readonly status:
    "success" | "no-op" | "stale-hash" | "failed" | "rolled-back";
  readonly appliedOperations: readonly string[];
  readonly createdFiles: readonly string[];
  readonly updatedFiles: readonly string[];
  readonly journalEntryId?: string;
  readonly error?: string;
}
