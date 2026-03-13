# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""Tests for GitLab MR discussion thread integration."""

from __future__ import annotations

import json
import urllib.error
import urllib.request
from io import BytesIO
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from change_risk_assessor.gitlab import GitLabError, post_mr_discussion

GITLAB_ARGS = {
    "api_url": "https://gitlab.example.com/api/v4",
    "token": "glpat-xxxxxxxxxxxxxxxxxxxx",
    "project_id": "42",
    "mr_iid": "7",
    "body": "risk report body",
}


def _mock_opener(status: int = 201) -> MagicMock:
    """Return a mock opener whose .open() yields a fake response."""
    resp = MagicMock()
    resp.status = status
    resp.__enter__ = lambda s: s
    resp.__exit__ = MagicMock(return_value=False)

    opener = MagicMock()
    opener.open = MagicMock(return_value=resp)
    return opener


class TestPostMrDiscussion:
    def test_posts_to_correct_url(self):
        opener = _mock_opener(201)
        with patch("change_risk_assessor.gitlab._build_opener", return_value=opener):
            post_mr_discussion(**GITLAB_ARGS)

        req = opener.open.call_args[0][0]
        assert req.full_url == (
            "https://gitlab.example.com/api/v4/projects/42"
            "/merge_requests/7/discussions"
        )
        assert req.method == "POST"

    def test_sends_body_as_json(self):
        opener = _mock_opener(201)
        with patch("change_risk_assessor.gitlab._build_opener", return_value=opener):
            post_mr_discussion(**GITLAB_ARGS)

        req = opener.open.call_args[0][0]
        payload = json.loads(req.data.decode())
        assert payload == {"body": "risk report body"}

    def test_sends_private_token_header(self):
        opener = _mock_opener(201)
        with patch("change_risk_assessor.gitlab._build_opener", return_value=opener):
            post_mr_discussion(**GITLAB_ARGS)

        req = opener.open.call_args[0][0]
        assert req.get_header("Private-token") == "glpat-xxxxxxxxxxxxxxxxxxxx"
        assert req.get_header("Content-type") == "application/json"

    def test_url_encodes_project_id(self):
        args = {**GITLAB_ARGS, "project_id": "group/subgroup/project"}
        opener = _mock_opener(201)
        with patch("change_risk_assessor.gitlab._build_opener", return_value=opener):
            post_mr_discussion(**args)

        req = opener.open.call_args[0][0]
        assert "group%2Fsubgroup%2Fproject" in req.full_url

    def test_raises_on_http_error(self):
        http_err = urllib.error.HTTPError(
            url="https://gitlab.example.com/api/v4/projects/42/merge_requests/7/discussions",
            code=403,
            msg="Forbidden",
            hdrs=None,  # type: ignore[arg-type]
            fp=BytesIO(b"insufficient permissions"),
        )
        opener = MagicMock()
        opener.open = MagicMock(side_effect=http_err)
        with patch("change_risk_assessor.gitlab._build_opener", return_value=opener):
            with pytest.raises(GitLabError, match="GitLab API returned 403"):
                post_mr_discussion(**GITLAB_ARGS)

    def test_raises_on_url_error(self):
        url_err = urllib.error.URLError(reason="connection refused")
        opener = MagicMock()
        opener.open = MagicMock(side_effect=url_err)
        with patch("change_risk_assessor.gitlab._build_opener", return_value=opener):
            with pytest.raises(GitLabError, match="Failed to reach GitLab API"):
                post_mr_discussion(**GITLAB_ARGS)

    def test_strips_trailing_slash_from_api_url(self):
        args = {**GITLAB_ARGS, "api_url": "https://gitlab.example.com/api/v4/"}
        opener = _mock_opener(201)
        with patch("change_risk_assessor.gitlab._build_opener", return_value=opener):
            post_mr_discussion(**args)

        req = opener.open.call_args[0][0]
        assert "/api/v4/projects/" in req.full_url
        assert "/v4//projects/" not in req.full_url

    def test_passes_cookie_path_to_opener(self):
        cookie = Path("/tmp/my-cookie")
        opener = _mock_opener(201)
        with patch("change_risk_assessor.gitlab._build_opener", return_value=opener) as mock_build:
            post_mr_discussion(**GITLAB_ARGS, cookie_path=cookie)

        mock_build.assert_called_once_with(cookie)


class TestBuildOpener:
    def test_no_cookie_path_returns_plain_opener(self):
        from change_risk_assessor.gitlab import _build_opener

        opener = _build_opener()
        handler_types = [type(h) for h in opener.handlers]
        assert urllib.request.HTTPCookieProcessor not in handler_types

    def test_none_cookie_path_returns_plain_opener(self):
        from change_risk_assessor.gitlab import _build_opener

        opener = _build_opener(None)
        handler_types = [type(h) for h in opener.handlers]
        assert urllib.request.HTTPCookieProcessor not in handler_types

    def test_cookie_file_loads_cookies(self, tmp_path):
        cookie_file = tmp_path / "cookie"
        cookie_file.write_text(
            "# Netscape HTTP Cookie File\n"
            ".example.com\tTRUE\t/\tTRUE\t0\tsession\tabc123\n"
        )
        from change_risk_assessor.gitlab import _build_opener

        opener = _build_opener(cookie_file)
        handler_types = [type(h) for h in opener.handlers]
        assert urllib.request.HTTPCookieProcessor in handler_types

    def test_nonexistent_cookie_path_returns_plain_opener(self, tmp_path):
        from change_risk_assessor.gitlab import _build_opener

        opener = _build_opener(tmp_path / "does-not-exist")
        handler_types = [type(h) for h in opener.handlers]
        assert urllib.request.HTTPCookieProcessor not in handler_types
