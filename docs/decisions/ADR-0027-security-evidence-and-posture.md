# ADR-0027: Security Evidence and Posture

- **Status**: Accepted
- **Date**: 2026-07-26

## Decision

Candidate S1 introduces provider-neutral security finding ingestion and posture analysis. Security evidence and findings are stored locally under `.aif/security/findings/` and `.aif/security/reports/` in versioned JSON format (`SecurityFinding`, `SecurityCoverageReport`).

Findings transition through explicit states: `open` → `verified`, `dismissed`, `accepted-risk`, or `remediated`. Finding severities follow a standard hierarchy (`critical`, `high`, `medium`, `low`, `info`).

SARIF (Static Analysis Results Interchange Format) imports and external scanner outputs are treated as untrusted data inputs. All imported findings undergo secret path redaction (`secretLikePath`), path canonicalization to project root, and schema validation. Malformed or tampered reports abort cleanly without writing partial findings.

Security findings and coverage reports provide evidence to human maintainers. Finding ingestion or risk acceptance cannot automatically execute arbitrary shell scripts, modify codebase files without review, or grant elevated execution capabilities to AI agents.

## Consequences

1. Security findings are provider-neutral, inspectable, local-first, and project-isolated.
2. SARIF reports from external scanners can be imported without introducing shell execution or remote telemetry risks.
3. Risk acceptance requires explicit approval evidence (`AcceptedSecurityRisk`) including approver identity, reasoning, and optional expiration timestamp.
