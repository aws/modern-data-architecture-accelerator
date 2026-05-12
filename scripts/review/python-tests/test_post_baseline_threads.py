"""Tests for review.baseline.post_baseline_threads — grouping, escalation, and formatting."""

import json
import os
import pytest


def _make_entry(module, config, risk_level="LOW", findings=None, risk_summary="", cdk_diff=""):
    """Helper to create a baseline entry dict."""
    return {
        "module": module,
        "config": config,
        "risk_level": risk_level,
        "findings": findings or [],
        "risk_summary": risk_summary,
        "risk_assessment": "",
        "cdk_diff": cdk_diff or f"diff for {module}/{config}",
        "change_type": "modified",
        "file": f"packages/apps/{module}/test/__snapshots__/{config}.baseline.json",
        "code_diff_paths": [],
    }


def _make_finding(source, risk="LOW", resource="TestResource (AWS::Test::Type)", change="test change"):
    return {"source": source, "risk": risk, "resource": resource, "change": change}


class TestBuildRootCauseGroups:
    """Tests for build_root_cause_groups."""

    def test_safe_findings_included_for_wide_impact(self):
        from review.baseline.post_baseline_threads import build_root_cause_groups

        entries = []
        for i in range(6):
            entries.append(_make_entry(
                f"module-{i}", "sample-config-comprehensive",
                risk_level="LOW",
                findings=[_make_finding("shared/lib/index.ts:L10", risk="LOW")],
            ))

        groups = build_root_cause_groups(entries)
        # Should have a group that was escalated from LOW due to wide impact (6 modules)
        assert "shared/lib/index.ts:L10" in groups
        assert groups["shared/lib/index.ts:L10"]["risk_level"] != "LOW"

    def test_low_findings_not_escalated_below_threshold(self):
        from review.baseline.post_baseline_threads import build_root_cause_groups

        entries = [
            _make_entry("module-a", "config", risk_level="LOW",
                        findings=[_make_finding("lib/index.ts:L1", risk="LOW")]),
            _make_entry("module-b", "config", risk_level="LOW",
                        findings=[_make_finding("lib/index.ts:L1", risk="LOW")]),
        ]

        groups = build_root_cause_groups(entries)
        # 2 modules — below threshold, stays LOW (no escalation)
        assert "lib/index.ts:L1" in groups
        assert groups["lib/index.ts:L1"]["risk_level"] == "LOW"

    def test_high_finding_creates_group(self):
        from review.baseline.post_baseline_threads import build_root_cause_groups

        entries = [
            _make_entry("sagemaker-app", "config", risk_level="HIGH",
                        findings=[_make_finding("helper.ts:L264", risk="HIGH", change="Permission removed")]),
        ]

        groups = build_root_cause_groups(entries)
        assert "helper.ts:L264" in groups
        assert groups["helper.ts:L264"]["risk_level"] == "HIGH"

    def test_unknown_source_creates_per_baseline_group(self):
        from review.baseline.post_baseline_threads import build_root_cause_groups

        entries = [
            _make_entry("app-a", "config-a", risk_level="HIGH", findings=[]),
            _make_entry("app-b", "config-b", risk_level="HIGH", findings=[]),
        ]

        groups = build_root_cause_groups(entries)
        # Each should get its own group, not merged into one "Unknown"
        unknown_groups = [k for k in groups if "Unknown" in k]
        assert len(unknown_groups) == 2


