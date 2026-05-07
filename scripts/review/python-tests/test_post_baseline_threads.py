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
    """Tests for _build_root_cause_groups."""

    def test_safe_findings_included_for_wide_impact(self):
        from review.baseline.post_baseline_threads import _build_root_cause_groups

        entries = []
        for i in range(6):
            entries.append(_make_entry(
                f"module-{i}", "sample-config-comprehensive",
                risk_level="LOW",
                findings=[_make_finding("shared/lib/index.ts:L10", risk="LOW")],
            ))

        groups = _build_root_cause_groups(entries)
        # Should have a group that was escalated from LOW due to wide impact (6 modules)
        assert "shared/lib/index.ts:L10" in groups
        assert groups["shared/lib/index.ts:L10"]["risk_level"] != "LOW"

    def test_low_findings_not_escalated_below_threshold(self):
        from review.baseline.post_baseline_threads import _build_root_cause_groups

        entries = [
            _make_entry("module-a", "config", risk_level="LOW",
                        findings=[_make_finding("lib/index.ts:L1", risk="LOW")]),
            _make_entry("module-b", "config", risk_level="LOW",
                        findings=[_make_finding("lib/index.ts:L1", risk="LOW")]),
        ]

        groups = _build_root_cause_groups(entries)
        # 2 modules — below threshold, stays LOW (no escalation)
        assert "lib/index.ts:L1" in groups
        assert groups["lib/index.ts:L1"]["risk_level"] == "LOW"

    def test_high_finding_creates_group(self):
        from review.baseline.post_baseline_threads import _build_root_cause_groups

        entries = [
            _make_entry("sagemaker-app", "config", risk_level="HIGH",
                        findings=[_make_finding("helper.ts:L264", risk="HIGH", change="Permission removed")]),
        ]

        groups = _build_root_cause_groups(entries)
        assert "helper.ts:L264" in groups
        assert groups["helper.ts:L264"]["risk_level"] == "HIGH"

    def test_unknown_source_creates_per_baseline_group(self):
        from review.baseline.post_baseline_threads import _build_root_cause_groups

        entries = [
            _make_entry("app-a", "config-a", risk_level="HIGH", findings=[]),
            _make_entry("app-b", "config-b", risk_level="HIGH", findings=[]),
        ]

        groups = _build_root_cause_groups(entries)
        # Each should get its own group, not merged into one "Unknown"
        unknown_groups = [k for k in groups if "Unknown" in k]
        assert len(unknown_groups) == 2


class TestWideImpactEscalation:
    """Tests for the wide impact escalation logic in _build_root_cause_groups."""

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
        from review.baseline.post_baseline_threads import _build_root_cause_groups

        groups = _build_root_cause_groups(self._make_wide_entries(3))
        group = groups["shared/construct.ts:L50"]
        assert group["risk_level"] == "MEDIUM"  # LOW + 1 = MEDIUM

    def test_5_modules_escalates_two_levels(self):
        from review.baseline.post_baseline_threads import _build_root_cause_groups

        groups = _build_root_cause_groups(self._make_wide_entries(5))
        group = groups["shared/construct.ts:L50"]
        assert group["risk_level"] == "HIGH"  # LOW + 2 = HIGH

    def test_10_modules_escalates_three_levels_capped_at_high(self):
        from review.baseline.post_baseline_threads import _build_root_cause_groups

        groups = _build_root_cause_groups(self._make_wide_entries(10))
        group = groups["shared/construct.ts:L50"]
        assert group["risk_level"] == "HIGH"  # LOW + 3 = HIGH (capped)

    def test_already_high_not_escalated_beyond_high(self):
        from review.baseline.post_baseline_threads import _build_root_cause_groups

        groups = _build_root_cause_groups(self._make_wide_entries(10, risk="HIGH"))
        group = groups["shared/construct.ts:L50"]
        assert group["risk_level"] == "HIGH"  # already HIGH, stays HIGH

    def test_wide_impact_metadata_set(self):
        from review.baseline.post_baseline_threads import _build_root_cause_groups

        groups = _build_root_cause_groups(self._make_wide_entries(5))
        group = groups["shared/construct.ts:L50"]
        assert group.get("wide_impact") == 5

    def test_multi_stack_same_module_counts_as_one(self):
        from review.baseline.post_baseline_threads import _build_root_cause_groups

        entries = []
        # Same module, different stacks
        for stack in ["main", "main-account-2", "main-account-3"]:
            entries.append(_make_entry(
                "sagemaker-app", f"config.{stack}",
                risk_level="LOW",
                findings=[_make_finding("shared.ts:L1", risk="LOW")],
            ))
        groups = _build_root_cause_groups(entries)
        # 1 module with 3 stacks — should NOT escalate (below 3 module threshold)
        assert groups["shared.ts:L1"]["risk_level"] == "LOW"


