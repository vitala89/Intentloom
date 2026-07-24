# Security Analysis and Remediation

## Purpose

Intentloom may add a defensive security capability that inspects an explicitly selected project, correlates deterministic scanner evidence with repository context, validates findings, and prepares targeted fixes for human review.

This direction extends Intentloom's existing validation, evidence, conformance, ownership, and transactional planning boundaries. It must not become an autonomous exploitation system or an unrestricted security agent.

## Product position

```text
project root + security policy + capability grant
                       ↓
 deterministic scanners and bounded evidence collectors
                       ↓
 normalized security evidence and data-flow context
                       ↓
 AI-assisted analysis and adversarial verification
                       ↓
 finding with confidence, evidence, impact, and remediation
                       ↓
 reviewed patch plan → explicit approval → revalidation → transaction
```

Traditional scanners and AI reasoning are complementary. Deterministic tools provide reproducible signals. Model-assisted analysis can trace cross-file flows, understand framework and business context, challenge false positives, and suggest narrow patches.

## Reference analysis

Claude Security publicly describes a scan, validate, and patch workflow. It focuses on context-dependent vulnerabilities, traces data flows, performs an adversarial verification pass, and requires human review before a suggested patch is applied. Intentloom should adopt those safety principles while remaining vendor-neutral and local-first where possible.

## Candidate finding categories

The first scope should prioritize defensive, high-impact classes:

- injection: SQL, command, code, template, XSS, XXE, and unsafe deserialization;
- path and network: traversal, symlink escape, SSRF, open redirect, unsafe URL handling;
- authentication and authorization: bypass, missing access checks, IDOR or BOLA, privilege escalation, CSRF, session weaknesses, and race conditions;
- secrets and sensitive data: committed credentials, unsafe logs, weak redaction, accidental generated-file exposure;
- dependency and supply chain: known vulnerable packages, unpinned or untrusted sources, install scripts, compromised or changed publishers, integrity and provenance gaps;
- agentic security: prompt injection, tool-confusion, capability escalation, malicious instructions in repositories, unsafe hooks, MCP poisoning, memory poisoning, and approval bypass;
- filesystem and process safety: arbitrary shell execution, unsafe temporary files, permissions, archive extraction, command construction, and environment leakage;
- web and desktop boundaries: CSP, IPC validation, Tauri allowlists, Electron exposure, origin checks, update signing, and local service authentication;
- language-specific memory safety where supported by evidence providers;
- complex business-logic vulnerabilities that cannot be represented as a simple pattern.

Coverage must be declared by language, framework, scanner, and model capability. Lack of coverage must not be presented as project safety.

## Evidence sources

Candidate read-only sources include:

- Intentloom project inspection and ownership state;
- local Git history and changed-file scope;
- package manifests and lockfiles;
- compiler and linter diagnostics;
- test and coverage reports explicitly supplied by the user or CI export;
- SARIF, SAST, dependency, secret, container, IaC, and license scanner exports;
- framework configuration and security headers;
- accepted threat models, ADRs, policies, and prior dismissals;
- provider exports with provenance and project isolation.

External scanner output and model output are untrusted evidence. They require validation, normalization, redaction, and source attribution.

## Finding model

Each finding should include:

- stable finding and project identifiers;
- category and relevant standard references where accurate;
- affected paths, symbols, versions, and data-flow steps;
- observed evidence and source provenance;
- exploit preconditions without weaponized exploit delivery;
- impact and affected trust boundary;
- severity, confidence, verification state, and uncertainty;
- duplicate, supersession, accepted-risk, and dismissal state;
- proposed remediation and expected behavioral change;
- tests or checks required to verify the fix;
- exact patch plan only when requested and supported;
- provider, model, scanner, ruleset, and version attribution.

Intentloom must distinguish verified vulnerabilities, likely findings, weak signals, missing evidence, unsupported analysis, and accepted risk.

## Verification pipeline

A finding should not be surfaced as verified from one model pass.

1. Collect deterministic and contextual evidence.
2. Generate a candidate hypothesis.
3. Re-read the exact source and trace the relevant boundary.
4. Run a separate challenge or adversarial verification pass.
5. Check reachability, sanitization, authorization, configuration, and framework behavior.
6. Compare against tests, history, prior dismissals, and duplicate findings.
7. Assign confidence and verification state.
8. Present evidence and uncertainty to the user.

