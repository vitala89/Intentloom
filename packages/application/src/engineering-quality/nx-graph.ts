import type {
  EngineeringGraphSnapshot,
  NxBoundaryRule,
  NxGraphAcquisitionMode,
  NxGraphFinding,
  NxWorkspaceMetadata,
} from "@intentloom/protocol";
import {
  validateNxBoundaryRule,
  validateNxWorkspaceMetadata,
} from "@intentloom/validator";
import {
  createGraphSnapshotFromNxWorkspace,
  resolveAffectedEngineeringScopes,
} from "./graph-provider.js";

export function detectNxWorkspace(input: {
  readonly workspaceRoot: string;
  readonly files: readonly string[];
}): {
  readonly detected: boolean;
  readonly acquisitionMode: NxGraphAcquisitionMode;
  readonly details?: string;
} {
  const normalizedFiles = input.files.map((f) => f.replaceAll("\\", "/"));

  const hasCachedGraph = normalizedFiles.some(
    (f) =>
      f.includes("node_modules/.cache/nx/nxdeps.json") ||
      f.includes("node_modules/.cache/nx/project-graph.json") ||
      f.endsWith(".nx/cache/project-graph.json"),
  );

  const hasNxJson = normalizedFiles.some((f) => f.endsWith("nx.json"));
  const hasProjectJson = normalizedFiles.some((f) =>
    f.endsWith("project.json"),
  );
  const hasWorkspaceJson = normalizedFiles.some((f) =>
    f.endsWith("workspace.json"),
  );

  if (hasCachedGraph) {
    return {
      detected: true,
      acquisitionMode: "cached-graph",
      details: "Detected cached Nx project-graph artifact",
    };
  }

  if (hasNxJson || hasProjectJson || hasWorkspaceJson) {
    return {
      detected: true,
      acquisitionMode: "project-metadata",
      details: "Detected Nx configuration and project metadata files",
    };
  }

  return {
    detected: false,
    acquisitionMode: "unsupported",
    details: "No Nx workspace markers or metadata files found",
  };
}

export function acquireNxGraphSnapshot(
  metadata: NxWorkspaceMetadata,
): EngineeringGraphSnapshot {
  const validatedMetadata = validateNxWorkspaceMetadata(metadata);

  return createGraphSnapshotFromNxWorkspace({
    projectRoot: validatedMetadata.workspaceRoot,
    projects: validatedMetadata.projects,
  });
}

export function validateNxModuleBoundaries(
  metadata: NxWorkspaceMetadata,
  rule: NxBoundaryRule,
): readonly NxGraphFinding[] {
  const validatedMetadata = validateNxWorkspaceMetadata(metadata);
  const validatedRule = validateNxBoundaryRule(rule);

  const findings: NxGraphFinding[] = [];
  const projects = validatedMetadata.projects;

  for (const [projName, projDef] of Object.entries(projects)) {
    const projTags = projDef.tags ?? [];

    for (const constraint of validatedRule.constraints) {
      if (projTags.includes(constraint.sourceTag)) {
        // Collect explicit dependencies
        const explicitDeps = projDef.dependencies ?? [];
        for (const depName of explicitDeps) {
          const targetProj = projects[depName];
          if (targetProj) {
            const targetTags = targetProj.tags ?? [];

            if (
              constraint.onlyDependOnLibsWithTags &&
              constraint.onlyDependOnLibsWithTags.length > 0
            ) {
              const matchesTag = constraint.onlyDependOnLibsWithTags.some(
                (tag) => targetTags.includes(tag),
              );
              if (!matchesTag) {
                findings.push({
                  ruleId: validatedRule.ruleId,
                  sourceProject: projName,
                  targetProject: depName,
                  cause: {
                    sourceProject: projName,
                    targetProject: depName,
                    causeType: "explicit-import",
                  },
                  message: `Project '${projName}' (tag '${constraint.sourceTag}') cannot depend on '${depName}' because it lacks tags [${constraint.onlyDependOnLibsWithTags.join(", ")}]`,
                  severity: "error",
                });
              }
            }

            if (
              constraint.notDependOnLibsWithTags &&
              constraint.notDependOnLibsWithTags.length > 0
            ) {
              const forbiddenTag = constraint.notDependOnLibsWithTags.find(
                (tag) => targetTags.includes(tag),
              );
              if (forbiddenTag) {
                findings.push({
                  ruleId: validatedRule.ruleId,
                  sourceProject: projName,
                  targetProject: depName,
                  cause: {
                    sourceProject: projName,
                    targetProject: depName,
                    causeType: "explicit-import",
                  },
                  message: `Project '${projName}' (tag '${constraint.sourceTag}') forbidden from depending on '${depName}' with tag '${forbiddenTag}'`,
                  severity: "error",
                });
              }
            }
          }
        }

        // Collect implicit dependencies
        const implicitDeps = projDef.implicitDependencies ?? [];
        for (const depName of implicitDeps) {
          const targetProj = projects[depName];
          if (targetProj) {
            const targetTags = targetProj.tags ?? [];

            if (
              constraint.onlyDependOnLibsWithTags &&
              constraint.onlyDependOnLibsWithTags.length > 0
            ) {
              const matchesTag = constraint.onlyDependOnLibsWithTags.some(
                (tag) => targetTags.includes(tag),
              );
              if (!matchesTag) {
                findings.push({
                  ruleId: validatedRule.ruleId,
                  sourceProject: projName,
                  targetProject: depName,
                  cause: {
                    sourceProject: projName,
                    targetProject: depName,
                    causeType: "implicit-dependency",
                  },
                  message: `Project '${projName}' (tag '${constraint.sourceTag}') cannot implicitly depend on '${depName}' because it lacks tags [${constraint.onlyDependOnLibsWithTags.join(", ")}]`,
                  severity: "error",
                });
              }
            }
          }
        }
      }
    }
  }

  return findings;
}

export function resolveNxAffectedProjects(
  metadata: NxWorkspaceMetadata,
  changedFilesOrProjects: readonly string[],
): readonly string[] {
  const snapshot = acquireNxGraphSnapshot(metadata);
  return resolveAffectedEngineeringScopes(snapshot, changedFilesOrProjects);
}
