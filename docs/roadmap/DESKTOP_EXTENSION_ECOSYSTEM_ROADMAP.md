# Desktop Extension Ecosystem Roadmap

## Status

Candidate roadmap. This document defines the staged path for third-party themes,
views, commands, panels, and integrations in the Intentloom desktop application.
It does not make arbitrary plugin code part of the trusted core process and does
not imply that an extension marketplace exists in the current release.

## Purpose

The Intentloom desktop application should be extensible without allowing an
extension to bypass the daemon, protocol, application-operation, capability,
approval, ownership, or transaction boundaries.

The desktop extension ecosystem reuses the managed extension lifecycle defined
by `urn:aif:schema:extension-manifest:1` and
`urn:aif:schema:extension-lock:1`. Desktop-specific contributions extend that
model instead of creating a second package format.

## Architectural position

```text
Desktop shell
  -> versioned Desktop Extension Host API
  -> validated contribution declarations
  -> daemon / application operations / bounded resources
  -> capability and permission enforcement
```

Extensions must not import private core packages, mutate project files directly,
read arbitrary local files, execute unrestricted commands, access credentials,
or call internal Tauri commands that are not explicitly exposed by the host API.

## Extension categories

The existing managed extension categories remain valid. The desktop ecosystem
adds explicit presentation contribution kinds inside a compatible extension
manifest:

- `theme`: design tokens, syntax colors, spacing, typography references, icons,
  and light/dark/high-contrast variants;
- `view`: a sandboxed project, evidence, knowledge, health, or workflow view;
- `panel`: a bounded panel hosted in a declared desktop region;
- `command`: a command-palette action mapped to an allowed host operation;
- `menu`: a declarative menu contribution referencing registered commands;
- `settings`: a namespaced settings schema and settings-page contribution;
- `renderer`: a renderer for a declared versioned resource or finding type;
- `provider-ui`: configuration and status UI for a managed skill, MCP server,
  knowledge provider, adapter pack, or daemon integration;
- `workspace-tool`: a typed read-only Agent Workspace tool contribution;
- `desktop-integration`: a bounded adapter over the daemon and shared
  application-operation boundary.

Themes are declarative and contain no executable code. Executable extensions
use a separate, more restrictive trust level.

## Manifest additions

A future schema revision should add a `desktop` section without weakening the
existing manifest requirements:

```json
{
  "$schema": "urn:aif:schema:extension-manifest:2",
  "extensionId": "ext:example/project-insights",
  "category": "daemon-integration",
  "version": "1.0.0",
  "compatibility": {
    "intentloomCore": "^0.5.0",
    "desktopHostApi": "^1.0.0"
  },
  "desktop": {
    "contributes": {
      "views": [
        {
          "id": "example.projectInsights",
          "title": "Project Insights",
          "location": "project.secondary",
          "resourceTypes": ["intentloom.project.inspection.v1"]
        }
      ],
      "commands": [
        {
          "id": "example.refreshInsights",
          "title": "Refresh Project Insights",
          "operation": "intentloom.project.inspect.v1"
        }
      ]
    }
  }
}
```

The exact schema version and field names require a separate ADR and protocol
review before implementation.

## Trust levels

### Level D0: declarative themes

- No executable code.
- No filesystem, process, network, daemon, MCP, or model capabilities.
- Tokens are validated, namespaced, bounded, and previewable.
- Fonts are referenced only through approved system or bundled application
  families; extensions do not silently install fonts.

### Level D1: declarative UI contributions

- Menus, commands, settings schemas, icons, view metadata, and render mappings.
- Commands may invoke only versioned host operations declared in the manifest.
- No arbitrary HTML, JavaScript, shell, filesystem, or network access.

### Level D2: sandboxed renderer extensions

- Render only caller-supplied, schema-validated resources.
- Use an isolated webview, worker, or equivalent restricted runtime.
- No direct Tauri command access.
- Host communication uses a versioned message protocol and capability allowlist.
- Strict CSP, size, time, memory, and message-rate limits are required.

### Level D3: managed desktop integrations

- May communicate with explicitly granted daemon or MCP operations.
- May request project-scoped read capabilities and separately reviewed network
  capabilities.
- Every capability is visible, revocable, and recorded in the extension lock.
- Project mutation remains behind prepared-plan review, explicit approval,
  revalidation, and the existing transaction boundary.

No trust level permits unrestricted in-process native plugins.

## Theme system

The first public extension surface should be themes because it has the smallest
security boundary and gives contributors immediate value.

A theme package should support:

- base mode: light, dark, or high contrast;
- semantic color tokens rather than component selectors;
- typography roles and scale references;
- spacing, radius, border, shadow, and motion tokens;
- syntax and diff tokens;
- chart palette tokens with accessibility constraints;
- icon-set references from an approved format;
- deterministic validation and preview;
- fallback tokens for forward compatibility;
- contrast diagnostics and reduced-motion behavior.

Themes must not inject arbitrary CSS, remote assets, scripts, trackers, web
fonts, or network URLs in the first milestone.

