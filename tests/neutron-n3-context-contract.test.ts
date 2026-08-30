import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  NEUTRON_CONTEXT_ASSEMBLY_REQUEST_SCHEMA_URN,
  NEUTRON_CONTEXT_BUNDLE_SCHEMA_URN,
  type NeutronRuntimeContractSnapshot,
} from "../packages/protocol/src/neutron-runtime.js";
import {
  validateAssembleNeutronContextRequest,
  validateNeutronContextBundle,
} from "../packages/validator/src/neutron-runtime.js";

const VALID_DIGEST =
  "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

function loadFixture(): NeutronRuntimeContractSnapshot {
  return JSON.parse(
    readFileSync(
      resolve("tests/fixtures/neutron-runtime/contract-snapshot.v1.json"),
      "utf8",
    ),
  ) as NeutronRuntimeContractSnapshot;
}

function minimalRequest(): Record<string, unknown> {
  return {
    schemaVersion: NEUTRON_CONTEXT_ASSEMBLY_REQUEST_SCHEMA_URN,
    root: "/project",
    sessionId: "neutron-session-fixture-1",
    projectId: "proj-fixture-1",
  };
}

describe("Neutron N3 context assembly contracts", () => {
  describe("AssembleNeutronContextRequest", () => {
    it("accepts a minimal valid request", () => {
      const request = validateAssembleNeutronContextRequest(minimalRequest());
      expect(request.schemaVersion).toBe(
        NEUTRON_CONTEXT_ASSEMBLY_REQUEST_SCHEMA_URN,
      );
      expect(request.root).toBe("/project");
      expect(request.sessionId).toBe("neutron-session-fixture-1");
      expect(request.projectId).toBe("proj-fixture-1");
    });

    it("accepts a request with all optional fields", () => {
      const request = validateAssembleNeutronContextRequest({
        ...minimalRequest(),
        taskId: "task-inspect",
        query: "neutron context",
        profileName: "default",
        role: "context-scout",
        skillLevel: "contract",
        maxTokens: 8000,
        maxItems: 40,
        sourceTypes: ["intent", "adr"],
        includeMemory: true,
        semanticRanking: false,
      });
      expect(request.taskId).toBe("task-inspect");
      expect(request.query).toBe("neutron context");
      expect(request.profileName).toBe("default");
      expect(request.role).toBe("context-scout");
      expect(request.skillLevel).toBe("contract");
      expect(request.maxTokens).toBe(8000);
      expect(request.maxItems).toBe(40);
      expect(request.sourceTypes).toEqual(["intent", "adr"]);
      expect(request.includeMemory).toBe(true);
      expect(request.semanticRanking).toBe(false);
    });

    it("rejects an unsupported schemaVersion", () => {
      expect(() =>
        validateAssembleNeutronContextRequest({
          ...minimalRequest(),
          schemaVersion:
            "urn:intentloom:schema:neutron-context-assembly-request:2",
        }),
      ).toThrow(/unsupported neutron context assembly request schema/);
    });

    it("rejects missing required identifiers", () => {
      expect(() =>
        validateAssembleNeutronContextRequest({
          schemaVersion: NEUTRON_CONTEXT_ASSEMBLY_REQUEST_SCHEMA_URN,
          sessionId: "s",
          projectId: "p",
        }),
      ).toThrow(/request\.root/);
      expect(() =>
        validateAssembleNeutronContextRequest({
          schemaVersion: NEUTRON_CONTEXT_ASSEMBLY_REQUEST_SCHEMA_URN,
          root: "/project",
          projectId: "p",
        }),
      ).toThrow(/request\.sessionId/);
      expect(() =>
        validateAssembleNeutronContextRequest({
          schemaVersion: NEUTRON_CONTEXT_ASSEMBLY_REQUEST_SCHEMA_URN,
          root: "/project",
          sessionId: "s",
        }),
      ).toThrow(/request\.projectId/);
    });

    it("rejects invalid budget values", () => {
      expect(() =>
        validateAssembleNeutronContextRequest({
          ...minimalRequest(),
          maxTokens: 0,
        }),
      ).toThrow(/request\.maxTokens/);
      expect(() =>
        validateAssembleNeutronContextRequest({
          ...minimalRequest(),
          maxItems: -1,
        }),
      ).toThrow(/request\.maxItems/);
    });

    it("rejects invalid role and profile shapes", () => {
      expect(() =>
        validateAssembleNeutronContextRequest({
          ...minimalRequest(),
          role: "autonomous-runner",
        }),
      ).toThrow(/request\.role/);
      expect(() =>
        validateAssembleNeutronContextRequest({
          ...minimalRequest(),
          skillLevel: "full",
        }),
      ).toThrow(/request\.skillLevel/);
      expect(() =>
        validateAssembleNeutronContextRequest({
          ...minimalRequest(),
          sourceTypes: ["intent", "unknown"],
        }),
      ).toThrow(/request\.sourceTypes\[1\]/);
    });
  });

  describe("NeutronContextSource provenance extension", () => {
    function bundleWithSources(
      sources: readonly Record<string, unknown>[],
    ): Record<string, unknown> {
      const fixture = loadFixture();
      return {
        ...fixture.context,
        sources,
      };
    }

    it("keeps legacy sources without provenance fields valid", () => {
      const bundle = validateNeutronContextBundle(loadFixture().context);
      expect(bundle.sources).toHaveLength(2);
      expect(bundle.sources[0]?.path).toBeUndefined();
      expect(bundle.sources[0]?.contentDigest).toBeUndefined();
    });

    it("accepts a source with a valid project-relative path", () => {
      const bundle = validateNeutronContextBundle(
        bundleWithSources([
          {
            sourceId: "policy-1",
            kind: "policy",
            trustClass: "project",
            provenance: "intentloom.context.bounded.v1",
            included: true,
            path: "docs/specs/AIF_V0_1_SPEC.md",
          },
        ]),
      );
      expect(bundle.sources[0]?.path).toBe("docs/specs/AIF_V0_1_SPEC.md");
    });

    it("accepts a source with a valid contentDigest", () => {
      const bundle = validateNeutronContextBundle(
        bundleWithSources([
          {
            sourceId: "policy-1",
            kind: "policy",
            trustClass: "project",
            provenance: "intentloom.context.bounded.v1",
            included: true,
            contentDigest: VALID_DIGEST,
          },
        ]),
      );
      expect(bundle.sources[0]?.contentDigest).toBe(VALID_DIGEST);
    });

    it("accepts a source with path, digest, and loadingLevel", () => {
      const bundle = validateNeutronContextBundle(
        bundleWithSources([
          {
            sourceId: "skill-1",
            kind: "skill",
            trustClass: "catalog",
            provenance: "intentloom.skill.v1",
            included: true,
            path: "catalog/skills/aif-task-router/SKILL.md",
            contentDigest: VALID_DIGEST,
            loadingLevel: "catalog",
          },
        ]),
      );
      expect(bundle.sources[0]).toMatchObject({
        path: "catalog/skills/aif-task-router/SKILL.md",
        contentDigest: VALID_DIGEST,
        loadingLevel: "catalog",
      });
    });

    it("rejects absolute or escaping paths", () => {
      expect(() =>
        validateNeutronContextBundle(
          bundleWithSources([
            {
              sourceId: "bad-path",
              kind: "inspect",
              trustClass: "project",
              provenance: "intentloom.inspect.v1",
              included: true,
              path: "/etc/passwd",
            },
          ]),
        ),
      ).toThrow(/context\.sources\[0\]\.path/);
      expect(() =>
        validateNeutronContextBundle(
          bundleWithSources([
            {
              sourceId: "bad-path",
              kind: "inspect",
              trustClass: "project",
              provenance: "intentloom.inspect.v1",
              included: true,
              path: "../secret.txt",
            },
          ]),
        ),
      ).toThrow(/context\.sources\[0\]\.path/);
    });

    it("rejects malformed contentDigest values", () => {
      expect(() =>
        validateNeutronContextBundle(
          bundleWithSources([
            {
              sourceId: "bad-digest",
              kind: "policy",
              trustClass: "project",
              provenance: "intentloom.context.bounded.v1",
              included: true,
              contentDigest: "sha256:fixture",
            },
          ]),
        ),
      ).toThrow(/context\.sources\[0\]\.contentDigest/);
    });
  });

  describe("NeutronContextBundle compatibility", () => {
    it("continues to validate the frozen N1 contract snapshot context", () => {
      const bundle = validateNeutronContextBundle(loadFixture().context);
      expect(bundle.schemaVersion).toBe(NEUTRON_CONTEXT_BUNDLE_SCHEMA_URN);
      expect(bundle.excludedSecretLikePaths).toEqual([".env"]);
    });

    it("validates a bundle containing extended sources", () => {
      const fixture = loadFixture();
      const bundle = validateNeutronContextBundle({
        ...fixture.context,
        sources: [
          {
            sourceId: "inspect-1",
            kind: "inspect",
            trustClass: "project",
            provenance: "intentloom.inspect.v1",
            included: true,
            path: "README.md",
            contentDigest: VALID_DIGEST,
          },
        ],
      });
      expect(JSON.stringify(bundle)).toContain(VALID_DIGEST);
    });
  });
});
