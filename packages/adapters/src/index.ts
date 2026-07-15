import {
  type AdapterName,
  checksum,
  type Catalog,
  generatedHeader,
  type GeneratedFile,
  normalizeOutputPath,
  storedPathCollisionKey,
} from "@intentloom/core";

export interface AdapterResult {
  readonly adapter: AdapterName;
  readonly contract: AdapterContract;
  readonly files: readonly GeneratedFile[];
  readonly unsupported: readonly string[];
}

export interface MultiAdapterResult {
  readonly adapters: readonly AdapterName[];
  readonly contracts: readonly AdapterContract[];
  readonly files: readonly GeneratedFile[];
  readonly unsupported: readonly string[];
  readonly experimental: readonly string[];
}

export interface AdapterGenerationOptions {
  readonly profile?: string;
}

const adapterVersion = "0.1.0";

function versionedHeader(sources: readonly string[], body: string): string {
  return `${generatedHeader(sources, body).trimEnd()}\n# Intentloom adapter output version: ${adapterVersion}\n\n`;
}

function versionedFile(
  path: string,
  body: string,
  sources: readonly string[],
): GeneratedFile {
  const normalizedPath = normalizeOutputPath(path);
  const content = `${versionedHeader(sources, body)}${body}`;
  return {
    path: normalizedPath,
    content,
    sources,
    checksum: checksum(content),
  };
}

function frontmatterFile(
  path: string,
  frontmatter: string,
  body: string,
  sources: readonly string[],
): GeneratedFile {
  const normalizedPath = normalizeOutputPath(path);
  const content = `${frontmatter.trimEnd()}\n\n${versionedHeader(sources, body)}${body}`;
  return {
    path: normalizedPath,
    content,
    sources,
    checksum: checksum(content),
  };
}

export type AdapterCapability =
  | "repository-instructions"
  | "shared-agents-guidance"
  | "nested-instructions"
  | "agent-skills"
  | "path-scoped-instructions"
  | "custom-agents"
  | "hooks"
  | "permissions"
  | "user-configuration"
  | "ignore-files"
  | "legacy-rules"
  | "environment-capability";

export interface AdapterContract {
  readonly id: AdapterName;
  readonly outputVersion: string;
  readonly supportedCapabilities: readonly AdapterCapability[];
  readonly sharedStandardCapabilities: readonly AdapterCapability[];
  readonly experimentalCapabilities: readonly AdapterCapability[];
  readonly unsupportedCapabilities: readonly AdapterCapability[];
  readonly canonicalSourceKinds: readonly ("policy" | "skill")[];
  readonly canonicalSourceReferences: readonly string[];
  readonly generatedDestinationPatterns: readonly string[];
  readonly destinationOwnership: "aif-owned-generated";
  readonly requiredGeneratedHeader: true;
  readonly schemaValidation: "generated-file";
  readonly deterministicGeneration: true;
  readonly compatibilityNotes: readonly string[];
  readonly migrationNotes: readonly string[];
}

const sharedMigrationNote =
  "Adapter removal reports owned outputs as stale and never deletes them implicitly.";

