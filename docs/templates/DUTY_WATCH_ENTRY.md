# Duty Watch Entry Template

```md
### YYYY-MM-DD, concise watch title

- **Status:** complete | partial | blocked | rolled back
- **Agent/tool:**
- **Branch:**
- **Commits:**
- **Pull request:**
- **Objective:**
- **Completed:**
- **Not completed:**
- **Files or packages changed:**
- **Validation:**
- **Decisions and assumptions:**
- **Risks or compatibility impact:**
- **Open issues or blockers:**
- **Next first action:**
- **Evidence:**

#### Duty completion checklist

- [ ] Formatter passed
- [ ] Markdown and lint checks passed when configured
- [ ] Relevant tests, type checks, builds, or compatibility checks passed
- [ ] `git diff --check` passed
- [ ] Final diff reviewed
- [ ] `PROJECT_STATE.md` updated when applicable
- [ ] `DUTY_WATCH.md` handoff completed
- [ ] Related roadmap, ADR, changelog, migration, or reference docs updated
- [ ] Failed or unavailable checks recorded
```

## Quality rules

- Use facts that can be checked in the repository.
- Name exact commands and results where practical.
- Distinguish completed work from proposed work.
- Make the next first action specific and executable.
- Do not include secrets, personal data, or hidden model reasoning.
- Keep historical entries. Correct mistakes with an explicit follow-up note
  rather than silently rewriting history.
