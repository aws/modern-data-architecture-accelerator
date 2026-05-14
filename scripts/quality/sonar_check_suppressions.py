#!/usr/bin/env python3
"""Check for UI-suppressed issues in a SonarQube project.

Exits with code 0 if no suppressions found, code 1 if suppressions
exist or on any error. Fails closed — any auth, network, or parse
failure is treated as a blocking error.

Environment variables:
    SONAR_SERVER - SonarQube server URL (for API calls)
    SONAR_LOGIN  - SonarQube authentication token
    SONAR_PORT   - (optional) Port for browser links, defaults to 8443

Usage:
    python3 sonar_check_suppressions.py <project_key>
"""
import os
import sys
import json
import urllib.request
import urllib.error
import base64
from urllib.parse import urlparse

# Maximum issues to fetch for display purposes
MAX_ISSUES_TO_DISPLAY = 20


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


def main() -> None:
    if len(sys.argv) != 2:
        print(f"Usage: {sys.argv[0]} <project_key>", file=sys.stderr)
        sys.exit(1)

    server = os.environ.get("SONAR_SERVER", "").rstrip("/")
    # Browser-accessible URL may require a different port than the API.
    # Constructs the public URL from SONAR_SERVER + SONAR_PORT (default 8443).
    sonar_port = os.environ.get("SONAR_PORT", "8443")
    parsed = urlparse(server)
    if parsed.port is None:
        public_url = f"{parsed.scheme}://{parsed.hostname}:{sonar_port}{parsed.path}"
    else:
        public_url = server
    token = os.environ.get("SONAR_LOGIN", "")

    if not server:
        print("ERROR: SONAR_SERVER environment variable is not set", file=sys.stderr)
        sys.exit(1)
    if not token:
        print("ERROR: SONAR_LOGIN environment variable is not set", file=sys.stderr)
        sys.exit(1)

    project_key = sys.argv[1]
    credentials = base64.b64encode(f"{token}:".encode()).decode()

    # First request: fetch issues (up to MAX_ISSUES_TO_DISPLAY) and filter
    # to only this exact project. The API may return issues from projects
    # with similar key prefixes.
    url = (
        f"{server}/api/issues/search"
        f"?projectKeys={project_key}"
        f"&resolutions=FALSE-POSITIVE,WONTFIX"
        f"&ps={MAX_ISSUES_TO_DISPLAY}"
    )
    data = _make_request(url, credentials)

    issues = data.get("issues", [])
    issues = [i for i in issues if i.get("project") == project_key]
    total = len(issues)

    if total == 0:
        print("No UI-suppressed issues found.")
        return

    print(f"ERROR: {total} issue(s) suppressed via SonarQube UI (false positive / won't fix).")
    print("")
    print("Suppressed issues:")
    print("-" * 80)

    for issue in issues:
        component = issue.get("component", "unknown")
        # Strip project key prefix from component path for readability
        file_path = component.replace(f"{project_key}:", "")
        line = issue.get("line", "?")
        message = issue.get("message", "No message")
        resolution = issue.get("resolution", "unknown")
        rule = issue.get("rule", "unknown")
        issue_key = issue.get("key", "")

        issue_url = f"{public_url}/project/issues?id={project_key}&open={issue_key}"
        print(f"  [{resolution}] {file_path}:{line}")
        print(f"    Rule: {rule}")
        print(f"    Message: {message}")
        print(f"    Link: {issue_url}")
        print("")

    if total > MAX_ISSUES_TO_DISPLAY:
        print(f"  ... and {total - MAX_ISSUES_TO_DISPLAY} more.")
        print("")

    print("-" * 80)
    print("All issues must be fixed in code or suppressed inline with rationale (//NOSONAR).")
    print("Remove UI suppressions and fix the underlying issues.")
    sys.exit(1)


if __name__ == "__main__":
    main()
