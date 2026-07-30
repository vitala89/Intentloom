# Security Policy

## Supported versions

Security fixes are assessed for the current `1.x` release line and the `main`
branch, per [`docs/releases/SUPPORT_POLICY_V1.md`](docs/releases/SUPPORT_POLICY_V1.md).
Pre-1.0 alpha and beta releases are no longer supported; report issues against a
supported version where possible.

Note that the `1.0.0` tag exists in this repository but has not been published to
npm at the time of writing. The current npm `latest` remains `0.1.0-alpha.3`; see
[`docs/releases/RELEASE_STATE.md`](docs/releases/RELEASE_STATE.md) for the
authoritative published-artifact status.

## Reporting a vulnerability

Please report suspected security vulnerabilities privately by emailing
[vitalii.kasap@icloud.com](mailto:vitalii.kasap@icloud.com).

Do not include sensitive vulnerability details, proof-of-concept exploits,
credentials, or private data in a public GitHub issue.

Please include enough information to reproduce and assess the issue, such as the
affected version, relevant configuration, impact, and reproduction steps.

After this repository becomes public and GitHub Private Vulnerability Reporting is
enabled, that channel may also be used for private reports. For general bugs that do
not involve a security vulnerability, use the public GitHub issue tracker.

## Scope and expectations

Reports covering the CLI, schemas, adapters, generated files, and filesystem behavior
are in scope. Maintainers will acknowledge reports when practical, assess impact,
coordinate disclosure, and communicate a resolution path without promising a fixed
response time.

Intentloom does not control third-party AI providers, editors, or their extensions;
those products retain their own security boundaries and reporting processes.
