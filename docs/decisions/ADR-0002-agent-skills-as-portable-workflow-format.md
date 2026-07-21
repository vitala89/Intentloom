# ADR-0002: Agent Skills as portable workflow format

## Status

Accepted

## Context

Intentloom needs progressively disclosed, reusable procedures rather than a single oversized instruction file. Several supported tools recognize the open Agent Skills model centered on `SKILL.md`.

## Decision

Use the open [Agent Skills specification](https://agentskills.io/specification) as the canonical packaging format for task-level workflows. Keep Intentloom-specific selection, profile, and validation metadata outside the portable `SKILL.md` body or in permitted metadata fields. Keep always-on repository guidance concise in `AGENTS.md`.

## Consequences

Skills are portable where providers support the standard or compatible locations; tool-specific capabilities stay adapter-owned. A skill is guidance, not a security boundary or executable runtime. Provider-specific extensions must be clearly marked and never required by the canonical skill.
