import type { FoundationScaffoldFileRow } from "./foundation-scaffold-client-viewmodel.js";

export interface FoundationScaffoldWorkspaceFileGroup {
  readonly label: string;
  readonly files: readonly FoundationScaffoldFileRow[];
}

export interface FoundationScaffoldWorkspaceSection {
  readonly topology: "pnpm-workspace";
  readonly hasNx: boolean;
  readonly groups: readonly FoundationScaffoldWorkspaceFileGroup[];
}

const WORKSPACE_TEMPLATE_PREFIX = "typescript-pnpm-workspace-starter@";

export function isWorkspaceScaffoldTemplate(
  templateVersions: readonly string[],
): boolean {
  return templateVersions.some((entry) =>
    entry.startsWith(WORKSPACE_TEMPLATE_PREFIX),
  );
}

export function buildFoundationScaffoldWorkspaceSection(
  files: readonly FoundationScaffoldFileRow[],
  templateVersions: readonly string[],
): FoundationScaffoldWorkspaceSection | undefined {
  if (!isWorkspaceScaffoldTemplate(templateVersions)) {
    return undefined;
  }

  const rootFiles: FoundationScaffoldFileRow[] = [];
  const packageFiles: FoundationScaffoldFileRow[] = [];
  const exampleFiles: FoundationScaffoldFileRow[] = [];

  for (const file of files) {
    if (file.path.startsWith("packages/")) {
      packageFiles.push(file);
      continue;
    }
    if (file.path.startsWith("examples/")) {
      exampleFiles.push(file);
      continue;
    }
    rootFiles.push(file);
  }

  const groups: FoundationScaffoldWorkspaceFileGroup[] = [];
  if (rootFiles.length > 0) {
    groups.push({ label: "Root", files: rootFiles });
  }
  if (packageFiles.length > 0) {
    groups.push({ label: "packages/", files: packageFiles });
  }
  if (exampleFiles.length > 0) {
    groups.push({ label: "examples/", files: exampleFiles });
  }

  return {
    topology: "pnpm-workspace",
    hasNx: files.some((file) => file.path === "nx.json"),
    groups,
  };
}
