---
scope: always
description: Operational guidance for commits, issues, MRs, reviews, and repo workflows
---

# Operational Guidance

## Regenerating starter-kit baselines

When regenerating starter-kit diff baselines (`UPDATE_BASELINES=true ... test_starter_kit.py`), you MUST neutralize local AWS credential resolution first. Otherwise `cdk synth` resolves the stack account from your ambient AWS credentials (an `~/.aws` `[default]` profile, `AWS_PROFILE`, a `credential_process` such as ada, env keys, or SSO) and bakes that real account number into the baselines. CI has no such credentials and falls back to the kit's placeholder account, so locally-generated baselines would not match CI and would fail the `sk_<kit>` job.

Run the regeneration with credential resolution disabled:

```bash
cd starter_kits
env -u AWS_PROFILE -u AWS_DEFAULT_PROFILE -u CDK_DEFAULT_ACCOUNT -u CDK_DEPLOY_ACCOUNT \
  AWS_SDK_LOAD_CONFIG=0 AWS_CONFIG_FILE=/dev/null AWS_SHARED_CREDENTIALS_FILE=/dev/null \
  UPDATE_BASELINES=true python3 ../scripts/test/test_starter_kit.py --kit <kit_name>
```

Then verify before committing — this MUST return nothing:

```bash
git grep -l '<your-aws-account-id>'   # or scan for any 12-digit account that is not the placeholder
```

The kit's placeholder account lives in `starter_kits/test/<kit>/kit-config.json` (`_cdk_default_account`); a clean regen produces that value, never a real account.

## Commits

Keep commit messages short: a single-line subject (a short half-sentence, e.g. `feat(agentcore): migrate VPC-only resource policy to native CFN resource`). Do not add a body. Detailed explanation belongs in the MR description, not the commit.

## Issues

When creating or writing down issues/tickets:
- **Bugs**: use the template at `.gitlab/issue_templates/bug_report.md`
- **Features / everything else**: use the template at `.gitlab/issue_templates/default.md`
- Save the resulting file in `.gitlab/issues/<kebab-case-name>.md`

## Merge Requests

When creating MRs/PRs:
- Use the template at `.gitlab/merge_request_templates/default.md` for the body
- Save the resulting file in `.gitlab/merge_requests/<kebab-case-name>.md`

## GitLab access

`code.aws.dev` is a GitLab site. To read or act on anything there (MRs, issues, discussions, files, pipelines), use ONLY the GitLab MCP tools (`mcp__gitlab__*`).

There is no fallback. You MUST NOT substitute any other mechanism, including:

- Web-fetch tools — the builder-mcp `ReadInternalWebsites` tool, `WebFetch`, or any similar tool, on a `code.aws.dev` URL
- CLI tools — `glab` in particular, and any other GitLab client
- Direct API calls — `curl`/`git` against the REST or GraphQL endpoints, with any token source

Do not check whether such a tool is installed or configured, and do not offer one as an option. If a GitLab MCP tool fails (e.g. auth/posture errors), or cannot do what is being asked (a missing tool for the operation, an unexposed field such as the native work-item Status), STOP and tell the user what failed and what you were attempting, so they can fix the MCP server or perform that step themselves. Reporting a blocked step is the correct outcome; working around it is not.

### Paginated results truncate silently

The GitLab MCP list tools (`mr_discussions`, `get_merge_request_notes`, `list_*`) are paginated. A response holding a full page looks identical to a complete result: there is no error and no marker. `per_page: 100` on an MR with 104 discussions returns 100 items and omits the rest.

Before drawing any conclusion from a list result, compare `pagination.x_total` against the number of items received, and keep requesting (`page: 2`, `3`, ...) until `pagination.x_next_page` is `null`.

You MUST NOT report a count, or state that something is absent ("no unresolved threads", "no new findings", "nothing left to fix"), on the basis of a single un-paginated call. Absence claims require having seen every page.

### Review-bot comment mechanics

The MDAA review bot surfaces findings three different ways. Scanning for newly-created unresolved threads catches only the first:

1. **New threads** — a fresh discussion per finding.
2. **In-place rewrites** — the bot edits the body of an existing thread with new findings and appends "Findings have changed since last review. Please re-acknowledge." The thread keeps its original `created_at` and may still be flagged `resolved`, so filtering on `resolvable && !resolved` misses it. Compare `updated_at` against `created_at` to spot these.
3. **Non-resolvable summary notes** — per-review roll-ups (`Compliance Review Summary`, `Test Standards Review Summary`, and so on) with `resolvable: false`. They cannot be resolved and do not block merging, but they report thread and finding counts worth reconciling against the threads you found.

A single thread commonly bundles several findings. When reporting review status, distinguish the number of threads from the number of findings inside them, and reconcile your list against the counts in the summary notes.

## Reviews

When asked to review changes against a story or assess branch alignment, follow the process in `.claude/agents/story-review.md`.

## General writing style

When generating text that is supposed to represent what a human wrote, such as a response from a developer to a thread or a developer's message on Slack, avoid using em dashes and other signs that a human would have trouble writing with a keyboard. This makes the text less distracting for another human to read.
