---
inclusion: manual
---

# MR Summary — Steering Guide

Generate a structured narrative summary of merge request changes for the MR description. This steering file is used by the MR Summary CI agent to produce informational content below a tear line in the MR description.

This steering file is purely descriptive — it does NOT evaluate risk, compliance, test quality, or architecture. Those concerns are handled by dedicated review agents that post their own MR discussion threads.

## What You Receive

The MR Summary agent provides you with:

1. **File category stats** — a table of changed files grouped by category with insertions/deletions
2. **Commit messages** — the `git log --oneline` for the MR
3. **Code diff** — the full `git diff` (truncated if large)
4. **Config schema changes** — diffs of any changed `config-schema.json` files

## What You Produce

Write a structured JSON object to `{output_file}`. No preamble, no markdown fences, no explanation outside the JSON. The file must contain ONLY valid JSON.

### JSON Output Schema

```json
{
  "change_summary": "Structured summary with Why, What, and Impact sections.",
  "code_changes": [
    {
      "category": "L2 Constructs | L3 Constructs | App Modules | Utilities / CLI | Lambda / Python | CI/CD Pipeline",
      "description": "What changed and why. Reference specific files.",
      "files": "file.ts (+X/-Y), other.ts (+X/-Y)"
    }
  ],
  "file_changes": [
    {
      "category": "Tests — Unit | Tests — Diff/Snapshot | Documentation | Build / Config | Sample Configs | Test Harness | Configuration Schemas",
      "description": "What changed. Reference specific files.",
      "files": "file.ts (+X/-Y)"
    }
  ],
  "config_changes": "Description of config property additions/changes/removals with YAML examples. Empty string if none.",
  "commit_log": "Bullet list of commit messages as markdown.",
  "future_considerations": "Brief notes on follow-up work, possible enhancements, or open questions suggested by the changes. Empty string if none are apparent."
}
```

### Required Fields

#### change_summary

A structured summary with three clearly labeled parts:

- **Why:** 1-2 sentences explaining the motivation — what problem exists or what need drove this change. Write as context for a reviewer who doesn't know the backstory. Infer from commit messages, code comments, and the nature of the changes.
- **What:** 2-3 sentences describing what the MR actually does — the concrete changes. Focus on reviewer-visible outcomes, not implementation details.
- **Impact:** 1-2 sentences on the blast radius — how changes propagate through the construct hierarchy (L2 → L3 → app modules). Note whether baselines are affected, whether config schemas changed, and how many downstream modules are impacted. Do not list individual files — keep it high level.

Format as a single string with bold labels:
```
**Why:** [motivation]

**What:** [concrete changes]

**Impact:** [blast radius]
```

#### code_changes

One entry per code category that has changes. Code categories:

| Category | Path Pattern |
|----------|-------------|
| L2 Constructs | `packages/constructs/L2/**/lib/**/*.ts` |
| L3 Constructs | `packages/constructs/L3/**/lib/**/*.ts` |
| App Modules | `packages/apps/**/lib/**/*.ts`, `packages/apps/**/bin/**/*.ts` |
| Utilities / CLI | `packages/utilities/**/lib/**/*.ts`, `packages/cli/lib/**/*.ts` (excluding `packages/utilities/mdaa-testing/**`) |
| Lambda / Python | `packages/**/lambda/**/*.py` |
| CI/CD Pipeline | `.gitlab-ci.yml`, `scripts/**` |

Only include categories with changes. Empty array if no code files changed.

#### file_changes

One entry per non-code file category that has changes:

| Category | Description |
|----------|-------------|
| Test Harness | Shared test utilities (`packages/utilities/mdaa-testing/lib/**/*.ts`) |
| Configuration Schemas | JSON Schema files (`packages/**/config-schema.json`). Ignore `schemas/**/*.json` (copies) |
| Tests — Unit | Unit test files (excluding diff/snapshot/synth tests and mdaa-testing) |
| Tests — Diff/Snapshot | Baseline files and their runners |
| Documentation | Markdown and docs (`**/*.md`, `docs/**`) |
| Build / Config | Project configuration (`package.json`, `tsconfig*.json`, `jest.config.*`, etc.) |
| Sample Configs | Module sample configurations (`**/sample_configs/**/*.yaml`) |

Only include categories with changes. Empty array if no non-code files changed.

#### config_changes

Description of config property additions/changes/removals with YAML examples. Empty string if no config schemas or sample configs changed. Do NOT evaluate risk — that is the Module Quality agent's job.

#### commit_log

Commit messages as a markdown bullet list. Group related commits if there are many.

#### future_considerations

Brief notes on follow-up work, possible enhancements, or open questions suggested by the changes. Only include items that are clearly implied by the diff — e.g., a new construct without documentation, a feature flag that could be extended, a pattern that could be applied to sibling modules. Empty string if nothing stands out. Keep to 2-4 bullet points max. Do NOT speculate or invent work — only note what the code itself suggests.

## Rules

- Summarize for rapid consumption to get a reviewer up to speed to the intent and impact of a change as quickly as possible
- Be factual and descriptive, not evaluative
- Do NOT classify risk levels or flag security concerns — review agents handle that
- Do NOT mention IAM policies, CDK Nag suppressions, or compliance — the Compliance agent handles that
- Do NOT assess test coverage or quality — the Test Standards agent handles that
- Reference specific file paths when describing changes
- Keep the total output under 4000 characters to fit in MR descriptions
- Use plain markdown — no HTML except for `<details>` collapse blocks if needed for long sections
- Write in third person ("This MR adds...", "The changes include...")
