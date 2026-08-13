import { resolve } from "node:path";
import type {
  BoundedExecutionCheckpoint,
  BoundedExecutionGate,
  BoundedExecutionWorkspaceOverview,
} from "@intentloom/protocol";
import {
  BOUNDED_EXECUTION_OPERATIONS,
  BOUNDED_EXECUTION_WORKSPACE_OVERVIEW_SCHEMA_URN,
  type BoundedExecutionOperation,
} from "@intentloom/protocol";
import { validateBoundedExecutionWorkspaceOverview } from "@intentloom/validator";
import type { FileSystem } from "./index.js";
import { applyBoundedExecutionChange } from "./bounded-execution-apply.js";
import { grantBoundedExecutionCapability } from "./bounded-execution-capability.js";
import { executeBoundedCodingAgentTask } from "./bounded-execution-task.js";
import { runBoundedExecutionVerification } from "./bounded-execution-verify.js";
import { prepareFeatureIntentWorkspace } from "./feature-intent-workspace.js";

export interface PrepareBoundedExecutionWorkspaceOptions {
  readonly root: string;
  readonly title: string;
  readonly summary: string;
  readonly projectId?: string;
  readonly now?: () => number;
  readonly planApproval?: string;
  readonly requestedNetworkAccess?: boolean;
  readonly requestedProcessExecution?: boolean;
  readonly requestedAllowedCommands?: readonly string[];
  readonly requestedAllowedPaths?: readonly string[];
  readonly requestedRoot?: string;
  readonly proposedPaths?: readonly string[];
  readonly applyRequested?: boolean;
  readonly grantedApprovals?: readonly string[];
  readonly applyFiles?: readonly {
    readonly path: string;
    readonly content: string;
  }[];
}

function blockedCheckpoints(
  status: BoundedExecutionCheckpoint["status"],
): readonly BoundedExecutionCheckpoint[] {
  return [
    { id: "approve-plan", label: "Approve implementation plan", status },
    {
      id: "grant-capability",
      label: "Grant explicit execution capability",
      status,
    },
    { id: "execute-task", label: "Execute bounded coding-agent task", status },
    {
      id: "verify",
      label: "Run tests, checkers, and architecture checks",
      status,
    },
    { id: "diff-review", label: "Review diff before apply", status },
  ];
}

function advanceGate(
  current: BoundedExecutionGate,
  next: BoundedExecutionGate,
): BoundedExecutionGate {
  if (
    current === "blocked" ||
    current === "unsupported" ||
    current === "w11-blocked" ||
    current === "validation-failed"
  ) {
    return current;
  }
  return next;
}

export async function prepareBoundedExecutionWorkspace(
  options: PrepareBoundedExecutionWorkspaceOptions,
  fs: FileSystem,
): Promise<BoundedExecutionWorkspaceOverview> {
  const root = resolve(options.root);
  if (root.length === 0) {
    throw new Error("root must be a non-empty string");
  }
  const projectId = options.projectId ?? "intentloom-project";
  const preparedAt = options.now ? options.now() : Date.now();
  const now = () => preparedAt;
  const feature = await prepareFeatureIntentWorkspace(
    {
      root,
      title: options.title,
      summary: options.summary,
      projectId,
      now,
    },
    fs,
  );
  const grant = grantBoundedExecutionCapability({
    approvedRoot: root,
    ...(options.requestedRoot !== undefined
      ? { requestedRoot: options.requestedRoot }
      : {}),
    ...(options.requestedAllowedPaths !== undefined
      ? { requestedAllowedPaths: options.requestedAllowedPaths }
      : {}),
    ...(options.requestedAllowedCommands !== undefined
      ? { requestedAllowedCommands: options.requestedAllowedCommands }
      : {}),
    ...(options.requestedNetworkAccess !== undefined
      ? { requestedNetworkAccess: options.requestedNetworkAccess }
      : {}),
    ...(options.requestedProcessExecution !== undefined
      ? { requestedProcessExecution: options.requestedProcessExecution }
      : {}),
    ...(options.planApproval !== undefined
      ? { planApproval: options.planApproval }
      : {}),
  });
  const proposedPaths = options.proposedPaths ?? [];
  const diagnostics = [...grant.diagnostics];
  let gate = grant.gate;
  let harnessScorecardStatus = "not-run";
  let checkpoints = blockedCheckpoints(
    gate === "capability-granted" ? "pending" : "blocked",
  );

  if (gate === "capability-granted") {
    const executed = await executeBoundedCodingAgentTask({
      intentId: feature.intent.id,
      root,
      title: options.title,
      now,
    });
    harnessScorecardStatus = executed.scorecard.status;
    if (
      executed.scorecard.status !== "passed" ||
      executed.agentStatus !== "completed"
    ) {
      gate = "blocked";
      diagnostics.push("bounded-task-failed");
      checkpoints = blockedCheckpoints("failed");
    } else {
      gate = advanceGate(gate, "executed");
      checkpoints = blockedCheckpoints("passed");
    }
  }

  const verification = runBoundedExecutionVerification({
    approvedRoot: root,
    allowedPaths:
      grant.capability.allowedPaths.length > 0
        ? grant.capability.allowedPaths
        : ["."],
    proposedPaths,
    architectureImpact: feature.architectureImpact,
  });
  if (gate === "executed") {
    const checksPassed =
      verification.checkerResults.every((checker) => checker.passed) &&
      verification.diffReview.outsideApprovedPaths.length === 0;
    gate = advanceGate(gate, checksPassed ? "verified" : "blocked");
    if (!checksPassed) diagnostics.push("verification-failed");
  }

  const applyRequested = options.applyRequested === true;
  const apply = applyRequested
    ? await applyBoundedExecutionChange({
        root,
        intentId: feature.intent.id,
        proposedPaths,
        outsideApprovedPaths: verification.diffReview.outsideApprovedPaths,
        grantedApprovals: options.grantedApprovals ?? [],
        applyRequested,
        files: options.applyFiles ?? [],
        fs,
        now,
      })
    : {
        attempted: false,
        applied: false,
        diagnostics: [] as readonly string[],
      };
  if (apply.attempted && !apply.applied) {
    diagnostics.push(...apply.diagnostics);
    if (gate === "verified") gate = "blocked";
  }
  if (apply.applied) {
    gate = "applied";
  }

  return validateBoundedExecutionWorkspaceOverview({
    schemaVersion: BOUNDED_EXECUTION_WORKSPACE_OVERVIEW_SCHEMA_URN,
    root,
    projectId,
    preparedAt,
    intentId: feature.intent.id,
    selectedAlternativeId: feature.plan.selectedAlternativeId,
    executionGate: gate,
    mutationAllowed: gate === "applied",
    capability: {
      ...grant.capability,
      mutationAllowed: gate === "applied",
    },
    checkpoints,
    checkerResults: verification.checkerResults,
    architectureCheck: verification.architectureCheck,
    diffReview: verification.diffReview,
    apply,
    verificationEvidence: [
      `harness:${harnessScorecardStatus}`,
      `architecture:${verification.architectureCheck.passed ? "passed" : "review"}`,
    ],
    diagnostics,
    harnessScorecardStatus,
  });
}

export async function executeBoundedExecutionWorkspace(
  options: PrepareBoundedExecutionWorkspaceOptions,
  fs: FileSystem,
): Promise<BoundedExecutionWorkspaceOverview> {
  return prepareBoundedExecutionWorkspace(options, fs);
}

export function listBoundedExecutionOperations(): readonly BoundedExecutionOperation[] {
  return BOUNDED_EXECUTION_OPERATIONS;
}
