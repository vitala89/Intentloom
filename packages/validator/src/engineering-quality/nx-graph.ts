import type {
  NxBoundaryConstraint,
  NxBoundaryRule,
  NxDependencyCause,
  NxGraphAcquisitionMode,
  NxGraphFinding,
  NxProjectDefinition,
  NxTargetDefinition,
  NxWorkspaceMetadata,
} from "@intentloom/protocol";
import {
  QUALITY_NX_BOUNDARY_RULE_SCHEMA_URN,
  QUALITY_NX_GRAPH_SCHEMA_URN,
} from "@intentloom/protocol";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateNxWorkspaceMetadata(
  input: unknown,
): NxWorkspaceMetadata {
  if (!isRecord(input)) {
    throw new Error("NxWorkspaceMetadata must be an object");
  }

  if (input.schemaUrn !== QUALITY_NX_GRAPH_SCHEMA_URN) {
    throw new Error(
      `Invalid schemaUrn: expected '${QUALITY_NX_GRAPH_SCHEMA_URN}'`,
    );
  }

  if (
    typeof input.workspaceRoot !== "string" ||
    input.workspaceRoot.trim() === ""
  ) {
    throw new Error("workspaceRoot must be a non-empty string");
  }

  const validModes: readonly NxGraphAcquisitionMode[] = [
    "cached-graph",
    "project-metadata",
    "bounded-export",
    "unsupported",
  ];
  if (
    typeof input.acquisitionMode !== "string" ||
    !validModes.includes(input.acquisitionMode as NxGraphAcquisitionMode)
  ) {
    throw new Error(
      `Invalid acquisitionMode: '${String(input.acquisitionMode)}'`,
    );
  }

  if (!isRecord(input.projects)) {
    throw new Error(
      "projects must be a record mapping project names to project definitions",
    );
  }

  const projects: Record<string, NxProjectDefinition> = {};
  for (const [name, proj] of Object.entries(input.projects)) {
    if (!isRecord(proj)) {
      throw new Error(`Project '${name}' must be an object`);
    }
    if (typeof proj.name !== "string" || proj.name.trim() === "") {
      throw new Error(`Project '${name}' must have a non-empty name`);
    }
    if (typeof proj.root !== "string" || proj.root.trim() === "") {
      throw new Error(`Project '${name}' must have a non-empty root`);
    }

    const projectType =
      proj.projectType === "application" || proj.projectType === "library"
        ? proj.projectType
        : undefined;

    const tags = Array.isArray(proj.tags)
      ? proj.tags.filter((t): t is string => typeof t === "string")
      : undefined;

    const implicitDependencies = Array.isArray(proj.implicitDependencies)
      ? proj.implicitDependencies.filter(
          (d): d is string => typeof d === "string",
        )
      : undefined;

    const dependencies = Array.isArray(proj.dependencies)
      ? proj.dependencies.filter((d): d is string => typeof d === "string")
      : undefined;

    let targets: Record<string, NxTargetDefinition> | undefined = undefined;
    if (isRecord(proj.targets)) {
      targets = {};
      for (const [tName, tDef] of Object.entries(proj.targets)) {
        if (isRecord(tDef)) {
          const executor =
            typeof tDef.executor === "string" ? tDef.executor : undefined;
          const options = isRecord(tDef.options) ? tDef.options : undefined;
          const dependsOn = Array.isArray(tDef.dependsOn)
            ? tDef.dependsOn.filter((d): d is string => typeof d === "string")
            : undefined;

          targets[tName] = {
            ...(executor !== undefined ? { executor } : {}),
            ...(options !== undefined ? { options } : {}),
            ...(dependsOn !== undefined ? { dependsOn } : {}),
          };
        }
      }
    }

    projects[name] = {
      name: proj.name,
      root: proj.root,
      ...(projectType !== undefined ? { projectType } : {}),
      ...(tags !== undefined ? { tags } : {}),
      ...(targets !== undefined ? { targets } : {}),
      ...(implicitDependencies !== undefined ? { implicitDependencies } : {}),
      ...(dependencies !== undefined ? { dependencies } : {}),
    };
  }

  const nxVersion =
    typeof input.nxVersion === "string" ? input.nxVersion : undefined;
  const defaultBase =
    typeof input.defaultBase === "string" ? input.defaultBase : undefined;

  return {
    schemaUrn: QUALITY_NX_GRAPH_SCHEMA_URN,
    workspaceRoot: input.workspaceRoot,
    acquisitionMode: input.acquisitionMode as NxGraphAcquisitionMode,
    projects,
    ...(nxVersion !== undefined ? { nxVersion } : {}),
    ...(defaultBase !== undefined ? { defaultBase } : {}),
  };
}