const contracts: Readonly<Record<AdapterName, AdapterContract>> = {
  claude: {
    id: "claude",
    outputVersion: adapterVersion,
    supportedCapabilities: ["repository-instructions", "agent-skills"],
    sharedStandardCapabilities: ["shared-agents-guidance"],
    experimentalCapabilities: [],
    unsupportedCapabilities: ["hooks", "permissions", "custom-agents"],
    canonicalSourceKinds: ["policy", "skill"],
    canonicalSourceReferences: ["policies/*.md", "skills/*/SKILL.md"],
    generatedDestinationPatterns: [
      ".claude/skills/<skill>/SKILL.md",
      "AGENTS.md",
      "CLAUDE.md",
    ],
    destinationOwnership: "aif-owned-generated",
    requiredGeneratedHeader: true,
    schemaValidation: "generated-file",
    deterministicGeneration: true,
    compatibilityNotes: [
      "CLAUDE.md imports the shared root AGENTS.md guidance.",
    ],
    migrationNotes: [sharedMigrationNote],
  },
  codex: {
    id: "codex",
    outputVersion: adapterVersion,
    supportedCapabilities: ["repository-instructions", "agent-skills"],
    sharedStandardCapabilities: [],
    experimentalCapabilities: [],
    unsupportedCapabilities: [
      "nested-instructions",
      "user-configuration",
      "custom-agents",
    ],
    canonicalSourceKinds: ["policy", "skill"],
    canonicalSourceReferences: ["policies/*.md", "skills/*/SKILL.md"],
    generatedDestinationPatterns: [
      ".agents/skills/<skill>/SKILL.md",
      "AGENTS.md",
    ],
    destinationOwnership: "aif-owned-generated",
    requiredGeneratedHeader: true,
    schemaValidation: "generated-file",
    deterministicGeneration: true,
    compatibilityNotes: [
      "Nested AGENTS.md files are supported by Codex but require an explicit project profile mapping.",
    ],
    migrationNotes: [sharedMigrationNote],
  },
  cursor: {
    id: "cursor",
    outputVersion: adapterVersion,
    supportedCapabilities: [
      "repository-instructions",
      "path-scoped-instructions",
    ],
    sharedStandardCapabilities: ["shared-agents-guidance"],
    experimentalCapabilities: ["agent-skills"],
    unsupportedCapabilities: ["legacy-rules", "ignore-files"],
    canonicalSourceKinds: ["policy", "skill"],
    canonicalSourceReferences: ["policies/*.md", "skills/*/SKILL.md"],
    generatedDestinationPatterns: [
      ".agents/skills/<skill>/SKILL.md",
      ".cursor/rules/*.mdc",
      "AGENTS.md",
    ],
    destinationOwnership: "aif-owned-generated",
    requiredGeneratedHeader: true,
    schemaValidation: "generated-file",
    deterministicGeneration: true,
    compatibilityNotes: [
      "Project rules use the current MDC format; Agent Skills output is experimental.",
    ],
    migrationNotes: [sharedMigrationNote],
  },
  copilot: {
    id: "copilot",
    outputVersion: adapterVersion,
    supportedCapabilities: [
      "repository-instructions",
      "path-scoped-instructions",
      "agent-skills",
    ],
    sharedStandardCapabilities: ["shared-agents-guidance"],
    experimentalCapabilities: ["custom-agents"],
    unsupportedCapabilities: ["environment-capability"],
    canonicalSourceKinds: ["policy", "skill"],
    canonicalSourceReferences: ["policies/*.md", "skills/*/SKILL.md"],
    generatedDestinationPatterns: [
      ".github/copilot-instructions.md",
      ".github/instructions/*.instructions.md",
      ".github/skills/<skill>/SKILL.md",
      "AGENTS.md",
    ],
    destinationOwnership: "aif-owned-generated",
    requiredGeneratedHeader: true,
    schemaValidation: "generated-file",
    deterministicGeneration: true,
    compatibilityNotes: [
      "Copilot instruction and agent surfaces vary by environment; Intentloom emits only portable repository instructions.",
    ],
    migrationNotes: [sharedMigrationNote],
  },
};

export function getAdapterContract(adapter: AdapterName): AdapterContract {
  return contracts[adapter];
}

function sharedInstructions(catalog: Catalog): string {
  return [
    "# Intentloom project guidance",
    "",
    "Follow the generated Intentloom policies and use focused skills for task-specific workflows.",
    "Do not edit generated files manually; update the canonical catalog and regenerate.",
    "",
    "## Canonical policy sources",
    ...catalog.policies.map((source) => `- ${source}`),
    "",
  ].join("\n");
}

function skillFiles(catalog: Catalog, directory: string): GeneratedFile[] {
  return catalog.skills.map((skill) => {
    const marker = "---\n";
    const end = skill.content.indexOf(marker, marker.length);
    if (!skill.content.startsWith(marker) || end < 0)
      throw new Error(`invalid canonical skill: ${skill.sourcePath}`);
    const frontmatter = skill.content.slice(0, end + marker.length);
    const instructions = skill.content.slice(end + marker.length);
    const content = `${frontmatter}\n${versionedHeader([skill.sourcePath], instructions)}${instructions}`;
    const path = normalizeOutputPath(`${directory}/${skill.name}/SKILL.md`);
    return {
      path,
      content,
      sources: [skill.sourcePath],
      checksum: checksum(content),
    };
  });
}

const profileGlobs: Readonly<Record<string, string>> = {
  typescript: "**/*.ts,**/*.tsx",
  angular: "**/*.ts,**/*.html",
  rust: "**/*.rs",
  tauri: "src-tauri/**",
  "angular-tauri": "**/*.ts,**/*.html,src-tauri/**",
};

function profileFile(
  adapter: "cursor" | "copilot",
  profile: string | undefined,
  canonicalSources: readonly string[],
): GeneratedFile[] {
  if (profile === undefined || profile === "generic") return [];
  const globs = profileGlobs[profile];
  if (globs === undefined) return [];
  const body = `Apply the shared Intentloom project guidance to the ${profile} profile paths.\n`;
  return adapter === "cursor"
    ? [
        frontmatterFile(
          `.cursor/rules/intentloom-${profile}.mdc`,
          `---\ndescription: Intentloom ${profile} profile guidance\nglobs: "${globs}"\nalwaysApply: false\n---`,
          body,
          canonicalSources,
        ),
      ]
    : [
        frontmatterFile(
          `.github/instructions/intentloom-${profile}.instructions.md`,
          `---\napplyTo: "${globs}"\n---`,
          body,
          canonicalSources,
        ),
      ];
}

