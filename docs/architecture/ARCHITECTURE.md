# Architecture

## Overview

```text
catalog + profiles ──> core resolver ──> adapter contracts ──> target files
       │                    │                   │                 │
       └────────────────> validator <───────────┴──── source map + lock
```

The catalog is the sole source of reusable engineering meaning. The resolver selects and parameterizes canonical artifacts. Adapters transform the resolved model into target-specific files. The validator recomputes the model and detects malformed inputs, unsupported capabilities, drift, and unsafe write plans.

## Current repository structure

```text
packages/
  core/          Canonical model, resolver, schemas, rendering contracts
  adapters/      Shared adapter interfaces and target implementations
  cli/           Local command surface and process adapter
  validator/     Validation and drift detection
catalog/
  skills/ policies/ workflows/ templates/ schemas/
adapters/
  claude/ codex/ cursor/ copilot/
profiles/ examples/ tests/
docs/
```

These packages are implemented private workspace modules. The public package is
the `intentloom` CLI; Core, Adapters, and Validator remain implementation
boundaries rather than public library APIs.

## Data flow and ownership

1. A profile names canonical artifacts and parameters.
2. The resolver validates and produces a normalized, tool-neutral desired state.
3. A target adapter declares capabilities, transforms only compatible content, and emits a write plan.
4. The write planner compares the plan with the installed source map and current filesystem.
5. The validator reports mismatch, drift, unsupported mappings, and conflict states before any mutation.

No adapter may become a second canonical catalog. Tool-specific features must be represented as declared capabilities and an explicit compatibility status, not silently approximated.

## Installed-project metadata

```text
.aif/
  config.yaml              User-owned configuration and profile selection
  manifest.lock.json       Generated, pinned resolved inputs and versions
  source-map.json          Generated ownership, paths, and hashes
```

`config.yaml` is user-edited. The lock and source map are generated records: edits are reported as drift rather than silently discarded. They contain no secrets.

## Generated-file envelope

Where a target supports comments, each file begins with an Intentloom envelope containing framework and adapter versions, canonical source path(s), generation warning, and checksum. For formats that cannot safely carry comments, equivalent metadata is kept in `source-map.json`; the adapter must document the limitation.

## Safety model

Planning is pure and local. Applying a plan is a separate action. Existing unowned files, a changed generated file, a checksum mismatch, or a path escaping project root causes a conflict. Resolution options are preview, retain, back up and replace, or explicitly cancel; there is no default replacement.

## Context budget

Policies stay concise and always-on only when necessary. Detailed task procedures belong in skills, which are selected by description and loaded when relevant. This follows the distinction in the [Agent Skills specification](https://agentskills.io/specification) and avoids copying a large catalog into every instruction file.
