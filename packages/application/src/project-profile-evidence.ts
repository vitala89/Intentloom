export interface StackEvidence {
  readonly typescript: readonly string[];
  readonly angular: readonly string[];
  readonly rust: readonly string[];
  readonly tauri: readonly string[];
  readonly nx: readonly string[];
  readonly sqlite: readonly string[];
  readonly securitySensitive: readonly string[];
}

function namedPackage(
  paths: ReadonlySet<string>,
  packageNames: ReadonlySet<string>,
  name: string,
): readonly string[] {
  return paths.has("package.json") && packageNames.has(name)
    ? ["package.json"]
    : [];
}

function prefixedPackage(
  paths: ReadonlySet<string>,
  packageNames: ReadonlySet<string>,
  prefix: string,
): readonly string[] {
  return paths.has("package.json") &&
    [...packageNames].some((name) => name.startsWith(prefix))
    ? ["package.json"]
    : [];
}

function present(paths: ReadonlySet<string>, path: string): readonly string[] {
  return paths.has(path) ? [path] : [];
}

export function collectStackEvidence(
  paths: ReadonlySet<string>,
  packageNames: ReadonlySet<string>,
  secretLikePath: (path: string) => boolean,
): StackEvidence {
  return {
    typescript: [
      ...namedPackage(paths, packageNames, "typescript"),
      ...present(paths, "tsconfig.json"),
    ],
    angular: [
      ...present(paths, "angular.json"),
      ...namedPackage(paths, packageNames, "@angular/core"),
    ],
    rust: [
      ...present(paths, "Cargo.toml"),
      ...present(paths, "src-tauri/Cargo.toml"),
    ],
    tauri: [
      ...present(paths, "src-tauri/Cargo.toml"),
      ...["src-tauri/tauri.conf.json", "src-tauri/tauri.conf.json5"].filter(
        (path) => paths.has(path),
      ),
      ...prefixedPackage(paths, packageNames, "@tauri-apps/"),
    ],
    nx: [
      ...present(paths, "nx.json"),
      ...present(paths, "workspace.json"),
      ...(paths.has("package.json") &&
      [...packageNames].some((name) => name === "nx" || name.startsWith("@nx/"))
        ? ["package.json"]
        : []),
    ],
    sqlite: [
      ...present(paths, "prisma/schema.prisma"),
      ...["migrations", "db"].filter((path) => paths.has(path)),
      ...(paths.has("package.json") &&
      [...packageNames].some((name) =>
        ["better-sqlite3", "sqlite3", "@libsql/client"].includes(name),
      )
        ? ["package.json"]
        : []),
    ],
    securitySensitive: [
      "src-tauri/src/stealth",
      "src-tauri/src/audio",
      "secrets",
      "credentials",
    ].filter((path) => paths.has(path) && !secretLikePath(path)),
  };
}
