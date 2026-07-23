# ADR-0015: Release Evidence Analysis Boundary

- Status: Accepted
- Date: 2026-07-23

Release analysis combines only normalized local Git and explicitly imported
provider evidence for one caller-selected project key. The pure operation emits
evidence statuses and deterministic source IDs; it never infers conformance,
approval, root cause, or authorization. Conflicting project keys remain
conflicting rather than being merged.
