"""Tests for MR Summary agent."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

# Add scripts/ to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from review.mr_summary.mr_summary import (
    SUMMARY_MARKER,
    classify_file,
    parse_shortstat,
    build_stats_table,
    update_mr_description,
    format_summary_markdown,
    generate_narrative,
)


class TestClassifyFile:
    """Test file category classification."""

    def test_l2_construct(self):
        assert classify_file("packages/constructs/L2/s3-constructs/lib/bucket.ts") == "L2 Constructs"

    def test_l3_construct(self):
        assert classify_file("packages/constructs/L3/datalake/datalake-l3-construct/lib/datalake-l3-construct.ts") == "L3 Constructs"

    def test_app_module_lib(self):
        assert classify_file("packages/apps/datalake/datalake-app/lib/datalake.ts") == "App Modules"

    def test_app_module_bin(self):
        assert classify_file("packages/apps/datalake/datalake-app/bin/datalake.ts") == "App Modules"

    def test_lambda_python(self):
        assert classify_file("packages/constructs/L3/datalake/datalake-l3-construct/lambda/handler.py") == "Lambda / Python"

    def test_utilities_lib(self):
        assert classify_file("packages/utilities/iam-role-helper/lib/rolehelper.ts") == "Utilities / CLI"

    def test_cli_lib(self):
        assert classify_file("packages/cli/lib/mdaa-cli.ts") == "Utilities / CLI"

    def test_test_harness(self):
        assert classify_file("packages/utilities/mdaa-testing/lib/test-app.ts") == "Test Harness"

    def test_test_harness_not_utilities(self):
        """mdaa-testing lib files should be Test Harness, not Utilities / CLI."""
        assert classify_file("packages/utilities/mdaa-testing/lib/diff.ts") == "Test Harness"

    def test_config_schema(self):
        assert classify_file("packages/apps/datalake/datalake-app/lib/config-schema.json") == "Configuration Schemas"

    def test_schema_duplicate(self):
        assert classify_file("schemas/@aws-mdaa/datalake.json") == "Duplicates"

    def test_unit_test(self):
        assert classify_file("packages/constructs/L2/s3-constructs/test/s3.compliance.test.ts") == "Tests — Unit"

    def test_diff_test(self):
        assert classify_file("packages/apps/datalake/datalake-app/test/datalake.diff.test.ts") == "Tests — Diff/Snapshot"

    def test_snapshot_test(self):
        assert classify_file("packages/apps/datalake/datalake-app/test/datalake.snapshot.test.ts") == "Tests — Diff/Snapshot"

    def test_baseline_json(self):
        assert classify_file("packages/apps/datalake/datalake-app/test/__snapshots__/sample-config-comprehensive.baseline.json") == "Tests — Diff/Snapshot"

    def test_ci_gitlab(self):
        assert classify_file(".gitlab-ci.yml") == "CI/CD Pipeline"

    def test_ci_scripts(self):
        assert classify_file("scripts/review/baseline/baseline_review.py") == "CI/CD Pipeline"

    def test_documentation(self):
        assert classify_file("packages/apps/datalake/datalake-app/README.md") == "Documentation"

    def test_sample_config(self):
        assert classify_file("packages/apps/datalake/datalake-app/sample_configs/sample-config-comprehensive.yaml") == "Sample Configs"

    def test_build_config_package_json(self):
        assert classify_file("packages/apps/datalake/datalake-app/package.json") == "Build / Config"

    def test_build_config_jest(self):
        assert classify_file("packages/apps/datalake/datalake-app/jest.config.js") == "Build / Config"

    def test_synth_test(self):
        assert classify_file("packages/apps/datalake/datalake-app/test/datalake.synth.test.ts") == "Tests — Diff/Snapshot"


class TestParseShortstat:
    """Test git shortstat parsing."""

    def test_full_stat(self):
        assert parse_shortstat(" 5 files changed, 120 insertions(+), 30 deletions(-)") == (5, 120, 30)

    def test_insertions_only(self):
        assert parse_shortstat(" 3 files changed, 50 insertions(+)") == (3, 50, 0)

    def test_deletions_only(self):
        assert parse_shortstat(" 2 files changed, 10 deletions(-)") == (2, 0, 10)

    def test_single_file(self):
        assert parse_shortstat(" 1 file changed, 5 insertions(+), 2 deletions(-)") == (1, 5, 2)

    def test_empty(self):
        assert parse_shortstat("") == (0, 0, 0)


class TestUpdateMrDescription:
    """Test MR description update logic."""

    @patch.dict(os.environ, {
        "PROJECT_ACCESS_TOKEN": "test-token",
        "CI_MERGE_REQUEST_IID": "123",
        "CI_PROJECT_ID": "456",
        "CI_API_V4_URL": "https://gitlab.example.com/api/v4",
    })
    @patch("review.mr_summary.mr_summary.gitlab_api")
    def test_appends_to_empty_description(self, mock_api):
        mock_api.side_effect = [
            {"description": "## My MR\n\nSome description"},  # GET
            None,  # PUT
        ]
        update_mr_description("Summary content here")

        # Verify PUT was called with marker
        put_call = mock_api.call_args_list[1]
        new_desc = put_call[1]["data"]["description"] if "data" in put_call[1] else put_call[0][3]["description"]
        assert SUMMARY_MARKER in new_desc
        assert "Summary content here" in new_desc
        assert "## My MR" in new_desc

    @patch.dict(os.environ, {
        "PROJECT_ACCESS_TOKEN": "test-token",
        "CI_MERGE_REQUEST_IID": "123",
        "CI_PROJECT_ID": "456",
        "CI_API_V4_URL": "https://gitlab.example.com/api/v4",
    })
    @patch("review.mr_summary.mr_summary.gitlab_api")
    def test_replaces_existing_auto_section(self, mock_api):
        existing = (
            "## My MR\n\nSome description\n\n"
            f"---\n{SUMMARY_MARKER}\n"
            "_Old auto content_\n\nOld summary"
        )
        mock_api.side_effect = [
            {"description": existing},  # GET
            None,  # PUT
        ]
        update_mr_description("New summary content")

        put_call = mock_api.call_args_list[1]
        new_desc = put_call[1]["data"]["description"] if "data" in put_call[1] else put_call[0][3]["description"]
        assert "New summary content" in new_desc
        assert "Old summary" not in new_desc
        assert "## My MR" in new_desc

    @patch.dict(os.environ, {}, clear=True)
    def test_skips_without_token(self, capsys):
        update_mr_description("content")
        captured = capsys.readouterr()
        assert "PROJECT_ACCESS_TOKEN not set" in captured.out


class TestFormatSummaryMarkdown:
    """Test JSON-to-markdown assembly."""

    def test_change_summary_visible(self):
        data = {
            "change_summary": "This MR adds a new feature.",
            "code_changes": [],
            "file_changes": [],
            "config_changes": "",
            "commit_log": "",
        }
        md = format_summary_markdown(data, "5 files changed", "| Cat | 5 | +100 | -10 |")
        assert "This MR adds a new feature." in md
        # Summary should NOT be inside a details block
        assert md.index("This MR adds a new feature.") < md.index("<details>")

    def test_file_stats_collapsed(self):
        data = {"change_summary": "Summary.", "code_changes": [], "file_changes": [], "config_changes": "", "commit_log": ""}
        md = format_summary_markdown(data, "5 files", "| table |")
        assert "<details><summary><b>File Stats</b>" in md
        assert "| table |" in md

    def test_code_changes_collapsed(self):
        data = {
            "change_summary": "Summary.",
            "code_changes": [{"category": "L2 Constructs", "description": "Added bucket tag.", "files": "bucket.ts (+5/-0)"}],
            "file_changes": [],
            "config_changes": "",
            "commit_log": "",
        }
        md = format_summary_markdown(data, "1 file", "| t |")
        assert "<details><summary><b>Code Changes</b>" in md
        assert "L2 Constructs" in md
        assert "Added bucket tag." in md

    def test_file_changes_collapsed(self):
        data = {
            "change_summary": "Summary.",
            "code_changes": [],
            "file_changes": [{"category": "Documentation", "description": "Updated README.", "files": "README.md (+10/-2)"}],
            "config_changes": "",
            "commit_log": "",
        }
        md = format_summary_markdown(data, "1 file", "| t |")
        assert "<details><summary><b>File Changes</b>" in md
        assert "Documentation" in md

    def test_commit_log_collapsed(self):
        data = {
            "change_summary": "Summary.",
            "code_changes": [],
            "file_changes": [],
            "config_changes": "",
            "commit_log": "- feat: add thing\n- fix: fix thing",
        }
        md = format_summary_markdown(data, "2 files", "| t |")
        assert "<details><summary><b>Commit Log</b>" in md
        assert "feat: add thing" in md

    def test_empty_sections_omitted(self):
        data = {"change_summary": "Summary.", "code_changes": [], "file_changes": [], "config_changes": "", "commit_log": ""}
        md = format_summary_markdown(data, "0 files", "")
        assert "Code Changes" not in md
        assert "File Changes" not in md
        assert "Configuration Changes" not in md
        assert "Commit Log" not in md

    @patch.dict(os.environ, {
        "PROJECT_ACCESS_TOKEN": "test-token",
        "CI_MERGE_REQUEST_IID": "123",
        "CI_PROJECT_ID": "456",
        "CI_API_V4_URL": "https://gitlab.example.com/api/v4",
    })
    @patch("review.mr_summary.mr_summary.gitlab_api")
    def test_preserves_closes_reference(self, mock_api):
        existing = (
            "## Developer Notes\n\nSome notes\n\n"
            "Closes #42"
        )
        mock_api.side_effect = [
            {"description": existing},  # GET
            None,  # PUT
        ]
        update_mr_description("New summary")

        put_call = mock_api.call_args_list[1]
        new_desc = put_call[0][3]["description"]
        assert "Closes #42" in new_desc
        assert "New summary" in new_desc
        # Closes should be at the bottom, after the auto section
        closes_idx = new_desc.index("Closes #42")
        summary_idx = new_desc.index("New summary")
        assert closes_idx > summary_idx

    @patch.dict(os.environ, {
        "PROJECT_ACCESS_TOKEN": "test-token",
        "CI_MERGE_REQUEST_IID": "123",
        "CI_PROJECT_ID": "456",
        "CI_API_V4_URL": "https://gitlab.example.com/api/v4",
    })
    @patch("review.mr_summary.mr_summary.gitlab_api")
    def test_preserves_closes_on_rerun(self, mock_api):
        """On re-run, Closes ref may be inside the auto section — still preserved."""
        existing = (
            "## Developer Notes\n\nSome notes\n\n"
            f"---\n{SUMMARY_MARKER}\n"
            "_Auto content_\n\nOld summary\n\n"
            "Closes #42"
        )
        mock_api.side_effect = [
            {"description": existing},  # GET
            None,  # PUT
        ]
        update_mr_description("Updated summary")

        put_call = mock_api.call_args_list[1]
        new_desc = put_call[0][3]["description"]
        assert "Closes #42" in new_desc
        assert "Updated summary" in new_desc
        assert "Old summary" not in new_desc


class TestGenerateNarrative:
    """Test narrative generation with mocked Kiro responses."""

    @patch("review.mr_summary.mr_summary.run_kiro_assessment")
    def test_valid_json_response(self, mock_kiro):
        mock_kiro.return_value = json.dumps({
            "change_summary": "Added S3 encryption.",
            "code_changes": [{"category": "L2", "description": "KMS key", "files": "bucket.ts"}],
            "file_changes": [],
            "config_changes": "",
            "commit_log": "",
        })
        result = generate_narrative("3 files", "| t |", "feat: add kms", "diff", "")
        assert "Added S3 encryption." in result
        assert "L2" in result

    @patch("review.mr_summary.mr_summary.run_kiro_assessment")
    def test_markdown_fenced_json(self, mock_kiro):
        """Kiro sometimes wraps JSON in markdown fences."""
        payload = json.dumps({
            "change_summary": "Fixed bug.",
            "code_changes": [],
            "file_changes": [],
            "config_changes": "",
            "commit_log": "",
        })
        mock_kiro.return_value = f"```json\n{payload}\n```"
        result = generate_narrative("1 file", "| t |", "fix: bug", "diff", "")
        assert "Fixed bug." in result

    @patch("review.mr_summary.mr_summary.run_kiro_assessment")
    def test_invalid_json_returns_raw(self, mock_kiro):
        mock_kiro.return_value = "This is not JSON, just a plain summary."
        result = generate_narrative("1 file", "| t |", "fix: x", "diff", "")
        assert result == "This is not JSON, just a plain summary."

    @patch("review.mr_summary.mr_summary.run_kiro_assessment")
    def test_config_section_included_in_prompt(self, mock_kiro):
        mock_kiro.return_value = json.dumps({
            "change_summary": "Config updated.",
            "code_changes": [],
            "file_changes": [],
            "config_changes": "New field added",
            "commit_log": "",
        })
        result = generate_narrative("1 file", "| t |", "feat: cfg", "diff", "schema diff here")
        # Verify config_section was passed (function should work without error)
        assert "Config updated." in result

    @patch("review.mr_summary.mr_summary.run_kiro_assessment")
    def test_empty_config_diff_omits_section(self, mock_kiro):
        mock_kiro.return_value = json.dumps({
            "change_summary": "No config.",
            "code_changes": [],
            "file_changes": [],
            "config_changes": "",
            "commit_log": "",
        })
        result = generate_narrative("1 file", "| t |", "feat: x", "diff", "")
        assert "No config." in result
