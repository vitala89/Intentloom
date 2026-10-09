import { canonicalizeNeutronMutationPaths } from "./neutron-mutation-canonical.js";

export function exactNeutronMutationPathSetsEqual(
  left: readonly string[],
  right: readonly string[],
): boolean {
  if (left.length !== right.length) return false;
  const normalizedLeft = canonicalizeNeutronMutationPaths(left, "left");
  const normalizedRight = canonicalizeNeutronMutationPaths(right, "right");
  for (let index = 0; index < normalizedLeft.length; index += 1) {
    if (normalizedLeft[index] !== normalizedRight[index]) return false;
  }
  return true;
}

export function assertExactNeutronMutationPathSet(
  actual: readonly string[],
  expected: readonly string[],
  label: string,
): void {
  if (exactNeutronMutationPathSetsEqual(actual, expected)) return;
  throw new Error(
    `${label}: declared path set must match reviewed paths exactly`,
  );
}
