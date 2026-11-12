---
scope: manual
---

# Documentation Quality Review - Steering Guide

Review repo-wide documentation quality: CHANGELOG updates, SCHEMA.md regeneration, starter kit READMEs, MkDocs nav consistency, cross-document link validity, and L3 architecture diagram currency. This agent covers documentation concerns that span the whole repository, not per-module documentation (which is handled by the Module Quality agent).

#[[file:CONTRIBUTING.md]]

## Scope

- **CHANGELOG.md** — must be updated when code changes are present
- **SCHEMA.md** — must be regenerated when `config-schema.json` changes
- **Starter kit READMEs** — `starter_kits/*/README.md` must reflect current module names and configs
- **MkDocs nav** — `mkdocs.yml` must include entries for new modules
- **Cross-references** — links in changed markdown files must point to files that exist
- **Architecture diagrams** — an L3 construct's `docs/*.drawio` and its exported `.png` must still reflect the construct when the construct's `lib/` or `docs/` changes

## What to Review

### CHANGELOG
- CHANGELOG.md should be updated only for user-impacting changes: new app modules, new or changed configuration properties, bug fixes affecting deployed behavior, breaking changes, deprecations
- New or changed L2/L3 constructs do NOT require CHANGELOG entries unless they surface as new app modules or config properties
- Internal changes (CI/CD, test infrastructure, refactoring, documentation tooling) do NOT require CHANGELOG entries
- The new entry should match the MR's changes (not stale or copy-pasted)
- Entry follows the existing format (version header, categorized bullets)
- Entries are release notes, not design documents: one or two sentences stating what changed and the user-visible effect. Flag entries that inline implementation mechanism (policy statement names, condition keys, IAM semantics), recap review discussion, or run substantially longer than surrounding entries — detail belongs in the module README or SCHEMA.md, linked from the entry

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

### Architecture Diagrams

Each L3 construct's diagram is a pair: an editable `docs/{module}.drawio` source and an exported `.png` in the same `docs/` directory that the app and construct READMEs embed. Only the PNG is rendered to readers, so a `.drawio` edited without re-exporting leaves the published diagram silently wrong. A diagram shows everything the construct can deploy, with optional parts marked "(Optional)", not one particular configuration.

#### Source and export stay in sync

- A changed `.drawio` must have a `.png` in the same `docs/` directory regenerated in the same change. A binary PNG appears in a diff as `Binary files ... differ`, which is the signal it was re-exported.
- A `.png` that changes with no corresponding `.drawio` change means the export has no reproducible source, unless the construct has no `.drawio` at all.
- Editor metadata alone changes nothing visible and needs no re-export. Treat a `.drawio` change as metadata-only when it is confined to the `<mxfile>` element's `host=`, `agent=`, `version=`, `etag=`, or `modified=` attributes. A change to any `value=`, geometry, style, or to the set of `mxCell` elements is visible and does require re-export.

#### The diagram depicts the construct

- Adding, removing, or re-wiring what an L3 construct deploys should be reflected in its diagram: a new resource type, a new trigger or event source, a new queue, table, or role, a resource that now uses a different resource, or a new group of settings the diagram already depicts at that level (such as a new guardrail filter type).
- Judge against what the diagram depicts, read from its shape labels and the connections between shapes.
- Resources a component-level diagram would not show are out of scope: log groups, metric filters, nag suppressions, SSM parameters and stack outputs the construct publishes.
- A construct with no `docs/` directory has a missing diagram, which is a Module Quality finding rather than a currency one.

## CI Agent Usage

This section is used by the automated Documentation Quality CI agent. The agent runs one Kiro
invocation per changed markdown file, one for CHANGELOG adequacy, and one per L3 architecture
diagram whose construct `lib/` or `docs/` changed.

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
      "category": "changelog | schema_md | starter_kit | mkdocs_nav | cross_reference | diagram",
      "file": "path/to/file",
      "line": 42,
      "detail": "What's missing or wrong."
    }
  ]
}
```

`line` is optional. A `diagram` finding about what the diagram depicts sets `file` and `line` to the construct source line that made the diagram stale, so the review thread is positioned there. A `diagram` finding about `.drawio`/`.png` sync sets `file` to the diagram file.

### Severity Classification

- **HIGH:** CHANGELOG not updated for user-impacting changes (new app modules, config property changes, bug fixes, breaking changes), SCHEMA.md out of sync with config-schema.json, broken links in changed docs
- **MEDIUM:** Starter kit README references outdated module config, MkDocs nav missing new module, CHANGELOG entry doesn't match MR changes, `.drawio` modified without re-exporting a `.png`, MR adds, removes, or re-wires something the construct's architecture diagram does not reflect
- **LOW:** `.png` modified without a corresponding `.drawio` change, minor formatting issues, stale links in unchanged docs adjacent to changed content, CHANGELOG entry substantially more verbose than repo convention (implementation mechanism or design rationale inlined instead of linked)

### Rules

- Only flag documentation gaps related to changes in THIS MR
- Do not flag pre-existing documentation issues
- Order findings: HIGH first, then MEDIUM, then LOW
- Use only ASCII characters in all string values
