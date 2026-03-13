# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""Tests for git operations."""

from unittest.mock import MagicMock, patch

import pytest

from change_risk_assessor.git import (
    GitError,
    clone_repo,
    get_head_hash,
    get_main_branch_hash,
    resolve_config_repo,
)

FAKE_HASH = "abc123def456abc123def456abc123def456abc1"


class TestGetMainBranchHash:
    def test_returns_hash_on_success(self):
        mock_result = MagicMock()
        mock_result.returncode = 0
        mock_result.stdout = f"{FAKE_HASH}\trefs/heads/main\n"

        with patch("change_risk_assessor.git.subprocess.run",
                   return_value=mock_result):
            h = get_main_branch_hash("https://example.com/repo.git")
            assert h == FAKE_HASH

    def test_raises_on_failure(self):
        mock_result = MagicMock()
        mock_result.returncode = 128
        mock_result.stdout = ""

        with patch("change_risk_assessor.git.subprocess.run",
                   return_value=mock_result):
            with pytest.raises(GitError, match="Failed to resolve"):
                get_main_branch_hash("https://example.com/repo.git")

    def test_raises_on_empty_output(self):
        mock_result = MagicMock()
        mock_result.returncode = 0
        mock_result.stdout = ""

        with patch("change_risk_assessor.git.subprocess.run",
                   return_value=mock_result):
            with pytest.raises(GitError, match="Failed to resolve"):
                get_main_branch_hash("https://example.com/repo.git")


class TestGetHeadHash:
    def test_returns_hash(self, tmp_path):
        mock_result = MagicMock()
        mock_result.returncode = 0
        mock_result.stdout = f"{FAKE_HASH}\n"

        with patch("change_risk_assessor.git.subprocess.run",
                   return_value=mock_result):
            assert get_head_hash(tmp_path) == FAKE_HASH

    def test_raises_on_failure(self, tmp_path):
        mock_result = MagicMock()
        mock_result.returncode = 128
        mock_result.stderr = "not a git repo"

        with patch("change_risk_assessor.git.subprocess.run",
                   return_value=mock_result):
            with pytest.raises(GitError, match="Failed to get HEAD"):
                get_head_hash(tmp_path)


class TestCloneRepo:
    def test_clones_and_returns_hash(self, tmp_path):
        dest = tmp_path / "cloned"
        clone_result = MagicMock(returncode=0, stderr="")
        hash_result = MagicMock(returncode=0, stdout=f"{FAKE_HASH}\n")

        with patch("change_risk_assessor.git.subprocess.run",
                   side_effect=[clone_result, hash_result]):
            h = clone_repo(repo_url="https://example.com/r.git", dest=dest)
            assert h == FAKE_HASH

    def test_raises_on_clone_failure(self, tmp_path):
        dest = tmp_path / "cloned"
        mock_result = MagicMock(returncode=128, stderr="auth failed")

        with patch("change_risk_assessor.git.subprocess.run",
                   return_value=mock_result):
            with pytest.raises(GitError, match="Failed to clone"):
                clone_repo(repo_url="https://example.com/r.git", dest=dest)


class TestResolveConfigRepo:
    def test_clones_git_url(self, tmp_path):
        clone_result = MagicMock(returncode=0, stderr="")
        hash_result = MagicMock(returncode=0, stdout=f"{FAKE_HASH}\n")

        with patch("change_risk_assessor.git.subprocess.run",
                   side_effect=[clone_result, hash_result]):
            resolved = resolve_config_repo(
                repo="https://example.com/mdaa-testing.git",
                work_dir=tmp_path,
            )
            assert resolved.name == "mdaa-testing"
            assert resolved.commit_hash == FAKE_HASH

    def test_clones_ssh_url(self, tmp_path):
        clone_result = MagicMock(returncode=0, stderr="")
        hash_result = MagicMock(returncode=0, stdout=f"{FAKE_HASH}\n")

        with patch("change_risk_assessor.git.subprocess.run",
                   side_effect=[clone_result, hash_result]):
            resolved = resolve_config_repo(
                repo="git@gitlab.example.com:team/configs.git",
                work_dir=tmp_path,
            )
            assert resolved.name == "configs"

    def test_uses_local_path(self, tmp_path):
        local_dir = tmp_path / "my-configs"
        local_dir.mkdir()
        hash_result = MagicMock(returncode=0, stdout=f"{FAKE_HASH}\n")

        with patch("change_risk_assessor.git.subprocess.run",
                   return_value=hash_result):
            resolved = resolve_config_repo(
                repo=str(local_dir), work_dir=tmp_path,
            )
            assert resolved.local_path == local_dir
            assert resolved.name == "my-configs"
            assert resolved.commit_hash == FAKE_HASH

    def test_local_path_not_git_falls_back(self, tmp_path):
        local_dir = tmp_path / "plain-dir"
        local_dir.mkdir()
        mock_result = MagicMock(returncode=128, stderr="not a git repo")

        with patch("change_risk_assessor.git.subprocess.run",
                   return_value=mock_result):
            resolved = resolve_config_repo(
                repo=str(local_dir), work_dir=tmp_path,
            )
            assert resolved.commit_hash == "local"

    def test_raises_on_missing_local_path(self, tmp_path):
        with pytest.raises(GitError, match="does not exist"):
            resolve_config_repo(
                repo="/nonexistent/path", work_dir=tmp_path,
            )
