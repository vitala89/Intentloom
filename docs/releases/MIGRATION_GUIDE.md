# Migration Guide

Before updating, run `aif diff` and `aif doctor`. Preserve project-owned files. Resolve source-map drift explicitly; never replace a conflicting instruction file without a reviewed choice. Config, manifest-lock, and adapter-output version migrations must be documented with a compatibility range and rollback path.

If sync reports `transaction-rollback-incomplete`, stop and inspect only the project-relative paths reported; do not rerun sync until their generated/metadata ownership state is reconciled.
