export const NEUTRON_RUNTIME_SESSION_SCHEMA_URN =
  "urn:intentloom:schema:neutron-runtime-session:1" as const;
export const NEUTRON_ADAPTER_CAPABILITY_SCHEMA_URN =
  "urn:intentloom:schema:neutron-adapter-capability:1" as const;
export const NEUTRON_CONTEXT_BUNDLE_SCHEMA_URN =
  "urn:intentloom:schema:neutron-context-bundle:1" as const;
export const NEUTRON_TOOL_ENVELOPE_SCHEMA_URN =
  "urn:intentloom:schema:neutron-tool-envelope:1" as const;
export const NEUTRON_TASK_GRAPH_SCHEMA_URN =
  "urn:intentloom:schema:neutron-task-graph:1" as const;
export const NEUTRON_SUBAGENT_RESULT_SCHEMA_URN =
  "urn:intentloom:schema:neutron-subagent-result:1" as const;
export const NEUTRON_USAGE_BUDGET_SCHEMA_URN =
  "urn:intentloom:schema:neutron-usage-budget:1" as const;
export const NEUTRON_CONTEXT_ASSEMBLY_REQUEST_SCHEMA_URN =
  "urn:intentloom:schema:neutron-context-assembly-request:1" as const;
export const NEUTRON_RUNTIME_EVENT_SCHEMA_URN =
  "urn:intentloom:schema:neutron-runtime-event:1" as const;

export const NEUTRON_SESSION_STATES = [
  "created",
  "discussing",
  "inspecting",
  "planning",
  "cancelled",
  "timed-out",
  "failed",
  "completed",
] as const;
export type NeutronSessionState = (typeof NEUTRON_SESSION_STATES)[number];

export const NEUTRON_NETWORK_MODES = ["offline", "explicit-egress"] as const;
export type NeutronNetworkMode = (typeof NEUTRON_NETWORK_MODES)[number];

export const NEUTRON_DATA_HANDLING_MODES = ["ephemeral", "retained"] as const;
export type NeutronDataHandlingMode =
  (typeof NEUTRON_DATA_HANDLING_MODES)[number];

export const NEUTRON_READ_ONLY_TOOLS = [
  "inspect",
  "doctor",
  "memorySearch",
  "timeline",
  "conformance",
  "securityAudit",
  "projectDiff",
] as const;
export type NeutronReadOnlyTool = (typeof NEUTRON_READ_ONLY_TOOLS)[number];

export const NEUTRON_TASK_STATES = [
  "pending",
  "ready",
  "running",
  "blocked",
  "cancelled",
  "timed-out",
  "failed",
  "completed",
] as const;
export type NeutronTaskState = (typeof NEUTRON_TASK_STATES)[number];

export const NEUTRON_EVENT_KINDS = [
  "progress",
  "cancellation",
  "timeout",
  "error",
] as const;
export type NeutronEventKind = (typeof NEUTRON_EVENT_KINDS)[number];

export const NEUTRON_SKILL_LOADING_LEVELS = [
  "catalog",
  "contract",
  "procedure",
] as const;
export type NeutronSkillLoadingLevel =
  (typeof NEUTRON_SKILL_LOADING_LEVELS)[number];

export const NEUTRON_DELEGATED_AGENT_ROLES = [
  "context-scout",
  "feature-builder",
  "test-engineer",
  "reviewer",
  "release-analyst",
] as const;
export type NeutronDelegatedAgentRole =
  (typeof NEUTRON_DELEGATED_AGENT_ROLES)[number];

export const NEUTRON_CONTEXT_SOURCE_TYPES = [
  "intent",
  "adr",
  "documentation",
  "ownership",
  "evidence",
  "provisional",
] as const;
export type NeutronContextSourceType =
  (typeof NEUTRON_CONTEXT_SOURCE_TYPES)[number];

export const NEUTRON_ERROR_CODES = [
  "validation-failed",
  "root-mismatch",
  "unsupported-tool",
  "cancelled",
  "timeout",
  "budget-exceeded",
  "adapter-unconfigured",
  "network-forbidden",
] as const;
export type NeutronErrorCode = (typeof NEUTRON_ERROR_CODES)[number];

export interface NeutronRuntimeSession {
  readonly schemaVersion: typeof NEUTRON_RUNTIME_SESSION_SCHEMA_URN;
  readonly sessionId: string;
  readonly root: string;
  readonly projectId: string;
  readonly state: NeutronSessionState;
  readonly mutationAllowed: false;
  readonly createdAt: string;
}

