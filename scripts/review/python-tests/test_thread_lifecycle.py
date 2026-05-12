"""Tests for shared thread lifecycle management."""

from __future__ import annotations

import re
import sys
from pathlib import Path
from unittest.mock import patch, call

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from review.lib.thread_lifecycle import (
    UnresolvedThreadsError,
    post_or_update_summary,
    post_detail_threads,
    resolve_orphaned_threads,
    check_unresolved_and_exit,
    find_thread_by_marker,
    _job_link,
    _was_auto_resolved,
    _format_thread_footer,
)
from review.lib.gitlab_threads import _build_diff_position
from review.lib.kiro_integration import load_preamble

DETAIL_PATTERN = re.compile(r"<!-- test-pkg:(.+?) -->")


class TestPostOrUpdateSummary:
    """Test summary note creation and update."""

    @patch("review.lib.thread_lifecycle.get_mr_discussions", return_value=[])
    @patch("review.lib.thread_lifecycle.create_mr_note")
    @patch("review.lib.thread_lifecycle.get_mr_notes", return_value=[])
    def test_creates_note_when_none_exists(self, mock_notes, mock_create, mock_disc):
        post_or_update_summary("1", "10", "tok", [], "<!-- summary -->", lambda: "body")
        mock_create.assert_called_once_with("1", "10", "tok", "body")

    @patch("review.lib.thread_lifecycle.get_mr_discussions", return_value=[])
    @patch("review.lib.thread_lifecycle.edit_mr_note")
    @patch("review.lib.thread_lifecycle.get_mr_notes", return_value=[
        {"id": "99", "body": "<!-- summary -->\nOld content"}
    ])
    def test_edits_existing_note(self, mock_notes, mock_edit, mock_disc):
        post_or_update_summary("1", "10", "tok", [], "<!-- summary -->", lambda: "new body")
        mock_edit.assert_called_once_with("1", "10", "99", "tok", "new body")

    @patch("review.lib.thread_lifecycle.get_mr_discussions", return_value=[{"id": "d1"}])
    @patch("review.lib.thread_lifecycle.create_mr_note")
    @patch("review.lib.thread_lifecycle.get_mr_notes", return_value=[])
    def test_returns_refreshed_discussions(self, mock_notes, mock_create, mock_disc):
        result = post_or_update_summary("1", "10", "tok", [], "<!-- s -->", lambda: "b")
        assert result == [{"id": "d1"}]


