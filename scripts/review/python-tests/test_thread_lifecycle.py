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
)

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
    @patch("review.lib.thread_lifecycle.edit_note")
    def test_updates_changed_thread(self, mock_edit, mock_resolve):
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
