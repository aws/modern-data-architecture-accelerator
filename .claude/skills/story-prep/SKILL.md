---
name: story-prep
description: Prepare a GitLab workitem for implementation — fetch the story, sync main with origin, assess whether the story is actually ready against latest main, then cut a branch with the bundled new_branch.sh. Use when starting work on a new story/issue/workitem ("let's start on 1345", "prep this story", "is this ready to implement", "create a branch for this issue").
---

# Story Prep

Front-loads everything that must be true before the first line of code: the story is fetched, `main` matches `origin/main`, the story's claims have been verified against that code, and a correctly-named branch exists.

Ordering is load-bearing. Readiness is judged against **latest `origin/main`**, so the sync (Phase 2) must happen before the review (Phase 3). A review against stale code can pass on claims that main has already invalidated.

The counterpart to this skill is `.claude/agents/story-review.md`, which reviews finished work before push. This one runs before work starts.

## Phase 1: Get the workitem ID from the user

**Ask the user for the workitem number or URL. Never infer it from the current branch.**

The user may not have switched off a previous story's branch, so the checked-out branch is not evidence of what they want to work on. Deriving the ID from it silently preps the wrong story. This is the opposite of `story-review.md`, which *does* read the branch name — correctly, because there the branch is the thing under review.

If the user already gave an ID or URL in their request, use it and don't re-ask. Accept either form:

- Bare number: `1345`
- URL: `https://code.aws.dev/proserve/mdaa/modern-data-architecture-accelerator/-/work_items/1345` (or `/-/issues/1345`) — the trailing path segment is the `issue_iid`

Fetch it with the GitLab MCP tools, never a web-fetch tool (see `agent_rules/developer-operational-guidance.md` § GitLab access):

```
mcp__gitlab__get_issue         project_id: "18688"  issue_iid: "1345"
mcp__gitlab__list_issue_discussions   project_id: "18688"  issue_iid: "1345"
```

`project_id` gotcha: the numeric ID `18688` works, and the URL-**encoded** path works (`proserve%2Fmdaa%2Fmodern-data-architecture-accelerator`). The raw slash-separated path returns `404 Project Not Found`. Prefer the numeric ID.

Read the discussions too, not just the description. They reveal status transitions and — importantly — whether **work already exists**: a linked MR, a "mentioned in commit" note, or an existing branch. If any exist, stop and tell the user before creating anything; the right move is usually to check out that branch or review that MR rather than start fresh.

## Phase 2: Put `main` on latest `origin/main`

Switch to `main` and bring it up to date. **Do not create a merge commit, and do not discard anything without checking first.**

```bash
git status --porcelain                      # must be empty before switching
git checkout main
git fetch origin main
git rev-list --left-right --count origin/main...main   # "<behind>  <ahead>"
```

Then act on the counts:

| State | Action |
|---|---|
| `0  0` | Already current. Nothing to do. |
| behind > 0, ahead `0` | `git merge --ff-only origin/main` |
| ahead > 0 (diverged) | **Stop and ask the user.** Do not merge, do not reset. |

Local `main` should never be ahead of origin, so commits there are an accident — usually leftovers from a rebase or a commit made on the wrong branch. Before proposing anything destructive, work out what they actually are:

```bash
git log --oneline origin/main..main                       # what's local-only
diff <(git show <local> --format="") <(git show <upstream> --format="")   # identical content?
```

A local commit whose diff is byte-identical to an upstream commit is a duplicate (differing only in author metadata) and is safe to drop with `git reset --hard origin/main`. A local commit with unique content is unpushed work — surface it and let the user decide. Report the pre-reset SHA either way so it stays recoverable via reflog.

If the working tree is dirty, stop and ask rather than stashing on the user's behalf.

## Phase 3: Assess readiness against latest main

The goal is not to summarize the story — it's to find the things that would waste implementation time or ship a silent defect. Verify; do not take the story's word for anything.

**Verify every factual claim in the story.** Stories in this repo often cite specific files, line-level details, symbol counts, and CDK API surface. Those are exactly the claims that rot as main moves. Open each cited file and confirm. Report a claim-by-claim table so the user can see what was checked, not just the conclusion.

**Prototype the risky mechanism before declaring it ready.** When a story depends on a non-obvious API behaviour — a CDK escape hatch, an L1 property, a construct's render path — write a throwaway script against the repo's own vendored `aws-cdk-lib` and synth it. This is where the expensive surprises hide (a silently-dropped property, an L2 that always emits a conflicting field, a wrong property name that type-checks). Ten minutes here saves an afternoon.

**Verify AWS service-capability claims against current AWS documentation.** A repo-only review cannot catch these. A synth proves the template renders; it says nothing about whether the service still accepts a property, whether a capability was deprecated, or whether an API the story names exists at all. Stories citing service behaviour — quotas, TTLs, condition keys, API names, defaults, regional availability — are asserting things that move independently of this repo, and your training data is not a source for them.

Use the MCP tools, not a web-fetch tool. `docs.aws.amazon.com` renders client-side, so `WebFetch` returns an empty page and looks like a missing doc:

```
mcp__builder-mcp__InternalSearch        query: "<service> <capability>"  domain: AWS_DOCS
mcp__builder-mcp__ReadInternalWebsites  inputs: ["https://docs.aws.amazon.com/<path>"]
```

Search first — guessing doc URLs wastes turns, and the API Reference pages (`/latest/APIReference/API_<Op>.html`) carry the request shape and error list the dev guide often omits.

**For any claim that an API, action, or field exists, check the service model.** This is the cheapest high-value check available and it settles the question outright:

```bash
python3 -c "
import botocore.session
m = botocore.session.get_session().get_service_model('<service>')
print(sorted(m.operation_names))
print(sorted(m.operation_model('<Op>').input_shape.members))"
```