class TestPostDetailThreads:
    """Test detail thread creation, update, and skip logic."""

    def _format(self, key, group, hash_, is_update):
        return f"<!-- test-pkg:{key} -->\n<!-- test-hash:{hash_} -->\nBody"

    def _hash(self, key, group):
        return "hash123"

    @patch("review.lib.thread_lifecycle.create_discussion")
    def test_creates_new_thread(self, mock_create):
        groups = {"pkg-a": {"risk_level": "HIGH", "source_hash": ""}}
        keys = post_detail_threads(
            "1", "10", "tok", [], groups, DETAIL_PATTERN,
            self._format, self._hash,
        )
        assert keys == {"pkg-a"}
        mock_create.assert_called_once()

    @patch("review.lib.thread_lifecycle.create_discussion")
    def test_skips_unchanged_thread(self, mock_create):
        discussions = [{"id": "d1", "notes": [{
            "id": "n1",
            "body": "<!-- test-pkg:pkg-a -->\n<!-- test-hash:hash123 -->\nOld",
        }]}]
        groups = {"pkg-a": {"risk_level": "HIGH", "source_hash": ""}}
        keys = post_detail_threads(
            "1", "10", "tok", discussions, groups, DETAIL_PATTERN,
            self._format, self._hash,
        )
        assert keys == {"pkg-a"}
        mock_create.assert_not_called()

    @patch("review.lib.thread_lifecycle.resolve_discussion")
    @patch("review.lib.thread_lifecycle.add_note_to_discussion")
    @patch("review.lib.thread_lifecycle.edit_note")
    def test_updates_changed_thread(self, mock_edit, mock_add_note, mock_resolve):
        discussions = [{"id": "d1", "notes": [{
            "id": "n1",
            "body": "<!-- test-pkg:pkg-a -->\n<!-- test-hash:oldhash -->\nOld",
        }]}]
        groups = {"pkg-a": {"risk_level": "HIGH", "source_hash": ""}}
        keys = post_detail_threads(
            "1", "10", "tok", discussions, groups, DETAIL_PATTERN,
            self._format, self._hash,
        )
        assert keys == {"pkg-a"}
        mock_edit.assert_called_once()
        mock_add_note.assert_called_once()
        call_args = mock_add_note.call_args[0]
        assert call_args[0:4] == ("1", "10", "d1", "tok")
        assert "Findings have changed since last review" in call_args[4]
        assert "Thread reopened" in call_args[4]
        mock_resolve.assert_called_once_with("1", "10", "d1", "tok", resolved=False)

    @patch("review.lib.thread_lifecycle.create_discussion")
    def test_skips_when_source_unchanged(self, mock_create):
        """Kiro variance — structural hash differs but source hash matches."""
        discussions = [{"id": "d1", "notes": [{
            "id": "n1",
            "body": "<!-- test-pkg:pkg-a -->\n<!-- test-hash:oldhash -->\n<!-- source-hash:src111 -->",
        }]}]
        groups = {"pkg-a": {"risk_level": "HIGH", "source_hash": "src111"}}
        keys = post_detail_threads(
            "1", "10", "tok", discussions, groups, DETAIL_PATTERN,
            self._format, self._hash,
        )
        mock_create.assert_not_called()

    @patch("review.lib.thread_lifecycle.resolve_discussion")
    @patch("review.lib.thread_lifecycle.add_note_to_discussion")
    def test_reopens_auto_resolved_thread(self, mock_add_note, mock_resolve):
        """Finding reappears after auto-resolve — thread should reopen."""
        discussions = [{"id": "d1", "notes": [
            {
                "id": "n1",
                "body": "<!-- test-pkg:pkg-a -->\n<!-- test-hash:myhash -->\nContent",
            },
            {
                "id": "n2",
                "body": "_This finding was resolved by code changes. Thread auto-resolved._",
            },
        ]}]
        # Same hash as stored — normally would skip, but thread was auto-resolved
        groups = {"pkg-a": {"risk_level": "HIGH", "source_hash": ""}}
        keys = post_detail_threads(
            "1", "10", "tok", discussions, groups, DETAIL_PATTERN,
            self._format, lambda k, g: "myhash",
        )
        assert keys == {"pkg-a"}
        mock_add_note.assert_called_once()
        call_args = mock_add_note.call_args[0]
        assert call_args[0:4] == ("1", "10", "d1", "tok")
        assert "Finding reappeared" in call_args[4]
        assert "Previous auto-resolve was premature" in call_args[4]
        mock_resolve.assert_called_once_with("1", "10", "d1", "tok", resolved=False)

    @patch("review.lib.thread_lifecycle.resolve_discussion")
    @patch("review.lib.thread_lifecycle.add_note_to_discussion")
    def test_skips_human_resolved_thread(self, mock_add_note, mock_resolve):
        """Finding reappears but thread was human-resolved — stays resolved."""
        discussions = [{"id": "d1", "notes": [
            {
                "id": "n1",
                "body": "<!-- test-pkg:pkg-a -->\n<!-- test-hash:myhash -->\nContent",
            },
            {
                "id": "n2",
                "body": "Intentional. This is expected behavior.",
            },
        ]}]
        groups = {"pkg-a": {"risk_level": "HIGH", "source_hash": ""}}
        keys = post_detail_threads(
            "1", "10", "tok", discussions, groups, DETAIL_PATTERN,
            self._format, lambda k, g: "myhash",
        )
        assert keys == {"pkg-a"}
        mock_add_note.assert_not_called()
        mock_resolve.assert_not_called()

    @patch("review.lib.thread_lifecycle.resolve_discussion")
    @patch("review.lib.thread_lifecycle.add_note_to_discussion")
    def test_skips_already_unresolved_auto_resolved_thread(self, mock_add_note, mock_resolve):
        """Thread was auto-resolved then manually reopened — don't post redundant reopen."""
        discussions = [{"id": "d1", "notes": [
            {
                "id": "n1",
                "body": "<!-- test-pkg:pkg-a -->\n<!-- test-hash:myhash -->\nContent",
                "resolvable": True,
                "resolved": False,
            },
            {
                "id": "n2",
                "body": "_This finding was resolved by code changes. Thread auto-resolved._",
            },
        ]}]
        groups = {"pkg-a": {"risk_level": "HIGH", "source_hash": ""}}
        keys = post_detail_threads(
            "1", "10", "tok", discussions, groups, DETAIL_PATTERN,
            self._format, lambda k, g: "myhash",
        )
        assert keys == {"pkg-a"}
        # Thread is already unresolved — no redundant reopen
        mock_add_note.assert_not_called()
        mock_resolve.assert_not_called()
        mock_resolve.assert_not_called()


