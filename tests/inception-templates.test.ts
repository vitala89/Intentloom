import { describe, expect, it } from "vitest";
import {
  createInceptionSession,
  proposeProjectBlueprints,
  createTemplateRegistry,
  registerStarterTemplate,
  resolveStarterTemplate,
  computeTemplateIntegrityHash,
  buildTemplateScaffoldPlan,
} from "@intentloom/application";
import { validateTemplateManifest } from "@intentloom/validator";

describe("Project Inception Third-Party Starter Ecosystem (Phase I10)", () => {
  it("registers, resolves, and builds scaffold plan from third-party template manifest", () => {
    const files = [
      {
        path: "package.json",
        action: "create" as const,
        content: '{"name":"ext-starter"}',
        isManaged: true,
      },
      {
        path: "README.md",
        action: "create" as const,
        content: "# External Starter\n",
        isManaged: false,
      },
    ];

    const integrityHash = computeTemplateIntegrityHash(files);

    const manifest = {
      id: "tpl_community_express",
      name: "Community Express Microservice",
      version: "1.0.0",
      description: "Third-party microservice template for Express APIs",
      license: "MIT",
      author: "Community Devs",
      minIntentloomVersion: "1.0.0",
      capabilities: ["network", "filesystem"],
      integrityHash,
      files,
    };

    let registry = createTemplateRegistry();
    registry = registerStarterTemplate(registry, manifest);

    const resolved = resolveStarterTemplate(registry, "tpl_community_express");
    expect(resolved.name).toBe("Community Express Microservice");

    const session = createInceptionSession({
      root: "/tmp/template-test",
      idea: "Third Party Template Test",
    });

    const blueprint = proposeProjectBlueprints(session).recommended;
    const plan = buildTemplateScaffoldPlan(
      resolved,
      blueprint,
      "/tmp/template-test",
    );

    expect(plan.root).toBe("/tmp/template-test");
    expect(plan.blueprintDigest).toBe(blueprint.digest);
    expect(plan.files.length).toBe(2);
  });

  it("rejects registration or plan generation when integrity hash is tampered", () => {
    const files = [
      {
        path: "package.json",
        action: "create" as const,
        content: '{"name":"tampered"}',
        isManaged: true,
      },
    ];

    const manifest = {
      id: "tpl_tampered",
      name: "Tampered Template",
      version: "1.0.0",
      description: "Tampered manifest",
      license: "MIT",
      author: "Attacker",
      minIntentloomVersion: "1.0.0",
      capabilities: [],
      integrityHash:
        "0000000000000000000000000000000000000000000000000000000000000000",
      files,
    };

    const registry = createTemplateRegistry();
    expect(() => registerStarterTemplate(registry, manifest)).toThrow(
      "Template integrity hash mismatch",
    );
  });

  it("validates template manifest structure strictly", () => {
    expect(() => validateTemplateManifest(null)).toThrow("expected object");
    expect(() =>
      validateTemplateManifest({
        id: "t1",
        name: "Test",
        version: "1.0.0",
        description: "desc",
        license: "MIT",
        author: "author",
        minIntentloomVersion: "1.0.0",
        capabilities: [],
        integrityHash: "abc",
        files: "not_an_array",
      }),
    ).toThrow("Invalid manifest.files");
  });
});
