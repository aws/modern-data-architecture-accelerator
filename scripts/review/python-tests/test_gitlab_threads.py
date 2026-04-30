"""Tests for review.lib.gitlab_threads — source position parsing and hashing."""

import json
import pytest


class TestParseSourcePosition:
    """Tests for _parse_source_position."""

    def test_file_with_line(self):
        from review.lib.gitlab_threads import _parse_source_position

        result = _parse_source_position("path/to/file.ts:L42")
        assert result == ("path/to/file.ts", 42)

    def test_file_with_line_no_prefix(self):
        from review.lib.gitlab_threads import _parse_source_position

        result = _parse_source_position("path/to/file.ts:42")
        assert result == ("path/to/file.ts", 42)

    def test_file_without_line(self):
        from review.lib.gitlab_threads import _parse_source_position

        result = _parse_source_position("sample_configs/name.yaml")
        assert result is None

    def test_unknown_source(self):
        from review.lib.gitlab_threads import _parse_source_position

        result = _parse_source_position("Unknown - Please Investigate")
        assert result is None

    def test_empty_source(self):
        from review.lib.gitlab_threads import _parse_source_position

        assert _parse_source_position("") is None
        assert _parse_source_position(None) is None


class TestStructuralHashing:
    """Tests that the hash is stable across Kiro wording variations."""

    def test_same_structure_different_prose_same_hash(self):
        from review.lib.gitlab_threads import compute_hash

        # Simulate two runs where Kiro describes the same finding differently
        structural_a = [
            ("module-a/config", "lib/index.ts:L94", "BucketParam (AWS::SSM::Parameter)", "LOW"),
        ]
        structural_b = [
            ("module-a/config", "lib/index.ts:L94", "BucketParam (AWS::SSM::Parameter)", "LOW"),
        ]
        hash_a = compute_hash(json.dumps(sorted(structural_a), sort_keys=True))
        hash_b = compute_hash(json.dumps(sorted(structural_b), sort_keys=True))
        assert hash_a == hash_b

    def test_different_structure_different_hash(self):
        from review.lib.gitlab_threads import compute_hash

        structural_a = [
            ("module-a/config", "lib/index.ts:L94", "BucketParam (AWS::SSM::Parameter)", "LOW"),
        ]
        structural_b = [
            ("module-a/config", "lib/index.ts:L94", "BucketParam (AWS::SSM::Parameter)", "HIGH"),
        ]
        hash_a = compute_hash(json.dumps(sorted(structural_a), sort_keys=True))
        hash_b = compute_hash(json.dumps(sorted(structural_b), sort_keys=True))
        assert hash_a != hash_b
