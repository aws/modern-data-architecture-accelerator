"""Tests for CLI Architecture (shell-safety) Review agent."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from unittest import mock

from review.cli_architecture.cli_architecture_review import (
    KIRO_PROMPT,
    CLI_PACKAGE_ROOT,
    collect_full_source,
    collect_test_source,
    cli_changed,
    ChangeDetectionError,
)
from review.cli_architecture.post_cli_architecture_threads import (
    SUMMARY_MARKER, SOURCE_PATTERN, build_source_groups, format_summary_body,
    format_source_thread,
)
from review.lib.thread_lifecycle import (
    find_thread_by_marker,
    find_summary_note as _find_summary_note,
    compute_structural_hash as _compute_structural_hash,
    orphan_source_file as _orphan_source_file,
)


# Wrap shared functions for test compatibility
def find_existing_thread(discussions, key):
    d, h, n, c = find_thread_by_marker(discussions, SOURCE_PATTERN, key)
    return d, h, n


def find_summary_note(notes):
    return _find_summary_note(notes, SUMMARY_MARKER)


class TestPromptAndConfig:
    def test_targets_cli_package(self):
        assert CLI_PACKAGE_ROOT == "packages/cli"

    def test_prompt_references_steering_file(self):
        assert "agent_rules/review-cli-architecture.md" in KIRO_PROMPT

    def test_prompt_names_the_three_invariants(self):
        # The prompt must anchor Kiro on all three invariants.
        assert "best-effort validation" in KIRO_PROMPT
        assert "quotes its input" in KIRO_PROMPT
        assert "fully tested" in KIRO_PROMPT

    def test_prompt_has_output_and_chunk_placeholders(self):
        assert "{output_file}" in KIRO_PROMPT
        assert "{code_chunks_file}" in KIRO_PROMPT
        assert "{security_source_file}" in KIRO_PROMPT
        assert "{security_tests_file}" in KIRO_PROMPT

    def test_security_source_covers_both_layers(self):
        # The lib/ glob must surface Layer 1 (validation registries), Layer 2 (sink
        # quoting), and the primary sink file into the full-source context.
        source = collect_full_source()
        assert "lib/config-field-policy.ts" in source
        assert "lib/shell-command.ts" in source
        assert "lib/mdaa-deploy.ts" in source

    def test_security_tests_cover_validators_and_sinks(self):
        # The test/ glob must surface the validator/sink tests and the compile-time
        # types.negative.ts contract that pins invariant 3.
        tests = collect_test_source()
        assert "test/config-field-policy.test.ts" in tests
        assert "test/shell-command.test.ts" in tests
        assert "test/types.negative.ts" in tests


class TestCliChanged:
    """A failed git diff must raise, not silently report 'no changes'."""

    def test_git_failure_raises(self):
        # A non-zero git exit (bad ref, shallow clone, dubious ownership) must not
        # be swallowed into a False that skips the whole review.
        fake = mock.Mock(returncode=128, stdout="", stderr="fatal: bad revision")
        with mock.patch(
            "review.cli_architecture.cli_architecture_review.subprocess.run",
            return_value=fake,
        ):
            try:
                cli_changed()
                assert False, "expected ChangeDetectionError"
            except ChangeDetectionError as e:
                assert "bad revision" in str(e)

    def test_no_changes_returns_false(self):
        fake = mock.Mock(returncode=0, stdout="\n", stderr="")
        with mock.patch(
            "review.cli_architecture.cli_architecture_review.subprocess.run",
            return_value=fake,
        ):
            assert cli_changed() is False

    def test_changes_returns_true(self):
        fake = mock.Mock(returncode=0, stdout="packages/cli/lib/mdaa-cli.ts\n", stderr="")
        with mock.patch(
            "review.cli_architecture.cli_architecture_review.subprocess.run",
            return_value=fake,
        ):
            assert cli_changed() is True


class TestBuildSourceGroups:
    def test_groups_by_chunk_hash(self):
        entries = [{"package": CLI_PACKAGE_ROOT, "findings": [
            {"file": "packages/cli/lib/mdaa-cli.ts", "line": 10, "risk": "HIGH",
             "category": "sink_bypasses_quoting", "source_hash": "abc123"},
            {"file": "packages/cli/lib/mdaa-cli.ts", "line": 20, "risk": "MEDIUM",
             "category": "untested_sink", "source_hash": "abc123"},
        ]}]
        groups = build_source_groups(entries)
        key = "packages/cli/lib/mdaa-cli.ts:abc123"
        assert key in groups
        assert len(groups[key]["findings"]) == 2
        assert groups[key]["risk_level"] == "HIGH"

    def test_different_chunks_separate_threads(self):
        entries = [{"package": CLI_PACKAGE_ROOT, "findings": [
            {"file": "packages/cli/lib/mdaa-cli.ts", "line": 10, "risk": "HIGH",
             "category": "raw_interpolation", "source_hash": "aaa"},
            {"file": "packages/cli/lib/config-field-policy.ts", "line": 50, "risk": "MEDIUM",
             "category": "weakened_validator", "source_hash": "bbb"},
        ]}]
        groups = build_source_groups(entries)
        assert "packages/cli/lib/mdaa-cli.ts:aaa" in groups
        assert "packages/cli/lib/config-field-policy.ts:bbb" in groups

    def test_fallback_without_source_hash(self):
        entries = [{"package": CLI_PACKAGE_ROOT, "findings": [
            {"file": "packages/cli/lib/mdaa-cli.ts", "line": 10, "risk": "HIGH",
             "category": "sink_bypasses_quoting"},
        ]}]
        groups = build_source_groups(entries)
        assert len(groups) == 1
        key = list(groups.keys())[0]
        assert key.startswith("packages/cli/lib/mdaa-cli.ts")

    def test_empty(self):
        assert build_source_groups([{"package": CLI_PACKAGE_ROOT, "findings": []}]) == {}


class TestFormatSummaryBody:
    def test_with_findings(self):
        entries = [{"package": CLI_PACKAGE_ROOT, "risk_level": "HIGH", "findings": [
            {"file": "packages/cli/lib/mdaa-cli.ts", "line": 5, "risk": "HIGH",
             "category": "sink_bypasses_quoting", "source_hash": "h1"},
        ]}]
        body = format_summary_body(entries)
        assert SUMMARY_MARKER in body
        assert "CLI Architecture Review Summary" in body
        assert "1 HIGH" in body

    def test_no_findings(self):
        body = format_summary_body([{"package": CLI_PACKAGE_ROOT, "risk_level": "LOW", "findings": []}])
        assert "shell-safety invariants hold" in body

    def test_breakdown_by_thread_not_finding(self):
        # Two findings at the same source collapse into one thread headed HIGH.
        entries = [{"package": CLI_PACKAGE_ROOT, "risk_level": "HIGH", "findings": [
            {"file": "packages/cli/lib/mdaa-cli.ts", "line": 5, "risk": "HIGH",
             "category": "sink_bypasses_quoting", "source_hash": "h1"},
            {"file": "packages/cli/lib/mdaa-cli.ts", "line": 5, "risk": "LOW",
             "category": "untested_sink", "source_hash": "h1"},
        ]}]
        body = format_summary_body(entries)
        assert "**Review threads:** 1" in body
        assert "**Total findings:** 2" in body
        assert "1 HIGH" in body
        assert "1 LOW" not in body


class TestFormatSourceThread:
    def test_markers_and_header(self):
        group = {"source": "packages/cli/lib/mdaa-cli.ts:42", "risk_level": "HIGH", "findings": [
            ("cli", {"risk": "HIGH", "category": "raw_interpolation", "line": 42,
                     "detail": "raw() receives a template literal"}),
        ]}
        key = "packages/cli/lib/mdaa-cli.ts:abc123"
        body = format_source_thread(key, group, "hash456")
        assert "<!-- cli-architecture-source:packages/cli/lib/mdaa-cli.ts:abc123 -->" in body
        assert "CLI Architecture Review" in body
        assert "Shell-Safety Break: HIGH" in body
        assert "raw_interpolation" in body
        assert "Contributor: fix the issue" in body

    def test_update_flag(self):
        group = {"source": "packages/cli/lib/shell-command.ts:10", "risk_level": "MEDIUM", "findings": [
            ("cli", {"risk": "MEDIUM", "category": "untested_sink", "line": 10, "detail": "no assertion"}),
        ]}
        body = format_source_thread("packages/cli/lib/shell-command.ts:xyz", group, "x", is_update=True)
        assert "re-acknowledge" in body


class TestStructuralHash:
    def test_stable_across_detail_changes(self):
        # Prose detail must NOT affect the structural hash — only category/risk/file/line.
        g1 = {"findings": [("cli", {"category": "weakened_validator", "risk": "HIGH",
                                    "file": "f.ts", "line": 3, "detail": "text one"})]}
        g2 = {"findings": [("cli", {"category": "weakened_validator", "risk": "HIGH",
                                    "file": "f.ts", "line": 3, "detail": "totally different text"})]}
        assert _compute_structural_hash("k", g1) == _compute_structural_hash("k", g2)

    def test_changes_when_category_changes(self):
        g1 = {"findings": [("cli", {"category": "weakened_validator", "risk": "HIGH",
                                    "file": "f.ts", "line": 3})]}
        g2 = {"findings": [("cli", {"category": "sink_bypasses_quoting", "risk": "HIGH",
                                    "file": "f.ts", "line": 3})]}
        assert _compute_structural_hash("k", g1) != _compute_structural_hash("k", g2)


class TestOrphanSourceFile:
    def test_strips_chunk_hash(self):
        assert _orphan_source_file("packages/cli/lib/mdaa-cli.ts:abc123") == "packages/cli/lib/mdaa-cli.ts"

    def test_no_hash(self):
        assert _orphan_source_file("packages/cli/lib/mdaa-cli.ts") == "packages/cli/lib/mdaa-cli.ts"


class TestFindExistingThread:
    def test_finds(self):
        key = "packages/cli/lib/mdaa-cli.ts:abc123"
        discussions = [{"id": "d1", "notes": [
            {"id": "n1", "body": f"<!-- cli-architecture-source:{key} -->\n<!-- cli-architecture-hash:abc -->"}
        ]}]
        d, h, n = find_existing_thread(discussions, key)
        assert d is not None
        assert h == "abc"

    def test_not_found(self):
        d, _, _ = find_existing_thread(
            [{"id": "d1", "notes": [{"id": "n1", "body": "other"}]}],
            "packages/cli/lib/mdaa-cli.ts:abc123",
        )
        assert d is None

    def test_marker_does_not_collide_with_architecture(self):
        # The architecture agent uses <!-- architecture-source:... -->. Ours must not
        # match those threads, or the two agents would fight over each other's threads.
        arch_key = "lib/a.ts:abc"
        discussions = [{"id": "d1", "notes": [
            {"id": "n1", "body": f"<!-- architecture-source:{arch_key} -->"}
        ]}]
        d, _, _ = find_existing_thread(discussions, arch_key)
        assert d is None


class TestFindSummaryNote:
    def test_finds(self):
        assert find_summary_note([{"id": "n1", "body": SUMMARY_MARKER}]) is not None

    def test_not_found(self):
        assert find_summary_note([{"id": "n1", "body": "nope"}]) is None
