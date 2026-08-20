import { resolve } from "node:path";
import {
  diffProject,
  doctorProject,
  nodeFileSystem,
  type DoctorPlan,
  type FileSystem,
} from "@intentloom/application";
import { resolveProjectDoctorInit } from "../../application/dist/resolve-project-doctor-init.js";
import { createArtifactValidator } from "@intentloom/validator";
import type {
  DoctorRequest,
  DoctorResult,
  ProjectDiffRequest,
  ProjectDiffResult,
} from "@intentloom/protocol";

export function doctorDaemonResultFromPlan(
  report: DoctorPlan,
): Omit<DoctorResult, "protocolVersion"> {
  return {
    findings: report.findings.map(
      ({ code, severity, category, path, message }) => ({
        code,
        severity,
        category,
        path,
        message,
      }),
    ),
    diagnostics: report.diagnostics,
    exitCode: report.findings.some((finding) => finding.severity === "error")
      ? 3
      : 0,
  };
}

async function createCatalogValidator(catalogRoot: string) {
  return createArtifactValidator(resolve(catalogRoot, "schemas"));
}

export async function handleProjectDoctorRequest(
  request: DoctorRequest,
  catalogRoot: string,
  fs: FileSystem = nodeFileSystem,
): Promise<Omit<DoctorResult, "protocolVersion">> {
  const root = resolve(request.params.root);
  const validator = await createCatalogValidator(catalogRoot);
  const init = await resolveProjectDoctorInit(
    {
      root,
      catalogRoot,
      validator,
      ...(request.params.profile !== undefined
        ? { profile: request.params.profile }
        : {}),
      ...(request.params.adapters !== undefined
        ? { adapters: request.params.adapters }
        : {}),
    },
    fs,
  );
  return doctorDaemonResultFromPlan(await doctorProject(init, fs));
}

export async function handleProjectDiffRequest(
  request: ProjectDiffRequest,
  catalogRoot: string,
  fs: FileSystem = nodeFileSystem,
): Promise<Omit<ProjectDiffResult, "protocolVersion">> {
  const root = resolve(request.params.root);
  const validator = await createCatalogValidator(catalogRoot);
  const init = await resolveProjectDoctorInit(
    {
      root,
      catalogRoot,
      validator,
      ...(request.params.profile !== undefined
        ? { profile: request.params.profile }
        : {}),
      ...(request.params.adapters !== undefined
        ? { adapters: request.params.adapters }
        : {}),
    },
    fs,
  );
  const result = await diffProject(init, fs);
  return {
    operationVersion: 1,
    root,
    changes: result.changes,
    diagnostics: result.diagnostics,
  };
}
