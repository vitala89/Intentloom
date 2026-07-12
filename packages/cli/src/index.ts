import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { generateAdapter } from "@aif/adapters";
import {
  AIF_VERSION,
  checksum,
  loadCatalog,
  normalizeOutputPath,
  type AdapterName,
  type Catalog,
  type GeneratedFile,
} from "@aif/core";
import { parse, stringify } from "yaml";

export type ChangeKind =
  | "create"
  | "update"
  | "conflict"
  | "modified"
  | "missing"
  | "stale"
  | "security-error";
export interface Change {
  readonly path: string;
  readonly kind: ChangeKind;
  readonly reason: string;
  readonly content?: string;
}
export interface Plan {
  readonly changes: readonly Change[];
  readonly diagnostics: readonly string[];
}
export interface FileSystem {
  exists(path: string): Promise<boolean>;
  read(path: string): Promise<string>;
  write(path: string, content: string): Promise<void>;
  mkdir(path: string): Promise<void>;
  remove(path: string): Promise<void>;
  list(path: string): Promise<string[]>;
}
export interface InitOptions {
  readonly root: string;
  readonly profile: string;
  readonly adapters: readonly AdapterName[];
  readonly dryRun?: boolean;
  readonly catalog?: Catalog;
  readonly catalogRoot?: string;
}
export interface SyncOptions extends InitOptions {
  readonly force?: boolean;
}

const emptyCatalog: Catalog = {
  policies: [],
  workflows: [],
  templates: [],
  skills: [],
};
const configPath = ".aif/config.yaml";
const lockPath = ".aif/manifest.lock.json";
const sourceMapPath = ".aif/source-map.json";

function inside(root: string, path: string): string {
  const target = resolve(root, path);
  if (target !== resolve(root) && !target.startsWith(`${resolve(root)}${sep}`))
    throw new Error(`path traversal: ${path}`);
  return target;
}

function config(profile: string, adapters: readonly AdapterName[]): string {
  return stringify({ schemaVersion: "1", profile, adapters });
}
function generated(
  adapterNames: readonly AdapterName[],
  catalog: Catalog,
): GeneratedFile[] {
  return adapterNames.flatMap(
    (adapter) => generateAdapter(adapter, catalog).files,
  );
}

async function desired(options: InitOptions): Promise<GeneratedFile[]> {
  const catalog =
    options.catalog ??
    (options.catalogRoot
      ? await loadCatalog(options.catalogRoot)
      : emptyCatalog);
  const files = generated(options.adapters, catalog);
  const lock =
    JSON.stringify(
      {
        lockVersion: "1",
        frameworkVersion: AIF_VERSION,
        profile: options.profile,
        adapters: options.adapters,
        generated: files.map((file) => ({
          path: file.path,
          checksum: file.checksum,
        })),
      },
      null,
      2,
    ) + "\n";
  const map =
    JSON.stringify(
      {
        schemaVersion: "1",
        files: files.map((file) => ({
          path: file.path,
          checksum: file.checksum,
          sources: file.sources,
          ownership: "aif-owned-generated",
        })),
      },
      null,
      2,
    ) + "\n";
  return [
    {
      path: configPath,
      content: config(options.profile, options.adapters),
      sources: [],
      checksum: checksum(config(options.profile, options.adapters)),
    },
    {
      path: ".aif/local.example.yaml",
      content: "# Local AIF preferences only; never store secrets here.\n",
      sources: [],
      checksum: checksum(
        "# Local AIF preferences only; never store secrets here.\n",
      ),
    },
    ...files,
    // Metadata is committed last so ownership never advances ahead of files.
    { path: lockPath, content: lock, sources: [], checksum: checksum(lock) },
    { path: sourceMapPath, content: map, sources: [], checksum: checksum(map) },
  ];
}

interface OwnershipRecord {
  readonly path: string;
  readonly checksum: string;
  readonly ownership: "aif-owned-generated";
}

async function ownership(
  root: string,
  fs: FileSystem,
): Promise<Map<string, OwnershipRecord> | null> {
  const path = inside(root, sourceMapPath);
  if (!(await fs.exists(path))) return new Map();
  try {
    const value = JSON.parse(await fs.read(path)) as {
      schemaVersion?: unknown;
      files?: unknown;
    };
    if (value.schemaVersion !== "1" || !Array.isArray(value.files)) return null;
    const records = new Map<string, OwnershipRecord>();
    for (const record of value.files) {
      if (typeof record !== "object" || record === null) return null;
      const item = record as Record<string, unknown>;
      if (
        typeof item.path !== "string" ||
        typeof item.checksum !== "string" ||
        item.ownership !== "aif-owned-generated"
      )
        return null;
      const normalized = normalizeOutputPath(item.path);
      if (normalized !== item.path || records.has(normalized)) return null;
      records.set(normalized, {
        path: normalized,
        checksum: item.checksum,
        ownership: "aif-owned-generated",
      });
    }
    return records;
  } catch {
    return null;
  }
}