export function generateAdapter(
  adapter: AdapterName,
  catalog: Catalog,
  options: AdapterGenerationOptions = {},
): AdapterResult {
  const common = sharedInstructions(catalog);
  switch (adapter) {
    case "claude":
      return {
        adapter,
        contract: getAdapterContract(adapter),
        files: [
          versionedFile("AGENTS.md", common, catalog.policies),
          versionedFile("CLAUDE.md", "@AGENTS.md\n", catalog.policies),
          ...skillFiles(catalog, ".claude/skills"),
        ],
        unsupported: ["hooks and permissions are intentionally not generated"],
      };
    case "codex":
      return {
        adapter,
        contract: getAdapterContract(adapter),
        files: [
          versionedFile("AGENTS.md", common, catalog.policies),
          ...skillFiles(catalog, ".agents/skills"),
        ],
        unsupported: [".codex/config.toml is intentionally not generated"],
      };
    case "cursor":
      return {
        adapter,
        contract: getAdapterContract(adapter),
        files: [
          versionedFile("AGENTS.md", common, catalog.policies),
          frontmatterFile(
            ".cursor/rules/intentloom-core.mdc",
            "---\ndescription: Intentloom shared project guidance\nalwaysApply: true\n---",
            common,
            catalog.policies,
          ),
          ...profileFile("cursor", options.profile, catalog.policies),
          ...skillFiles(catalog, ".agents/skills"),
        ],
        unsupported: [
          ".cursorignore is profile-optional and not generated by the generic adapter",
          "legacy .cursorrules is unsupported",
        ],
      };
    case "copilot":
      return {
        adapter,
        contract: getAdapterContract(adapter),
        files: [
          versionedFile("AGENTS.md", common, catalog.policies),
          versionedFile(
            ".github/copilot-instructions.md",
            common,
            catalog.policies,
          ),
          frontmatterFile(
            ".github/instructions/intentloom.instructions.md",
            '---\napplyTo: "**"\n---',
            common,
            catalog.policies,
          ),
          ...profileFile("copilot", options.profile, catalog.policies),
          ...skillFiles(catalog, ".github/skills"),
        ],
        unsupported: [
          "custom agents are not generated because support differs by Copilot environment",
        ],
      };
  }
}

export function generateAllAdapters(
  catalog: Catalog,
): readonly AdapterResult[] {
  return (["claude", "codex", "cursor", "copilot"] as const).map((adapter) =>
    generateAdapter(adapter, catalog),
  );
}

export function generateAdapters(
  adapters: readonly AdapterName[],
  catalog: Catalog,
  options: AdapterGenerationOptions = {},
): MultiAdapterResult {
  const selected = [...new Set(adapters)].sort();
  const results = selected.map((adapter) =>
    generateAdapter(adapter, catalog, options),
  );
  return mergeAdapterResults(results);
}

export function mergeAdapterResults(
  results: readonly AdapterResult[],
): MultiAdapterResult {
  const ordered = [...results].sort((left, right) =>
    left.adapter.localeCompare(right.adapter),
  );
  const files = new Map<string, GeneratedFile>();
  for (const result of ordered)
    for (const file of result.files) {
      const key = storedPathCollisionKey(file.path);
      const previous = files.get(key);
      if (previous === undefined) files.set(key, file);
      else if (
        previous.path !== file.path ||
        previous.content !== file.content ||
        previous.checksum !== file.checksum ||
        previous.sources.join("\0") !== file.sources.join("\0")
      )
        throw new Error(`adapter destination conflict: ${key}`);
    }
  return {
    adapters: [...new Set(ordered.map((result) => result.adapter))],
    contracts: [
      ...new Map(
        ordered.map((result) => [result.adapter, result.contract] as const),
      ).values(),
    ],
    files: [...files.values()].sort((left, right) =>
      left.path.localeCompare(right.path),
    ),
    unsupported: ordered
      .flatMap((result) =>
        result.unsupported.map((message) => `${result.adapter}: ${message}`),
      )
      .sort(),
    experimental: ordered
      .flatMap((result) =>
        result.contract.experimentalCapabilities.map(
          (capability) => `${result.adapter}: ${capability}`,
        ),
      )
      .sort(),
  };
}

export { adapterVersion };
