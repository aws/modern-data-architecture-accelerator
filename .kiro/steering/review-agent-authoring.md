---
inclusion: fileMatch
fileMatchPattern: 'scripts/review/**'
---

# Review Agent Authoring Standards

Standards for building Kiro-powered review agents that run as CI jobs on merge requests. Activates automatically when any file under `scripts/review/` is read or modified.

#[[file:.kiro/steering/scripts-authoring.md]]

## Agent Architecture

Each review agent is an independent CI job that:
1. Detects affected packages using `changed-only.py` and `_target_ref()`
2. Collects context (source code, diffs, test files) for each affected package
3. Pipes context through Kiro headless with a steering file for assessment
4. Produces a `report.json` and JUnit XML report
5. Posts structured GitLab MR discussion threads (summary + detail threads)

The MR Summary agent is a special case — it updates the MR description instead of posting threads.

## Pipeline Blocking Policy

**All agent CI jobs use `allow_failure: false`.** If an agent fails to run (script crash, Kiro timeout, API error), the merge is blocked. The review is required, not optional.

**Finding-level blocking:**
- **BLOCKING findings** (compliance agent only) → review script exits non-zero → merge blocked
- **HIGH / MEDIUM / LOW findings** → review script exits zero → merge proceeds, threads require human acknowledgment
- Only the compliance agent has a BLOCKING tier. Other agents' worst severity is HIGH.

**Rationale:** If the agent can't run, the review didn't happen. MRs should not merge without review. BLOCKING findings represent infrastructure-breaking or security-removing changes that must be addressed before merge. HIGH/MEDIUM/LOW findings are review guidance enforced through the thread acknowledgment workflow.

## Shared Infrastructure — Reuse Rules

Before writing any new code, check these existing components:

| Component | Location | Import/Call |
|-----------|----------|-------------|
| `_target_ref()` | `review/lib/nx_graph.py` | Import |
| `_load_project_graph()` | `review/lib/nx_graph.py` | Import |
| `_get_transitive_deps()` | `review/lib/nx_graph.py` | Import |
| `PROJECT_ROOT` | `review/lib/nx_graph.py` | Import |
| `run_kiro_assessment()` | `review/lib/kiro_integration.py` | Import |
| `_parse_risk_json()` | `review/lib/kiro_integration.py` | Import |
| `_parse_risk_level()` | `review/lib/kiro_integration.py` | Import |
| `to_junit_xml()` | `review/lib/report.py` | Import |
| `gitlab_api()` | `review/lib/gitlab_threads.py` | Import |
| `get_mr_discussions()` | `review/lib/gitlab_threads.py` | Import |
| `compute_hash()` | `review/lib/gitlab_threads.py` | Import |
| `create_discussion()` | `review/lib/gitlab_threads.py` | Import |
| `resolve_discussion()` | `review/lib/gitlab_threads.py` | Import |
| `_build_diff_position()` | `review/lib/gitlab_threads.py` | Import |
| `_parse_source_position()` | `review/lib/gitlab_threads.py` | Import |
| `changed-only.py` | `scripts/nx/changed-only.py` | Subprocess (different purpose directory) |

**Do NOT:**
- Reimplement any of the above
- Import across purpose directories (`scripts/review/` must not import from `scripts/nx/` — call as subprocess)
- Add external pip dependencies — stdlib only

## Thread Naming Convention

Each agent uses a domain-specific label that describes what the finding is:

| Agent | Thread Header | Summary Header |
|-------|--------------|----------------|
| Compliance | `## {icon} Compliance Risk: {LEVEL}` | `## Compliance Review Summary` |
| Test Standards | `## {icon} Testing Gap: {LEVEL}` | `## Test Standards Review Summary` |
| Module Quality | `## {icon} Quality Concern: {LEVEL}` | `## Module Quality Review Summary` |
| Code Architecture | `## {icon} Architecture Misalignment: {LEVEL}` | `## Architecture Review Summary` |
| Documentation Quality | `## {icon} Documentation Gap: {LEVEL}` | `## Documentation Quality Review Summary` |

Icons: ❌ BLOCKING, ⚠️ HIGH/MEDIUM, ✅ LOW, ❓ UNKNOWN

## Thread Namespacing

Each agent uses distinct HTML comment markers to identify its threads. Markers must never collide across agents.

