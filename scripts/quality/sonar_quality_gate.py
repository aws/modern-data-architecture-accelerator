#!/usr/bin/env python3
"""Print SonarQube quality gate status and new-code issues to the job log.

Always prints the quality gate condition breakdown. On failure, also prints
individual issues with file, line, rule, and message — enough detail for
automated tools or developers to fix without visiting the SonarQube UI.

Exits with code 0 if gate passed, code 1 if gate failed or on any error.
Fails closed — any auth, network, or parse failure is treated as a blocking error.

Environment variables:
    SONAR_SERVER - SonarQube server URL (for API calls)
    SONAR_TOKEN  - SonarQube authentication token
    SONAR_PORT   - (optional) Port for browser links, defaults to 8443

Usage:
    python3 sonar_quality_gate.py <project_key>
"""
import os
import sys
import json
import urllib.request
import urllib.error
import base64
from urllib.parse import urlparse

# Maximum issues to fetch per page
PAGE_SIZE = 100
# Maximum total issues to display
MAX_ISSUES = 50


def _make_request(url: str, credentials: str) -> dict:
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
    except urllib.error.URLError as e:
        print(f"ERROR: Connection failed: {e.reason}", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"ERROR: Failed to parse SonarQube response: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"ERROR: Unexpected error: {e}", file=sys.stderr)
        sys.exit(1)


# Human-readable metric names
METRIC_NAMES = {
    "new_reliability_rating": "New Reliability Rating",
    "new_security_rating": "New Security Rating",
    "new_maintainability_rating": "New Maintainability Rating",
    "new_coverage": "New Code Coverage",
    "new_duplicated_lines_density": "New Code Duplications",
    "new_bugs": "New Bugs",
    "new_vulnerabilities": "New Vulnerabilities",
    "new_code_smells": "New Code Smells",
    "new_security_hotspots_reviewed": "New Security Hotspots Reviewed",
    "new_lines_to_cover": "New Lines to Cover",
}

# Rating values (1=A, 2=B, etc.)
RATING_MAP = {"1": "A", "2": "B", "3": "C", "4": "D", "5": "E"}

SEVERITY_ORDER = {
    "BLOCKER": 0,
    "CRITICAL": 1,
    "MAJOR": 2,
    "MINOR": 3,
    "INFO": 4,
}


def _format_value(metric: str, value: str) -> str:
    """Format a metric value for display."""
    if "rating" in metric:
        return RATING_MAP.get(value, value)
    if "coverage" in metric or "duplicated" in metric:
        return f"{value}%"
    return value


def _format_comparator(comparator: str) -> str:
    """Format a comparator for display."""
    return {"GT": ">", "LT": "<", "EQ": "=", "NE": "!="}.get(comparator, comparator)


def print_quality_gate(project_key: str, server: str, credentials: str) -> bool:
    """Print quality gate conditions. Returns True if gate passed."""
    url = f"{server}/api/qualitygates/project_status?projectKey={project_key}"
    data = _make_request(url, credentials)

    status = data.get("projectStatus", {})
    gate_status = status.get("status", "UNKNOWN")
    conditions = status.get("conditions", [])

    passed = gate_status == "OK"
    icon = "✅" if passed else "❌"

    print("")
    print("=" * 70)
    print(f"QUALITY GATE: {icon} {gate_status}")
    print("=" * 70)
    print("")

    if not conditions:
        print("  No conditions evaluated.")
        print("")
        return passed

    for condition in conditions:
        metric = condition.get("metricKey", "unknown")
        metric_name = METRIC_NAMES.get(metric, metric)
        actual = _format_value(metric, condition.get("actualValue", "?"))
        threshold = _format_value(metric, condition.get("errorThreshold", "?"))
        comparator = _format_comparator(condition.get("comparator", "?"))
        cond_status = condition.get("status", "UNKNOWN")
        cond_icon = "✅" if cond_status == "OK" else "❌"

        print(f"  {cond_icon} {metric_name}: {actual} (threshold: {comparator} {threshold})")

    print("")
    return passed


def print_issues(project_key: str, server: str, credentials: str, public_url: str) -> None:
    """Print new-code issues for the project."""
    url = (
        f"{server}/api/issues/search"
        f"?projectKeys={project_key}"
        f"&statuses=OPEN,CONFIRMED,REOPENED"
        f"&inNewCodePeriod=true"
        f"&ps={PAGE_SIZE}"
        f"&s=SEVERITY"
        f"&asc=false"
    )
    data = _make_request(url, credentials)

    issues = data.get("issues", [])
    # Filter to exact project (API may return similar-prefix projects)
    issues = [i for i in issues if i.get("project") == project_key]
    total = len(issues)

    if not issues:
        print("  No new-code issues found.")
        return

    print(f"--- New Code Issues ({total}) ---")
    print("")

    # Sort by severity
    issues.sort(key=lambda i: SEVERITY_ORDER.get(i.get("severity", "INFO"), 99))

    for issue in issues[:MAX_ISSUES]:
        severity = issue.get("severity", "UNKNOWN")
        issue_type = issue.get("type", "UNKNOWN")
        component = issue.get("component", "unknown")
        file_path = component.replace(f"{project_key}:", "")
        line = issue.get("line", "?")
        message = issue.get("message", "No message")
        rule = issue.get("rule", "unknown")
        issue_key = issue.get("key", "")

        issue_url = f"{public_url}/project/issues?id={project_key}&open={issue_key}"
        print(f"  {issue_type} [{severity}] {file_path}:{line}")
        print(f"    Rule: {rule}")
        print(f"    {message}")
        print(f"    {issue_url}")
        print("")

    if total > MAX_ISSUES:
        print(f"  ... and {total - MAX_ISSUES} more issues.")
        print("")

    print("-" * 70)


def main() -> None:
    if len(sys.argv) != 2:
        print(f"Usage: {sys.argv[0]} <project_key>", file=sys.stderr)
        sys.exit(1)

    server = os.environ.get("SONAR_SERVER", "").rstrip("/")
    sonar_port = os.environ.get("SONAR_PORT", "8443")
    parsed = urlparse(server)
    if not parsed.scheme or not parsed.hostname:
        print("ERROR: SONAR_SERVER must be a valid URL with scheme and hostname", file=sys.stderr)
        sys.exit(1)
    if parsed.port is None:
        public_url = f"{parsed.scheme}://{parsed.hostname}:{sonar_port}{parsed.path}"
    else:
        public_url = server
    token = os.environ.get("SONAR_TOKEN", "")

    if not server:
        print("ERROR: SONAR_SERVER environment variable is not set", file=sys.stderr)
        sys.exit(1)
    if not token:
        print("ERROR: SONAR_TOKEN environment variable is not set", file=sys.stderr)
        sys.exit(1)

    project_key = sys.argv[1]
    credentials = base64.b64encode(f"{token}:".encode()).decode()

    passed = print_quality_gate(project_key, server, credentials)

    if not passed:
        print_issues(project_key, server, credentials, public_url)
        sys.exit(1)


if __name__ == "__main__":
    main()
