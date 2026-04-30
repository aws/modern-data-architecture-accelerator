"""Tests for review.lib.nx_graph — target ref resolution."""

import os
import pytest


class TestTargetRef:
    """Tests for _target_ref."""

    def test_defaults_to_origin_main(self):
        from review.lib.nx_graph import _target_ref

        os.environ.pop("CI_MERGE_REQUEST_TARGET_BRANCH_NAME", None)
        assert _target_ref() == "origin/main"

    def test_uses_ci_variable(self):
        from review.lib.nx_graph import _target_ref

        os.environ["CI_MERGE_REQUEST_TARGET_BRANCH_NAME"] = "release/v2"
        try:
            assert _target_ref() == "origin/release/v2"
        finally:
            del os.environ["CI_MERGE_REQUEST_TARGET_BRANCH_NAME"]