class TestWideImpactEscalation:
    """Tests for the wide impact escalation logic in build_root_cause_groups."""

    def _make_wide_entries(self, module_count, risk="LOW"):
        entries = []
        for i in range(module_count):
            entries.append(_make_entry(
                f"module-{i}", "sample-config",
                risk_level=risk,
                findings=[_make_finding("shared/construct.ts:L50", risk=risk)],
            ))
        return entries

    def test_3_modules_escalates_one_level(self):
        from review.baseline.post_baseline_threads import build_root_cause_groups

        groups = build_root_cause_groups(self._make_wide_entries(3))
        group = groups["shared/construct.ts:L50"]
        assert group["risk_level"] == "MEDIUM"  # LOW + 1 = MEDIUM

    def test_5_modules_escalates_two_levels(self):
        from review.baseline.post_baseline_threads import build_root_cause_groups

        groups = build_root_cause_groups(self._make_wide_entries(5))
        group = groups["shared/construct.ts:L50"]
        assert group["risk_level"] == "HIGH"  # LOW + 2 = HIGH

    def test_10_modules_escalates_three_levels_capped_at_high(self):
        from review.baseline.post_baseline_threads import build_root_cause_groups

        groups = build_root_cause_groups(self._make_wide_entries(10))
        group = groups["shared/construct.ts:L50"]
        assert group["risk_level"] == "HIGH"  # LOW + 3 = HIGH (capped)

    def test_already_high_not_escalated_beyond_high(self):
        from review.baseline.post_baseline_threads import build_root_cause_groups

        groups = build_root_cause_groups(self._make_wide_entries(10, risk="HIGH"))
        group = groups["shared/construct.ts:L50"]
        assert group["risk_level"] == "HIGH"  # already HIGH, stays HIGH

    def test_wide_impact_metadata_set(self):
        from review.baseline.post_baseline_threads import build_root_cause_groups

        groups = build_root_cause_groups(self._make_wide_entries(5))
        group = groups["shared/construct.ts:L50"]
        assert group.get("wide_impact") == 5

    def test_multi_stack_same_module_counts_as_one(self):
        from review.baseline.post_baseline_threads import build_root_cause_groups

        entries = []
        # Same module, different stacks
        for stack in ["main", "main-account-2", "main-account-3"]:
            entries.append(_make_entry(
                "sagemaker-app", f"config.{stack}",
                risk_level="LOW",
                findings=[_make_finding("shared.ts:L1", risk="LOW")],
            ))
        groups = build_root_cause_groups(entries)
        # 1 module with 3 stacks — should NOT escalate (below 3 module threshold)
        assert groups["shared.ts:L1"]["risk_level"] == "LOW"


class TestFormatSummaryBody:
    """Tests for format_summary_body."""

    def test_includes_counts(self):
        from review.baseline.post_baseline_threads import format_summary_body

        entries = [
            _make_entry("app-a", "config", risk_level="HIGH", risk_summary="Something risky"),
            _make_entry("app-b", "config", risk_level="LOW", risk_summary="All good"),
        ]
        body = format_summary_body(entries)
        assert "Total baselines changed:** 2" in body
        assert "1 HIGH" in body
        assert "1 LOW" in body

    def test_stack_ordering(self):
        from review.baseline.post_baseline_threads import format_summary_body

        entries = [
            _make_entry("sagemaker-app", "config.main-account-2-region", risk_level="HIGH"),
            _make_entry("sagemaker-app", "config.main", risk_level="HIGH"),
        ]
        body = format_summary_body(entries)
        # Main stack (shorter name) should appear before associated stack
        main_pos = body.index("config.main`")
        assoc_pos = body.index("config.main-account-2-region`")
        assert main_pos < assoc_pos

    def test_overall_summary_used_when_available(self):
        from review.baseline.post_baseline_threads import format_summary_body

        entries = [
            _make_entry("app", "config", risk_level="LOW",
                        risk_summary="per-baseline summary"),
        ]
        entries[0]["overall_summary"] = "This is the overall summary."
        body = format_summary_body(entries)
        assert "This is the overall summary." in body

    def test_baseline_details_collapsed(self):
        from review.baseline.post_baseline_threads import format_summary_body

        entries = [_make_entry("app", "config", risk_level="LOW")]
        body = format_summary_body(entries)
        assert "<details><summary><b>Baseline Details</b></summary>" in body


class TestFindExistingRootCauseThread:
    """Tests for finding baseline threads via shared find_thread_by_marker."""

    def test_finds_thread_by_source_marker(self):
        from review.baseline.post_baseline_threads import SOURCE_PATTERN
        from review.lib.thread_lifecycle import find_thread_by_marker

        discussions = [{
            "id": "disc-123",
            "notes": [{
                "id": 456,
                "body": "<!-- baseline-source:lib/index.ts:abc123 -->\n<!-- baseline-hash:def456 -->\nSome content",
            }],
        }]
        disc, hash_val, note_id, source_hash = find_thread_by_marker(discussions, SOURCE_PATTERN, "lib/index.ts:abc123")
        assert disc is not None
        assert disc["id"] == "disc-123"
        assert hash_val == "def456"
        assert note_id == "456"

    def test_returns_none_when_not_found(self):
        from review.baseline.post_baseline_threads import SOURCE_PATTERN
        from review.lib.thread_lifecycle import find_thread_by_marker

        discussions = [{
            "id": "disc-123",
            "notes": [{
                "id": 456,
                "body": "<!-- baseline-source:other/file.ts:xyz -->\n<!-- baseline-hash:abc -->\nContent",
            }],
        }]
        disc, hash_val, note_id, source_hash = find_thread_by_marker(discussions, SOURCE_PATTERN, "lib/index.ts:abc123")
        assert disc is None

    def test_uses_latest_hash_from_multiple_notes(self):
        from review.baseline.post_baseline_threads import SOURCE_PATTERN
        from review.lib.thread_lifecycle import find_thread_by_marker

        discussions = [{
            "id": "disc-123",
            "notes": [
                {"id": 1, "body": "<!-- baseline-source:file.ts:abc -->\n<!-- baseline-hash:old_hash -->\nOriginal"},
                {"id": 2, "body": "<!-- baseline-hash:new_hash -->\nUpdated"},
            ],
        }]
        disc, hash_val, note_id, source_hash = find_thread_by_marker(discussions, SOURCE_PATTERN, "file.ts:abc")
        assert hash_val == "new_hash"
        assert note_id == "1"