The verifier must be allowed to reject the candidate finding. Scanner disagreement remains visible rather than being averaged into false certainty.

## Remediation workflow

```text
finding
→ remediation proposal
→ exact affected paths and diff
→ tests, migration, compatibility, and policy impact
→ explicit human approval
→ root, digest, ownership, permission, and state revalidation
→ transactional apply or reject
→ post-write security and consistency verification
```

No model response, severity label, scheduled scan, webhook, or external provider result counts as approval.

## Security center surfaces

A future TUI or desktop Security section may provide:

- project security posture with declared coverage;
- prioritized findings and verification state;
- data-flow and trust-boundary views;
- dependency and extension provenance;
- secrets and sensitive-data findings;
- agent, MCP, hook, memory, and prompt-injection risks;
- change-scoped scan comparison;
- dismissals, accepted risks, expiration, and owner;
- proposed patches with side-by-side diff;
- export to Markdown, JSON, and SARIF;
- provider or issue-tracker adapters through reviewed extension contracts.

A single numeric score should not hide missing coverage or uncertain evidence.

## Safe scanner integration

Scanner adapters must declare:

- executable or service identity, source, publisher, version, license, and integrity;
- languages and finding classes covered;
- required files, commands, network, credentials, and runtime permissions;
- output schema and size limits;
- whether code or metadata leaves the machine;
- update, revocation, and retention behavior.

The first milestone should prefer imported reports and fixed read-only command allowlists. It must not execute repository-provided scripts, package install hooks, arbitrary build commands, proof-of-concept exploits, or generic shell commands.

## AI and provider boundaries

- local analysis should be available independently of hosted models;
- sending source to an external provider requires explicit disclosure and scope approval;
- credentials remain outside project metadata, findings, logs, and exports;
- private source, findings, or patches are not training data by default;
- model and prompt changes must be versioned for reproducibility where possible;
- stochastic analysis must be labeled and should be paired with deterministic evidence;
- critical patches always require expert review and tests.

## Scheduled and CI analysis

Scheduled or CI scans are a later candidate. They may create findings and notifications, but cannot apply patches automatically. Required controls include:

- explicit repository and directory scope;
- pinned scanner and policy versions;
- budget, timeout, and concurrency limits;
- secret-safe logs and artifacts;
- baseline and new-finding comparison;
- retention and deletion policy;
- reproducible export and audit trail;
- no hidden network destinations.

## Delivery sequence

1. Define versioned security evidence, finding, verification, dismissal, accepted-risk, and remediation-plan schemas.
2. Import SARIF and selected explicit scanner exports without executing tools.
3. Add project security posture and coverage reporting.
4. Add fixed read-only local adapters for dependency, secret, configuration, and source scanning.
5. Implement correlation, deduplication, provenance, and evidence-quality analysis.
6. Add optional provider-neutral AI reasoning and separate finding verification.
7. Add reviewable remediation plans and tests without applying them.
8. Reuse the approved-plan transaction boundary for explicitly approved patches.
9. Add TUI and desktop Security Center views.
10. Consider scheduled scans, CI integration, and webhooks only after privacy, retention, and threat reviews.

## Exit criteria for the first milestone

- explicit reports can be imported into a versioned vendor-neutral finding model;
- every finding preserves scanner or provider provenance and declared coverage;
- findings distinguish verification and confidence states;
- read-only analysis leaves the project byte-for-byte unchanged;
- source and evidence remain project-isolated;
- users can export, dismiss, accept risk, and revisit findings with an audit trail;
- no patch can be applied without exact diff, explicit approval, and revalidation;
- adversarial fixtures cover prompt injection, malicious reports, path escape, oversized input, secret leakage, cross-project mixing, and approval bypass.

## Non-goals for the first milestone

- offensive exploitation or exploit generation;
- scanning third-party projects without authorization;
- claiming complete vulnerability coverage;
- replacing security engineers, penetration testing, or established scanners;
- automatically applying security patches;
- executing arbitrary repository commands;
- using private code or findings for training by default;
- treating a model's confidence as proof.