async function plan(
  options: InitOptions,
  fs: FileSystem,
  sync = false,
): Promise<Plan> {
  const changes: Change[] = [];
  const owned = await ownership(options.root, fs);
  if (owned === null)
    return {
      changes: [
        {
          path: sourceMapPath,
          kind: "conflict",
          reason: "malformed source-map; refusing all writes",
        },
      ],
      diagnostics: ["invalid source-map"],
    };
  for (const file of await desired(options)) {
    const path = inside(options.root, normalizeOutputPath(file.path));
    if (!(await fs.exists(path)))
      changes.push({
        path: file.path,
        kind: "create",
        reason: "missing",
        content: file.content,
      });
    else if ((await fs.read(path)) === file.content) continue;
    else if (
      sync &&
      file.path !== sourceMapPath &&
      file.path !== lockPath &&
      file.path !== configPath
    ) {
      const record = owned.get(file.path);
      if (!record)
        changes.push({
          path: file.path,
          kind: "conflict",
          reason: "existing destination has no AIF ownership record",
        });
      else if (checksum(await fs.read(path)) !== record.checksum)
        changes.push({
          path: file.path,
          kind: "modified",
          reason: "AIF-owned generated file was manually modified",
        });
      else
        changes.push({
          path: file.path,
          kind: "update",
          reason: "verified AIF-owned generated output changed",
          content: file.content,
        });
    } else
      changes.push({
        path: file.path,
        kind: "conflict",
        reason: "existing file is not identical; explicit resolution required",
      });
  }
  return { changes, diagnostics: [] };
}

async function apply(
  root: string,
  fs: FileSystem,
  proposal: Plan,
): Promise<void> {
  const writes = proposal.changes.filter(
    (change) => change.kind === "create" || change.kind === "update",
  );
  const backups = new Map<string, string>();
  const created: string[] = [];
  try {
    for (const change of writes) {
      const path = inside(root, change.path);
      if (await fs.exists(path)) backups.set(path, await fs.read(path));
      else created.push(path);
      await fs.mkdir(dirname(path));
      await fs.write(path, change.content!);
    }
  } catch (error) {
    for (const [path, content] of backups) await fs.write(path, content);
    for (const path of created) await fs.remove(path);
    throw error;
  }
}

export async function initProject(
  options: InitOptions,
  fs: FileSystem,
): Promise<Plan> {
  const proposal = await plan(options, fs);
  if (
    !options.dryRun &&
    !proposal.changes.some((change) => change.kind === "conflict")
  )
    await apply(options.root, fs, proposal);
  return proposal;
}
export async function syncProject(
  options: SyncOptions,
  fs: FileSystem,
): Promise<Plan> {
  const proposal = await plan(options, fs, true);
  if (
    !options.dryRun &&
    !proposal.changes.some((change) => change.kind === "conflict")
  )
    await apply(options.root, fs, proposal);
  return proposal;
}
export async function diffProject(
  options: InitOptions,
  fs: FileSystem,
): Promise<Plan> {
  return plan(options, fs);
}
export async function doctorProject(
  options: InitOptions,
  fs: FileSystem,
): Promise<Plan> {
  const proposal = await plan({ ...options, dryRun: true }, fs);
  return {
    ...proposal,
    diagnostics: proposal.changes
      .filter((change) => change.kind === "conflict")
      .map((change) => `${change.path}: ${change.reason}`),
  };
}
export async function adoptProject(
  options: InitOptions,
  fs: FileSystem,
): Promise<Plan> {
  const known = [
    "AGENTS.md",
    "CLAUDE.md",
    ".cursor/rules",
    ".github/copilot-instructions.md",
    "README.md",
    "ROADMAP.md",
    "CHANGELOG.md",
  ];
  const found = await Promise.all(
    known.map(async (path) =>
      (await fs.exists(inside(options.root, path))) ? path : null,
    ),
  );
  const proposal = await plan({ ...options, dryRun: true }, fs);
  return {
    ...proposal,
    diagnostics: found
      .filter((path): path is string => path !== null)
      .map((path) => `project-owned existing artifact: ${path}`),
  };
}
export async function planFeature(taskId: string): Promise<string> {
  if (!taskId) throw new Error("task identifier is required");
  return `# Feature brief: ${taskId}\n\n## Must read\n\n## Read if needed\n\n## Excluded\n\n## Forbidden to change\n\n## Acceptance criteria\n\n## Edge cases\n\n## Verification\n\n## Technical debt\n\n## Stop condition\n`;
}

export function createMemoryFileSystem(
  initial: Record<string, string> = {},
  failAfterWrites?: number,
): FileSystem & { files: Map<string, string> } {
  const files = new Map(Object.entries(initial));
  let writes = 0;
  let failed = false;
  return {
    files,
    async exists(path) {
      return files.has(path);
    },
    async read(path) {
      const content = files.get(path);
      if (content === undefined) throw new Error(`missing ${path}`);
      return content;
    },
    async write(path, content) {
      writes += 1;
      if (
        failAfterWrites !== undefined &&
        writes > failAfterWrites &&
        !failed
      ) {
        failed = true;
        throw new Error("injected write failure");
      }
      files.set(path, content);
    },
    async mkdir() {},
    async remove(path) {
      files.delete(path);
    },
    async list(path) {
      return [...files.keys()].filter((file) => file.startsWith(path));
    },
  };
}
export const nodeFileSystem: FileSystem = {
  async exists(path) {
    try {
      await stat(path);
      return true;
    } catch {
      return false;
    }
  },
  read: (path) => readFile(path, "utf8"),
  async write(path, content) {
    await writeFile(path, content, "utf8");
  },
  async mkdir(path) {
    await mkdir(path, { recursive: true });
  },
  async remove(path) {
    await rm(path, { recursive: true, force: true });
  },
  async list(path) {
    try {
      return await readdir(path);
    } catch {
      return [];
    }
  },
};
