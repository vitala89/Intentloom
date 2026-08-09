import {
  QUALITY_PACK_SCHEMA_URN,
  type EngineeringQualityPack,
} from "@intentloom/protocol";
import { provenance } from "./common.js";

const baseDependency = ["intentloom/base-quality"] as const;
const typescriptSource = {
  id: "typescript-handbook",
  title: "TypeScript Handbook",
  uri: "https://www.typescriptlang.org/docs/handbook/intro.html",
  kind: "official-documentation",
} as const;
const angularSource = {
  id: "angular-style-guide",
  title: "Angular Style Guide",
  uri: "https://angular.dev/style-guide",
  kind: "official-documentation",
} as const;
const reactSource = {
  id: "react-docs",
  title: "React Documentation",
  uri: "https://react.dev/learn",
  kind: "official-documentation",
} as const;

export const typescriptQualityPack = {
  schemaVersion: QUALITY_PACK_SCHEMA_URN,
  id: "intentloom/typescript",
  version: "1.0.0",
  name: "TypeScript",
  description:
    "Strict, typed, provider-neutral TypeScript engineering guidance.",
  dependencies: baseDependency,
  compatibility: {
    intentloomVersionRange: ">=1.0.0 <2.0.0",
    technologies: [
      { technologyId: "typescript", versionRange: ">=5.0.0 <8.0.0" },
    ],
  },
  provenance: provenance([typescriptSource]),
  entries: [
    {
      id: "typescript-strictness",
      meaningId: "typescript.strict-type-safety",
      kind: "guidance",
      name: "Strict type safety",
      description:
        "Keep strict compiler checks and narrow unknown data before use.",
      category: "code-quality",
      severity: "error",
      applicableClassifications: [
        "hand-written-production",
        "schema-or-protocol",
      ],
      enforcement: "checker-backed",
      reviewQuestion:
        "Are boundary values narrowed and are strict compiler guarantees preserved?",
      sourceReferenceIds: ["typescript-handbook"],
    },
    {
      id: "typescript-contracts",
      meaningId: "typescript.public-contract-discipline",
      kind: "guidance",
      name: "Public contract discipline",
      description:
        "Keep exported types explicit and compatibility changes intentional.",
      category: "architecture",
      severity: "warning",
      applicableClassifications: [
        "public-export-surface",
        "schema-or-protocol",
      ],
      enforcement: "review-checklist",
      reviewQuestion:
        "Is every public type change additive or covered by a compatibility decision?",
      sourceReferenceIds: ["typescript-handbook"],
    },
    {
      id: "typescript-async-errors",
      meaningId: "typescript.explicit-async-error-state",
      kind: "guidance",
      name: "Explicit async and error states",
      description:
        "Represent async failure and unavailable evidence explicitly rather than hiding it.",
      category: "maintainability",
      severity: "warning",
      applicableClassifications: ["hand-written-production"],
      enforcement: "review-checklist",
      reviewQuestion:
        "Can callers distinguish success, failure, cancellation, and insufficient evidence?",
      sourceReferenceIds: ["typescript-handbook"],
    },
  ],
} satisfies EngineeringQualityPack;

export const angularQualityPack = {
  schemaVersion: QUALITY_PACK_SCHEMA_URN,
  id: "intentloom/angular",
  version: "1.0.0",
  name: "Angular",
  description:
    "Feature-oriented Angular structure, components, DI, and reactive-state guidance.",
  dependencies: baseDependency,
  compatibility: {
    intentloomVersionRange: ">=1.0.0 <2.0.0",
    technologies: [
      { technologyId: "@angular/core", versionRange: ">=17.0.0 <21.0.0" },
    ],
  },
  provenance: provenance([angularSource]),
  entries: [
    {
      id: "angular-feature-organization",
      meaningId: "angular.feature-oriented-organization",
      kind: "guidance",
      name: "Feature-oriented organization",
      description:
        "Organize Angular code by feature and keep each feature cohesive.",
      category: "architecture",
      severity: "warning",
      applicableClassifications: ["hand-written-production"],
      enforcement: "review-checklist",
      reviewQuestion:
        "Does the module boundary reflect a user or domain feature rather than a technical bucket?",
      sourceReferenceIds: ["angular-style-guide"],
    },
    {
      id: "angular-focused-components",
      meaningId: "angular.focused-components",
      kind: "guidance",
      name: "Focused components",
      description:
        "Keep components focused on presentation and explicit interaction boundaries.",
      category: "maintainability",
      severity: "warning",
      applicableClassifications: ["hand-written-production"],
      enforcement: "review-checklist",
      reviewQuestion:
        "Is domain behavior kept outside a component when it has an independent reason to change?",
      sourceReferenceIds: ["angular-style-guide"],
    },
    {
      id: "angular-di-boundary",
      meaningId: "angular.dependency-injection-boundary",
      kind: "guidance",
      name: "Explicit dependency injection",
      description:
        "Use dependency injection at clear boundaries and keep providers replaceable.",
      category: "architecture",
      severity: "warning",
      applicableClassifications: ["hand-written-production"],
      enforcement: "review-checklist",
      reviewQuestion:
        "Can the dependency be replaced in a focused test without reaching across the UI boundary?",
      sourceReferenceIds: ["angular-style-guide"],
    },
  ],
} satisfies EngineeringQualityPack;

export const reactQualityPack = {
  schemaVersion: QUALITY_PACK_SCHEMA_URN,
  id: "intentloom/react",
  version: "1.0.0",
  name: "React",
  description:
    "Pure components, explicit effects, immutable state, and accessible React guidance.",
  dependencies: baseDependency,
  compatibility: {
    intentloomVersionRange: ">=1.0.0 <2.0.0",
    technologies: [{ technologyId: "react", versionRange: ">=18.0.0 <20.0.0" }],
  },
  provenance: provenance([reactSource]),
  entries: [
    {
      id: "react-component-purity",
      meaningId: "react.component-purity",
      kind: "guidance",
      name: "Pure components",
      description:
        "Keep render logic pure and derive values instead of synchronizing redundant state.",
      category: "code-quality",
      severity: "error",
      applicableClassifications: ["hand-written-production"],
      enforcement: "review-checklist",
      reviewQuestion:
        "Does rendering avoid side effects and unnecessary state synchronization?",
      sourceReferenceIds: ["react-docs"],
    },
    {
      id: "react-effects-boundary",
      meaningId: "react.effect-boundaries",
      kind: "guidance",
      name: "Explicit effect boundaries",
      description:
        "Use effects only for external synchronization and clean up subscriptions.",
      category: "maintainability",
      severity: "warning",
      applicableClassifications: ["hand-written-production"],
      enforcement: "review-checklist",
      reviewQuestion:
        "Is the effect synchronized with an external system and safely cleaned up?",
      sourceReferenceIds: ["react-docs"],
    },
    {
      id: "react-state-immutability",
      meaningId: "react.immutable-state",
      kind: "guidance",
      name: "Immutable state updates",
      description:
        "Treat props and state as immutable inputs and update them through explicit ownership.",
      category: "code-quality",
      severity: "error",
      applicableClassifications: ["hand-written-production"],
      enforcement: "review-checklist",
      reviewQuestion:
        "Can a child or helper mutate state owned by another component?",
      sourceReferenceIds: ["react-docs"],
    },
  ],
} satisfies EngineeringQualityPack;
