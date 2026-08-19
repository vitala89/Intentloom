import type { ExistingProjectAdoptionApplyViewModel } from "@intentloom/protocol";
import {
  diffProject,
  doctorProject,
  inspectProject,
  type FileSystem,
  type InitOptions,
} from "./index.js";

function secretLikePath(path: string): boolean {
  return path
    .split("/")
    .some(
      (segment) =>
        segment === ".env" ||
        segment.startsWith(".env.") ||
        /\.(?:key|pem|p12|pfx)$/iu.test(segment),
    );
}

export function adoptionApplySafePaths(
  paths: readonly string[],
): readonly string[] {
  return paths.filter((path) => !secretLikePath(path));
}

export async function evaluateExistingProjectAdoptionPostApplyHealth(
  root: string,
  init: InitOptions,
  fs: FileSystem,
): Promise<{
  ready: boolean;
  inspectionReadiness: string;
  doctor: ExistingProjectAdoptionApplyViewModel["doctor"];
  diff: ExistingProjectAdoptionApplyViewModel["diff"];
}> {
  const doctor = await doctorProject(init, fs);
  const diff = await diffProject(init, fs);
  const inspection = await inspectProject(root, fs);
  const errorCount = doctor.findings.filter(
    (finding) => finding.severity === "error",
  ).length;
  const unmanagedDriftPaths = adoptionApplySafePaths(
    diff.changes
      .filter((change) =>
        ["conflict", "modified", "security-error"].includes(change.kind),
      )
      .map((change) => change.path),
  );
  return {
    ready:
      errorCount === 0 &&
      unmanagedDriftPaths.length === 0 &&
      inspection.readiness === "ready",
    inspectionReadiness: inspection.readiness,
    doctor: {
      errorCount,
      warningCount: doctor.findings.filter(
        (finding) => finding.severity === "warning",
      ).length,
      codes: [
        ...new Set(doctor.findings.map((finding) => finding.code)),
      ].sort(),
    },
    diff: { unmanagedDriftPaths },
  };
}
