# Migration Guide

Before updating, run `aif diff` and `aif doctor`. Preserve project-owned files. Resolve source-map drift explicitly; never replace a conflicting instruction file without a reviewed choice. Config, manifest-lock, and adapter-output version migrations must be documented with a compatibility range and rollback path.
