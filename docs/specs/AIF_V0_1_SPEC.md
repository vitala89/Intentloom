# AIF v0.1 Specification

## Purpose

AIF makes repeatable engineering guidance portable across AI coding tools without making the tools interchangeable. It owns canonical engineering content and deterministic transformation rules; each tool retains its own runtime, authorization, and execution model.

## Scope

v0.1 delivers canonical policies, portable Agent Skills, workflows, project scaffold templates, schemas, adapters, validation, and a local CLI with `init`, `adopt`, `plan`, `diff`, `sync`, and `doctor`. Applye is the first dogfooding example, not a source of generic policy.

Out of scope: MCP, CodeGraph/Graphify, hosted services, telemetry, marketplace, LLM API integration, automatic agent execution, cloud synchronization, GUI, plugin runtime, and autonomous merging.

## Normative requirements

1. Every reusable artifact has one canonical source below `catalog/`.
2. Canonical artifacts must not contain vendor syntax or behavior.
3. An adapter may emit only documented, supported target formats; unsupported targets remain ungenerated.
4. Every generated file identifies AIF framework version, adapter version, canonical source path, generation warning, and content checksum when the target format permits it.
5. Installed projects use `.aif/config.yaml`, `.aif/manifest.lock.json`, and `.aif/source-map.json`.
6. Any write-capable command supports dry-run and diff preview, detects conflicts, and creates a backup or asks for explicit confirmation before replacement.
7. AIF performs no network request, telemetry, dependency installation, or hook installation unless a future user-visible command explicitly adds and documents that capability.

## Artifact model

| Artifact | Canonical location   | Purpose                                           |
| -------- | -------------------- | ------------------------------------------------- |
| Policy   | `catalog/policies/`  | Durable engineering constraints                   |
| Workflow | `catalog/workflows/` | Ordered, human-verifiable procedure               |
| Skill    | `catalog/skills/`    | Portable, progressively disclosed task capability |
| Template | `catalog/templates/` | Parameterized scaffold or document                |
| Schema   | `catalog/schemas/`   | Validated machine-readable contract               |
| Profile  | `profiles/`          | Selected artifact set and parameters              |

Canonical skills follow the open [Agent Skills specification](https://agentskills.io/specification): a skill directory containing `SKILL.md` with required `name` and `description` frontmatter. AIF may add its own schema around, but does not redefine, the standard skill payload.

## Versioning

| Version           | Meaning                                | Compatibility rule           |
| ----------------- | -------------------------------------- | ---------------------------- |
| Framework version | AIF release                            | SemVer                       |
| Schema version    | Canonical manifest/schema contract     | Explicit compatibility range |
| Adapter version   | Transformation behavior for one target | SemVer, recorded in output   |
| Lock version      | Installed-project lock format          | Explicit parser support      |

`manifest.lock.json` pins framework, schemas, adapters, profile, source hashes, and generated-output hashes. A schema or lock migration is never implicit.

## Command contract (future CLI)

| Command  | Intent                                    | Writes?                       |
| -------- | ----------------------------------------- | ----------------------------- |
| `init`   | Create a new AIF layout                   | With preview and confirmation |
| `adopt`  | Map AIF into an existing project          | With conflict detection       |
| `plan`   | Explain resolved profile and target files | No                            |
| `diff`   | Compare desired and installed state       | No                            |
| `sync`   | Apply an approved plan                    | Only after safety gates       |
| `doctor` | Validate files, versions, and drift       | No                            |

## Acceptance criteria

v0.1 is complete when a fixture project can use a pinned profile to produce deterministic adapter plans; validate source maps and checksums; surface modified generated files; and refuse unsafe overwrite without an explicit user choice.
