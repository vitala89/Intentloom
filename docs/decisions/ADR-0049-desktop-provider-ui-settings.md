# ADR-0049: Desktop Provider UI & Managed Extension Settings Integration Spec

- **Status:** Accepted
- **Date:** 2026-08-01
- **Deciders:** Intentloom Architecture Board
- **Consulted:** Desktop Team, Settings Architect, Security Team

---

## Context

Third-party extensions (such as MCP server integrations, provider UIs, knowledge connectors, or adapter packs) require namespaced settings and configuration UI inside the Desktop application (`kind: "settings"` & `kind: "provider-ui"`). These settings must not tamper with internal core settings, overwrite security grants, or persist unencrypted sensitive credentials.

---

## Decision

We establish **Desktop Provider UI & Managed Extension Settings**:

1. **Declarative Settings Schema (`kind: "settings"`)**:
   - `id`: Globally unique setting section ID (e.g. `settings.extension.mcp-github`).
   - `title`: Display title in Settings View.
   - `properties`: JSON Schema object describing allowed configuration keys, defaults, and data types (`boolean`, `string`, `number`).

2. **Namespaced Settings Store (`apps/desktop/src/views/extension-settings.ts`)**:
   - `ExtensionSettingsStore` manages namespaced settings (`extension:<id>:<key>`) separately from core workspace settings.
   - Settings validation prevents unauthorized key injection or invalid values.

3. **Security Invariants**:
   - Extension settings cannot override daemon port, auth tokens, or protocol invariants.
   - Sensitive credentials (e.g., API keys) must be stored through system keychain integration rather than plain settings files.

---

## Consequences

- Third-party extensions gain structured, safe, and namespaced settings UI in the Desktop application.
- Core settings and system credentials remain 100% isolated and secure.
