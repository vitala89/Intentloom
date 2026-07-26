# ADR-0028: Local Deterministic Security Adapters

- **Status**: Accepted
- **Date**: 2026-07-26

## Decision

Candidate S2 introduces built-in, local, deterministic, read-only security adapters for analyzing project security posture without relying on untrusted external builds, package install scripts, or network connections.

Security adapters are categorized into eight explicit categories:

1. `dependency`: Inspects project manifests (`package.json`, lockfiles) for unsafe dependency pins or untrusted packages.
2. `secret`: Scans source files and configuration for hardcoded API keys, tokens, or private credentials.
3. `config`: Audits `.aif/` directory, project configuration files, and permission policies.
4. `source`: Analyzes source files for unsafe pattern usage.
5. `extension`: Checks declared extension descriptors and capabilities.
6. `mcp`: Audits MCP server declarations for generic shell or unsafe path access.
7. `hook`: Inspects hook configurations for unreviewed script executions.
8. `agentic`: Evaluates agentic safety policies and boundaries.

All security adapters execute as pure internal functions operating on the project `FileSystem` abstraction. They cannot execute arbitrary shell scripts, launch external binaries, download remote rule files, or communicate over the network.

All findings produced by adapters are normalized into standard `SecurityFinding` objects. Identical findings (matching rule ID and evidence file path) are correlated and deduplicated by the correlation engine (`correlateSecurityFindings`).

## Consequences

1. Security auditing remains 100% deterministic, local-first, offline, and reproducible.
2. No risk of arbitrary code execution from malicious build scripts or external scanner hooks during security scanning.
3. Multiple scanner outputs are automatically deduplicated and correlated into unified posture reports.
