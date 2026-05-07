#!/usr/bin/env python3
"""
MR Summary — auto-populates the MR description with change stats and narrative.

1. Collects git diff stats and classifies changed files by category
2. Collects commit messages
3. Detects config schema and sample config changes
4. Pipes context through Kiro headless for narrative summary generation
5. Updates the MR description below a tear line marker

The summary is purely informational — no risk evaluation, compliance review,
or test quality assessment. Those concerns are handled by dedicated review agents.

Outputs:
  mr-summary/summary.md  - The generated summary markdown (for debugging)

Environment:
  KIRO_API_KEY           - Required for narrative generation (Kiro headless auth)
  CI_API_V4_URL          - GitLab API base URL (set by GitLab CI)
  CI_PROJECT_ID          - Project ID (set by GitLab CI)
  CI_MERGE_REQUEST_IID   - MR IID (set by GitLab CI)
  PROJECT_ACCESS_TOKEN   - GitLab project access token for MR description update

Usage:
  python3 scripts/review/mr-summary/mr_summary.py [--output-dir mr-summary]
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path

# Add scripts/ to Python path so review.lib imports work when run directly
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from review.lib.nx_graph import PROJECT_ROOT, _target_ref
from review.lib.kiro_integration import run_kiro_assessment, strip_markdown_fences
from review.lib.gitlab_threads import gitlab_api


SUMMARY_MARKER = "<!-- mr-summary-auto -->"

# File category classification rules — ordered by specificity (most specific first)
# Each rule is (category_name, include_pattern, exclude_pattern_or_None)
FILE_CATEGORIES = [
    ("Test Harness", re.compile(r"^packages/utilities/mdaa-testing/lib/.*\.ts$"), None),
    ("Configuration Schemas", re.compile(r"^packages/.*/config-schema\.json$"), None),
    ("Duplicates", re.compile(r"^schemas/.*\.json$"), None),
    ("Tests — Diff/Snapshot", re.compile(
        r"\.(baseline\.json|snap)$|"
        r"\.(diff|snapshot|synth)\.test\.ts$"
    ), None),
    ("Tests — Unit", re.compile(r"^packages/.*/test/.*\.ts$"), re.compile(
        r"\.(diff|snapshot|synth)\.test\.ts$|"
        r"^packages/utilities/mdaa-testing/"
    )),
    ("CI/CD Pipeline", re.compile(r"^(\.gitlab-ci\.yml|scripts/)"), None),
    ("Documentation", re.compile(r"\.md$"), None),
    ("Sample Configs", re.compile(r"sample_configs/.*\.yaml$"), None),
    ("Build / Config", re.compile(
        r"(^|/)package\.json$|package-lock\.json|"
        r"^nx\.json$|tsconfig.*\.json$|jest\.config\.|"
        r"\.prettierrc|Dockerfile|\.properties$|"
        r"^\.bandit$|^\.checkov\.yml$|^\.gitignore$"
    ), None),
    # Code categories — broken out by construct layer
    ("L2 Constructs", re.compile(r"^packages/constructs/L2/.*/lib/.*\.ts$"), None),
    ("L3 Constructs", re.compile(r"^packages/constructs/L3/.*/lib/.*\.ts$"), None),
    ("App Modules", re.compile(
        r"^packages/apps/.*/lib/.*\.ts$|"
        r"^packages/apps/.*/bin/.*\.ts$"
    ), None),
    ("Utilities / CLI", re.compile(
        r"^packages/utilities/.*/lib/.*\.ts$|"
        r"^packages/cli/lib/.*\.ts$"
    ), re.compile(r"^packages/utilities/mdaa-testing/")),
    ("Lambda / Python", re.compile(r"^packages/.*/lambda/.*\.py$"), None),
]


def classify_file(filepath: str) -> str:
    """Classify a file into a category based on path patterns."""
    for category, include, exclude in FILE_CATEGORIES:
        if include.search(filepath):
            if exclude and exclude.search(filepath):
                continue
            return category
    return "Other"


def get_changed_files() -> list[str]:
    """Get list of changed files between target branch and HEAD."""
    result = subprocess.run(
        ["git", "diff", "--name-only", _target_ref()],
        capture_output=True, text=True, cwd=str(PROJECT_ROOT),
    )
    return [f.strip() for f in result.stdout.strip().split("\n") if f.strip()]


def get_diff_stats() -> str:
    """Get overall diff stats."""
    result = subprocess.run(
        ["git", "diff", "--shortstat", _target_ref()],
        capture_output=True, text=True, cwd=str(PROJECT_ROOT),
    )
    return result.stdout.strip()


def get_category_stats(files: list[str]) -> str:
    """Get shortstat for a list of files."""
    if not files:
        return ""
    result = subprocess.run(
        ["git", "diff", "--shortstat", _target_ref(), "--"] + files,
        capture_output=True, text=True, cwd=str(PROJECT_ROOT),
    )
    return result.stdout.strip()


def parse_shortstat(stat_line: str) -> tuple[int, int, int]:
    """Parse git shortstat output into (files, insertions, deletions)."""
    files = insertions = deletions = 0
    if not stat_line:
        return files, insertions, deletions
    m = re.search(r"(\d+) files? changed", stat_line)
    if m:
        files = int(m.group(1))
    m = re.search(r"(\d+) insertions?\(\+\)", stat_line)
    if m:
        insertions = int(m.group(1))
    m = re.search(r"(\d+) deletions?\(-\)", stat_line)
    if m:
        deletions = int(m.group(1))
    return files, insertions, deletions


def get_commit_messages() -> str:
    """Get commit messages for the MR."""
    result = subprocess.run(
        ["git", "log", "--oneline", f"{_target_ref()}..HEAD"],
        capture_output=True, text=True, cwd=str(PROJECT_ROOT),
    )
    return result.stdout.strip()


def get_code_diff(max_chars: int = 30000) -> str:
    """Get the full code diff, truncated to max_chars."""
    result = subprocess.run(
        ["git", "diff", _target_ref()],
        capture_output=True, text=True, cwd=str(PROJECT_ROOT),
    )
    diff = result.stdout.strip()
    if len(diff) > max_chars:
        diff = diff[:max_chars] + f"\n\n... (truncated, {len(diff)} total chars)"
    return diff


def build_stats_table(changed_files: list[str]) -> str:
    """Build the change summary table by file category."""
    # Group files by category
    categories: dict[str, list[str]] = {}
    for f in changed_files:
        cat = classify_file(f)
        categories.setdefault(cat, []).append(f)

    # Build table rows with stats
    rows: list[tuple[str, int, int, int]] = []
    for cat_name in [c[0] for c in FILE_CATEGORIES] + ["Other"]:
        files = categories.get(cat_name, [])
        if not files or cat_name == "Duplicates":
            continue
        stat_line = get_category_stats(files)
        n_files, insertions, deletions = parse_shortstat(stat_line)
        # Use actual file count from our list if shortstat disagrees (renames)
        rows.append((cat_name, len(files), insertions, deletions))

    if not rows:
        return "_No file changes detected._"

    lines = [
        "| Category | Files | Insertions | Deletions |",
        "|---|---|---|---|",
    ]
    for cat, n_files, ins, dels in rows:
        lines.append(f"| {cat} | {n_files} | +{ins} | -{dels} |")

    return "\n".join(lines)


def get_config_schema_diff() -> str:
    """Get diff of changed config-schema.json files."""
    result = subprocess.run(
        ["git", "diff", _target_ref(), "--", "packages/**/config-schema.json"],
        capture_output=True, text=True, cwd=str(PROJECT_ROOT),
    )
    diff = result.stdout.strip()
    if not diff:
        return ""
    max_chars = 5000
    if len(diff) > max_chars:
        diff = diff[:max_chars] + "\n... (truncated)"
    return diff


KIRO_PROMPT = """\
You are generating a merge request summary for the MDAA repository.

