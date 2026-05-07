---
inclusion: manual
---

# Documentation Quality Review - Steering Guide

Review repo-wide documentation quality — CHANGELOG updates, SCHEMA.md regeneration, starter kit READMEs, MkDocs nav consistency, and cross-document link validity. This agent covers documentation concerns that span the whole repository, not per-module documentation (which is handled by the Module Quality agent).

#[[file:CONTRIBUTING.md]]

## Scope

- **CHANGELOG.md** — must be updated when code changes are present
- **SCHEMA.md** — must be regenerated when `config-schema.json` changes
- **Starter kit READMEs** — `starter_kits/*/README.md` must reflect current module names and configs
- **MkDocs nav** — `mkdocs.yml` must include entries for new modules
- **Cross-references** — links in changed markdown files must point to files that exist

## What to Review

### CHANGELOG
- CHANGELOG.md should be updated only for user-impacting changes: new app modules, new or changed configuration properties, bug fixes affecting deployed behavior, breaking changes, deprecations
- New or changed L2/L3 constructs do NOT require CHANGELOG entries unless they surface as new app modules or config properties
- Internal changes (CI/CD, test infrastructure, refactoring, documentation tooling) do NOT require CHANGELOG entries
- The new entry should match the MR's changes (not stale or copy-pasted)
- Entry follows the existing format (version header, categorized bullets)

### SCHEMA.md
- If `lib/config-schema.json` changed in any app module, the corresponding `SCHEMA.md` should also be updated
- SCHEMA.md is auto-generated — if the schema changed but SCHEMA.md didn't, it wasn't regenerated

### Starter Kits
- If a module referenced by a starter kit config changed its config schema, the starter kit README and configs should be reviewed
- Starter kit configs should use current module names and config properties

### MkDocs Navigation
- If new app modules were added, `mkdocs.yml` should have corresponding nav entries
- If modules were renamed or removed, stale nav entries should be cleaned up

### Cross-References
- Links in changed markdown files should point to files that exist
- Relative paths should be valid from the linking file's location

## CI Agent Usage

This section is used by the automated Documentation Quality CI agent. The agent runs a single
Kiro invocation per MR (not per-package) with the full list of changed files and relevant
documentation context.

### JSON Output Schema

Write findings to `{output_file}` as a JSON object. No preamble, no markdown fences, no explanation
outside the JSON. The file must contain ONLY valid JSON.

```json
{
  "overall_risk": "HIGH | MEDIUM | LOW",
  "summary": "One paragraph summarizing documentation quality.",
  "findings": [
    {
      "risk": "HIGH | MEDIUM | LOW",
      "category": "changelog | schema_md | starter_kit | mkdocs_nav | cross_reference",
      "file": "path/to/file",
      "detail": "What's missing or wrong."
    }
  ]
}
```

### Severity Classification

- **HIGH:** CHANGELOG not updated for user-impacting changes (new app modules, config property changes, bug fixes, breaking changes), SCHEMA.md out of sync with config-schema.json, broken links in changed docs
- **MEDIUM:** Starter kit README references outdated module config, MkDocs nav missing new module, CHANGELOG entry doesn't match MR changes
- **LOW:** Minor formatting issues, stale links in unchanged docs adjacent to changed content

### Rules

- Only flag documentation gaps related to changes in THIS MR
- Do not flag pre-existing documentation issues
- Order findings: HIGH first, then MEDIUM, then LOW
- Use only ASCII characters in all string values