class TestFormatSummaryBody:
    """Tests for _format_summary_body."""

    def test_includes_counts(self):
        from review.baseline.post_baseline_threads import _format_summary_body

        entries = [
            _make_entry("app-a", "config", risk_level="HIGH", risk_summary="Something risky"),
            _make_entry("app-b", "config", risk_level="LOW", risk_summary="All good"),
        ]
        body = _format_summary_body(entries)
        assert "Total baselines changed:** 2" in body
        assert "1 HIGH" in body
        assert "1 LOW" in body

    def test_stack_ordering(self):
        from review.baseline.post_baseline_threads import _format_summary_body

        entries = [
            _make_entry("sagemaker-app", "config.main-account-2-region", risk_level="HIGH"),
            _make_entry("sagemaker-app", "config.main", risk_level="HIGH"),
        ]
        body = _format_summary_body(entries)
        # Main stack (shorter name) should appear before associated stack
        main_pos = body.index("config.main`")
        assoc_pos = body.index("config.main-account-2-region`")
        assert main_pos < assoc_pos

    def test_overall_summary_used_when_available(self):
        from review.baseline.post_baseline_threads import _format_summary_body

        entries = [
            _make_entry("app", "config", risk_level="LOW",
                        risk_summary="per-baseline summary"),
        ]
        entries[0]["overall_summary"] = "This is the overall summary."
        body = _format_summary_body(entries)
        assert "This is the overall summary." in body

    def test_baseline_details_collapsed(self):
        from review.baseline.post_baseline_threads import _format_summary_body

        entries = [_make_entry("app", "config", risk_level="LOW")]
        body = _format_summary_body(entries)
        assert "<details><summary><b>Baseline Details</b></summary>" in body


class TestFindExistingRootCauseThread:
    """Tests for _find_existing_root_cause_thread."""

    def test_finds_thread_by_source_marker(self):
        from review.baseline.post_baseline_threads import _find_existing_root_cause_thread

        discussions = [{
            "id": "disc-123",
            "notes": [{
                "id": 456,
                "body": "<!-- root-cause:lib/index.ts:L94 -->\n<!-- rootcause-hash:abc123 -->\nSome content",
            }],
        }]
        disc, hash_val, note_id, source_hash = _find_existing_root_cause_thread(discussions, "lib/index.ts:L94")
        assert disc is not None
        assert disc["id"] == "disc-123"
        assert hash_val == "abc123"
        assert note_id == "456"

    def test_returns_none_when_not_found(self):
        from review.baseline.post_baseline_threads import _find_existing_root_cause_thread

        discussions = [{
            "id": "disc-123",
            "notes": [{
                "id": 456,
                "body": "<!-- root-cause:other/file.ts:L10 -->\n<!-- rootcause-hash:xyz -->\nContent",
            }],
        }]
        disc, hash_val, note_id, source_hash = _find_existing_root_cause_thread(discussions, "lib/index.ts:L94")
        assert disc is None
        assert hash_val is None
        assert note_id is None

    def test_uses_latest_hash_from_multiple_notes(self):
        from review.baseline.post_baseline_threads import _find_existing_root_cause_thread

        discussions = [{
            "id": "disc-123",
            "notes": [
                {"id": 1, "body": "<!-- root-cause:file.ts:L1 -->\n<!-- rootcause-hash:old_hash -->\nOriginal"},
                {"id": 2, "body": "<!-- rootcause-hash:new_hash -->\nUpdated"},
            ],
        }]
        disc, hash_val, note_id, source_hash = _find_existing_root_cause_thread(discussions, "file.ts:L1")
        assert hash_val == "new_hash"
        assert note_id == "1"  # first note ID for editing


class TestRootCauseGroupSummary:
    """Tests that root cause group risk_summary comes from findings, not baseline summary."""

    def test_summary_from_first_finding(self):
        from review.baseline.post_baseline_threads import _build_root_cause_groups

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

        groups = _build_root_cause_groups(entries)
        group = groups["helper.ts:L10"]
        # Summary should be from the first finding's change, not the baseline summary
        assert group["risk_summary"] == "Permission removed from provisioning policy"
        assert "unrelated" not in group["risk_summary"]

    def test_empty_findings_no_summary(self):
        from review.baseline.post_baseline_threads import _build_root_cause_groups

        entries = [
            _make_entry("app-a", "config", risk_level="HIGH", findings=[]),
        ]

        groups = _build_root_cause_groups(entries)
        unknown_groups = [g for g in groups.values()]
        assert len(unknown_groups) == 1
        # Unknown groups use baseline risk_summary as fallback (empty here)
        assert unknown_groups[0]["risk_summary"] == ""
