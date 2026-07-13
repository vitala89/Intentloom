# ADR-0004: Schema-driven structural validation

## Status

Accepted

## Context

AIF reads user-authored configuration, generated ownership metadata, planning
artifacts, and portable Agent Skills. Handwritten shape checks had diverged
between commands and mixed document structure with filesystem, ownership,
checksum, capability, and lifecycle decisions.

## Decision

Use locally bundled, explicitly versioned JSON Schemas for AIF document
structure. Parse JSON, YAML, and skill frontmatter through one bounded safe
parser and return stable content-safe diagnostics. Reject unsupported or missing
versions and strict unknown core fields. Human-authored planning artifacts may
use one isolated `extensions` object.

Run structural validation before semantic validation and writes. Keep project
root, symlink, collision, checksum, ownership, capability, reference, and
lifecycle rules in semantic validators. JSON Schema is not a filesystem or
cross-document security boundary.

Agent Skill frontmatter remains the open Agent Skills format. AIF separately
applies a catalog-admission policy to ensure its reusable skills document
triggers, inputs, outputs, non-triggers, and stop conditions; these are content
quality requirements, not new frontmatter fields or a redefinition of the open
format.

## Consequences

Commands share one validation result and exit-code contract. Schemas and profile
evidence must be packaged with the CLI and resolved without network access.
Schema, lock, framework, and adapter-output versions remain distinct. Future
schema changes require an explicit migration; they are never inferred from the
framework version.
