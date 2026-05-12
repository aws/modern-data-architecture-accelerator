"""Tests for Module Quality Review agent."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from unittest.mock import patch

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from review.module_quality.module_quality_review import (
    EXCLUDED_ROOTS,
    resolve_l3_construct_root,
)
from review.module_quality.post_module_quality_threads import (
    SUMMARY_MARKER,
    PKG_PATTERN,
    format_summary_body,
    format_module_thread,
)
from review.lib.thread_lifecycle import find_thread_by_marker, find_summary_note as _find_summary_note


# Wrap shared functions for test compatibility
def find_existing_thread(discussions, pkg_name):
    d, h, n, c = find_thread_by_marker(discussions, PKG_PATTERN, pkg_name)
    return d, h, n


def find_summary_note(notes):
    return _find_summary_note(notes, SUMMARY_MARKER)


class TestExcludedRoots:
    def test_core_app_excluded(self):
        assert "packages/apps/core/app" in EXCLUDED_ROOTS

    def test_core_devops_excluded(self):
        assert "packages/apps/core/devops" in EXCLUDED_ROOTS

    def test_dataops_shared_excluded(self):
        assert "packages/apps/dataops/dataops-shared-app" in EXCLUDED_ROOTS


class TestResolveL3ConstructRoot:
    def test_resolves_datalake(self):
        result = resolve_l3_construct_root("packages/apps/datalake/datalake-app")
        assert result is not None
        assert "datalake-l3-construct" in result

    def test_returns_none_for_non_app(self):
        result = resolve_l3_construct_root("packages/constructs/L2/s3-constructs")
        assert result is None


class TestFormatSummaryBody:
    def test_includes_marker(self):
        entries = [
            {"package_name": "pkg-a", "type": "app", "risk_level": "HIGH", "risk_summary": "Issues found", "findings": [
                {"risk": "HIGH", "category": "readme_gap"},
            ]},
        ]
        body = format_summary_body(entries)
        assert SUMMARY_MARKER in body
        assert "Module Quality Review Summary" in body
        assert "1 HIGH" in body
        assert "Concerns:" in body

    def test_no_findings_uses_concerns_language(self):
        entries = [{"package_name": "pkg-a", "type": "app", "risk_level": "LOW", "risk_summary": "", "findings": []}]
        body = format_summary_body(entries)
        assert "All modules meet quality standards" in body
        assert "Risk breakdown" not in body

    def test_empty_entries(self):
        body = format_summary_body([])
        assert "Modules reviewed:** 0" in body


class TestFormatModuleThread:
    def test_includes_markers(self):
        entry = {
            "package_name": "pkg-a",
            "type": "app",
            "risk_level": "HIGH",
            "findings": [
                {"risk": "HIGH", "category": "config_usability", "file": "lib/config.ts", "property": "accessPolicies", "detail": "No JSDoc"},
            ],
        }
        body = format_module_thread("pkg-a", entry, "abc123")
        assert "<!-- module-quality-pkg:pkg-a -->" in body
        assert "Module Quality Review" in body
        assert "Quality Concern: HIGH" in body
        assert "Config Usability" in body
        assert "accessPolicies" in body

    def test_groups_by_category(self):
        entry = {
            "package_name": "pkg-a",
            "type": "app",
            "risk_level": "HIGH",
            "findings": [
                {"risk": "HIGH", "category": "readme_gap", "file": "README.md", "property": "", "detail": "Missing section"},
                {"risk": "MEDIUM", "category": "schema_coverage", "file": "sample_configs/", "property": "", "detail": "Gap"},
            ],
        }
        body = format_module_thread("pkg-a", entry, "abc123")
        assert "### README Gaps" in body
        assert "### Schema Coverage" in body

    def test_update_flag(self):
        entry = {
            "package_name": "pkg-a", "type": "app", "risk_level": "MEDIUM",
            "findings": [{"risk": "MEDIUM", "category": "jsdoc", "file": "lib/c.ts", "property": "x", "detail": "Weak"}],
        }
        body = format_module_thread("pkg-a", entry, "def456", is_update=True)
        assert "re-acknowledge" in body


class TestFindExistingThread:
    def test_finds_by_package(self):
        discussions = [{
            "id": "d1",
            "notes": [{"id": "n1", "body": "<!-- module-quality-pkg:pkg-a -->\n<!-- module-quality-hash:abc123 -->"}],
        }]
        disc, hash_val, note_id = find_existing_thread(discussions, "pkg-a")
        assert disc is not None
        assert hash_val == "abc123"

    def test_returns_none(self):
        discussions = [{"id": "d1", "notes": [{"id": "n1", "body": "<!-- module-quality-pkg:pkg-b -->"}]}]
        disc, _, _ = find_existing_thread(discussions, "pkg-a")
        assert disc is None


class TestFindSummaryNote:
    def test_finds(self):
        notes = [{"id": "n1", "body": f"{SUMMARY_MARKER}\nContent"}]
        assert find_summary_note(notes) is not None

    def test_returns_none(self):
        notes = [{"id": "n1", "body": "Not a summary"}]
        assert find_summary_note(notes) is None




class TestSchemaDesignCategory:
    """Tests for schema_design category rendering in format_module_thread."""

    def test_schema_design_renders_correctly(self):
        """schema_design findings render under 'Schema Design' heading."""
        entry = {
            "package_name": "my-app",
            "type": "app",
            "risk_level": "MEDIUM",
            "findings": [
                {
                    "risk": "MEDIUM",
                    "category": "schema_design",
                    "file": "lib/config.ts",
                    "property": "vpcConfig",
                    "detail": "Schema uses overly permissive any type",
                },
            ],
        }
        body = format_module_thread("my-app", entry, "hash123")
        assert "<!-- module-quality-pkg:my-app -->" in body
        assert "Quality Concern: MEDIUM" in body
        assert "### Schema Design" in body
        assert "Schema uses overly permissive any type" in body
        assert "vpcConfig" in body

    def test_schema_design_mixed_with_other_categories(self):
        """schema_design renders alongside other categories."""
        entry = {
            "package_name": "my-app",
            "type": "app",
            "risk_level": "HIGH",
            "findings": [
                {
                    "risk": "HIGH",
                    "category": "readme_gap",
                    "file": "README.md",
                    "property": "",
                    "detail": "Missing architecture section",
                },
                {
                    "risk": "MEDIUM",
                    "category": "schema_design",
                    "file": "lib/schema.ts",
                    "property": "accessPolicies",
                    "detail": "Array type lacks item validation",
                },
            ],
        }
        body = format_module_thread("my-app", entry, "hash456")
        assert "### README Gaps" in body
        assert "Missing architecture section" in body
        assert "### Schema Design" in body
        assert "Array type lacks item validation" in body
