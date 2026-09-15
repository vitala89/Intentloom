import { storedPathCollisionKey } from "@intentloom/core";

export function destinationCollisionKey(path: string): string {
  try {
    return storedPathCollisionKey(path);
  } catch {
    throw new Error("invalid or escaping destination");
  }
}

export interface DestinationCollision {
  readonly code: "destination-collision";
  readonly key: string;
  readonly paths: readonly string[];
  readonly sources: readonly string[];
}

export function findDestinationCollisions(
  inputs: readonly { path: string; sources: readonly string[] }[],
): DestinationCollision[] {
  const groups = new Map<
    string,
    { paths: Set<string>; sources: Set<string>; count: number }
  >();
  for (const input of inputs) {
    const key = destinationCollisionKey(input.path);
    const group = groups.get(key) ?? {
      paths: new Set(),
      sources: new Set(),
      count: 0,
    };
    group.paths.add(input.path);
    input.sources.forEach((source) => group.sources.add(source));
    group.count += 1;
    groups.set(key, group);
  }
  return [...groups.entries()]
    .filter(([, group]) => group.count > 1)
    .map(([key, group]) => ({
      code: "destination-collision" as const,
      key,
      paths: [...group.paths].sort(),
      sources: [...group.sources].sort(),
    }))
    .sort((left, right) => left.key.localeCompare(right.key));
}
