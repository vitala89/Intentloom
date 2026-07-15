import { cp, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createArtifactValidator,
  SchemaCatalogError,
} from "@intentloom/validator";

describe("local schema catalog", () => {
  it("compiles every bundled schema without remote references", async () => {
    await expect(
      createArtifactValidator(resolve("catalog/schemas")),
    ).resolves.toBeDefined();
  });
  it("reports a broken local reference without a raw library error", async () => {
    const root = await mkdtemp(join(tmpdir(), "aif-schema-catalog-"));
    await cp(resolve("catalog/schemas"), root, { recursive: true });
    const path = join(root, "aif-config.schema.json");
    const schema = JSON.parse(await readFile(path, "utf8"));
    schema.properties.profile = { $ref: "#/$defs/missing" };
    await writeFile(path, JSON.stringify(schema), "utf8");
    await expect(
      createArtifactValidator(root),
    ).rejects.toMatchObject<SchemaCatalogError>({
      code: "schema-catalog-invalid",
      schemaFile: "aif-config.schema.json",
    });
  });
  it("rejects remote schema references", async () => {
    const root = await mkdtemp(join(tmpdir(), "aif-schema-catalog-"));
    await cp(resolve("catalog/schemas"), root, { recursive: true });
    const path = join(root, "aif-config.schema.json");
    const schema = JSON.parse(await readFile(path, "utf8"));
    schema.properties.profile = { $ref: "https://example.com/schema.json" };
    await writeFile(path, JSON.stringify(schema), "utf8");
    await expect(createArtifactValidator(root)).rejects.toMatchObject({
      code: "schema-reference-not-local",
    });
  });
});
