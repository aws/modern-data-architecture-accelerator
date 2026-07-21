#!/usr/bin/env python3
"""Post SonarQube new-code issues as GitLab MR discussion threads.

Groups issues by file and posts/updates/resolves threads using the same
lifecycle infrastructure as other review agents. Threads are identified
by <!-- sonar-file:<path> --> markers.

Requires environment variables:
  CI_API_V4_URL        - GitLab API base URL (set by GitLab CI)
  CI_PROJECT_ID        - Project ID (set by GitLab CI)
  CI_MERGE_REQUEST_IID - MR IID (set by GitLab CI)
  PROJECT_ACCESS_TOKEN - GitLab token for API calls
  SONAR_SERVER         - SonarQube server URL
  SONAR_TOKEN          - SonarQube authentication token
  SONAR_PORT           - (optional) Port for browser links, defaults to 8443

Usage:
    python3 post_sonar_threads.py <project_key>
"""
from __future__ import annotations

import base64
import hashlib
import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import urlparse

# Add scripts/ to Python path so review.lib imports work when run directly
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from review.lib.gitlab_threads import (
    get_mr_discussions,
    create_discussion,
    _build_diff_position,
)
from review.lib.thread_lifecycle import (
    find_thread_by_marker,
    post_or_update_summary,
    post_detail_threads,
    resolve_orphaned_threads,
    compute_file_source_hash,
)


# --- Constants ---

PAGE_SIZE = 500
SUMMARY_MARKER = "<!-- sonar-summary -->"
FILE_PATTERN = re.compile(r"<!-- sonar-file:(.+?) -->")

SEVERITY_MAP = {
    "BLOCKER": "HIGH",
    "CRITICAL": "HIGH",
    "MAJOR": "MEDIUM",
    "MINOR": "LOW",
    "INFO": "LOW",
}

SEVERITY_ICON = {
    "HIGH": "\u26a0\ufe0f",
    "MEDIUM": "\u26a0\ufe0f",
    "LOW": "\u2139\ufe0f",
}

SEVERITY_ORDER = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}


# --- SonarQube API ---