class TestResolveOrphanedThreads:
    """Test orphan thread auto-resolution."""

    @patch("review.lib.thread_lifecycle.resolve_discussion")
    @patch("review.lib.thread_lifecycle.add_note_to_discussion")
    def test_resolves_orphan(self, mock_add, mock_resolve):
        discussions = [{"id": "d1", "notes": [{
            "id": "n1",
            "body": "<!-- test-pkg:pkg-old -->\nContent",
        }]}]
        resolve_orphaned_threads("1", "10", "tok", discussions, DETAIL_PATTERN, set())
        mock_add.assert_called_once()
        mock_resolve.assert_called_once_with("1", "10", "d1", "tok", resolved=True)

    @patch("review.lib.thread_lifecycle.resolve_discussion")
    @patch("review.lib.thread_lifecycle.add_note_to_discussion")
    def test_keeps_current_thread(self, mock_add, mock_resolve):
        discussions = [{"id": "d1", "notes": [{
            "id": "n1",
            "body": "<!-- test-pkg:pkg-a -->\nContent",
        }]}]
        resolve_orphaned_threads("1", "10", "tok", discussions, DETAIL_PATTERN, {"pkg-a"})
        mock_add.assert_not_called()
        mock_resolve.assert_not_called()

    @patch("review.lib.thread_lifecycle.resolve_discussion")
    @patch("review.lib.thread_lifecycle.add_note_to_discussion")
    def test_keeps_orphan_when_source_unchanged(self, mock_add, mock_resolve):
        """Kiro variance — finding disappeared but source didn't change."""
        discussions = [{"id": "d1", "notes": [{
            "id": "n1",
            "body": "<!-- test-pkg:pkg-old -->\n<!-- source-hash:abc123 -->\nContent",
        }]}]
        resolve_orphaned_threads(
            "1", "10", "tok", discussions, DETAIL_PATTERN, set(),
            source_hashes={"pkg-old": "abc123"},
        )
        mock_add.assert_not_called()
        mock_resolve.assert_not_called()


class TestCheckUnresolvedAndExit:
    """Test unresolved thread detection."""

    @patch("review.lib.thread_lifecycle.get_mr_discussions", return_value=[])
    def test_passes_when_no_threads(self, mock_disc):
        # Should not raise
        check_unresolved_and_exit("1", "10", "tok", DETAIL_PATTERN, "test", "Finding", "job")

    @patch("review.lib.thread_lifecycle.get_mr_discussions", return_value=[{
        "id": "d1",
        "notes": [{"id": "n1", "body": "<!-- test-pkg:pkg-a -->", "resolvable": True, "resolved": True}],
    }])
    def test_passes_when_all_resolved(self, mock_disc):
        check_unresolved_and_exit("1", "10", "tok", DETAIL_PATTERN, "test", "Finding", "job")

    @patch("review.lib.thread_lifecycle.get_mr_discussions", return_value=[{
        "id": "d1",
        "notes": [{"id": "n1", "body": "<!-- test-pkg:pkg-a -->", "resolvable": True, "resolved": False}],
    }])
    def test_raises_when_unresolved(self, mock_disc):
        with pytest.raises(UnresolvedThreadsError) as exc_info:
            check_unresolved_and_exit("1", "10", "tok", DETAIL_PATTERN, "test", "Finding", "job")
        assert len(exc_info.value.threads) == 1
        assert exc_info.value.agent_name == "test"
        assert exc_info.value.job_name == "job"


class TestJobLink:
    """Test _job_link helper."""

    def test_with_url_and_name(self):
        with patch.dict("os.environ", {"CI_JOB_URL": "https://example.com/-/jobs/123", "CI_JOB_NAME": "my_review_job"}):
            result = _job_link()
            assert result == "[`my_review_job`](https://example.com/-/jobs/123)"

    def test_with_name_only(self):
        with patch.dict("os.environ", {"CI_JOB_NAME": "my_review_job"}, clear=False):
            import os
            os.environ.pop("CI_JOB_URL", None)
            result = _job_link()
            assert result == "`my_review_job`"

    def test_without_env_vars(self):
        with patch.dict("os.environ", {}, clear=True):
            result = _job_link()
            assert result == ""


