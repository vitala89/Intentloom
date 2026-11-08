import { parse } from "yaml";
import type {
  SkillCatalogMetadata,
  SkillExecutionContract,
  SkillProcedure,
  TrustClass,
} from "@intentloom/protocol";
import { extractMarkdownSection } from "../skill-markdown.js";

export function parseSkillProgressive(
  id: string,
  content: string,
): {
  catalog: SkillCatalogMetadata;
  contract: SkillExecutionContract;
  procedure: SkillProcedure;
} {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/u.exec(content);
  const frontmatterStr = match ? (match[1] ?? "") : "";
  const body = match ? (match[2] ?? "") : content;

  let fields: Record<string, unknown> = {};
  if (frontmatterStr.trim().length > 0) {
    try {
      const parsed = parse(frontmatterStr) as unknown;
      if (typeof parsed === "object" && parsed !== null) {
        fields = parsed as Record<string, unknown>;
      }
    } catch {
      // fallback to empty frontmatter
    }
  }

  const name = typeof fields.name === "string" ? fields.name : id;
  const description =
    typeof fields.description === "string" ? fields.description : `Skill ${id}`;
  const version = typeof fields.version === "string" ? fields.version : "1.0.0";
  const packs = Array.isArray(fields.packs)
    ? fields.packs.filter((p): p is string => typeof p === "string")
    : ["all"];
  const roles = Array.isArray(fields.roles)
    ? fields.roles.filter((r): r is string => typeof r === "string")
    : ["engineer"];
  const trustClass: TrustClass =
    typeof fields.trustClass === "string" &&
    [
      "canonical-policy",
      "verified-evidence",
      "user-supplied",
      "agent-generated",
    ].includes(fields.trustClass)
      ? (fields.trustClass as TrustClass)
      : "canonical-policy";
  const compatibility = Array.isArray(fields.compatibility)
    ? fields.compatibility.filter((c): c is string => typeof c === "string")
    : ["v1.0"];
  const capabilities = Array.isArray(fields.capabilities)
    ? fields.capabilities.filter((c): c is string => typeof c === "string")
    : [id];
  const permissions = Array.isArray(fields.permissions)
    ? fields.permissions.filter((p): p is string => typeof p === "string")
    : [];

  const catalogCost = Math.ceil(
    (name.length + description.length + id.length + 50) / 4,
  );
  const contractCost = catalogCost + Math.ceil(body.length / 8);
  const procedureCost = Math.ceil(content.length / 4);

  const catalog: SkillCatalogMetadata = {
    level: "catalog",
    id,
    name,
    version,
    description,
    packs,
    roles,
    trustClass,
    compatibility,
    capabilities,
    permissions,
    contextCost: {
      catalogCost,
      contractCost,
      procedureCost,
    },
  };

  const inputs: { name: string; description: string; required: boolean }[] = [];
  const inputsSection = extractMarkdownSection(body, "Inputs");
  if (inputsSection) {
    const lines = inputsSection
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.startsWith("-"));
    for (const line of lines) {
      const text = line.replace(/^- /, "").trim();
      inputs.push({
        name: text.split(" ")[0] ?? "input",
        description: text,
        required: true,
      });
    }
  }

  const outputs: { name: string; description: string }[] = [];
  const outputsSection = extractMarkdownSection(body, "Exact outputs");
  if (outputsSection) {
    const lines = outputsSection
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    for (const line of lines) {
      outputs.push({
        name: "output",
        description: line.replace(/^- /, ""),
      });
    }
  }

  const triggers: string[] = [];
  const triggerSection = extractMarkdownSection(body, "Trigger");
  if (triggerSection) {
    triggers.push(triggerSection.trim());
  }

  const contract: SkillExecutionContract = {
    ...catalog,
    level: "contract",
    inputs,
    outputs,
    triggers,
    toolRequirements: [],
    executionConstraints: [],
  };

  const procedure: SkillProcedure = {
    ...contract,
    level: "procedure",
    content,
  };

  return { catalog, contract, procedure };
}
