# CLI

AIF commands are local and deterministic. Generated files are AIF-owned only when recorded in the source map; project-owned files are never silently replaced.

Sync failures include a stable transaction stage. A successful programmatic transaction reports success only after generated files, manifest, source map, consistency validation, and cleanup complete.

Exit status must distinguish restored transaction failures from incomplete rollback. The current programmatic result exposes this distinction; direct CLI rendering remains a release blocker.
