import { createHash } from "node:crypto";
import type {
  TemplateManifest,
  StarterTemplateRegistry,
  ProjectBlueprint,
  ScaffoldPlan,
  ScaffoldFilePlan,
} from "@intentloom/protocol";
import {
  validateTemplateManifest,
  validateProjectBlueprint,
  validateScaffoldPlan,
} from "@intentloom/validator";

export function computeTemplateIntegrityHash(
  files: readonly ScaffoldFilePlan[],
): string {
  const sortedFiles = [...files].sort((a, b) => a.path.localeCompare(b.path));
  const payload = JSON.stringify(
    sortedFiles.map((f) => ({ path: f.path, content: f.content })),
  );
  return createHash("sha256").update(payload).digest("hex");
}

export function createTemplateRegistry(
  initialTemplates: readonly TemplateManifest[] = [],
): StarterTemplateRegistry {
  const validated = initialTemplates.map(validateTemplateManifest);
  return { templates: validated };
}

export function registerStarterTemplate(
  registry: StarterTemplateRegistry,
  manifest: TemplateManifest,
): StarterTemplateRegistry {
  const validated = validateTemplateManifest(manifest);
  const expectedHash = computeTemplateIntegrityHash(validated.files);

  if (validated.integrityHash !== expectedHash) {
    throw new Error(
      `Template integrity hash mismatch for '${validated.id}': expected '${expectedHash}', got '${validated.integrityHash}'`,
    );
  }

  const existingIndex = registry.templates.findIndex(
    (t) => t.id === validated.id,
  );
  const updatedTemplates = [...registry.templates];

  if (existingIndex >= 0) {
    updatedTemplates[existingIndex] = validated;
  } else {
    updatedTemplates.push(validated);
  }

  return { templates: updatedTemplates };
}

export function resolveStarterTemplate(
  registry: StarterTemplateRegistry,
  templateId: string,
): TemplateManifest {
  if (typeof templateId !== "string" || templateId.trim().length === 0) {
    throw new Error("resolveStarterTemplate requires a non-empty templateId");
  }

  const found = registry.templates.find((t) => t.id === templateId);
  if (!found) {
    throw new Error(`Starter template '${templateId}' not found in registry`);
  }

  return found;
}

export function buildTemplateScaffoldPlan(
  manifest: TemplateManifest,
  blueprint: ProjectBlueprint,
  root: string,
): ScaffoldPlan {
  const validatedManifest = validateTemplateManifest(manifest);
  const validatedBlueprint = validateProjectBlueprint(blueprint);

  if (typeof root !== "string" || root.trim().length === 0) {
    throw new Error("buildTemplateScaffoldPlan requires a non-empty root path");
  }

  const expectedHash = computeTemplateIntegrityHash(validatedManifest.files);
  if (validatedManifest.integrityHash !== expectedHash) {
    throw new Error(
      `Template integrity verification failed for '${validatedManifest.id}'`,
    );
  }

  const now = Date.now();
  const plan: ScaffoldPlan = {
    planId: `scaffold_template_${validatedManifest.id}_${now}`,
    root,
    blueprintDigest: validatedBlueprint.digest,
    files: validatedManifest.files,
    dependencies: ["typescript", "vitest"],
    scripts: {
      build: "tsc",
      test: "vitest run",
    },
    createdAt: now,
  };

  return validateScaffoldPlan(plan);
}
