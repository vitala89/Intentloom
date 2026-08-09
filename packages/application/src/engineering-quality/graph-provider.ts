import { createHash } from "node:crypto";
import type {
  EngineeringArchitectureRule,
  EngineeringGraphFinding,
  EngineeringGraphSnapshot,
  GraphEdge,
  GraphNode,
} from "@intentloom/protocol";
import { QUALITY_GRAPH_SNAPSHOT_SCHEMA_URN } from "@intentloom/protocol";
import {
  validateEngineeringArchitectureRule,
  validateEngineeringGraphSnapshot,
} from "@intentloom/validator";

function computeGraphDigest(
  projectRoot: string,
  nodes: readonly GraphNode[],
  edges: readonly GraphEdge[],
): string {
  const sortedNodes = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
  const sortedEdges = [...edges].sort((a, b) => {
    const comp = a.source.localeCompare(b.source);
    return comp !== 0 ? comp : a.target.localeCompare(b.target);
  });

  const payload = JSON.stringify({
    projectRoot,
    nodes: sortedNodes,
    edges: sortedEdges,
  });
  return createHash("sha256").update(payload).digest("hex");
}

export function createGraphSnapshotFromTypeScriptWorkspace(input: {
  readonly projectRoot: string;
  readonly packages: readonly {
    readonly name: string;
    readonly path: string;
    readonly dependencies?: readonly string[];
  }[];
}): EngineeringGraphSnapshot {
  const nodes: GraphNode[] = input.packages.map((pkg) => ({
    id: pkg.name,
    name: pkg.name,
    type: "package",
    path: pkg.path,
  }));

  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges: GraphEdge[] = [];

  for (const pkg of input.packages) {
    if (pkg.dependencies) {
      for (const dep of pkg.dependencies) {
        if (nodeIds.has(dep)) {
          edges.push({
            source: pkg.name,
            target: dep,
            type: "dependency",
          });
        }
      }
    }
  }

  const contentDigest = computeGraphDigest(input.projectRoot, nodes, edges);

  const snapshot: EngineeringGraphSnapshot = {
    schemaUrn: QUALITY_GRAPH_SNAPSHOT_SCHEMA_URN,
    providerKind: "typescript-workspace",
    providerName: "TypeScript Workspace Provider",
    snapshotId: `ts-workspace-${contentDigest.slice(0, 12)}`,
    projectRoot: input.projectRoot,
    nodes,
    edges,
    contentDigest,
    createdAt: "2026-08-10T00:00:00.000Z",
    confidence: "high",
  };

  return validateEngineeringGraphSnapshot(snapshot);
}

export function createGraphSnapshotFromNxWorkspace(input: {
  readonly projectRoot: string;
  readonly projects: Record<
    string,
    {
      readonly root: string;
      readonly tags?: readonly string[];
      readonly implicitDependencies?: readonly string[];
      readonly dependencies?: readonly string[];
    }
  >;
}): EngineeringGraphSnapshot {
  const projectEntries = Object.entries(input.projects).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  const nodes: GraphNode[] = projectEntries.map(([name, proj]) => {
    const tags = proj.tags && proj.tags.length > 0 ? proj.tags : undefined;
    return {
      id: name,
      name,
      type: "project",
      path: proj.root,
      ...(tags !== undefined ? { tags } : {}),
    };
  });

  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges: GraphEdge[] = [];

  for (const [name, proj] of projectEntries) {
    if (proj.dependencies) {
      for (const dep of proj.dependencies) {
        if (nodeIds.has(dep)) {
          edges.push({
            source: name,
            target: dep,
            type: "dependency",
          });
        }
      }
    }
    if (proj.implicitDependencies) {
      for (const dep of proj.implicitDependencies) {
        if (nodeIds.has(dep)) {
          edges.push({
            source: name,
            target: dep,
            type: "implicit-dependency",
          });
        }
      }
    }
  }

  const contentDigest = computeGraphDigest(input.projectRoot, nodes, edges);

  const snapshot: EngineeringGraphSnapshot = {
    schemaUrn: QUALITY_GRAPH_SNAPSHOT_SCHEMA_URN,
    providerKind: "nx-workspace",
    providerName: "Nx Workspace Provider",
    snapshotId: `nx-workspace-${contentDigest.slice(0, 12)}`,
    projectRoot: input.projectRoot,
    nodes,
    edges,
    contentDigest,
    createdAt: "2026-08-10T00:00:00.000Z",
    confidence: "high",
  };

  return validateEngineeringGraphSnapshot(snapshot);
}

function matchesSelector(node: GraphNode, selector: string): boolean {
  if (node.id === selector || node.path === selector) {
    return true;
  }
  if (node.tags && node.tags.includes(selector)) {
    return true;
  }
  return false;
}

export function validateArchitectureAgainstGraph(
  snapshot: EngineeringGraphSnapshot,
  rules: readonly EngineeringArchitectureRule[],
): readonly EngineeringGraphFinding[] {
  const validatedSnapshot = validateEngineeringGraphSnapshot(snapshot);
  const validatedRules = rules.map(validateEngineeringArchitectureRule);

  const findings: EngineeringGraphFinding[] = [];
  const nodeMap = new Map(validatedSnapshot.nodes.map((n) => [n.id, n]));

  for (const rule of validatedRules) {
    for (const edge of validatedSnapshot.edges) {
      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);

      if (sourceNode && targetNode) {
        if (
          matchesSelector(sourceNode, rule.sourceTagOrPath) &&
          matchesSelector(targetNode, rule.forbiddenTargetTagOrPath)
        ) {
          findings.push({
            ruleId: rule.ruleId,
            sourceNodeId: sourceNode.id,
            targetNodeId: targetNode.id,
            reason: rule.reason,
            severity: "error",
          });
        }
      }
    }
  }

  return findings;
}

export function resolveAffectedEngineeringScopes(
  snapshot: EngineeringGraphSnapshot,
  changedPathsOrNodes: readonly string[],
): readonly string[] {
  const validatedSnapshot = validateEngineeringGraphSnapshot(snapshot);

  const affected = new Set<string>();

  // Find initial changed nodes
  for (const changed of changedPathsOrNodes) {
    for (const node of validatedSnapshot.nodes) {
      if (node.id === changed || node.path === changed) {
        affected.add(node.id);
      }
    }
  }

  // Build reverse adjacency list: target -> array of sources that depend on target
  const reverseAdj = new Map<string, string[]>();
  for (const edge of validatedSnapshot.edges) {
    const list = reverseAdj.get(edge.target) ?? [];
    list.push(edge.source);
    reverseAdj.set(edge.target, list);
  }

  // Traverse transitively
  const queue = Array.from(affected);
  while (queue.length > 0) {
    const current = queue.shift()!;
    const dependents = reverseAdj.get(current) ?? [];
    for (const dep of dependents) {
      if (!affected.has(dep)) {
        affected.add(dep);
        queue.push(dep);
      }
    }
  }

  return Array.from(affected).sort((a, b) => a.localeCompare(b));
}
