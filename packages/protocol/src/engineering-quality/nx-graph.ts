export const QUALITY_NX_GRAPH_SCHEMA_URN =
  "urn:intentloom:schema:engineering-nx-graph:v1" as const;

export const QUALITY_NX_BOUNDARY_RULE_SCHEMA_URN =
  "urn:intentloom:schema:engineering-nx-boundary-rule:v1" as const;

export type NxGraphAcquisitionMode =
  "cached-graph" | "project-metadata" | "bounded-export" | "unsupported";

export interface NxTargetDefinition {
  readonly executor?: string;
  readonly options?: Record<string, unknown>;
  readonly dependsOn?: readonly string[];
}

export interface NxProjectDefinition {
  readonly name: string;
  readonly root: string;
  readonly projectType?: "application" | "library";
  readonly tags?: readonly string[];
  readonly targets?: Record<string, NxTargetDefinition>;
  readonly implicitDependencies?: readonly string[];
  readonly dependencies?: readonly string[];
}

export interface NxWorkspaceMetadata {
  readonly schemaUrn: typeof QUALITY_NX_GRAPH_SCHEMA_URN;
  readonly workspaceRoot: string;
  readonly nxVersion?: string;
  readonly defaultBase?: string;
  readonly projects: Record<string, NxProjectDefinition>;
  readonly acquisitionMode: NxGraphAcquisitionMode;
}

export interface NxBoundaryConstraint {
  readonly sourceTag: string;
  readonly onlyDependOnLibsWithTags?: readonly string[];
  readonly bannedExternalImports?: readonly string[];
  readonly notDependOnLibsWithTags?: readonly string[];
}

export interface NxBoundaryRule {
  readonly schemaUrn: typeof QUALITY_NX_BOUNDARY_RULE_SCHEMA_URN;
  readonly ruleId: string;
  readonly constraints: readonly NxBoundaryConstraint[];
}

export interface NxDependencyCause {
  readonly sourceProject: string;
  readonly targetProject: string;
  readonly causeType:
    "explicit-import" | "implicit-dependency" | "task-dependency";
  readonly sourceFile?: string;
}

export interface NxGraphFinding {
  readonly ruleId: string;
  readonly sourceProject: string;
  readonly targetProject: string;
  readonly cause: NxDependencyCause;
  readonly message: string;
  readonly severity: "warning" | "error";
}
