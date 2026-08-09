import { describe, expect, it } from "vitest";
import {
  activateExternalQualityPack,
  computeExternalQualityPackDigest,
  importExternalQualityPack,
} from "@intentloom/application";
import {
  QUALITY_PACK_ACTIVATION_SCHEMA_URN,
  QUALITY_PACK_IMPORT_SCHEMA_URN,
  type EngineeringQualityPack,
  type ExternalQualityPackSource,
} from "@intentloom/protocol";
import { validateExternalQualityPackSource } from "@intentloom/validator";
import { baseQualityPack } from "../catalog/packs/engineering-quality/base.js";

const externalPack: EngineeringQualityPack = {
  ...baseQualityPack,
  id: "example/external-quality",
  provenance: {
    sourceKind: "external",
    publisher: "Example Quality Org",
    license: "MIT",
    references: baseQualityPack.provenance.references,
  },
};

function sourceFor(
  kind: ExternalQualityPackSource["kind"],
): ExternalQualityPackSource {
  const values = {
    package: { locator: "npm:@example/quality-pack", pin: "1.2.3" },
    git: {
      locator: "https://github.com/example/quality-pack.git",
      pin: "0123456789abcdef0123456789abcdef01234567",
    },
    local: { locator: "./quality-pack.json", pin: "local-v1" },
    "organization-registry": {
      locator: "https://registry.example.com/quality-pack",
      pin: "1.2.3",
    },
    "documentation-snapshot": {
      locator: "https://docs.example.com/quality",
      pin: "snapshot-20260809",
    },
  } satisfies Record<
    ExternalQualityPackSource["kind"],
    Omit<ExternalQualityPackSource, "kind" | "digest">
  >;
  return {
    kind,
    ...values[kind],
    digest: computeExternalQualityPackDigest(externalPack),
  };
}

function request(source: ExternalQualityPackSource): unknown {
  return {
    schemaVersion: QUALITY_PACK_IMPORT_SCHEMA_URN,
    payload: JSON.stringify(externalPack),
    source,
    declaredPublisher: "Example Quality Org",
    declaredLicense: "MIT",
  };
}

function reversed<T>(values: readonly T[]): T[] {
  const result: T[] = [];
  for (let index = values.length - 1; index >= 0; index -= 1) {
    result.push(values[index]!);
  }
  return result;
}

describe("Engineering Quality Packs (Phase Q9)", () => {
  it.each<ExternalQualityPackSource["kind"]>([
    "package",
    "git",
    "local",
    "organization-registry",
    "documentation-snapshot",
  ])("imports a pinned data-only %s pack without activating it", (kind) => {
    const source = sourceFor(kind);
    const first = importExternalQualityPack(request(source));
    const second = importExternalQualityPack(request(source));

    expect(first).toEqual(second);
    expect(first.status).toBe("imported");
    expect(first.reviewStatus).toBe("pending");
    expect(first.pinStatus).toBe("verified");
    expect(first.pack.provenance.sourceKind).toBe("external");
  });

  it("normalizes entry ordering before producing a stable digest", () => {
    const reordered: EngineeringQualityPack = {
      ...externalPack,
      entries: reversed(externalPack.entries),
      dependencies: reversed(externalPack.dependencies),
    };
    expect(computeExternalQualityPackDigest(reordered)).toBe(
      computeExternalQualityPackDigest(externalPack),
    );
  });

  it("rejects mismatched digest and provenance declarations", () => {
    const source = sourceFor("package");
    expect(() =>
      importExternalQualityPack(
        request({ ...source, digest: `sha256:${"0".repeat(64)}` }),
      ),
    ).toThrow(/digest does not match/);
    expect(() =>
      importExternalQualityPack({
        ...request(source),
        declaredPublisher: "Another Org",
      }),
    ).toThrow(/provenance does not match/);
  });

  it("rejects duplicate rule identities before digest verification", () => {
    const invalidPack = {
      ...externalPack,
      entries: [externalPack.entries[0], externalPack.entries[0]],
    };
    expect(() =>
      importExternalQualityPack({
        ...request(sourceFor("local")),
        payload: JSON.stringify(invalidPack),
      }),
    ).toThrow(/duplicate entry id/);
  });

  it("requires explicit approval bound to the exact source before activation", () => {
    const source = sourceFor("git");
    const imported = importExternalQualityPack(request(source));
    const approval = {
      schemaVersion: QUALITY_PACK_ACTIVATION_SCHEMA_URN,
      decision: "approve",
      reviewerId: "reviewer-1",
      source,
    };
    const activated = activateExternalQualityPack(imported, approval);

    expect(activated.status).toBe("activated");
    expect(activated.digest).toBe(imported.digest);
    expect(() =>
      activateExternalQualityPack(imported, {
        ...approval,
        source: { ...source, pin: "fedcba9876543210fedcba9876543210fedcba98" },
      }),
    ).toThrow(/does not match/);
  });

  it("validates source pins and never accepts executable-looking locators", () => {
    expect(() =>
      validateExternalQualityPackSource({
        kind: "git",
        locator: "javascript:process.exit()",
        pin: "deadbeef",
        digest: `sha256:${"a".repeat(64)}`,
      }),
    ).toThrow(/HTTPS URL/);
    expect(() =>
      validateExternalQualityPackSource({
        kind: "local",
        locator: "../outside.json",
        pin: "local-v1",
        digest: `sha256:${"a".repeat(64)}`,
      }),
    ).toThrow(/repository-relative/);
  });
});