class TestRootCauseGroupSummary:
    """Tests that root cause group risk_summary comes from findings, not baseline summary."""

    def test_summary_from_first_finding(self):
        from review.baseline.post_baseline_threads import build_root_cause_groups

        entries = [
            _make_entry("app-a", "config", risk_level="HIGH",
                        risk_summary="This is the baseline-level summary mentioning unrelated changes",
                        findings=[_make_finding("helper.ts:L10", risk="HIGH",
                                                change="Permission removed from provisioning policy")]),
            _make_entry("app-b", "config", risk_level="HIGH",
                        risk_summary="Another baseline summary with different wording",
                        findings=[_make_finding("helper.ts:L10", risk="HIGH",
                                                change="CfnValidate statement deleted")]),
        ]

        groups = build_root_cause_groups(entries)
        group = groups["helper.ts:L10"]
        # Summary should be from the first finding's change, not the baseline summary
        assert group["risk_summary"] == "Permission removed from provisioning policy"
        assert "unrelated" not in group["risk_summary"]

    def test_empty_findings_no_summary(self):
        from review.baseline.post_baseline_threads import build_root_cause_groups

        entries = [
            _make_entry("app-a", "config", risk_level="HIGH", findings=[]),
        ]

        groups = build_root_cause_groups(entries)
        unknown_groups = [g for g in groups.values()]
        assert len(unknown_groups) == 1
        # Unknown groups use baseline risk_summary as fallback (empty here)
        assert unknown_groups[0]["risk_summary"] == ""


