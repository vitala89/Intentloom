import {
  QUALITY_PACK_SCHEMA_URN,
  type EngineeringQualityPack,
} from "@intentloom/protocol";
import { provenance } from "./common.js";

const testingSource = {
  id: "vitest-guidance",
  title: "Vitest Guide",
  uri: "https://vitest.dev/guide/",
  kind: "official-documentation",
} as const;
const accessibilitySource = {
  id: "wcag-overview",
  title: "Web Content Accessibility Guidelines",
  uri: "https://www.w3.org/WAI/standards-guidelines/wcag/",
  kind: "official-documentation",
} as const;
const securitySource = {
  id: "owasp-asvs",
  title: "OWASP Application Security Verification Standard",
  uri: "https://owasp.org/www-project-application-security-verification-standard/",
  kind: "official-documentation",
} as const;

const baseDependency = ["intentloom/base-quality"] as const;

export const testingQualityPack = {
  schemaVersion: QUALITY_PACK_SCHEMA_URN,
  id: "intentloom/testing",
  version: "1.0.0",
  name: "Testing Guidance",
  description:
    "Provider-neutral guidance for focused, deterministic, maintainable tests.",
  dependencies: baseDependency,
  compatibility: { intentloomVersionRange: ">=1.0.0 <2.0.0" },
  provenance: provenance([testingSource]),
  entries: [
    {
      id: "testing-focused-behavior",
      meaningId: "testing.focused-behavior-contract",
      kind: "guidance",
      name: "Test observable behavior",
      description:
        "Prefer focused tests that prove observable behavior over implementation detail.",
      category: "code-quality",
      severity: "warning",
      applicableClassifications: ["hand-written-test"],
      enforcement: "guidance",
      reviewQuestion:
        "Does the test fail for the user-visible regression it protects?",
      sourceReferenceIds: ["vitest-guidance"],
    },
    {
      id: "testing-deterministic-fixtures",
      meaningId: "testing.deterministic-fixtures",
      kind: "guidance",
      name: "Keep fixtures deterministic",
      description:
        "Keep time, ordering, platform, and external state explicit in fixtures.",
      category: "maintainability",
      severity: "warning",
      applicableClassifications: ["fixture-or-data-table", "hand-written-test"],
      enforcement: "guidance",
      reviewQuestion:
        "Can the fixture produce the same result without network or ambient machine state?",
      sourceReferenceIds: ["vitest-guidance"],
    },
  ],
} satisfies EngineeringQualityPack;

export const accessibilityQualityPack = {
  schemaVersion: QUALITY_PACK_SCHEMA_URN,
  id: "intentloom/accessibility",
  version: "1.0.0",
  name: "Accessibility Guidance",
  description: "WCAG-aligned, keyboard-first accessibility review guidance.",
  dependencies: baseDependency,
  compatibility: { intentloomVersionRange: ">=1.0.0 <2.0.0" },
  provenance: provenance([accessibilitySource]),
  entries: [
    {
      id: "accessibility-keyboard",
      meaningId: "accessibility.keyboard-complete",
      kind: "guidance",
      name: "Keyboard-complete interactions",
      description:
        "Interactive surfaces expose a usable keyboard path and visible focus.",
      category: "code-quality",
      severity: "error",
      applicableClassifications: ["hand-written-production"],
      enforcement: "review-checklist",
      reviewQuestion:
        "Can every interaction be completed with keyboard input and understood by focus?",
      sourceReferenceIds: ["wcag-overview"],
    },
    {
      id: "accessibility-non-color",
      meaningId: "accessibility.non-color-status",
      kind: "guidance",
      name: "Status is not color-only",
      description:
        "Status and severity use text or another explicit signal in addition to color.",
      category: "code-quality",
      severity: "warning",
      applicableClassifications: ["hand-written-production"],
      enforcement: "review-checklist",
      reviewQuestion:
        "Would the status remain understandable without color perception?",
      sourceReferenceIds: ["wcag-overview"],
    },
  ],
} satisfies EngineeringQualityPack;

export const securitySensitiveQualityPack = {
  schemaVersion: QUALITY_PACK_SCHEMA_URN,
  id: "intentloom/security-sensitive",
  version: "1.0.0",
  name: "Security-Sensitive Guidance",
  description:
    "Least-privilege, input-validation, and evidence-boundary guidance.",
  dependencies: baseDependency,
  compatibility: { intentloomVersionRange: ">=1.0.0 <2.0.0" },
  provenance: provenance([securitySource]),
  entries: [
    {
      id: "security-untrusted-input",
      meaningId: "security.untrusted-input-boundary",
      kind: "guidance",
      name: "Validate untrusted input at boundaries",
      description:
        "Treat repository, tool, provider, model, and pack data as untrusted input.",
      category: "security",
      severity: "error",
      applicableClassifications: [
        "hand-written-production",
        "schema-or-protocol",
      ],
      enforcement: "review-checklist",
      reviewQuestion:
        "Which typed validator rejects malformed or malicious boundary input?",
      sourceReferenceIds: ["owasp-asvs"],
    },
    {
      id: "security-least-privilege",
      meaningId: "security.least-privilege-capability",
      kind: "guidance",
      name: "Keep capabilities least-privileged",
      description:
        "Do not grant network, process, credential, or mutation authority implicitly.",
      category: "security",
      severity: "error",
      applicableClassifications: [
        "hand-written-production",
        "schema-or-protocol",
      ],
      enforcement: "review-checklist",
      reviewQuestion:
        "Does the change preserve explicit capability and human-approval boundaries?",
      sourceReferenceIds: ["owasp-asvs"],
    },
  ],
} satisfies EngineeringQualityPack;
