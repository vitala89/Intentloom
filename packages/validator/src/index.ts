import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  Ajv2020,
  type ErrorObject,
  type ValidateFunction,
} from "ajv/dist/2020.js";
import { parseDocument } from "yaml";
import {
  checksum,
  normalizeOutputPath,
  parseAifConfig,
  parseSkill,
  type GeneratedFile,
} from "@aif/core";

export type ArtifactType =
  | "aif-config"
  | "manifest-lock"
  | "source-map"
  | "feature-brief"
  | "context-pack"
  | "change-request"
  | "technical-debt"
  | "agent-skill";
export type ArtifactFormat = "json" | "yaml" | "skill";

export interface ArtifactValidationInput {
  readonly artifactType: ArtifactType;
  readonly documentPath: string;
  readonly format: ArtifactFormat;
  readonly source: string;
  readonly skillPolicy?: "open-format" | "aif-catalog";
  readonly semanticContext?: {
    readonly previousDocument?: Readonly<Record<string, unknown>>;
    readonly knownFeatureIds?: readonly string[];
    readonly knownDocumentPaths?: readonly string[];
    readonly knownProjectPaths?: readonly string[];
  };
}

export interface ArtifactValidationIssue {
  readonly code: string;
  readonly message: string;
  readonly fieldPath: string;
}

export interface ArtifactValidationResult {
  readonly status: "valid" | "invalid";
  readonly artifactType: ArtifactType;
  readonly schemaId: string;
  readonly schemaVersion: string | null;
  readonly documentPath: string;
  readonly structuralErrors: readonly ArtifactValidationIssue[];
  readonly semanticErrors: readonly ArtifactValidationIssue[];
  readonly warnings: readonly ArtifactValidationIssue[];
  readonly document?: unknown;
}

export interface ArtifactValidator {
  validate(input: ArtifactValidationInput): ArtifactValidationResult;
}

export interface ArtifactValidatorPolicy {
  readonly supportedAdapters?: readonly string[];
  readonly knownProfiles?: readonly string[];
  readonly knownWorkflows?: readonly string[];
}

export interface SkillSetValidationResult {
  readonly results: readonly ArtifactValidationResult[];
  readonly errors: readonly ArtifactValidationIssue[];
}

export class SchemaCatalogError extends Error {
  constructor(
    readonly code: "schema-catalog-invalid" | "schema-reference-not-local",
    readonly schemaFile: string,
  ) {
    super(code);
  }
}

const schemaVersion = "1";
const schemaIds: Record<ArtifactType, string> = {
  "aif-config": `urn:aif:schema:aif-config:${schemaVersion}`,
  "manifest-lock": `urn:aif:schema:manifest-lock:${schemaVersion}`,
  "source-map": `urn:aif:schema:source-map:${schemaVersion}`,
  "feature-brief": `urn:aif:schema:feature-brief:${schemaVersion}`,
  "context-pack": `urn:aif:schema:context-pack:${schemaVersion}`,
  "change-request": `urn:aif:schema:change-request:${schemaVersion}`,
  "technical-debt": `urn:aif:schema:technical-debt:${schemaVersion}`,
  "agent-skill": `urn:aif:schema:agent-skill:${schemaVersion}`,
};
const schemaFiles: Record<ArtifactType, string> = {
  "aif-config": "aif-config.schema.json",
  "manifest-lock": "manifest-lock.schema.json",
  "source-map": "source-map.schema.json",
  "feature-brief": "feature-brief.schema.json",
  "context-pack": "context-pack.schema.json",
  "change-request": "change-request.schema.json",
  "technical-debt": "technical-debt.schema.json",
  "agent-skill": "agent-skill.schema.json",
};
const maximumDocumentBytes = 1024 * 1024;
const maximumDocumentDepth = 64;

class ParserFailure extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

function issue(
  code: string,
  message: string,
  fieldPath = "",
): ArtifactValidationIssue {
  return { code, message, fieldPath };
}

function invalidResult(
  input: ArtifactValidationInput,
  version: string | null,
  errors: readonly ArtifactValidationIssue[],
): ArtifactValidationResult {
  return {
    status: "invalid",
    artifactType: input.artifactType,
    schemaId: schemaIds[input.artifactType],
    schemaVersion: version,
    documentPath: input.documentPath,
    structuralErrors: errors,
    semanticErrors: [],
    warnings: [],
  };
}