Read the steering file #[[file:.kiro/steering/mr-summary.md]] for the complete
rules and JSON output schema. Follow those rules exactly.

Here is the context for this MR:

## Overall Stats
{overall_stats}

## Change Summary by Category
{stats_table}

## Commit Messages
```
{commit_messages}
```

## Code Diff
```diff
{code_diff}
```

{config_section}

Write the JSON object to {output_file}. No preamble, no markdown fences around the JSON,
no explanation outside the JSON. The file must contain ONLY valid JSON matching the schema
in the steering file.
"""


def generate_narrative(
    overall_stats: str,
    stats_table: str,
    commit_messages: str,
    code_diff: str,
    config_diff: str,
) -> str:
    """Generate narrative summary via Kiro and assemble into markdown."""
    config_section = ""
    if config_diff:
        config_section = f"## Config Schema Changes\n```diff\n{config_diff}\n```"

    prompt = KIRO_PROMPT.format(
        overall_stats=overall_stats,
        stats_table=stats_table,
        commit_messages=commit_messages,
        code_diff=code_diff,
        config_section=config_section,
        output_file="{output_file}",
    )

    raw = run_kiro_assessment(prompt, validate_json=True)

    text = strip_markdown_fences(raw)

    try:
        parsed = json.loads(text)
    except ValueError:
        # Fallback: treat raw output as the change summary
        return raw

    return format_summary_markdown(parsed, overall_stats, stats_table)


def format_summary_markdown(data: dict, overall_stats: str, stats_table: str) -> str:
    """Assemble parsed JSON sections into markdown with collapsible blocks."""
    parts = []

    # Change summary — always visible
    change_summary = data.get("change_summary", "")
    if change_summary:
        parts.append(change_summary)

    # File stats — collapsed, right after summary
    parts.append("")
    parts.append(f"<details><summary><b>File Stats</b> — {overall_stats}</summary>\n")
    parts.append(stats_table)
    parts.append("\n</details>")

    # Code changes — collapsed
    code_changes = data.get("code_changes", [])
    if code_changes:
        lines = []
        for entry in code_changes:
            cat = entry.get("category", "")
            desc = entry.get("description", "")
            files = entry.get("files", "")
            lines.append(f"**{cat}**\n\n{desc}")
            if files:
                lines.append(f"\n**Files:** {files}")
            lines.append("")
        content = "\n".join(lines)
        parts.append("")
        parts.append(f"<details><summary><b>Code Changes</b></summary>\n\n{content}\n</details>")

    # File changes — collapsed
    file_changes = data.get("file_changes", [])
    if file_changes:
        lines = []
        for entry in file_changes:
            cat = entry.get("category", "")
            desc = entry.get("description", "")
            files = entry.get("files", "")
            lines.append(f"**{cat}**\n\n{desc}")
            if files:
                lines.append(f"\n**Files:** {files}")
            lines.append("")
        content = "\n".join(lines)
        parts.append("")
        parts.append(f"<details><summary><b>File Changes</b></summary>\n\n{content}\n</details>")

    # Config changes — collapsed
    config_changes = data.get("config_changes", "")
    if config_changes:
        parts.append("")
        parts.append(f"<details><summary><b>Configuration Changes</b></summary>\n\n{config_changes}\n\n</details>")

    # Commit log — collapsed
    commit_log = data.get("commit_log", "")
    if commit_log:
        parts.append("")
        parts.append(f"<details><summary><b>Commit Log</b></summary>\n\n{commit_log}\n\n</details>")

    return "\n".join(parts)


def update_mr_description(summary_content: str) -> None:
    """Update the MR description with the summary below the tear line."""
    token = os.environ.get("PROJECT_ACCESS_TOKEN")
    if not token:
        print("PROJECT_ACCESS_TOKEN not set, skipping MR description update.")
        return

    mr_iid = os.environ.get("CI_MERGE_REQUEST_IID")
    if not mr_iid:
        print("CI_MERGE_REQUEST_IID not set (not an MR pipeline), skipping.")
        return

    project_id = os.environ["CI_PROJECT_ID"]

    # Fetch current MR description
    mr_path = f"/projects/{project_id}/merge_requests/{mr_iid}"
    mr_data = gitlab_api("GET", mr_path, token)
    current_desc = mr_data.get("description", "") or ""

    # Preserve GitLab auto-appended issue references (e.g., "Closes #123")
    # GitLab adds these at the bottom of the description when creating MRs from issues.
    issue_ref_pattern = re.compile(
        r"^(Closes|Related to|Fixes|Resolves|Implements)\s+.+$",
        re.MULTILINE | re.IGNORECASE,
    )
    # Capture the full matching lines, not just the keyword
    issue_ref_lines = [
        line for line in current_desc.split("\n")
        if issue_ref_pattern.match(line.strip())
    ]

    # Build the auto-generated section
    timestamp = subprocess.run(
        ["date", "-u", "+%Y-%m-%d %H:%M UTC"],
        capture_output=True, text=True,
    ).stdout.strip()

    auto_section = (
        f"\n\n---\n{SUMMARY_MARKER}\n"
        f"## MR Summary\n\n"
        f"_Auto-populated by the MR Summary agent. "
        f"Last updated: {timestamp}. Do not edit below this line._\n\n"
        f"{summary_content}"
    )

    # Append preserved issue references at the bottom
    if issue_ref_lines:
        auto_section += "\n\n" + "\n".join(issue_ref_lines)

    # Replace existing auto section or append
    if SUMMARY_MARKER in current_desc:
        # Replace everything from the tear line onward
        marker_idx = current_desc.index(SUMMARY_MARKER)
        # Find the --- before the marker (tear line)
        tear_idx = current_desc.rfind("---", 0, marker_idx)
        if tear_idx >= 0:
            above_tear = current_desc[:tear_idx].rstrip()
        else:
            above_tear = current_desc[:marker_idx].rstrip()
        # Remove any issue ref lines from above_tear (we'll re-append them below the auto section)
        above_lines = [
            line for line in above_tear.split("\n")
            if not issue_ref_pattern.match(line.strip())
        ]
        new_desc = "\n".join(above_lines).rstrip() + auto_section
    else:
        # First run — remove issue refs from current desc, they'll go below the auto section
        above_lines = [
            line for line in current_desc.split("\n")
            if not issue_ref_pattern.match(line.strip())
        ]
        new_desc = "\n".join(above_lines).rstrip() + auto_section

    # Update MR description
    gitlab_api("PUT", mr_path, token, {"description": new_desc})
    print("  MR description updated with summary.")


def main() -> None:
    parser = argparse.ArgumentParser(description="MR Summary generator")
    parser.add_argument(
        "--output-dir",
        default="mr-summary",
        help="Output directory for summary artifacts",
    )
    args = parser.parse_args()

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Phase 1: Collect stats (mechanical)
    print("Collecting change stats...")
    changed_files = get_changed_files()
    if not changed_files:
        print("No file changes detected. Skipping summary generation.")
        return

    print(f"Found {len(changed_files)} changed file(s).")
    overall_stats = get_diff_stats()
    stats_table = build_stats_table(changed_files)
    commit_messages = get_commit_messages()

    print("\nStats table:")
    print(stats_table)

    # Phase 2: Detect config changes (mechanical)
    config_diff = get_config_schema_diff()
    if config_diff:
        print(f"\nConfig schema changes detected ({len(config_diff)} chars).")

    # Phase 3: Generate narrative (Kiro)
    print("\nGenerating narrative summary via Kiro...")
    code_diff = get_code_diff()
    summary = generate_narrative(
        overall_stats=overall_stats,
        stats_table=stats_table,
        commit_messages=commit_messages,
        code_diff=code_diff,
        config_diff=config_diff,
    )

    # Save to file for debugging
    summary_path = output_dir / "summary.md"
    summary_path.write_text(summary)
    print(f"\nSummary written to {summary_path}")

    # Phase 4: Update MR description
    print("\nUpdating MR description...")
    update_mr_description(summary)

    print("Done.")


if __name__ == "__main__":
    main()
