---
inclusion: manual
---

# Pre-Push Review

Run the same reviews that CI will run, then fix any issues found. Use this before pushing to avoid CI review failures.

## Usage

Reference this file in Kiro chat: `#pre-push-review`

Then say: "review my changes" or "run pre-push review"

## Process

### Step 1: Detect changed packages

Run `git diff origin/main --name-only` to identify changed files. Classify each into:
- L2/L3 constructs → compliance + architecture review
- App modules → module quality review
- Test files → test standards review
- Baseline files → baseline diff risk review
- Documentation files → doc quality review

### Step 2: For each applicable review, apply the steering file rules

Use the same rules as the CI agents:
- **Compliance** (`#[[file:.kiro/steering/compliance-review.md]]`): encryption, IAM, nag suppressions, security groups
- **Architecture** (`#[[file:.kiro/steering/architecture-review.md]]`): layer violations, dependency direction, construct ID stability
- **Module Quality** (`#[[file:.kiro/steering/module-quality.md]]`): README, sample configs, schema coverage, JSDoc, config usability
- **Test Standards** (`#[[file:.kiro/steering/testing-standards.md]]`): test coverage, naming, baselines, CDK Nag compliance
- **Diff Risk** (`#[[file:.kiro/steering/diff-risk-assessment.md]]`): breaking changes, data loss, privilege escalation

### Step 3: Report findings

Present findings grouped by agent, with severity and file:line. Format as a table:

| Agent | Severity | File | Issue |
|-------|----------|------|-------|
| Compliance | HIGH | lib/auth.ts:42 | Wildcard IAM resource |
| Architecture | MEDIUM | lib/app.ts:15 | Construct logic in app class |

### Step 4: Propose fixes

For each finding, propose a fix with a brief explanation of what will change and why. Present all proposed fixes before implementing any:

| # | Finding | Proposed Fix |
|---|---------|-------------|
| 1 | Wildcard IAM resource in auth.ts:42 | Scope to specific bucket ARN |
| 2 | Construct logic in app.ts:15 | Move to L3 construct |

Ask: "Proceed with all fixes, or adjust any?"

### Step 5: Implement fixes

After confirmation, implement fixes in severity order (HIGH first). After each fix, verify it doesn't introduce new issues.

### Step 6: Confirm clean

After all fixes, re-run the review to confirm no remaining findings. Report "Pre-push review clean — ready to push."

## Scope rules

- Only review code that differs from `origin/main` (same as CI)
- Be exhaustive — flag every instance of a pattern, not just the first
- Stay within each agent's scope (don't flag compliance issues as architecture)
- Do NOT flag pre-existing issues in unchanged code

## Out of scope

Changes to these paths are not covered by the automated review agents:
- `scripts/review/` — review infrastructure itself. Validate with `uv run pytest` in `scripts/review/python-tests/`
- `.kiro/steering/` — steering files. No automated review; verify manually
- `.gitlab-ci.yml` — CI config. No automated review; verify pipeline runs

If only out-of-scope files changed, report "No agent-reviewable code changed" and suggest the appropriate manual validation commands.
