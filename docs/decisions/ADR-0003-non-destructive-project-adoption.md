# ADR-0003: Non-destructive project adoption

## Status

Accepted

## Context

Existing projects have independently owned instruction files and automation. A generator that overwrites them can erase local knowledge or introduce unsafe behavior.

## Decision

Separate planning from applying. Every future write operation will support dry-run, diff preview, conflict detection, and backup or explicit confirmation. AIF records generated ownership in `.aif/source-map.json` and resolved versions/hashes in `.aif/manifest.lock.json`.

## Consequences

Adoption is safe by default and diagnosable over time, at the cost of visible conflict resolution and a more deliberate command design. Existing files without AIF ownership are never silently claimed or replaced.