class TestWasAutoResolved:
    """Test _was_auto_resolved detection."""

    def test_auto_resolved_thread(self):
        discussion = {"notes": [
            {"body": "<!-- test-pkg:a -->\nFinding content"},
            {"body": "_This finding was resolved by code changes. Thread auto-resolved._"},
        ]}
        assert _was_auto_resolved(discussion) is True

    def test_human_resolved_thread(self):
        discussion = {"notes": [
            {"body": "<!-- test-pkg:a -->\nFinding content"},
            {"body": "Intentional change, this is expected."},
        ]}
        assert _was_auto_resolved(discussion) is False

    def test_human_comment_after_auto_resolve(self):
        """Human commented after auto-resolve — treat as human-resolved."""
        discussion = {"notes": [
            {"body": "<!-- test-pkg:a -->\nFinding content"},
            {"body": "_This finding was resolved by code changes. Thread auto-resolved._"},
            {"body": "Actually this is fine, keeping it resolved."},
        ]}
        assert _was_auto_resolved(discussion) is False

    def test_empty_notes(self):
        discussion = {"notes": []}
        assert _was_auto_resolved(discussion) is False

    def test_only_marker_note(self):
        discussion = {"notes": [
            {"body": "<!-- test-pkg:a -->\n<!-- test-hash:abc -->\nContent"},
        ]}
        assert _was_auto_resolved(discussion) is False


class TestBuildDiffPosition:
    """Test GitLab diff position building."""

    SAMPLE_DIFF = """\
diff --git a/lib/auth.ts b/lib/auth.ts
--- a/lib/auth.ts
+++ b/lib/auth.ts
@@ -10,6 +10,8 @@ export class Auth {
   constructor() {
     this.bucket = new Bucket();
+    this.bucket.addPolicy();
+    this.bucket.enableEncryption();
     this.key = new Key();
     return this;
   }
"""

    @patch.dict("os.environ", {"CI_MERGE_REQUEST_DIFF_BASE_SHA": "aaa", "CI_COMMIT_SHA": "bbb"})
    @patch("review.lib.gitlab_threads.subprocess.run")
    def test_context_line_sets_both(self, mock_run):
        """Context lines should set both old_line and new_line."""
        mock_run.return_value = type("R", (), {"returncode": 0, "stdout": self.SAMPLE_DIFF})()
        # Line 14 is "this.key = new Key();" — a context line after the additions
        # Hunk starts at +10. Context lines: 10(constructor), 11(this.bucket), +12, +13, 14(this.key)
        result = _build_diff_position("lib/auth.ts", 14)
        assert result is not None
        assert "old_line" in result
        assert "new_line" in result
        assert result["new_line"] == 14

    @patch.dict("os.environ", {"CI_MERGE_REQUEST_DIFF_BASE_SHA": "aaa", "CI_COMMIT_SHA": "bbb"})
    @patch("review.lib.gitlab_threads.subprocess.run")
    def test_added_line_sets_new_only(self, mock_run):
        """Added lines should only set new_line."""
        mock_run.return_value = type("R", (), {"returncode": 0, "stdout": self.SAMPLE_DIFF})()
        # Line 12 is "+    this.bucket.addPolicy();" — an added line
        result = _build_diff_position("lib/auth.ts", 12)
        assert result is not None
        assert "new_line" in result
        assert "old_line" not in result
        assert result["new_line"] == 12

    @patch.dict("os.environ", {"CI_MERGE_REQUEST_DIFF_BASE_SHA": "aaa", "CI_COMMIT_SHA": "bbb"})
    @patch("review.lib.gitlab_threads.subprocess.run")
    def test_line_not_in_hunk_returns_none(self, mock_run):
        """Lines outside any diff hunk should return None."""
        mock_run.return_value = type("R", (), {"returncode": 0, "stdout": self.SAMPLE_DIFF})()
        # Line 500 doesn't exist in any hunk
        result = _build_diff_position("lib/auth.ts", 500)
        assert result is None

    @patch.dict("os.environ", {}, clear=True)
    def test_no_env_vars_returns_none(self):
        """Without CI env vars, should return None."""
        result = _build_diff_position("lib/auth.ts", 10)
        assert result is None


class TestLoadPreamble:
    """Test preamble loading from steering file."""

    def test_loads_and_strips_front_matter(self):
        preamble = load_preamble()
        # Should contain the preamble content
        assert "reviewing a merge request headlessly" in preamble
        # Should NOT contain YAML front matter
        assert "inclusion: manual" not in preamble
        # Should end with double newline
        assert preamble.endswith("\n\n")

    def test_does_not_contain_markdown_header(self):
        preamble = load_preamble()
        # The "# Review Agent Preamble" header should be included (it's after ---)
        # but the front matter keys should not
        assert "inclusion:" not in preamble
