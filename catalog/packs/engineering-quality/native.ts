import {
  QUALITY_PACK_SCHEMA_URN,
  type EngineeringQualityPack,
} from "@intentloom/protocol";
import { provenance } from "./common.js";

const baseDependency = ["intentloom/base-quality"] as const;
const rustSource = {
  id: "rust-book",
  title: "The Rust Programming Language",
  uri: "https://doc.rust-lang.org/book/",
  kind: "official-documentation",
} as const;
const tauriSource = {
  id: "tauri-security",
  title: "Tauri 2 Security Documentation",
  uri: "https://v2.tauri.app/security/",
  kind: "official-documentation",
} as const;

export const rustQualityPack = {
  schemaVersion: QUALITY_PACK_SCHEMA_URN,
  id: "intentloom/rust",
  version: "1.0.0",
  name: "Rust",
  description:
    "Ownership, error boundaries, formatting, and unsafe-code review guidance.",
  dependencies: baseDependency,
  compatibility: {
    intentloomVersionRange: ">=1.0.0 <2.0.0",
    technologies: [{ technologyId: "rust", versionRange: ">=1.75.0 <2.0.0" }],
  },
  provenance: provenance([rustSource]),
  entries: [
    {
      id: "rust-formatting",
      meaningId: "rust.formatting-and-lints",
      kind: "guidance",
      name: "Formatting and lint evidence",
      description:
        "Keep rustfmt and selected Clippy guidance explicit in verification.",
      category: "code-quality",
      severity: "warning",
      applicableClassifications: ["hand-written-production"],
      enforcement: "checker-backed",
      reviewQuestion:
        "Are formatting and relevant lint results recorded for the changed Rust surface?",
      sourceReferenceIds: ["rust-book"],
    },
    {
      id: "rust-error-boundaries",
      meaningId: "rust.error-boundaries",
      kind: "guidance",
      name: "Explicit error boundaries",
      description:
        "Propagate typed errors across boundaries and avoid production panics for expected failures.",
      category: "maintainability",
      severity: "error",
      applicableClassifications: ["hand-written-production"],
      enforcement: "review-checklist",
      reviewQuestion:
        "Are expected failures represented in the public result rather than hidden in a panic?",
      sourceReferenceIds: ["rust-book"],
    },
    {
      id: "rust-unsafe-review",
      meaningId: "rust.unsafe-explicit-review",
      kind: "guidance",
      name: "Unsafe code review",
      description:
        "Keep unsafe blocks narrow and record the invariant that makes each block sound.",
      category: "security",
      severity: "error",
      applicableClassifications: ["hand-written-production"],
      enforcement: "review-checklist",
      reviewQuestion:
        "Is every unsafe block justified by an explicit, testable invariant?",
      sourceReferenceIds: ["rust-book"],
    },
  ],
} satisfies EngineeringQualityPack;

export const tauriQualityPack = {
  schemaVersion: QUALITY_PACK_SCHEMA_URN,
  id: "intentloom/tauri-2",
  version: "1.0.0",
  name: "Tauri 2",
  description:
    "Least-privilege capabilities, validated IPC, and native-webview boundary guidance.",
  dependencies: baseDependency,
  compatibility: {
    intentloomVersionRange: ">=1.0.0 <2.0.0",
    technologies: [{ technologyId: "tauri", versionRange: ">=2.0.0 <3.0.0" }],
  },
  provenance: provenance([tauriSource]),
  entries: [
    {
      id: "tauri-capabilities",
      meaningId: "tauri.capabilities-least-privilege",
      kind: "guidance",
      name: "Least-privilege capabilities",
      description:
        "Declare only the Tauri capabilities and permissions the surface needs.",
      category: "security",
      severity: "error",
      applicableClassifications: [
        "declarative-config",
        "hand-written-production",
      ],
      enforcement: "review-checklist",
      reviewQuestion:
        "Can any capability or permission be removed while preserving the requested behavior?",
      sourceReferenceIds: ["tauri-security"],
    },
    {
      id: "tauri-ipc-validation",
      meaningId: "tauri.ipc-input-validation",
      kind: "guidance",
      name: "Validated IPC",
      description:
        "Validate IPC parameters at the native boundary and keep command authority explicit.",
      category: "security",
      severity: "error",
      applicableClassifications: [
        "hand-written-production",
        "schema-or-protocol",
      ],
      enforcement: "review-checklist",
      reviewQuestion:
        "Does the native command reject malformed input before side effects?",
      sourceReferenceIds: ["tauri-security"],
    },
    {
      id: "tauri-webview-boundary",
      meaningId: "tauri.native-webview-boundary",
      kind: "guidance",
      name: "Native-webview boundary",
      description:
        "Keep frontend, IPC, filesystem, and process capabilities behind typed boundaries.",
      category: "architecture",
      severity: "warning",
      applicableClassifications: ["hand-written-production"],
      enforcement: "review-checklist",
      reviewQuestion:
        "Does the UI avoid directly acquiring native authority or arbitrary commands?",
      sourceReferenceIds: ["tauri-security"],
    },
  ],
} satisfies EngineeringQualityPack;
