# v0.2.2 Local Git Evidence Plan

## Objective

Provide bounded, deterministic local Git evidence for one explicit project
root, starting with release-oriented commit history.

## Exit criteria

- Git is invoked directly with a fixed read-only argument list and no shell.
- Limits, timeout, environment sanitization, and unavailable-repository states
  are explicit and testable.
- Output contains only normalized commit IDs, parents, timestamps, and
  project-relative changed paths; identities and raw messages are excluded.
- Equivalent fixture output is byte-for-byte deterministic and project files
  remain unchanged.
- The package is private and does not grant conformance, approval, mutation, or
  network capability.