| Agent | Detail Marker | Summary Marker |
|-------|--------------|----------------|
| Baseline (existing) | `<!-- baseline-source:{key} -->` | `<!-- baseline-summary -->` |
| Compliance | `<!-- compliance-source:{file}:{line} -->` | `<!-- compliance-summary -->` |
| Test Standards | `<!-- test-standards-pkg:{name} -->` | `<!-- test-standards-summary -->` |
| Module Quality | `<!-- module-quality-pkg:{name} -->` | `<!-- module-quality-summary -->` |
| Architecture | `<!-- architecture-source:{file}:{hash} -->` | `<!-- architecture-summary -->` |
| Documentation | `<!-- docs-quality-file:{path} -->` | `<!-- docs-quality-summary -->` |

## Two-Tier Thread Model

Every review agent follows the same two-tier pattern from the baseline review:

**Tier 1 — Summary thread (resolved):**
- One per MR per agent — **always posted**, even when there are no findings
- When no findings: states the agent ran successfully and found no issues
- When findings exist: provides overview with finding counts by severity, affected packages
- Resolved by default (informational, doesn't block)
- Updated in place on re-runs

**Tier 2 — Detail threads (unresolved):**
- One per finding group (per-package, per-file, or per-source-location depending on agent)
- All severity levels get threads (including LOW)
- Positioned inline on the MR diff when possible via `_build_diff_position()`
- Unresolved — requires human acknowledgment
- Hash-based change detection: skip if unchanged, update and unresolve if changed
- Thread footer includes CI job name so reviewers know what to rerun after resolving

## Thread Lifecycle

Copy the lifecycle logic from `post_baseline_threads.py`:

1. **Compute structural hash** from finding data (excludes prose descriptions)
2. **Find existing thread** via HTML comment marker
3. **If thread is locked** (`[review-bot:lock]` reply by a human) → skip everything
4. **If no existing thread** → create new, position inline if possible
5. **If existing thread, hash matches** → skip (no update needed) unless it was auto-resolved by the bot and the finding has reappeared (then reopen)
6. **If existing thread, source hash matches** → skip (Kiro variance, not a real change)
7. **If existing thread, hash differs and thread is human-resolved** → edit note in place and post a "_Findings metadata updated since this thread was resolved. Resolved status preserved._" reply, but do NOT unresolve
8. **If existing thread, hash differs otherwise** → edit note in place, unresolve thread with "_Findings have changed since last review. Please re-acknowledge._"

### Source-hash safety net (REQUIRED)

Every post script MUST populate `source_hash` on each finding group dict and pass a
`{key: source_hash}` map to `resolve_orphaned_threads(..., source_hashes=...)`. The
shared lifecycle uses these to suppress hash-drift reopens and orphan auto-resolves
when the underlying source files have not changed (Kiro/LLM variance).

Helpers in `review/lib/thread_lifecycle.py`:

- `compute_source_hash(package_root)` — directory hash, used by package-scoped agents
  (compliance, architecture, baseline, module-quality, test-standards).
- `compute_file_source_hash(file_path)` — single-file hash, used by file-scoped
  agents (doc-quality).

### Human resolves are durable

A reviewer's "Resolve thread" click is a deliberate acknowledgment that survives
hash drift. The lifecycle distinguishes human resolves from bot auto-resolves via
`_was_auto_resolved()` and only reopens the latter when findings reappear or
metadata drifts.

### `[review-bot:lock]` escape hatch

If a thread keeps getting reopened despite the source-hash safety net (e.g., the
file legitimately changed for unrelated reasons but the finding remains a
"won't fix"), a reviewer can reply with `[review-bot:lock]` on the thread.
Subsequent CI runs will skip the thread entirely — no body update, no reopen,
no orphan resolution. Editing or deleting the lock comment releases the lock.

This phrase is advertised in the standard thread footer so reviewers don't need
to read steering docs to discover it.

## CI Job Template

```yaml
feature_merge_{agent}_review:
  interruptible: true
  tags:
    - arch:amd64
    - size:medium
  only:
    - merge_requests
  stage: analyze
  dependencies:
    - feature_merge_build_test
  needs:
    - feature_merge_build_test
  cache:
    key: feature-merge-build-$CI_COMMIT_SHA
    paths:
      - node_modules/
      - packages/**/node_modules/
      - .nx/
    policy: pull
  allow_failure: false
  variables:
    GIT_DEPTH: '0'
    KIRO_API_KEY: '${KIRO_API_KEY}'
    KIRO_TIMEOUT: '600'
    KIRO_MAX_THREADS: '5'
  script:
    - python3 ./scripts/review/{agent}/{agent}_review.py --output-dir {agent}-review
    - python3 ./scripts/review/{agent}/post_{agent}_threads.py --report {agent}-review/report.json
  artifacts:
    paths:
      - {agent}-review/report.json
    reports:
      junit: {agent}-review/junit-report.xml
    when: always
```

## Review Script Pattern

Each `*_review.py` follows the `baseline_review.py` pattern:

```python
#!/usr/bin/env python3
"""
{Agent Name} Review — {one-line description}.

{Detailed description of what it does, numbered steps.}

Outputs:
  {agent}-review/report.json       - Full structured report
  {agent}-review/junit-report.xml  - JUnit XML for GitLab MR test reports

Environment:
  KIRO_API_KEY                     - Required for assessment
  KIRO_TIMEOUT                     - Optional, default 600s
  KIRO_MAX_THREADS                 - Optional, default 5

Usage:
  python3 scripts/review/{agent}/{agent}_review.py [--output-dir {agent}-review]
"""
```

Key implementation points:
- Use `_target_ref()` for git diff base — never hardcode `origin/main`
- Call `changed-only.py` as subprocess with `--extensions .ts` for package detection
- Filter packages by path for agent scope (L2/L3 for compliance, apps for module quality, etc.)
- Parallel Kiro invocations via `ThreadPoolExecutor` with `KIRO_MAX_THREADS`
- Use `run_kiro_assessment(prompt, validate_json=True)` for structured output
- Generate JUnit XML via `to_junit_xml()` from `review/lib/report.py`
- Exit non-zero only for BLOCKING findings (compliance agent) or infrastructure failures

## Thread Lifecycle and Exit Code Logic

After posting/updating all threads, the thread posting script must:

1. **Resolve orphaned threads** — find threads with this agent's marker that don't correspond to any current finding. Auto-resolve them with a note: "_This finding was resolved by code changes. Thread auto-resolved._"
2. **Check for unresolved threads** — re-fetch all discussions, find threads with this agent's marker, check if any are unresolved.
3. **If any unresolved → exit non-zero** (blocks merge)
4. **If all resolved (or no threads) → exit zero** (merge proceeds)

This means:
- New findings → new unresolved thread → job fails → reviewer must resolve to unblock
- Changed findings → thread unresolved → job fails → reviewer must re-resolve
- Unchanged findings with resolved threads → thread skipped → job passes
- No findings → no threads (only summary) → job passes
- Finding disappeared (code fixed) → orphaned thread auto-resolved with note → job passes

## Kiro Prompt Pattern

Each agent's prompt must:
1. Reference the steering file: `#[[file:.kiro/steering/{steering-file}.md]]`
2. Include the relevant context (code diff, source files, test files, etc.)
3. Specify the output file: `Write your assessment to {output_file} as a JSON object.`
4. Include the exact JSON schema the agent expects
5. Include rules for what to include/exclude in findings
6. Use `{output_file}` placeholder (replaced by `run_kiro_assessment()`)

## Wide Impact Escalation

For agents reviewing shared constructs (compliance, architecture):
- If a finding's source is in a shared L2/L3 construct, use `_get_transitive_deps()` to count downstream consumers
- 3+ downstream modules → escalate risk one level
- 5+ → escalate two levels
- 10+ → escalate three levels (max HIGH, never auto-escalate to BLOCKING)
- Note the blast radius in the thread body

Copy the escalation logic from `post_baseline_threads.py` `_build_root_cause_groups()`.

## File Reading Pattern

Each agent reads package files inline — no shared `source_collector` module. Follow the `baseline_review.py` pattern:
- `Path.glob()` + `read_text()` for source files
- `subprocess.run(["git", "diff", ...])` for code diffs
- Truncate large content to stay within Kiro context limits (15-20K chars per section)
- Return empty string if file/directory doesn't exist

## Testing Pattern

All tests in `scripts/review/python-tests/`. Test pure functions only:
- File classification / package filtering
- Prompt construction (verify steering file reference, context inclusion)
- Report generation (mock Kiro responses, verify JSON structure)
- Thread formatting (verify markers, hash computation, body structure)
- Thread lifecycle (mock GitLab API, verify create/update/skip logic)
- Wide impact escalation (mock nx graph, verify risk level changes)

Do NOT test actual subprocess execution, Kiro CLI invocation, or GitLab API calls.
