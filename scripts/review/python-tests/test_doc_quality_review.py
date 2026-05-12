"""Tests for Documentation Quality Review agent."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from review.doc_quality.doc_quality_review import has_code_changes
from review.doc_quality.post_doc_quality_threads import (
    SUMMARY_MARKER, build_file_groups, format_summary_body,
    format_file_thread,
)
from review.lib.thread_lifecycle import find_thread_by_marker, find_summary_note

# Wrap shared functions for test compatibility
FILE_PATTERN = __import__("re").compile(r"<!-- docs-quality-file:(.+?) -->")

def find_existing_thread(discussions, file_path):
    d, h, n, c = find_thread_by_marker(discussions, FILE_PATTERN, file_path)
    return d, h, n


class TestHasCodeChanges:
    def test_ts_file(self):
        assert has_code_changes(["packages/constructs/L2/s3/lib/index.ts"]) is True
    def test_py_file(self):
        assert has_code_changes(["packages/constructs/L3/datalake/lambda/handler.py"]) is True
    def test_md_only(self):
        assert has_code_changes(["README.md", "CHANGELOG.md"]) is False
    def test_scripts(self):
        assert has_code_changes(["scripts/review/compliance/compliance_review.py"]) is False
    def test_empty(self):
        assert has_code_changes([]) is False


class TestBuildFileGroups:
    def test_groups(self):
        entries = [{"findings": [
            {"file": "CHANGELOG.md", "risk": "HIGH", "category": "changelog", "detail": "Not updated"},
        ]}]
        groups = build_file_groups(entries)
        assert "CHANGELOG.md" in groups
        assert len(groups["CHANGELOG.md"]["findings"]) == 1

    def test_empty(self):
        assert build_file_groups([{"findings": []}]) == {}


class TestFormatSummaryBody:
    def test_with_findings(self):
        entries = [{"findings": [{"risk": "HIGH", "category": "changelog"}]}]
        body = format_summary_body(entries)
        assert SUMMARY_MARKER in body
        assert "Documentation Quality Review Summary" in body
        assert "1 HIGH" in body

    def test_no_findings(self):
        body = format_summary_body([{"findings": []}])
        assert "No documentation gaps found" in body


class TestFormatFileThread:
    def test_markers(self):
        group = {"file": "CHANGELOG.md", "risk_level": "HIGH", "findings": [
            {"risk": "HIGH", "category": "changelog", "detail": "Not updated"},
        ]}
        body = format_file_thread("CHANGELOG.md", group, "abc123")
        assert "<!-- docs-quality-file:CHANGELOG.md -->" in body
        assert "Documentation Review" in body
        assert "Documentation Gap: HIGH" in body
        assert "Contributor: fix the issue" in body

    def test_update(self):
        group = {"file": "f.md", "risk_level": "LOW", "findings": [
            {"risk": "LOW", "category": "cross_reference", "detail": "Stale link"},
        ]}
        body = format_file_thread("f.md", group, "x", is_update=True)
        assert "re-acknowledge" in body


class TestFindExistingThread:
    def test_finds(self):
        discussions = [{"id": "d1", "notes": [
            {"id": "n1", "body": "<!-- docs-quality-file:CHANGELOG.md -->\n<!-- docs-quality-hash:abc -->"}
        ]}]
        d, h, n = find_existing_thread(discussions, "CHANGELOG.md")
        assert d is not None
        assert h == "abc"

    def test_not_found(self):
        d, _, _ = find_existing_thread([{"id": "d1", "notes": [{"id": "n1", "body": "other"}]}], "CHANGELOG.md")
        assert d is None


class TestFindSummaryNote:
    def test_finds(self):
        assert find_summary_note([{"id": "n1", "body": SUMMARY_MARKER}], SUMMARY_MARKER) is not None
    def test_not_found(self):
        assert find_summary_note([{"id": "n1", "body": "nope"}], SUMMARY_MARKER) is None



from review.doc_quality.doc_quality_review import (
    get_changed_schemas,
    get_changed_markdown,
    get_starter_kit_changes,
)


class TestGetChangedSchemas:
    def test_no_schemas(self):
        assert get_changed_schemas(["README.md"]) == "(no config schemas changed)"

    def test_schema_with_md_updated(self):
        files = [
            "packages/apps/datalake/datalake-app/lib/config-schema.json",
            "packages/apps/datalake/datalake-app/SCHEMA.md",
        ]
        result = get_changed_schemas(files)
        assert "SCHEMA.md also changed" in result

    def test_schema_without_md(self):
        files = ["packages/apps/datalake/datalake-app/lib/config-schema.json"]
        result = get_changed_schemas(files)
        assert "SCHEMA.md NOT updated" in result


class TestGetChangedMarkdown:
    def test_no_md(self):
        assert get_changed_markdown(["lib/index.ts"]) == "(no markdown files changed)"

    def test_lists_md_files(self):
        result = get_changed_markdown(["README.md", "CHANGELOG.md", "lib/index.ts"])
        assert "README.md" in result
        assert "CHANGELOG.md" in result
        assert "index.ts" not in result

    def test_caps_at_50(self):
        files = [f"docs/page{i}.md" for i in range(60)]
        result = get_changed_markdown(files)
        assert result.count("  - ") == 50


class TestGetStarterKitChanges:
    def test_no_changes(self):
        assert get_starter_kit_changes(["README.md"]) == "(no starter kit changes)"

    def test_lists_changes(self):
        files = ["starter_kits/basic/config.yaml", "starter_kits/advanced/config.yaml"]
        result = get_starter_kit_changes(files)
        assert "starter_kits/basic/config.yaml" in result
        assert "starter_kits/advanced/config.yaml" in result
