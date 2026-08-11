import type { FileSystem } from "../index.js";
import { nodeFileSystem } from "../index.js";
import { getFirstPartySpecializedPackEntries } from "./first-party-specialized-pack-runtime.js";
import {
  resolveFirstPartySpecializedPackDetection,
  validateFirstPartySpecializedPackCatalog,
} from "./specialized-pack-catalog-engine.js";
import {
  buildSpecializedPackCatalogViewModel,
  buildSpecializedPackDetectionViewModel,
  buildSpecializedPackExplainViewModel,
} from "./specialized-pack-viewmodel.js";
import type { QualityCliResult } from "./cli-quality-standards.js";

export type SpecializedPacksCliCommand =
  "list" | "detect" | "explain" | "compatibility";

async function collectProjectPaths(
  root: string,
  fs: FileSystem,
  maxPaths = 5000,
): Promise<readonly string[]> {
  const paths = await fs.list(root);
  return paths.slice(0, maxPaths);
}

function findPackEntry(packId: string) {
  const catalog = validateFirstPartySpecializedPackCatalog(
    getFirstPartySpecializedPackEntries(),
  );
  const entry = catalog.entries.find((item) => item.manifest.id === packId);
  if (entry === undefined) {
    throw new Error(`unknown specialized pack: ${packId}`);
  }
  return entry;
}

export async function runSpecializedPacksCliCommand(
  command: SpecializedPacksCliCommand,
  args: {
    readonly json?: boolean;
    readonly root?: string;
    readonly packId?: string;
    readonly packIds?: readonly string[];
    readonly fs?: FileSystem;
  },
): Promise<QualityCliResult> {
  const json = args.json ?? false;
  const entries = getFirstPartySpecializedPackEntries();
  const catalog = validateFirstPartySpecializedPackCatalog(entries);

  if (command === "list") {
    const viewmodel = buildSpecializedPackCatalogViewModel(catalog.entries);
    const stdout = json
      ? JSON.stringify(viewmodel, null, 2)
      : `Specialized packs: ${viewmodel.totalEntries} first-party entries`;
    return { exitCode: 0, stdout, stderr: "" };
  }

  if (command === "explain") {
    if (!args.packId) {
      return {
        exitCode: 1,
        stdout: "",
        stderr: "Error: packId is required for explain",
      };
    }
    try {
      const viewmodel = buildSpecializedPackExplainViewModel(
        findPackEntry(args.packId),
      );
      const stdout = json
        ? JSON.stringify(viewmodel, null, 2)
        : `Pack: ${viewmodel.packId} v${viewmodel.version} (${viewmodel.name})`;
      return { exitCode: 0, stdout, stderr: "" };
    } catch (error: unknown) {
      return { exitCode: 1, stdout: "", stderr: String(error) };
    }
  }

  if (command === "detect" || command === "compatibility") {
    if (!args.root) {
      return {
        exitCode: 1,
        stdout: "",
        stderr: "Error: root is required for detect and compatibility",
      };
    }
    const fs = args.fs ?? nodeFileSystem;
    const projectPaths = await collectProjectPaths(args.root, fs);
    const resolution = resolveFirstPartySpecializedPackDetection({
      projectPaths,
      entries,
    });
    const viewmodel = buildSpecializedPackDetectionViewModel(resolution);
    if (command === "compatibility" && args.packIds !== undefined) {
      const requested = new Set(args.packIds);
      const compatible = viewmodel.compatiblePackIds.filter((packId) =>
        requested.has(packId),
      );
      const stdout = json
        ? JSON.stringify({ compatiblePackIds: compatible }, null, 2)
        : `Compatible specialized packs: ${compatible.join(", ") || "none"}`;
      return { exitCode: 0, stdout, stderr: "" };
    }
    const stdout = json
      ? JSON.stringify(viewmodel, null, 2)
      : `Detected ${viewmodel.candidates.length} candidate pack(s); compatible: ${viewmodel.compatiblePackIds.join(", ") || "none"}`;
    return { exitCode: 0, stdout, stderr: "" };
  }

  return { exitCode: 1, stdout: "", stderr: `Unknown command: '${command}'` };
}
