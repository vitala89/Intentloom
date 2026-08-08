# ADR-0053: Approved Apply transaction engine

## Status

Accepted.

## Context

Intentloom has stabilized its read-only architecture and established external extension lifecycles. Following the `DESKTOP_V0_6_IMPLEMENTATION_PLAN.md`, Phase 7 introduces the "Approved Apply" milestone. Up until this point, the platform and its integrations (such as the Harness Adoption Gate) have operated strictly defensively: reading, evaluating, and isolating execution without mutating the project's canonical root.

However, to provide an "Intent Loop" that safely applies developer-approved or agent-generated changes, the platform must cross the boundary from read-only evaluation to filesystem mutation. Because Intentloom places human agency at the center of its security model, mutation must never happen automatically as a byproduct of model output.

A deterministic, fail-closed transaction engine is required to ensure that:

1. Proposed changes are exactly what is reviewed by the human.
2. Changes are bound to a specific snapshot of the project state to avoid divergence.
3. Every mutation provides atomic rollback capability and deterministic evidence.

## Decision

We will implement the Approved Apply Transaction Engine. It will reside in the core architecture and be enforced before any file mutations are committed.

The architecture consists of three layers:

### 1. Protocol Schemas (`@intentloom/protocol`)

- `ApprovedApplyPlan`: Defines the proposed change. It contains the exact diff (or instructions to reach it), a cryptographic identity (`planDigest`), an `expiresAt` timestamp, and the expected state of the repository (`projectStateDigest`).
- `ApprovedApplyRequest`: Represents the intent to execute the plan. It carries the `plan`, explicit string approvals (e.g., `["atomic-commit-approval"]`), and the execution context (like current capability and ownership constraints).
- `ApprovedApplyResult`: The deterministic result of the security evaluation (`passed: boolean`, diagnostics, and safe next action).

### 2. Validation (`@intentloom/validator`)

- Strict runtime validation of the above schemas to ensure all external data crossing the boundary is structurally sound and follows the `schemaVersion: 1` convention.

### 3. Application Gate (`@intentloom/application`)

- The `evaluateApprovedApplyPlan` gate. Analogous to the `evaluateHarnessAdoptionGate`, this function strictly evaluates the `ApprovedApplyRequest` against the current reality. It guarantees that:
  - The plan is not expired.
  - The requested approvals contain the mandatory capability grants required for mutation (e.g., `atomic-commit-approval`).
  - The `projectStateDigest` requested matches the current canonical root digest, failing if the repository state has diverged.

Once a plan passes `evaluateApprovedApplyPlan`, the transaction engine will write the files, capturing the inverse diff as transactional rollback evidence.

## Consequences

- **Fail-closed**: Any divergence in repository state or expiration of the plan strictly halts mutation.
- **Explicit Approval**: Models or extensions can _propose_ an `ApprovedApplyPlan`, but only a human action explicitly granting the required capability (or an authorized agent operating under pre-granted explicit approval limits) can fulfill the requirements of the gate.
- **Rollback Guarantee**: The transactional apply engine guarantees that a failed apply, or a human requesting a revert, can cleanly roll back using the generated rollback evidence.
