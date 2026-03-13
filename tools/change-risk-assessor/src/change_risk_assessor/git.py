# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""Git operations: clone repos, resolve commit hashes."""

from __future__ import annotations

import logging
import subprocess
from dataclasses import dataclass
from pathlib import Path

from change_risk_assessor.config import GIT_CLONE_TIMEOUT, GIT_TIMEOUT

logger = logging.getLogger(__name__)


class GitError(Exception):
    """Raised when a git operation fails."""


def get_main_branch_hash(repo_url: str) -> str:
    """Get the commit hash of the main branch via ``git ls-remote``."""
    result = subprocess.run(
        ["git", "ls-remote", repo_url, "refs/heads/main"],
        capture_output=True, text=True, timeout=GIT_TIMEOUT,
    )
    if result.returncode != 0 or not result.stdout.strip():
        raise GitError(
            f"Failed to resolve main branch commit hash from {repo_url}"
        )
    return result.stdout.split()[0]


def clone_repo(
    *,
    repo_url: str,
    dest: Path,
    branch: str = "main",
    depth: int = 1,
) -> str:
    """Clone a git repo and return the HEAD commit hash."""
    logger.info("Cloning %s (branch: %s)", repo_url, branch)
    result = subprocess.run(
        ["git", "clone", "--depth", str(depth), "--branch", branch,
         repo_url, str(dest)],
        capture_output=True, text=True, timeout=GIT_CLONE_TIMEOUT,
    )
    if result.returncode != 0:
        raise GitError(f"Failed to clone {repo_url}: {result.stderr}")

    commit_hash = get_head_hash(dest)
    logger.info("Cloned at commit: %s", commit_hash)
    return commit_hash


def get_head_hash(repo_path: Path) -> str:
    """Get the HEAD commit hash of a local repo."""
    result = subprocess.run(
        ["git", "-C", str(repo_path), "rev-parse", "HEAD"],
        capture_output=True, text=True, timeout=GIT_TIMEOUT,
    )
    if result.returncode != 0:
        raise GitError(
            f"Failed to get HEAD hash for {repo_path}: {result.stderr}"
        )
    return result.stdout.strip()


@dataclass(frozen=True)
class ResolvedRepo:
    """A resolved config repo with its local path and identity."""

    local_path: Path
    name: str
    commit_hash: str


def resolve_config_repo(
    *,
    repo: str,
    work_dir: Path,
) -> ResolvedRepo:
    """Resolve a config repo: clone if URL, use directly if local path.

    Returns a ``ResolvedRepo`` with the local path, repo name, and commit hash.
    """
    if repo.startswith("https://") or repo.startswith("git@"):
        name = Path(repo).stem  # strips .git
        clone_dir = work_dir / "config_clones" / name
        commit_hash = clone_repo(repo_url=repo, dest=clone_dir)
        return ResolvedRepo(local_path=clone_dir, name=name, commit_hash=commit_hash)

    local_path = Path(repo)
    if not local_path.is_dir():
        raise GitError(f"Config repo path does not exist: {repo}")

    name = local_path.name
    try:
        commit_hash = get_head_hash(local_path)
    except GitError:
        commit_hash = "local"

    return ResolvedRepo(local_path=local_path, name=name, commit_hash=commit_hash)