function documentDepth(value: unknown, seen = new WeakSet<object>()): number {
  if (typeof value !== "object" || value === null) return 0;
  if (seen.has(value)) throw new ParserFailure("document-cycle");
  seen.add(value);
  const children = Array.isArray(value)
    ? value
    : Object.values(value as Record<string, unknown>);
  let depth = 1;
  for (const child of children)
    depth = Math.max(depth, 1 + documentDepth(child, seen));
  seen.delete(value);
  return depth;
}

function parseYaml(source: string): unknown {
  const document = parseDocument(source, {
    prettyErrors: false,
    schema: "core",
    strict: true,
    uniqueKeys: true,
  });
  const problem = [...document.errors, ...document.warnings][0];
  if (problem) {
    const code = String(problem.code);
    if (code === "DUPLICATE_KEY") throw new ParserFailure("yaml-duplicate-key");
    if (code.includes("TAG")) throw new ParserFailure("yaml-unsafe-tag");
    throw new ParserFailure("yaml-malformed");
  }
  return document.toJS({ maxAliasCount: 50 }) as unknown;
}

function skillParts(source: string): { frontmatter: unknown; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/u.exec(source);
  if (!match) throw new ParserFailure("skill-frontmatter-malformed");
  return { frontmatter: parseYaml(match[1]!), body: match[2]! };
}

function safeParse(input: ArtifactValidationInput): unknown {
  if (Buffer.byteLength(input.source, "utf8") > maximumDocumentBytes)
    throw new ParserFailure("document-too-large");
  const source = input.source.replace(/^\uFEFF/u, "");
  let value: unknown;
  if (input.format === "json") {
    try {
      value = JSON.parse(source) as unknown;
    } catch {
      throw new ParserFailure("json-malformed");
    }
  } else if (input.format === "skill") value = skillParts(source).frontmatter;
  else value = parseYaml(source);
  if (documentDepth(value) > maximumDocumentDepth)
    throw new ParserFailure("document-too-deep");
  return value;
}

function fieldPath(error: ErrorObject): string {
  if (error.keyword === "additionalProperties") {
    const property = error.params.additionalProperty;
    return `${error.instancePath}/${String(property).replaceAll("~", "~0").replaceAll("/", "~1")}`;
  }
  return error.instancePath;
}

function schemaIssue(error: ErrorObject): ArtifactValidationIssue {
  const code =
    error.keyword === "additionalProperties"
      ? "schema-unknown-property"
      : error.keyword === "required"
        ? "schema-required-property"
        : error.keyword === "type"
          ? "schema-type-mismatch"
          : "schema-constraint-failed";
  const message =
    error.keyword === "additionalProperties"
      ? "property is not allowed"
      : error.keyword === "required"
        ? "required property is missing"
        : error.keyword === "type"
          ? "property has the wrong type"
          : "property does not satisfy the schema";
  const path =
    error.keyword === "required"
      ? `${error.instancePath}/${String(error.params.missingProperty)}`
      : fieldPath(error);
  return issue(code, message, path);
}