def _sonar_request(url: str, credentials: str) -> dict:
    """Make an authenticated request to the SonarQube API."""
    req = urllib.request.Request(url, headers={"Authorization": f"Basic {credentials}"})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")
        print(f"ERROR: SonarQube API returned HTTP {e.code}: {e.reason}", file=sys.stderr)
        if body:
            print(f"Response: {body[:500]}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"ERROR: SonarQube API request failed: {e}", file=sys.stderr)
        sys.exit(1)


def fetch_new_code_issues(project_key: str, server: str, credentials: str) -> list[dict]:
    """Fetch all new-code issues from SonarQube."""
    issues: list[dict] = []
    page = 1
    while True:
        url = (
            f"{server}/api/issues/search"
            f"?componentKeys={project_key}"
            f"&statuses=OPEN,CONFIRMED,REOPENED"
            f"&inNewCodePeriod=true"
            f"&ps={PAGE_SIZE}"
            f"&p={page}"
        )
        data = _sonar_request(url, credentials)
        batch = data.get("issues", [])
        # Filter to exact project
        batch = [i for i in batch if i.get("project") == project_key]
        issues.extend(batch)
        total = data.get("paging", {}).get("total", 0)
        if len(issues) >= total or not batch:
            break
        page += 1
    return issues


# --- Grouping ---

def group_issues_by_file(issues: list[dict], project_key: str) -> dict[str, dict]:
    """Group issues by file path and compute risk level."""
    groups: dict[str, dict] = {}
    for issue in issues:
        component = issue.get("component", "")
        file_path = component.replace(f"{project_key}:", "")
        if not file_path:
            continue

        if file_path not in groups:
            groups[file_path] = {
                "file_path": file_path,
                "issues": [],
                "risk_level": "LOW",
            }

        severity = issue.get("severity", "INFO")
        mapped_risk = SEVERITY_MAP.get(severity, "LOW")

        groups[file_path]["issues"].append({
            "type": issue.get("type", "UNKNOWN"),
            "severity": severity,
            "risk": mapped_risk,
            "line": issue.get("line"),
            "message": issue.get("message", ""),
            "rule": issue.get("rule", ""),
            "key": issue.get("key", ""),
        })

        # Escalate group risk level
        current_risk = groups[file_path]["risk_level"]
        if SEVERITY_ORDER.get(mapped_risk, 99) < SEVERITY_ORDER.get(current_risk, 99):
            groups[file_path]["risk_level"] = mapped_risk

    return groups


# --- Formatting ---

def format_summary_body(groups: dict[str, dict], public_url: str, project_key: str) -> str:
    """Format the summary note body."""
    total_issues = sum(len(g["issues"]) for g in groups.values())
    total_files = len(groups)

    risk_counts = {"HIGH": 0, "MEDIUM": 0, "LOW": 0}
    for g in groups.values():
        risk_counts[g["risk_level"]] += 1

    risk_summary = ", ".join(
        f"{count} {level}" for level, count in risk_counts.items() if count > 0
    )

    lines = [
        SUMMARY_MARKER,
        "",
        "## SonarQube Review Summary",
        "",
        f"**Total new-code issues:** {total_issues} across {total_files} file(s)",
        "",
        f"**Thread severity breakdown:** {risk_summary}",
        "",
        f"[View in SonarQube]({public_url}/project/issues?id={project_key}&inNewCodePeriod=true)",
        "",
        "_Files with issues have individual review threads. Resolve each thread to acknowledge the findings._",
    ]
    return "\n".join(lines)


def format_file_thread(key: str, group: dict, content_hash: str, is_update: bool) -> str:
    """Format a per-file discussion thread body."""
    file_path = group["file_path"]
    risk_level = group["risk_level"]
    icon = SEVERITY_ICON.get(risk_level, "\u2753")
    issues = sorted(group["issues"], key=lambda i: SEVERITY_ORDER.get(i["risk"], 99))

    lines = [
        f"<!-- sonar-file:{key} -->",
        f"<!-- sonar-hash:{content_hash} -->",
        "",
        f"## {icon} SonarQube Review — New Code Issues: {risk_level}",
        "",
        f"**File:** `{file_path}`",
        "",
        f"### Issues ({len(issues)})",
        "",
    ]

    for issue in issues:
        line_ref = f"L{issue['line']}" if issue.get("line") else "?"
        lines.append(
            f"- **{issue['type']} [{issue['severity']}]** {line_ref}: "
            f"{issue['message']} (`{issue['rule']}`)"
        )

    lines.extend([
        "",
        "_Contributor: fix the issues or suppress inline with `//NOSONAR` and rationale._\\",
        "_Reviewer: resolve this thread once addressed._\\",
        "_Stuck in a reopen loop? Reply `[review-bot:lock]` to suppress further reopens._",
    ])

    return "\n".join(lines)


def compute_structural_hash(key: str, group: dict) -> str:
    """Compute a hash of the group's issues for change detection."""
    content = json.dumps(
        [(i["rule"], i["line"], i["message"]) for i in group["issues"]],
        sort_keys=True,
    )
    return hashlib.sha256(content.encode()).hexdigest()[:12]


def get_position(key: str) -> dict | None:
    """Try to build a diff position for inline thread placement."""
    # Use line 1 of the file for the thread position
    return _build_diff_position(key, 1)


# --- Main ---

def main() -> None:
    if len(sys.argv) != 2:
        print(f"Usage: {sys.argv[0]} <project_key>", file=sys.stderr)
        sys.exit(1)

    project_key = sys.argv[1]

    # GitLab env
    project_id = os.environ.get("CI_PROJECT_ID", "")
    mr_iid = os.environ.get("CI_MERGE_REQUEST_IID", "")
    token = os.environ.get("PROJECT_ACCESS_TOKEN", "")

    if not mr_iid:
        print("Not an MR pipeline — skipping SonarQube thread posting.")
        return

    if not project_id or not token:
        print("ERROR: CI_PROJECT_ID or PROJECT_ACCESS_TOKEN not set", file=sys.stderr)
        sys.exit(1)

    # SonarQube env
    server = os.environ.get("SONAR_SERVER", "").rstrip("/")
    sonar_port = os.environ.get("SONAR_PORT", "8443")
    sonar_token = os.environ.get("SONAR_TOKEN", "")

    if not server or not sonar_token:
        print("ERROR: SONAR_SERVER or SONAR_TOKEN not set", file=sys.stderr)
        sys.exit(1)

    parsed = urlparse(server)
    if parsed.port is None and parsed.hostname:
        public_url = f"{parsed.scheme}://{parsed.hostname}:{sonar_port}{parsed.path}"
    else:
        public_url = server

    credentials = base64.b64encode(f"{sonar_token}:".encode()).decode()

    # Fetch issues
    print("Fetching SonarQube new-code issues...")
    issues = fetch_new_code_issues(project_key, server, credentials)
    print(f"  Found {len(issues)} issue(s)")

    if not issues:
        # Post clean summary, resolve orphans
        discussions = get_mr_discussions(project_id, mr_iid, token)
        post_or_update_summary(
            project_id, mr_iid, token, discussions, SUMMARY_MARKER,
            lambda: f"{SUMMARY_MARKER}\n\n## SonarQube Review Summary\n\n"
                    f"**Total new-code issues:** 0\n\n"
                    f"**Result:** \u2705 No SonarQube issues in new code.\n\n"
                    f"_All clean — no review threads needed._",
        )
        discussions = get_mr_discussions(project_id, mr_iid, token)
        resolve_orphaned_threads(
            project_id, mr_iid, token, discussions, FILE_PATTERN, set(),
        )
        return

    # Group by file
    groups = group_issues_by_file(issues, project_key)

    # Source hashes for orphan detection
    source_hashes = {
        key: compute_file_source_hash(key) for key in groups
    }

    # Get existing discussions
    discussions = get_mr_discussions(project_id, mr_iid, token)

    # Post summary
    discussions = post_or_update_summary(
        project_id, mr_iid, token, discussions, SUMMARY_MARKER,
        lambda: format_summary_body(groups, public_url, project_key),
    )

    # Post per-file threads
    processed_keys = post_detail_threads(
        project_id, mr_iid, token, discussions,
        groups, FILE_PATTERN,
        format_file_thread,
        compute_structural_hash,
        get_position,
    )

    # Resolve orphans (files no longer have issues)
    resolve_orphaned_threads(
        project_id, mr_iid, token, discussions, FILE_PATTERN, processed_keys,
        source_hashes=source_hashes,
    )

    # Post coverage gap thread if coverage gate condition failed
    post_coverage_thread_if_failed(project_key, server, credentials, public_url, project_id, mr_iid, token)


def post_coverage_thread_if_failed(
    project_key: str,
    server: str,
    credentials: str,
    public_url: str,
    project_id: str,
    mr_iid: str,
    token: str,
) -> None:
    """Post a single coverage thread listing uncovered files when the coverage gate fails."""
    # Check if coverage condition failed
    gate_url = f"{server}/api/qualitygates/project_status?projectKey={project_key}"
    gate_data = _sonar_request(gate_url, credentials)
    conditions = gate_data.get("projectStatus", {}).get("conditions", [])

    coverage_failed = False
    for cond in conditions:
        if cond.get("metricKey") == "new_coverage" and cond.get("status") != "OK":
            coverage_failed = True
            break

    if not coverage_failed:
        # Resolve any existing coverage thread if coverage is now passing
        discussions = get_mr_discussions(project_id, mr_iid, token)
        for discussion in discussions:
            notes = discussion.get("notes", [])
            if notes and "<!-- sonar-coverage -->" in notes[0].get("body", ""):
                resolvable_notes = [n for n in notes if n.get("resolvable", False)]
                is_resolved = all(n.get("resolved", True) for n in resolvable_notes)
                if not is_resolved:
                    from review.lib.gitlab_threads import resolve_discussion, add_note_to_discussion
                    add_note_to_discussion(
                        project_id, mr_iid, discussion["id"], token,
                        "_Coverage gate now passing. Thread auto-resolved._",
                    )
                    resolve_discussion(project_id, mr_iid, discussion["id"], token, resolved=True)
        return

    # Fetch per-file coverage data for new code
    measures_url = (
        f"{server}/api/measures/component_tree"
        f"?component={project_key}"
        f"&metricKeys=new_uncovered_lines,new_lines_to_cover"
        f"&qualifiers=FIL"
        f"&ps=100"
        f"&metricSort=new_uncovered_lines"
        f"&metricSortFilter=withMeasuresOnly"
        f"&s=metric"
        f"&asc=false"
    )
    measures_data = _sonar_request(measures_url, credentials)
    components = measures_data.get("components", [])

    # Filter to files with uncovered new lines
    uncovered_files: list[dict] = []
    for comp in components:
        measures = {m["metric"]: m.get("value", m.get("period", {}).get("value", "0")) for m in comp.get("measures", [])}
        uncovered = int(measures.get("new_uncovered_lines", "0"))
        lines_to_cover = int(measures.get("new_lines_to_cover", "0"))
        if uncovered > 0:
            file_path = comp.get("path", comp.get("key", "").replace(f"{project_key}:", ""))
            uncovered_files.append({
                "file": file_path,
                "uncovered": uncovered,
                "total": lines_to_cover,
            })

    if not uncovered_files:
        return

    # Build the thread body
    total_uncovered = sum(f["uncovered"] for f in uncovered_files)
    total_to_cover = sum(f["total"] for f in uncovered_files)
    coverage_pct = round((1 - total_uncovered / total_to_cover) * 100, 1) if total_to_cover else 0

    lines = [
        "<!-- sonar-coverage -->",
        "",
        "## ⚠️ SonarQube — New Code Coverage Gap",
        "",
        f"**Overall new code coverage:** {coverage_pct}% ({total_uncovered} uncovered lines across {len(uncovered_files)} files)",
        "",
        "### Files with uncovered new code",
        "",
    ]

    for f in uncovered_files[:30]:
        lines.append(f"- `{f['file']}` — {f['uncovered']}/{f['total']} lines uncovered")

    if len(uncovered_files) > 30:
        lines.append(f"- ... and {len(uncovered_files) - 30} more files")

    lines.extend([
        "",
        f"[View coverage details in SonarQube]({public_url}/component_measures?id={project_key}&metric=new_uncovered_lines&view=list)",
        "",
        "_Add tests covering the listed files to pass the coverage gate._",
    ])

    body = "\n".join(lines)

    # Find or create the coverage thread
    discussions = get_mr_discussions(project_id, mr_iid, token)
    existing = None
    for discussion in discussions:
        notes = discussion.get("notes", [])
        if notes and "<!-- sonar-coverage -->" in notes[0].get("body", ""):
            existing = discussion
            break

    if existing:
        note_id = str(existing["notes"][0]["id"])
        from review.lib.gitlab_threads import edit_mr_note
        edit_mr_note(project_id, mr_iid, note_id, token, body)
    else:
        from review.lib.gitlab_threads import create_mr_note
        create_mr_note(project_id, mr_iid, token, body)


if __name__ == "__main__":
    main()