An action absent from the model is not callable, no matter how confidently a design doc, a slide, or a presenter names it. Enablement material and internal decks age faster than the API.

When public docs and internal material disagree, say so rather than picking one. Record for each claim whether it is confirmed by public docs, stated only in internal material, contested, or unresolved — the implementer needs that to decide how firmly to word it, especially where the README publishes publicly. A value real enough to document but absent from AWS docs should say so, so readers don't conclude the README is wrong when they can't find it.

**Check the acceptance criteria are actually verifiable.** Each should be Given/When/Then per `.gitlab/issue_templates/default.md`, and each should be testable by the means the repo has: synth-time assertions, unit tests, baseline diffs. Flag any criterion that is really runtime behaviour — it needs a manual test-account note, not a test. Flag any that is ambiguous in a way that changes the implementation (e.g. "scopes to those ARNs" when `Equals` and `StartsWith` behave differently).

**Look for gaps in the proposed solution**, especially default and omitted-config paths. A guard specified only for the "both fields set" case commonly misses the "only the new field set" case, which is the primary use case. Trace what the code does when the new option is present and the old one is absent.

**Confirm the repo-obligation checklist** the story needs to satisfy, and flag any it doesn't mention:

- Sample configs — extend the comprehensive sample by default; a dedicated config only when the new field is mutually exclusive with one already there (`agent_rules/user-config-authoring.md` § 8)
- Every sample config has a `baselineDiffTestApp` entry and a committed baseline (`agent_rules/review-testing-standards.md`)
- Existing baselines that must stay byte-identical
- Generated schema artifacts — `lib/config-schema.json` and `schemas/@aws-mdaa/<module>.json` are committed and regenerate from the config interface via `npm run build`
- `CHANGELOG.md` entry under `[NEXT_RELEASE_VERSION]`
- Module `README.md` / `SCHEMA.md` currency
- New L3 constructs need a `*.compliance.test.ts`

Report as: verified claims, then blocking gaps, then corrections to the plan, then a verdict. Be specific enough that the implementer can act on each item without re-deriving it.

**If the review finds blocking gaps, present them and ask the user whether to proceed to Phase 4 or fix the workitem first.** Don't cut a branch for a story that needs rewriting, and don't refuse to cut one either — it's the user's call. Corrections to the *plan* (as opposed to missing requirements) generally don't block; note them and carry on.

### If you rewrite the workitem, leave no trace of the rewrite

The story is a specification, not a record of how it was produced. Its reader is encountering it for the first time and needs to know only what is true now. Notes about what an earlier version claimed are noise to everyone but you, and they invite the reader to weigh a superseded version against the current one.

Write the corrected description as if it had always read that way. Strip:

- Revision preambles and "corrected on <date>" notes
- Struck-through former text (`~~…~~`) — delete it, don't display it crossed out
- "The original version of this story asserted X" — just state the correct thing
- Table rows or list items whose only content is a correction ("Slide 7 → actually slide 8") — fix the citation in place and drop the row
- Editorialising about the sources ("neither deck notices this", "omitted from the original story")
- Renamed-thing trails ("formerly tracked under #NNNN")

Keep anything that changes what the implementer does, even when it originates in a correction:

- Warnings not to do something a source recommends, plus the reason — otherwise an implementer reading the same source re-adds it
- Genuine open questions, marked open
- Per-claim confidence, framed as *how to word this*, not as *what I checked*

The test: would a reader who had never seen the earlier version wonder why this sentence is here? If yes, it's archaeology — cut it.

## Phase 4: Create the branch

Only after the user is satisfied with readiness.

```bash
.claude/skills/story-prep/new_branch.sh <type>/<id>-<kebab-slug>
```

`new_branch.sh` is bundled in this skill's own directory, so it travels with the skill and works for anyone who checks out the repo. Run it from anywhere — it resolves the repo root from its own location.

**The script pushes the branch to `origin` (`git push -u`).** That's outward-facing, so confirm the branch name with the user before running it rather than picking one and pushing.

Name it `<type>/<workitem-id>-<short-kebab-slug>`, e.g. `feat/1345-audit-trail-data-events`. Pick `type` from the story's labels: `feat` for a feature request, `fix` for a bug, `docs` for a documentation-only deliverable, plus `chore` and `spike`.

It enforces `^(feat/|chore/|spike/|fix/|docs/)[a-z0-9]+(-[a-z0-9]+)*$`. Rejected: `feature/`, `doc/` (plural `docs/`), uppercase, underscores, a trailing hyphen, consecutive hyphens. Keep the slug short — it's derived from the story title, not a copy of it.

Every guard runs before any git side effect and exits 1 with a message on stderr, so a rejection costs nothing and never leaves a half-made branch:

- Invalid or missing branch name
- Branch already exists locally — it tells you to `git checkout` instead, which is the right move when Phase 1 found existing work
- Working tree dirty — a dirty tree would otherwise be carried onto the new branch
- Base branch diverged from the remote and can't fast-forward — it lists the local-only commits and stops

The script then fetches, checks out the base, and **fast-forwards only** (`git merge --ff-only`). Phase 2 makes that a no-op, which is the intent: sync deliberately and verifiably first, and let this find nothing to do. If Phase 2 was skipped and `main` diverged, the script refuses rather than quietly creating a merge commit on `main` — resolve it via Phase 2 and re-run.

## Report

Close with:

- **Workitem** — ID, title, milestone, labels, and any existing branch/MR/commits found
- **Main** — SHA now checked out, and what the sync did
- **Readiness** — verified-claims table, blocking gaps, plan corrections, verdict
- **Branch** — name created and pushed, or why not
