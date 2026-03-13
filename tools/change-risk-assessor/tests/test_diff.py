# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""Tests for mdaa diff orchestration."""

from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from change_risk_assessor.diff import DiffError, find_diff_files, run_diff


class TestRunDiff:
    patch_target = "change_risk_assessor.diff.subprocess.run"

    def test_successful_diff(self, tmp_path):
        config_path = tmp_path / "configs"
        config_path.mkdir()
        diff_output = tmp_path / "diff-output"
        baseline_path = tmp_path / "baselines"
        mdaa_bin = Path("/usr/local/bin/mdaa")

        mock_result = MagicMock()
        mock_result.returncode = 0
        mock_result.stdout = ""

        with patch(self.patch_target, return_value=mock_result) as mock_run:
            run_diff(
                mdaa_bin=mdaa_bin,
                config_path=config_path,
                baseline_path=baseline_path,
                diff_output=diff_output,
            )

            mock_run.assert_called_once()
            cmd = mock_run.call_args[0][0]
            assert str(mdaa_bin) in cmd
            assert "diff" in cmd
            assert "-c" in cmd
            assert "--baseline" in cmd
            assert "--diff-out" in cmd

    def test_passes_domain_and_module_flags(self, tmp_path):
        config_path = tmp_path / "configs"
        config_path.mkdir()
        diff_output = tmp_path / "diff-output"

        mock_result = MagicMock()
        mock_result.returncode = 0
        mock_result.stdout = ""

        with patch(self.patch_target, return_value=mock_result) as mock_run:
            run_diff(
                mdaa_bin=Path("/bin/mdaa"),
                config_path=config_path,
                baseline_path=tmp_path / "baselines",
                diff_output=diff_output,
                domain="analytics",
                module="glue-jobs",
            )

            cmd = mock_run.call_args[0][0]
            assert "-d" in cmd
            assert "analytics" in cmd
            assert "-m" in cmd
            assert "glue-jobs" in cmd

    def test_raises_on_nonzero_exit(self, tmp_path):
        config_path = tmp_path / "configs"
        config_path.mkdir()
        diff_output = tmp_path / "diff-output"

        mock_result = MagicMock()
        mock_result.returncode = 1
        mock_result.stdout = "synth output"

        with patch(self.patch_target, return_value=mock_result):
            with pytest.raises(DiffError, match="exit code 1"):
                run_diff(
                    mdaa_bin=Path("/bin/mdaa"),
                    config_path=config_path,
                    baseline_path=tmp_path / "baselines",
                    diff_output=diff_output,
                )

        assert (diff_output / "diff_stderr.log").read_text() == "synth output"

    def test_writes_stdout_log_on_success(self, tmp_path):
        config_path = tmp_path / "configs"
        config_path.mkdir()
        diff_output = tmp_path / "diff-output"

        mock_result = MagicMock()
        mock_result.returncode = 0
        mock_result.stdout = "synth output"

        with patch(self.patch_target, return_value=mock_result):
            run_diff(
                mdaa_bin=Path("/bin/mdaa"),
                config_path=config_path,
                baseline_path=tmp_path / "baselines",
                diff_output=diff_output,
            )

        assert (diff_output / "diff_stderr.log").read_text() == "synth output"


class TestFindDiffFiles:
    def test_finds_nested_diff_files(self, tmp_path):
        (tmp_path / "org/domain/env/mod-a").mkdir(parents=True)
        (tmp_path / "org/domain/env/mod-b").mkdir(parents=True)
        (tmp_path / "org/domain/env/mod-a/diff.txt").write_text("diff a")
        (tmp_path / "org/domain/env/mod-b/diff.txt").write_text("diff b")

        files = find_diff_files(tmp_path)
        assert len(files) == 2
        names = [f.parent.name for f in files]
        assert "mod-a" in names
        assert "mod-b" in names

    def test_returns_empty_when_no_diffs(self, tmp_path):
        assert find_diff_files(tmp_path) == []