export function validateNxBoundaryRule(input: unknown): NxBoundaryRule {
  if (!isRecord(input)) {
    throw new Error("NxBoundaryRule must be an object");
  }

  if (input.schemaUrn !== QUALITY_NX_BOUNDARY_RULE_SCHEMA_URN) {
    throw new Error(
      `Invalid schemaUrn: expected '${QUALITY_NX_BOUNDARY_RULE_SCHEMA_URN}'`,
    );
  }

  if (typeof input.ruleId !== "string" || input.ruleId.trim() === "") {
    throw new Error("ruleId must be a non-empty string");
  }

  if (!Array.isArray(input.constraints)) {
    throw new Error("constraints must be an array");
  }

  const constraints: NxBoundaryConstraint[] = input.constraints.map(
    (c, idx) => {
      if (!isRecord(c)) {
        throw new Error(`Constraint at index ${idx} must be an object`);
      }
      if (typeof c.sourceTag !== "string" || c.sourceTag.trim() === "") {
        throw new Error(
          `Constraint at index ${idx} must have a non-empty sourceTag`,
        );
      }

      const onlyDependOnLibsWithTags = Array.isArray(c.onlyDependOnLibsWithTags)
        ? c.onlyDependOnLibsWithTags.filter(
            (t): t is string => typeof t === "string",
          )
        : undefined;

      const bannedExternalImports = Array.isArray(c.bannedExternalImports)
        ? c.bannedExternalImports.filter(
            (t): t is string => typeof t === "string",
          )
        : undefined;

      const notDependOnLibsWithTags = Array.isArray(c.notDependOnLibsWithTags)
        ? c.notDependOnLibsWithTags.filter(
            (t): t is string => typeof t === "string",
          )
        : undefined;

      return {
        sourceTag: c.sourceTag,
        ...(onlyDependOnLibsWithTags !== undefined
          ? { onlyDependOnLibsWithTags }
          : {}),
        ...(bannedExternalImports !== undefined
          ? { bannedExternalImports }
          : {}),
        ...(notDependOnLibsWithTags !== undefined
          ? { notDependOnLibsWithTags }
          : {}),
      };
    },
  );

  return {
    schemaUrn: QUALITY_NX_BOUNDARY_RULE_SCHEMA_URN,
    ruleId: input.ruleId,
    constraints,
  };
}

export function validateNxGraphFinding(input: unknown): NxGraphFinding {
  if (!isRecord(input)) {
    throw new Error("NxGraphFinding must be an object");
  }

  if (typeof input.ruleId !== "string" || input.ruleId.trim() === "") {
    throw new Error("ruleId must be a non-empty string");
  }

  if (
    typeof input.sourceProject !== "string" ||
    input.sourceProject.trim() === ""
  ) {
    throw new Error("sourceProject must be a non-empty string");
  }

  if (
    typeof input.targetProject !== "string" ||
    input.targetProject.trim() === ""
  ) {
    throw new Error("targetProject must be a non-empty string");
  }

  if (!isRecord(input.cause)) {
    throw new Error("cause must be an object");
  }

  const validCauses = [
    "explicit-import",
    "implicit-dependency",
    "task-dependency",
  ] as const;
  if (
    typeof input.cause.causeType !== "string" ||
    !validCauses.includes(input.cause.causeType as (typeof validCauses)[number])
  ) {
    throw new Error(`Invalid causeType: '${String(input.cause.causeType)}'`);
  }

  const sourceFile =
    typeof input.cause.sourceFile === "string"
      ? input.cause.sourceFile
      : undefined;

  const cause: NxDependencyCause = {
    sourceProject: String(input.cause.sourceProject),
    targetProject: String(input.cause.targetProject),
    causeType: input.cause.causeType as NxDependencyCause["causeType"],
    ...(sourceFile !== undefined ? { sourceFile } : {}),
  };

  if (typeof input.message !== "string" || input.message.trim() === "") {
    throw new Error("message must be a non-empty string");
  }

  const validSeverities = ["warning", "error"] as const;
  if (
    typeof input.severity !== "string" ||
    !validSeverities.includes(
      input.severity as (typeof validSeverities)[number],
    )
  ) {
    throw new Error(`Invalid severity: '${String(input.severity)}'`);
  }

  return {
    ruleId: input.ruleId,
    sourceProject: input.sourceProject,
    targetProject: input.targetProject,
    cause,
    message: input.message,
    severity: input.severity as "warning" | "error",
  };
}
