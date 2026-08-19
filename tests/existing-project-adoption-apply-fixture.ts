import {
  approveExistingProjectAdoptionPreparedPlan,
  createMemoryFileSystem,
  prepareExistingProjectAdoptionPlan,
  prepareExistingProjectAdoptionPreparedPlan,
} from "@intentloom/application";
import type { ExistingProjectAdoptionApproval } from "@intentloom/protocol";

export function viiLikeTree(
  extra: Record<string, string> = {},
): Record<string, string> {
  return {
    "/project/nx.json": JSON.stringify({ targetDefaults: {} }),
    "/project/package.json": JSON.stringify({
      devDependencies: { nx: "21.0.0", typescript: "5.8.0" },
    }),
    "/project/tsconfig.json": "{}",
    "/project/README.md": "vii workspace\n",
    "/project/AGENTS.md": "project agents\n",
    "/project/.github/workflows/validate.yml": "name: validate\n",
    "/project/.github/PULL_REQUEST_TEMPLATE.md": "## Summary\n",
    "/project/.nx/cache/terminalOutputs/run-1.txt": "cached output\n",
    "/project/docs/architecture/overview.md": "architecture overview\n",
    "/project/.env": "SECRET=1\n",
    ...extra,
  };
}

export function snapshot(files: Map<string, string>): string {
  return JSON.stringify(
    [...files.entries()].sort(([left], [right]) => left.localeCompare(right)),
  );
}

export async function preparedApproved(
  fs: ReturnType<typeof createMemoryFileSystem>,
  now = 1_700_000_000_000,
) {
  const preview = await prepareExistingProjectAdoptionPlan(
    { root: "/project", projectId: "vii-like" },
    fs,
  );
  const prepared = await prepareExistingProjectAdoptionPreparedPlan(
    {
      root: "/project",
      projectId: "vii-like",
      previewIdentity: preview.previewIdentity,
      decisions: [{ path: "AGENTS.md", kind: "keep-project-owned" }],
      now: () => now,
    },
    fs,
  );
  const approved = await approveExistingProjectAdoptionPreparedPlan(
    {
      root: "/project",
      preparedPlanId: prepared.plan!.preparedPlanId,
      planDigest: prepared.plan!.planDigest,
      preparedPlan: prepared.plan!,
      now: () => now + 100,
    },
    fs,
  );
  return {
    preview,
    plan: prepared.plan!,
    approval: approved.approval as ExistingProjectAdoptionApproval,
  };
}
