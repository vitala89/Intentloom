# Compatibility Matrix

## Status vocabulary

| Status                            | Meaning                                                                |
| --------------------------------- | ---------------------------------------------------------------------- |
| Officially supported              | Provider documents the format/capability as supported.                 |
| Supported through shared standard | Provider documents compatibility with the open standard.               |
| Generated adapter                 | AIF can emit a documented provider-native format.                      |
| Experimental                      | Provider behavior or AIF mapping is preview/unstable; requires opt-in. |
| Unsupported                       | AIF deliberately does not generate or rely on it.                      |

## v0.1 implemented assessment

| Capability              | Claude Code                        | OpenAI Codex                              | Cursor                                    | GitHub Copilot                                      |
| ----------------------- | ---------------------------------- | ----------------------------------------- | ----------------------------------------- | --------------------------------------------------- |
| Repository instructions | Officially supported (`CLAUDE.md`) | Officially supported (`AGENTS.md`)        | Officially supported (`AGENTS.md`, Rules) | Officially supported (instructions and `AGENTS.md`) |
| Shared `AGENTS.md`      | Via `CLAUDE.md` import             | Officially supported                      | Officially supported                      | Officially supported                                |
| Agent Skills            | Officially supported               | Officially supported                      | Supported through shared standard         | Officially supported                                |
| Path-scoped rules       | Officially supported               | Adapter-dependent; not canonical          | Officially supported                      | Officially supported                                |
| Custom subagents        | Officially supported               | Experimental / adapter discovery required | Experimental / adapter discovery required | Officially supported                                |
| AIF native adapter      | Generated adapter                  | Generated adapter                         | Generated adapter                         | Generated adapter                                   |

All four adapter rows are implemented and covered by real-catalog, conflict,
drift, stale-version, removal, idempotence, multi-adapter, snapshot, and packed
CLI fixtures. Cursor Agent Skills and Copilot custom-agent capability remain
experimental; AIF does not fabricate Copilot custom-agent output.

## Runtime and host matrix

| Runtime/host | Status                                                                                |
| ------------ | ------------------------------------------------------------------------------------- |
| Node 22      | Supported minimum; complete local suite and packed CLI verified                       |
| Node 24      | Supported; complete Linux/macOS/Windows CI matrix configured                          |
| Linux        | Compatibility CI configured for Node 22 and 24                                        |
| macOS        | Node 22 verified locally; compatibility CI configured for Node 22 and 24              |
| Windows      | Compatibility CI configured for Node 22 and 24; no local Windows execution is claimed |

The current cross-platform verdict is partially resolved until the configured
Windows jobs produce external CI evidence.

## Source basis

- Claude Code documents `CLAUDE.md` imports, including importing `AGENTS.md`, in [How Claude remembers your project](https://code.claude.com/docs/en/memory); skills and subagents are documented in [Agent Skills](https://code.claude.com/docs/en/agent-sdk/skills) and [subagents](https://code.claude.com/docs/en/sub-agents).
- Codex uses repository `AGENTS.md` guidance and Agent Skills; AIF will re-verify exact target behavior at implementation time against [OpenAI Codex documentation](https://developers.openai.com/codex/).
- Cursor documents project Rules and root `AGENTS.md` in [Rules](https://docs.cursor.com/context/rules-for-ai).
- Copilot documents repository instructions, path instructions, and `AGENTS.md` support in [repository custom instructions](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions-in-your-ide/add-repository-instructions-in-your-ide), and skills in [About agent skills](https://docs.github.com/en/copilot/concepts/agents/about-agent-skills).
- Portable skill structure is defined by the [Agent Skills specification](https://agentskills.io/specification); `AGENTS.md` is intentionally plain Markdown per [agents.md](https://agents.md/).

## Policy

Provider behavior is never inferred from another provider or community convention. AIF records the source, tested provider version/range, adapter version, and fixture result before changing a compatibility status. Undocumented formats and private/internal APIs are unsupported.
