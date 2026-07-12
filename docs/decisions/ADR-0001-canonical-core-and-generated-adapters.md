# ADR-0001: Canonical core and generated adapters

## Status

Accepted

## Context

The supported agents use distinct instruction, rule, skill, and agent formats. Maintaining independent hand-authored copies would cause divergence and force vendor behavior into framework policy.

## Decision

Keep reusable engineering meaning in one vendor-neutral catalog. Resolve it to a normalized model and generate provider-specific derivatives through versioned adapters. Generated files carry provenance and are validated against the source map.

## Consequences

Adapters can evolve without rewriting policy, and unsupported capability differences remain visible. The framework must maintain capability declarations, fixtures, provenance records, and drift checks. Hand-editing generated files is not an ownership model; it creates a reported conflict.
