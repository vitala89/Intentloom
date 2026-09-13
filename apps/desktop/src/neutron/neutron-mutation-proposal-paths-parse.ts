import { DesktopBridgeError } from "../desktop-client.js";

export function parseNeutronMutationChangedPaths(
  paths: readonly string[],
): readonly string[] {
  if (paths.length === 0) {
    throw new DesktopBridgeError(
      "Neutron mutation proposal changedPaths must contain at least one path",
      "bounded_validation_failed",
    );
  }
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (let index = 0; index < paths.length; index += 1) {
    const path = paths[index]!;
    const safe = normalizeProjectRelativePath(path, index);
    if (seen.has(safe)) {
      throw new DesktopBridgeError(
        "Neutron mutation proposal changedPaths must not contain duplicate paths",
        "bounded_validation_failed",
      );
    }
    seen.add(safe);
    normalized.push(safe);
  }
  return normalized;
}

function normalizeProjectRelativePath(path: string, index: number): string {
  const field = `plan.changedPaths[${String(index)}]`;
  if (
    path === "" ||
    path.includes("\0") ||
    /^[A-Za-z]:/u.test(path) ||
    path.startsWith("/") ||
    path.startsWith("\\")
  ) {
    throw new DesktopBridgeError(
      `${field} must be a safe project-relative path`,
      "bounded_validation_failed",
    );
  }
  const segments: string[] = [];
  for (const rawSegment of path.replaceAll("\\", "/").split("/")) {
    if (rawSegment === "" || rawSegment === ".") continue;
    if (rawSegment === "..") {
      throw new DesktopBridgeError(
        `${field} must be a safe project-relative path`,
        "bounded_validation_failed",
      );
    }
    segments.push(rawSegment);
  }
  if (segments.length === 0) {
    throw new DesktopBridgeError(
      `${field} must be a safe project-relative path`,
      "bounded_validation_failed",
    );
  }
  return segments.join("/");
}
