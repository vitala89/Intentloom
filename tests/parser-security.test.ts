import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  createArtifactValidator,
  type ArtifactValidator,
} from "@aif/validator";

let validator: ArtifactValidator;
beforeAll(async () => {
  validator = await createArtifactValidator(resolve("catalog/schemas"));
});

function config(source: string, format: "json" | "yaml" = "yaml") {
  return validator.validate({
    artifactType: "aif-config",
    documentPath: ".aif/config.yaml",
    format,
    source,
  });
}

describe("safe artifact parsing", () => {
  it("rejects malformed JSON", () =>
    expect(config('{"schemaVersion":', "json").structuralErrors[0]?.code).toBe(
      "json-malformed",
    ));
  it("rejects malformed YAML", () =>
    expect(config("schemaVersion: [", "yaml").structuralErrors[0]?.code).toBe(
      "yaml-malformed",
    ));
  it("rejects duplicate YAML keys", () =>
    expect(
      config("schemaVersion: '1'\nprofile: a\nprofile: b\nadapters: [codex]\n")
        .structuralErrors[0]?.code,
    ).toBe("yaml-duplicate-key"));
  it("rejects unsafe YAML tags", () =>
    expect(
      config("schemaVersion: '1'\nprofile: !unsafe value\nadapters: [codex]\n")
        .structuralErrors[0]?.code,
    ).toBe("yaml-unsafe-tag"));
  it("supports bounded YAML aliases", () =>
    expect(
      config(
        "schemaVersion: '1'\nprofile: &profile generic\nadapters: [codex]\nlocalOverrides: [*profile]\n",
      ).status,
    ).toBe("valid"));
  it("rejects excessive nesting", () => {
    let nested: unknown = "value";
    for (let index = 0; index < 70; index += 1) nested = { child: nested };
    expect(
      config(JSON.stringify(nested), "json").structuralErrors[0]?.code,
    ).toBe("document-too-deep");
  });
  it("rejects oversized documents", () =>
    expect(
      config(
        `schemaVersion: '1'\nprofile: generic\nadapters: [codex]\npadding: ${"x".repeat(1024 * 1024)}\n`,
      ).structuralErrors[0]?.code,
    ).toBe("document-too-large"));
  it("rejects null documents", () =>
    expect(config("null", "json").structuralErrors[0]?.code).toBe(
      "document-object-required",
    ));
  it("rejects scalar documents", () =>
    expect(config("scalar", "yaml").structuralErrors[0]?.code).toBe(
      "document-object-required",
    ));
  it("accepts a BOM-prefixed document", () =>
    expect(
      config("\uFEFFschemaVersion: '1'\nprofile: generic\nadapters: [codex]\n")
        .status,
    ).toBe("valid"));
  it("accepts Unicode field values where allowed", () => {
    const document = {
      schemaVersion: "1",
      id: "TD-1",
      status: "active",
      severity: "low",
      area: "validation",
      description: "Überprüfung 安全",
      reasonAccepted: "now",
      workaround: "manual",
      doNot: "bypass",
      risk: "low",
      resolutionTrigger: "release",
      relatedFeature: "F-1",
      relatedFiles: [],
    };
    expect(
      validator.validate({
        artifactType: "technical-debt",
        documentPath: "plans/debt.json",
        format: "json",
        source: JSON.stringify(document),
      }).status,
    ).toBe("valid");
  });
  it("does not echo secret-looking values or the complete document", () => {
    const secret = "SUPER-SECRET-PRIVATE-VALUE";
    const outcome = config(
      `schemaVersion: '1'\nprofile: generic\nadapters: [codex]\napiToken: ${secret}\n`,
    );
    expect(JSON.stringify(outcome)).not.toContain(secret);
    expect(JSON.stringify(outcome)).not.toContain("apiToken:");
  });
});
