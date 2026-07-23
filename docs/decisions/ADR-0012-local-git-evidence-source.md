# ADR-0012: Restricted local Git evidence source

## Status

Accepted

## Context

The first evidence milestone needs a deterministic release-oriented view of
local Git history without credentials, network access, shell evaluation, or
project mutation. Git output is untrusted evidence and must not become an
instruction source or an authority signal.

## Decision

Add a private `@intentloom/evidence-git` package. It invokes `git` directly
through an injected runner, with a fixed read-only `log` argument allowlist,
an explicit root, a bounded commit limit, timeout, and output limit. It never
uses a shell, reads Git config, runs hooks, follows arbitrary commands, or
invokes fetch, pull, push, checkout, reset, clean, or config writes.

The normalized result contains commit IDs, parent IDs, commit timestamps, and
changed project-relative paths only. Author identities, commit subjects, raw
output, environment values, and absolute paths are excluded. Evidence is
labeled `local-git` with an observed-but-unverified trust state and a bounded
limit marker. Missing or invalid Git repositories return a structured
unavailable result rather than a process exception.

## Consequences

The package is a source adapter, not a conformance engine or release authority.
Timeline correlation and provider evidence require later contracts. Tests must
prove argument allowlisting, deterministic parsing, bounds, redaction, and
unchanged project snapshots.