export interface NeutronAdapterCapability {
  readonly schemaVersion: typeof NEUTRON_ADAPTER_CAPABILITY_SCHEMA_URN;
  readonly providerKind: "deterministic-test" | "unconfigured" | "ollama";
  readonly modelId: string;
  readonly supportsStreaming: boolean;
  readonly supportsToolCalls: boolean;
  readonly networkMode: NeutronNetworkMode;
  readonly dataHandling: NeutronDataHandlingMode;
  readonly credentialIsolation: "outside-project-metadata";
}

export interface NeutronContextSource {
  readonly sourceId: string;
  readonly kind:
    "inspect" | "memory" | "skill" | "policy" | "evidence" | "task";
  readonly trustClass: "project" | "catalog" | "user" | "derived";
  readonly provenance: string;
  readonly included: boolean;
  readonly exclusionReason?: string;
  /** Project-relative normalized path when the source maps to a file. */
  readonly path?: string;
  /** SHA-256 digest of normalized excerpt bytes: `sha256:<64 lowercase hex>`. */
  readonly contentDigest?: string;
  readonly loadingLevel?: NeutronSkillLoadingLevel;
}

export interface AssembleNeutronContextRequest {
  readonly schemaVersion: typeof NEUTRON_CONTEXT_ASSEMBLY_REQUEST_SCHEMA_URN;
  readonly root: string;
  readonly sessionId: string;
  readonly projectId: string;
  readonly taskId?: string;
  readonly query?: string;
  readonly profileName?: string;
  readonly role?: NeutronDelegatedAgentRole;
  readonly skillLevel?: NeutronSkillLoadingLevel;
  readonly maxTokens?: number;
  readonly maxItems?: number;
  readonly sourceTypes?: readonly NeutronContextSourceType[];
  readonly includeMemory?: boolean;
  readonly semanticRanking?: boolean;
}

export interface NeutronContextBundle {
  readonly schemaVersion: typeof NEUTRON_CONTEXT_BUNDLE_SCHEMA_URN;
  readonly root: string;
  readonly sessionId: string;
  readonly estimatedTokens: number;
  readonly sources: readonly NeutronContextSource[];
  readonly excludedSecretLikePaths: readonly string[];
}

export interface NeutronToolInvocation {
  readonly invocationId: string;
  readonly toolName: NeutronReadOnlyTool;
  readonly root: string;
  readonly sessionId: string;
  readonly argumentsJson: string;
  readonly timeoutMs: number;
}

export interface NeutronToolResult {
  readonly invocationId: string;
  readonly ok: boolean;
  readonly payloadJson: string | null;
  readonly errorCode: NeutronErrorCode | null;
}

export interface NeutronToolEnvelope {
  readonly schemaVersion: typeof NEUTRON_TOOL_ENVELOPE_SCHEMA_URN;
  readonly invocation: NeutronToolInvocation;
  readonly result: NeutronToolResult;
}

export interface NeutronTaskNode {
  readonly taskId: string;
  readonly parentId: string | null;
  readonly dependencies: readonly string[];
  readonly role: string;
  readonly requiredCapabilities: readonly string[];
  readonly state: NeutronTaskState;
  readonly expectedOutput: string;
}

export interface NeutronTaskGraph {
  readonly schemaVersion: typeof NEUTRON_TASK_GRAPH_SCHEMA_URN;
  readonly root: string;
  readonly sessionId: string;
  readonly nodes: readonly NeutronTaskNode[];
}

export interface NeutronSubagentResult {
  readonly schemaVersion: typeof NEUTRON_SUBAGENT_RESULT_SCHEMA_URN;
  readonly taskId: string;
  readonly sessionId: string;
  readonly root: string;
  readonly status: "completed" | "failed" | "cancelled";
  readonly outputDigest: string;
  readonly mutationAttempted: false;
}

export interface NeutronUsageBudget {
  readonly schemaVersion: typeof NEUTRON_USAGE_BUDGET_SCHEMA_URN;
  readonly sessionId: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly contextTokens: number;
  readonly tokenBudget: number;
  readonly limitExceeded: boolean;
}

export interface NeutronRuntimeEvent {
  readonly schemaVersion: typeof NEUTRON_RUNTIME_EVENT_SCHEMA_URN;
  readonly sessionId: string;
  readonly kind: NeutronEventKind;
  readonly code: NeutronErrorCode | null;
  readonly message: string;
}

export interface NeutronRuntimeContractSnapshot {
  readonly session: NeutronRuntimeSession;
  readonly adapter: NeutronAdapterCapability;
  readonly context: NeutronContextBundle;
  readonly tool: NeutronToolEnvelope;
  readonly graph: NeutronTaskGraph;
  readonly subagent: NeutronSubagentResult;
  readonly usage: NeutronUsageBudget;
  readonly event: NeutronRuntimeEvent;
}
