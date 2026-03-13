# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""GitLab Merge Request discussion thread integration.

Posts risk assessment results as a new discussion thread on the
merge request using the GitLab Discussions API.
"""

from __future__ import annotations

import http.cookiejar
import json
import logging
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

logger = logging.getLogger(__name__)


class GitLabError(Exception):
    """Raised when a GitLab API call fails."""


def _build_opener(cookie_path: Path | None = None) -> urllib.request.OpenerDirector:
    """Build a URL opener, optionally loading cookies from a file."""
    handlers: list[urllib.request.BaseHandler] = []
    if cookie_path and cookie_path.is_file():
        jar = http.cookiejar.MozillaCookieJar(str(cookie_path))
        jar.load(ignore_discard=True, ignore_expires=True)
        logger.debug("Loaded cookies from %s", cookie_path)
        handlers.append(urllib.request.HTTPCookieProcessor(jar))
    return urllib.request.build_opener(*handlers)


def post_mr_discussion(
    *,
    api_url: str,
    token: str,
    project_id: str,
    mr_iid: str,
    body: str,
    cookie_path: Path | None = None,
) -> None:
    """Create a new discussion thread on a merge request.

    Uses ``POST /projects/:id/merge_requests/:iid/discussions``
    per the GitLab Discussions API.
    """
    encoded_project = urllib.parse.quote(project_id, safe="")
    url = (
        f"{api_url.rstrip('/')}/projects/{encoded_project}"
        f"/merge_requests/{mr_iid}/discussions"
    )

    payload = json.dumps({"body": body}).encode()
    req = urllib.request.Request(
        url,
        data=payload,
        method="POST",
        headers={
            "PRIVATE-TOKEN": token,
            "Content-Type": "application/json",
        },
    )

    opener = _build_opener(cookie_path)

    # When using cookie-based auth (e.g. Midway), the first request may
    # redirect through an auth flow that downgrades POST to GET. A
    # preflight GET warms up the session so the POST goes through cleanly.
    if cookie_path:
        try:
            opener.open(urllib.request.Request(url, method="GET", headers={
                "PRIVATE-TOKEN": token,
            }))
        except urllib.error.URLError:
            pass

    logger.info("Posting discussion thread to MR !%s...", mr_iid)

    try:
        with opener.open(req) as resp:
            resp_body = resp.read().decode()
            if resp.status == 201:
                logger.info("Discussion thread created successfully.")
            else:
                logger.warning(
                    "Unexpected status %d from GitLab API.\n%s",
                    resp.status,
                    resp_body,
                )
    except urllib.error.HTTPError as exc:
        raise GitLabError(
            f"GitLab API returned {exc.code}: {exc.read().decode()}"
        ) from exc
    except urllib.error.URLError as exc:
        raise GitLabError(f"Failed to reach GitLab API: {exc.reason}") from exc


if __name__ == "__main__":
    import argparse
    import sys

    logging.basicConfig(level=logging.INFO, format="%(message)s", stream=sys.stderr)

    parser = argparse.ArgumentParser(
        description="Post a discussion thread on a GitLab merge request.",
    )
    parser.add_argument("--api-url", required=True, help="GitLab API base URL.")
    parser.add_argument("--token", required=True, help="Project access token.")
    parser.add_argument("--project-id", required=True, help="GitLab project ID or path.")
    parser.add_argument("--mr-iid", required=True, help="Merge request IID.")
    parser.add_argument(
        "--cookie", type=Path, default=None,
        help="Path to a Netscape/Mozilla cookie file.",
    )
    parser.add_argument(
        "file", nargs="?",
        help="File containing the thread body (reads stdin if omitted).",
    )
    args = parser.parse_args()

    if args.file:
        thread_body = Path(args.file).read_text()
    else:
        thread_body = sys.stdin.read()

    if not thread_body.strip():
        parser.print_usage(sys.stderr)
        raise SystemExit(1)

    post_mr_discussion(
        api_url=args.api_url,
        token=args.token,
        project_id=args.project_id,
        mr_iid=args.mr_iid,
        body=thread_body,
        cookie_path=args.cookie,
    )
