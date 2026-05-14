#!/usr/bin/env python3
"""Check if a SonarQube project exists.

Prints 'true' if the project exists, 'false' if it does not.
Exits with code 1 on unexpected errors.

Uses api/components/show which requires Browse permission on the project
(granted by default to the token that created it via first analysis).

Environment variables:
    SONAR_SERVER - SonarQube server URL
    SONAR_LOGIN  - SonarQube authentication token

Usage:
    python3 sonar_project_exists.py <project_key>
"""
import os
import sys
import json
import urllib.request
import urllib.error
import base64


def main() -> None:
    if len(sys.argv) != 2:
        print(f"Usage: {sys.argv[0]} <project_key>", file=sys.stderr)
        sys.exit(1)

    server = os.environ.get("SONAR_SERVER", "").rstrip("/")
    token = os.environ.get("SONAR_LOGIN", "")

    if not server:
        print("SONAR_SERVER environment variable is not set", file=sys.stderr)
        sys.exit(1)
    if not token:
        print("SONAR_LOGIN environment variable is not set", file=sys.stderr)
        sys.exit(1)

    project_key = sys.argv[1]

    # api/components/show returns 404 if the project doesn't exist,
    # 200 if it does. Only requires Browse permission on the project.
    url = f"{server}/api/components/show?component={project_key}"
    credentials = base64.b64encode(f"{token}:".encode()).decode()
    req = urllib.request.Request(url, headers={"Authorization": f"Basic {credentials}"})

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            # 200 = project exists
            print("true")
    except urllib.error.HTTPError as e:
        if e.code == 404:
            # Project does not exist
            print("false")
        else:
            print(f"HTTP error {e.code}: {e.reason}", file=sys.stderr)
            body = e.read().decode(errors="replace")
            if body:
                print(f"Response: {body[:500]}", file=sys.stderr)
            sys.exit(1)
    except urllib.error.URLError as e:
        print(f"Connection error: {e.reason}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
