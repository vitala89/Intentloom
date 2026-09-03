export const NEUTRON_SCHEDULER_ERROR_CODES = [
  "validation-failed",
  "cycle-detected",
  "missing-dependency",
  "duplicate-task-id",
  "duplicate-dependency",
  "self-dependency",
  "invalid-parent",
  "invalid-transition",
  "invalid-concurrency",
] as const;

export type NeutronSchedulerErrorCode =
  (typeof NEUTRON_SCHEDULER_ERROR_CODES)[number];

export interface NeutronSchedulerErrorDetails {
  readonly taskId?: string;
  readonly dependencyId?: string;
  readonly cyclePath?: readonly string[];
  readonly fromState?: string;
  readonly toState?: string;
}

export class NeutronSchedulerError extends Error {
  readonly code: NeutronSchedulerErrorCode;
  readonly details: NeutronSchedulerErrorDetails;

  constructor(
    code: NeutronSchedulerErrorCode,
    message: string,
    details: NeutronSchedulerErrorDetails = {},
  ) {
    super(message);
    this.name = "NeutronSchedulerError";
    this.code = code;
    this.details = details;
  }
}