class TestFormatRootCauseThread:
    """Tests for format_root_cause_thread."""

    def _make_group(self, risk_level="HIGH", wide_impact=None, findings=None):
        """Helper to create a root cause group dict."""
        if findings is None:
            findings = [
                ("app-a/config", {"source": "lib/helper.ts:L10", "resource": "MyBucket (AWS::S3::Bucket)", "change": "Removed encryption", "risk": "HIGH"}),
            ]
        group = {
            "source": "lib/helper.ts:L10",
            "risk_level": risk_level,
            "findings": findings,
            "risk_summary": "Encryption removed from bucket",
            "source_hash": "abc123def456",
        }
        if wide_impact:
            group["wide_impact"] = wide_impact
        return group

    def test_includes_source_marker(self):
        from review.baseline.post_baseline_threads import format_root_cause_thread

        group = self._make_group()
        body = format_root_cause_thread("lib/helper.ts:abc123def456", group, "hash123")
        assert "<!-- baseline-source:lib/helper.ts:abc123def456 -->" in body

    def test_includes_hash_marker(self):
        from review.baseline.post_baseline_threads import format_root_cause_thread

        group = self._make_group()
        body = format_root_cause_thread("lib/helper.ts:abc123def456", group, "hash123")
        assert "<!-- baseline-hash:hash123 -->" in body

    def test_shows_correct_risk_level_and_icon(self):
        from review.baseline.post_baseline_threads import format_root_cause_thread

        group = self._make_group(risk_level="HIGH")
        body = format_root_cause_thread("key", group, "hash")
        assert "\u26a0\ufe0f" in body  # ⚠️ icon for HIGH
        assert "Infrastructure Risk: HIGH" in body

    def test_shows_low_risk_icon(self):
        from review.baseline.post_baseline_threads import format_root_cause_thread

        group = self._make_group(risk_level="LOW")
        body = format_root_cause_thread("key", group, "hash")
        assert "\u2705" in body  # ✅ icon for LOW
        assert "Infrastructure Risk: LOW" in body

    def test_shows_root_cause_with_display_source(self):
        from review.baseline.post_baseline_threads import format_root_cause_thread

        group = self._make_group()
        body = format_root_cause_thread("key", group, "hash")
        assert "Root Cause:" in body
        assert "lib/helper.ts:L10" in body

    def test_shows_findings_changed_when_is_update(self):
        from review.baseline.post_baseline_threads import format_root_cause_thread

        group = self._make_group()
        body = format_root_cause_thread("key", group, "hash", is_update=True)
        assert "Findings have changed since last review" in body

    def test_no_findings_changed_when_not_update(self):
        from review.baseline.post_baseline_threads import format_root_cause_thread

        group = self._make_group()
        body = format_root_cause_thread("key", group, "hash", is_update=False)
        assert "Findings have changed" not in body

    def test_shows_wide_impact_note(self):
        from review.baseline.post_baseline_threads import format_root_cause_thread

        group = self._make_group(wide_impact=7)
        body = format_root_cause_thread("key", group, "hash")
        assert "Wide impact" in body
        assert "7 modules" in body

    def test_no_wide_impact_note_when_not_set(self):
        from review.baseline.post_baseline_threads import format_root_cause_thread

        group = self._make_group()
        body = format_root_cause_thread("key", group, "hash")
        assert "Wide impact" not in body

    def test_includes_affected_resources_table(self):
        from review.baseline.post_baseline_threads import format_root_cause_thread

        group = self._make_group()
        body = format_root_cause_thread("key", group, "hash")
        assert "Affected Resources" in body
        assert "| Resource | Type | Change | Risk |" in body
        assert "MyBucket" in body
        assert "AWS::S3::Bucket" in body

    def test_includes_thread_footer(self):
        from review.baseline.post_baseline_threads import format_root_cause_thread

        group = self._make_group()
        body = format_root_cause_thread("key", group, "hash")
        assert "Contributor:" in body
        assert "Reviewer:" in body


class TestComputeStructuralHash:
    """Tests for _compute_structural_hash."""

    def test_consistent_hash_for_same_input(self):
        from review.baseline.post_baseline_threads import _compute_structural_hash

        group = {
            "findings": [
                ("app-a/config", {"source": "lib/a.ts:L10", "resource": "Bucket (AWS::S3::Bucket)", "risk": "HIGH"}),
                ("app-b/config", {"source": "lib/a.ts:L10", "resource": "Queue (AWS::SQS::Queue)", "risk": "MEDIUM"}),
            ],
        }
        h1 = _compute_structural_hash("lib/a.ts:abc123", group)
        h2 = _compute_structural_hash("lib/a.ts:abc123", group)
        assert h1 == h2

    def test_different_hashes_for_different_inputs(self):
        from review.baseline.post_baseline_threads import _compute_structural_hash

        group_a = {
            "findings": [
                ("app-a/config", {"source": "lib/a.ts:L10", "resource": "Bucket (AWS::S3::Bucket)", "risk": "HIGH"}),
            ],
        }
        group_b = {
            "findings": [
                ("app-a/config", {"source": "lib/a.ts:L10", "resource": "Queue (AWS::SQS::Queue)", "risk": "MEDIUM"}),
            ],
        }
        h1 = _compute_structural_hash("key", group_a)
        h2 = _compute_structural_hash("key", group_b)
        assert h1 != h2

    def test_deterministic_order_independent(self):
        from review.baseline.post_baseline_threads import _compute_structural_hash

        group_ordered = {
            "findings": [
                ("app-b/config", {"source": "lib/a.ts:L10", "resource": "Queue (AWS::SQS::Queue)", "risk": "MEDIUM"}),
                ("app-a/config", {"source": "lib/a.ts:L10", "resource": "Bucket (AWS::S3::Bucket)", "risk": "HIGH"}),
            ],
        }
        group_reversed = {
            "findings": [
                ("app-a/config", {"source": "lib/a.ts:L10", "resource": "Bucket (AWS::S3::Bucket)", "risk": "HIGH"}),
                ("app-b/config", {"source": "lib/a.ts:L10", "resource": "Queue (AWS::SQS::Queue)", "risk": "MEDIUM"}),
            ],
        }
        h1 = _compute_structural_hash("key", group_ordered)
        h2 = _compute_structural_hash("key", group_reversed)
        assert h1 == h2
