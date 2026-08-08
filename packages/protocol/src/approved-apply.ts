export interface ApprovedApplyPlan {
  readonly schemaVersion: 1;
  readonly planDigest: string;
  readonly projectStateDigest: string;
  readonly targetRoot: string;
  readonly changedPaths: readonly string[];
  readonly expiresAt?: number;
}

export interface ApprovedApplyRequest {
  readonly schemaVersion: 1;
  readonly targetResourceId: string;
  readonly plan: ApprovedApplyPlan;
  readonly grantedApprovals: readonly string[];
}

export interface ApprovedApplyResult {
  readonly schemaVersion: 1;
  readonly targetResourceId: string;
  readonly passed: boolean;
  readonly diagnostics: readonly string[];
  readonly safeNextAction: string;
}

export interface ApprovedApplyRollbackFile {
  readonly path: string;
  readonly previousContent: string | null;
}

export interface ApprovedApplyRollbackEvidence {
  readonly schemaVersion: 1;
  readonly planDigest: string;
  readonly targetRoot: string;
  readonly rollbackFiles: readonly ApprovedApplyRollbackFile[];
}

export interface ApprovedApplyExecutionResult {
  readonly schemaVersion: 1;
  readonly targetResourceId: string;
  readonly applied: boolean;
  readonly gateResult: ApprovedApplyResult;
  readonly rollbackEvidence?: ApprovedApplyRollbackEvidence;
  readonly diagnostics: readonly string[];
}