## Extension host API

The Desktop Extension Host API must be versioned independently from the desktop
application release. It should expose narrow capabilities such as:

- read the selected project identity and non-secret presentation metadata;
- subscribe to validated view-model snapshots;
- invoke explicitly allowed read-only operations;
- register commands, menus, views, panels, renderers, and settings;
- read and write only namespaced extension settings;
- request user-approved capability changes;
- report health, diagnostics, and compatibility state;
- support cancellation and disposal.

It must not expose private package internals, raw filesystem handles, generic
HTTP clients, unrestricted daemon RPC, generic shell execution, credential
stores, Git mutation, package installation, release, deployment, or publication.

## Distribution and discovery

The initial ecosystem should support local and repository-referenced extensions
before any marketplace:

1. local development directory with explicit developer mode;
2. signed or integrity-pinned package from an approved package registry;
3. repository release artifact with exact version and digest;
4. curated catalog metadata as a later optional service.

The lockfile records the exact artifact, publisher, version, digest, license,
host API compatibility, granted capabilities, configuration digest, and health
state. Popularity must never be treated as trust.

## Developer experience

A future extension SDK should provide:

- TypeScript types for manifests and host messages;
- JSON Schemas and validation CLI;
- a local extension development host;
- theme preview and accessibility checks;
- deterministic fixtures for each contribution type;
- compatibility test harness;
- packaging, integrity, license, and notice checks;
- examples for a theme, read-only view, command provider, and managed
  knowledge-provider UI;
- migration helpers between host API versions.

Suggested commands:

```bash
intentloom extension create
intentloom extension validate
intentloom extension dev
intentloom extension pack
intentloom extension inspect
intentloom extension install --dry-run
intentloom extension update --dry-run
intentloom extension disable
intentloom extension remove --dry-run
```

Command names are candidates and require normal CLI design review.

## Delivery sequence

### D1: Desktop shell stability gate

Before third-party extensions, complete one stable desktop vertical slice:

- explicit project selection;
- authenticated daemon connection;
- inspect, doctor, diff, timeline, and conformance views;
- cancellation and byte-for-byte no-mutation guarantees;
- versioned desktop-to-daemon protocol compatibility;
- export and deletion of local session data.

### D2: Theme API

- define semantic design-token schema;
- implement theme validation, preview, enable, disable, fallback, and removal;
- ship at least one built-in light, dark, and high-contrast theme;
- add accessibility and visual-regression fixtures;
- document third-party theme creation.

### D3: Declarative contribution API

- commands, menus, settings, icons, view metadata, and resource render mappings;
- no executable third-party code;
- lockfile, compatibility, license, integrity, and permission review;
- extension health diagnostics in Desktop and `intentloom doctor`.

### D4: Sandboxed renderer host

- isolated runtime and versioned message protocol;
- strict CSP and resource limits;
- schema-bound resource rendering;
- crash isolation, disable/recovery flow, and adversarial fixtures.

### D5: Managed integration host

- bounded daemon and MCP operation access;
- project-scoped permissions;
- visible network and provider state;
- capability-delta review for install and update;
- no direct project mutation.

### D6: Reviewed mutating contributions

Consider only after the prepared-plan protocol is stable and independently
security-audited. Extensions may prepare a plan, but only Intentloom can show the
exact diff, collect explicit approval, revalidate current state, and apply the
transaction.

### D7: Optional curated catalog

A catalog or marketplace may be considered only after install, update, rollback,
revocation, advisory, signing, compatibility, moderation, and abuse-reporting
flows are proven without it.

## Relationship to TUI

The TUI should share extension metadata, diagnostics, commands, and host
operations where presentation allows. It should not attempt to render arbitrary
desktop webviews or duplicate the desktop renderer runtime.

Themes may share semantic tokens, while TUI maps them to terminal color and text
capabilities. Commands and settings can be shared when they target the same
versioned application operation. Desktop-only panels and renderers remain
explicitly unsupported in TUI capability discovery.

## Exit criteria for the first ecosystem milestone

- A third party can create, validate, package, install, preview, enable, disable,
  and remove a declarative theme without modifying Intentloom source.
- Installation and update show exact artifact, version, integrity, license,
  compatibility, configuration, and capability changes.
- A broken theme cannot prevent the desktop application from starting and can be
  disabled through safe mode.
- The selected project remains byte-for-byte unchanged during theme operations.
- Desktop, CLI, daemon, and doctor report equivalent extension state.
- No extension can access project files, credentials, network, processes, MCP,
  daemon operations, or model providers unless its trust level allows the exact
  capability and the user explicitly grants it.

## Non-goals

- VS Code-compatible arbitrary extension execution in the first milestones;
- unrestricted JavaScript, native libraries, shell commands, or Tauri commands;
- remote assets or tracking inside themes;
- silent installation, updates, permission expansion, or publisher changes;
- extension-controlled approval or direct project mutation;
- requiring a marketplace, account, telemetry, or hosted service;
- treating signed, popular, or open-source extensions as automatically safe.