export async function createArtifactValidator(
  schemaRoot: string,
  policy: ArtifactValidatorPolicy = {},
): Promise<ArtifactValidator> {
  const ajv = new Ajv2020({
    allErrors: true,
    coerceTypes: false,
    messages: false,
    strict: true,
    useDefaults: false,
  });
  const validators = new Map<ArtifactType, ValidateFunction>();
  for (const artifactType of Object.keys(schemaFiles) as ArtifactType[]) {
    const schemaFile = schemaFiles[artifactType];
    try {
      const schema = JSON.parse(
        await readFile(resolve(schemaRoot, schemaFile), "utf8"),
      ) as object;
      const visit = (value: unknown): void => {
        if (typeof value !== "object" || value === null) return;
        for (const [key, child] of Object.entries(value)) {
          if (
            key === "$ref" &&
            typeof child === "string" &&
            !child.startsWith("#")
          )
            throw new SchemaCatalogError(
              "schema-reference-not-local",
              schemaFile,
            );
          visit(child);
        }
      };
      visit(schema);
      validators.set(artifactType, ajv.compile(schema));
    } catch (error) {
      if (error instanceof SchemaCatalogError) throw error;
      throw new SchemaCatalogError("schema-catalog-invalid", schemaFile);
    }
  }
  return {
    validate(input) {
      let document: unknown;
      try {
        document = safeParse(input);
      } catch (error) {
        const code =
          error instanceof ParserFailure
            ? error.code
            : input.format === "json"
              ? "json-malformed"
              : "yaml-malformed";
        return invalidResult(input, null, [
          issue(code, "document could not be parsed safely"),
        ]);
      }
      if (
        typeof document !== "object" ||
        document === null ||
        Array.isArray(document)
      )
        return invalidResult(input, null, [
          issue("document-object-required", "document must be an object"),
        ]);
      const declaredVersion = (document as Record<string, unknown>)
        .schemaVersion;
      const version =
        input.artifactType === "agent-skill" ? schemaVersion : declaredVersion;
      if (typeof version !== "string")
        return invalidResult(input, null, [
          issue(
            "schema-version-missing",
            "required schema version is missing",
            "/schemaVersion",
          ),
        ]);
      if (version !== schemaVersion)
        return invalidResult(input, version, [
          issue(
            "schema-version-unsupported",
            "schema version is not supported",
            "/schemaVersion",
          ),
        ]);
      const validateSchema = validators.get(input.artifactType)!;
      const valid = validateSchema(document);
      if (!valid)
        return invalidResult(
          input,
          version,
          [...(validateSchema.errors ?? [])]
            .sort((left, right) =>
              `${fieldPath(left)}:${left.keyword}`.localeCompare(
                `${fieldPath(right)}:${right.keyword}`,
              ),
            )
            .map(schemaIssue),
        );
      const semanticErrors: ArtifactValidationIssue[] = [];
      if (input.artifactType === "aif-config") {
        const config = document as Record<string, unknown>;
        const selectedAdapters = config.adapters as string[];
        const selectedWorkflows =
          (config.workflows as string[] | undefined) ?? [];
        if (
          policy.knownProfiles &&
          !policy.knownProfiles.includes(config.profile as string)
        )
          semanticErrors.push(
            issue(
              "profile-unsupported",
              "selected project profile is not available",
              "/profile",
            ),
          );
        if (
          policy.supportedAdapters &&
          selectedAdapters.some(
            (adapter) => !policy.supportedAdapters!.includes(adapter),
          )
        )
          semanticErrors.push(
            issue(
              "adapter-capability-unsupported",
              "selected adapter is not supported by this runtime",
              "/adapters",
            ),
          );
        if (
          policy.knownWorkflows &&
          selectedWorkflows.some(
            (workflow) => !policy.knownWorkflows!.includes(workflow),
          )
        )
          semanticErrors.push(
            issue(
              "workflow-unsupported",
              "enabled workflow is not available",
              "/workflows",
            ),
          );
      }
      if (
        input.artifactType === "manifest-lock" ||
        input.artifactType === "source-map"
      ) {
        const metadata = document as Record<string, unknown>;
        const records = metadata[
          input.artifactType === "manifest-lock" ? "generated" : "files"
        ] as readonly Record<string, unknown>[];
        const destinations = new Set<string>();
        for (const record of records) {
          const path = String(record.path);
          const key = path.normalize("NFC").toLowerCase();
          if (destinations.has(key)) {
            semanticErrors.push(
              issue(
                "metadata-duplicate-destination",
                "metadata destinations must be unique after normalization",
              ),
            );
            break;
          }
          destinations.add(key);
        }
      }
      if (input.artifactType === "manifest-lock") {
        const manifest = document as Record<string, unknown>;
        for (const [field, code] of [
          ["adapters", "manifest-duplicate-adapter"],
          ["sourceHashes", "manifest-duplicate-source"],
        ] as const) {
          const identifiers = new Set<string>();
          for (const entry of manifest[field] as { id: string }[]) {
            if (identifiers.has(entry.id)) {
              semanticErrors.push(
                issue(code, `${field} identifiers must be unique`, `/${field}`),
              );
              break;
            }
            identifiers.add(entry.id);
          }
        }
      }
      if (input.artifactType === "context-pack") {
        const pack = document as Record<string, unknown>;
        const mustRead = new Set(
          Array.isArray(pack.mustRead) ? pack.mustRead : [],
        );
        const overlap = (
          Array.isArray(pack.excluded) ? pack.excluded : []
        ).filter((path) => mustRead.has(path));
        if (overlap.length > 0)
          semanticErrors.push(
            issue(
              "context-path-set-overlap",
              "a path cannot be both required and excluded",
              "/excluded",
            ),
          );
      }
      const previous = input.semanticContext?.previousDocument;
      const transitionRules: Partial<
        Record<
          ArtifactType,
          {
            field: string;
            allowed: Readonly<Record<string, readonly string[]>>;
          }
        >
      > = {
        "feature-brief": {
          field: "status",
          allowed: {
            draft: ["approved", "cancelled"],
            approved: ["in-progress", "cancelled"],
            "in-progress": ["blocked", "done", "cancelled"],
            blocked: ["in-progress", "cancelled"],
            done: [],
            cancelled: [],
          },
        },
        "change-request": {
          field: "decision",
          allowed: {
            pending: ["accepted", "deferred", "rejected"],
            accepted: [],
            deferred: ["pending"],
            rejected: [],
          },
        },
        "technical-debt": {
          field: "status",
          allowed: {
            accepted: ["active", "rejected"],
            active: ["scheduled", "resolved"],
            scheduled: ["active", "resolved"],
            resolved: [],
            rejected: [],
          },
        },
      };
      const transition = transitionRules[input.artifactType];
      if (previous && transition) {
        const before = previous[transition.field];
        const after = (document as Record<string, unknown>)[transition.field];
        if (
          typeof before === "string" &&
          typeof after === "string" &&
          before !== after &&
          !transition.allowed[before]?.includes(after)
        )
          semanticErrors.push(
            issue(
              "lifecycle-transition-invalid",
              "artifact lifecycle transition is not allowed",
              `/${transition.field}`,
            ),
          );
      }
      if (input.artifactType === "feature-brief") {
        const reference = (document as Record<string, unknown>).contextPack;
        if (
          input.semanticContext?.knownDocumentPaths &&
          !input.semanticContext.knownDocumentPaths.includes(
            reference as string,
          )
        )
          semanticErrors.push(
            issue(
              "feature-reference-missing",
              "referenced context pack is not available",
              "/contextPack",
            ),
          );
      }
      if (
        input.artifactType === "change-request" ||
        input.artifactType === "technical-debt"
      ) {
        const reference = (document as Record<string, unknown>).relatedFeature;
        if (
          input.semanticContext?.knownFeatureIds &&
          !input.semanticContext.knownFeatureIds.includes(reference as string)
        )
          semanticErrors.push(
            issue(
              "feature-reference-missing",
              "related feature is not available",
              "/relatedFeature",
            ),
          );
      }
      if (input.artifactType === "technical-debt") {
        const paths = (document as Record<string, unknown>)
          .relatedFiles as string[];
        if (
          input.semanticContext?.knownProjectPaths &&
          paths.some(
            (path) => !input.semanticContext!.knownProjectPaths!.includes(path),
          )
        )
          semanticErrors.push(
            issue(
              "related-file-missing",
              "related file is not available in the project",
              "/relatedFiles",
            ),
          );
      }
      if (input.artifactType === "agent-skill") {
        const { body } = skillParts(input.source.replace(/^\uFEFF/u, ""));
        const declaredName = (document as Record<string, unknown>).name;
        const parts = input.documentPath.replaceAll("\\", "/").split("/");
        const parentName = parts.at(-2);
        if (typeof declaredName === "string" && parentName !== declaredName)
          semanticErrors.push(
            issue(
              "skill-directory-name-mismatch",
              "skill name must match its parent directory",
              "/name",
            ),
          );
        if (input.skillPolicy === "aif-catalog") {
          const requiredSections = [
            ["skill-trigger-required", /^## Trigger\s*$/mu],
            ["skill-inputs-required", /^## Inputs\s*$/mu],
            ["skill-outputs-required", /^## (?:Exact outputs|Outputs)\s*$/mu],
            ["skill-stop-condition-required", /^## Stop conditions?\s*$/mu],
          ] as const;
          for (const [code, pattern] of requiredSections)
            if (!pattern.test(body))
              semanticErrors.push(
                issue(code, "required AIF policy section is missing"),
              );
          if (!/Do not trigger/iu.test(body))
            semanticErrors.push(
              issue(
                "skill-non-trigger-required",
                "AIF skills require an explicit non-trigger condition",
              ),
            );
        }
        const references = [
          ...body.matchAll(/\]\(([^)\s]+)(?:\s+[^)]*)?\)/gu),
          ...body.matchAll(
            /(?:^|\s)((?:references|scripts|assets|\.\.?\/)\/??[^\s)]+)/gmu,
          ),
        ];
        for (const reference of references) {
          const rawPath = reference[1]!.replace(/^<|>$/gu, "");
          if (/^(?:https?|mailto):/iu.test(rawPath) || rawPath.startsWith("#"))
            continue;
          let path = rawPath;
          try {
            path = decodeURIComponent(rawPath).split(/[?#]/u, 1)[0]!;
          } catch {
            /* malformed escapes are rejected as unsafe local references */
          }
          if (
            path.startsWith("/") ||
            path.includes("\\") ||
            /^[A-Za-z]:/u.test(path) ||
            /^[A-Za-z][A-Za-z0-9+.-]*:/u.test(path) ||
            path.split("/").some((part) => part === "..")
          )
            semanticErrors.push(
              issue(
                "skill-reference-escape",
                "skill reference must remain inside the skill directory",
              ),
            );
        }
      }
      return {
        status: semanticErrors.length === 0 ? "valid" : "invalid",
        artifactType: input.artifactType,
        schemaId: schemaIds[input.artifactType],
        schemaVersion: version,
        documentPath: input.documentPath,
        structuralErrors: [],
        semanticErrors,
        warnings: [],
        document,
      };
    },
  };
}

export function validateSkillSet(
  validator: ArtifactValidator,
  documents: readonly { readonly path: string; readonly content: string }[],
  options: { readonly aifCatalogPolicy?: boolean } = {},
): SkillSetValidationResult {
  const results = documents.map((document) =>
    validator.validate({
      artifactType: "agent-skill",
      documentPath: document.path,
      format: "skill",
      source: document.content,
      skillPolicy: options.aifCatalogPolicy ? "aif-catalog" : "open-format",
    }),
  );
  const errors: ArtifactValidationIssue[] = [];
  if (!options.aifCatalogPolicy) return { results, errors };
  const names = new Map<string, string>();
  for (const result of results) {
    if (
      result.status === "invalid" ||
      typeof result.document !== "object" ||
      result.document === null
    )
      continue;
    const name = (result.document as Record<string, unknown>).name;
    if (typeof name !== "string") continue;
    if (names.has(name))
      errors.push(
        issue(
          "duplicate-skill-name",
          "skill names must be unique within the catalog",
          "/name",
        ),
      );
    else names.set(name, result.documentPath);
  }
  return { results, errors };
}

export interface Diagnostic {
  readonly code: string;
  readonly message: string;
  readonly path?: string;
}

export function validateSkillDocuments(
  documents: readonly { path: string; content: string }[],
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const names = new Map<string, string>();
  for (const document of documents) {
    try {
      const skill = parseSkill(document.path, document.content);
      const previous = names.get(skill.name);
      if (previous)
        diagnostics.push({
          code: "duplicate-skill-name",
          path: document.path,
          message: `${skill.name} also appears in ${previous}`,
        });
      else names.set(skill.name, document.path);
    } catch (error) {
      diagnostics.push({
        code: "malformed-skill",
        path: document.path,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return diagnostics;
}

export function validateConfigDocument(value: string): Diagnostic[] {
  try {
    parseAifConfig(value);
    return [];
  } catch (error) {
    return [
      {
        code: "invalid-config",
        message: error instanceof Error ? error.message : String(error),
      },
    ];
  }
}

export function validateGeneratedFiles(
  files: readonly GeneratedFile[],
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const destinations = new Set<string>();
  for (const file of files) {
    try {
      normalizeOutputPath(file.path);
    } catch (error) {
      diagnostics.push({
        code: "path-traversal",
        path: file.path,
        message: String(error),
      });
    }
    if (destinations.has(file.path))
      diagnostics.push({
        code: "conflicting-destination",
        path: file.path,
        message: "more than one file has this destination",
      });
    destinations.add(file.path);
    if (file.sources.length === 0)
      diagnostics.push({
        code: "missing-source-attribution",
        path: file.path,
        message: "generated files require canonical sources",
      });
    if (checksum(file.content) !== file.checksum)
      diagnostics.push({
        code: "stale-generated-checksum",
        path: file.path,
        message: "generated content has changed",
      });
  }
  return diagnostics;
}

export function validateManifest(value: unknown): Diagnostic[] {
  if (typeof value !== "object" || value === null)
    return [
      { code: "invalid-manifest", message: "manifest must be an object" },
    ];
  const manifest = value as Record<string, unknown>;
  return typeof manifest.lockVersion === "string" &&
    typeof manifest.frameworkVersion === "string"
    ? []
    : [
        {
          code: "invalid-manifest",
          message: "manifest requires lockVersion and frameworkVersion",
        },
      ];
}

export function validateCanonicalReferences(
  references: readonly string[],
  knownSources: readonly string[],
): Diagnostic[] {
  const known = new Set(knownSources);
  return references
    .filter((reference) => !known.has(reference))
    .map((reference) => ({
      code: "broken-canonical-reference",
      path: reference,
      message: "reference does not exist in the supplied canonical catalog",
    }));
}
