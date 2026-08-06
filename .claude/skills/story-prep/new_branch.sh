#!/bin/bash
# ============================================================================
# new_branch.sh
#
# Creates a conventionally-named branch off an up-to-date base and pushes it
# to the remote with upstream tracking.
#
# Used by the story-prep skill (see SKILL.md, Phase 4), and safe to run
# directly. Runnable from any directory — paths resolve from the script's own
# location, not the working directory.
#
# Usage:
#   .claude/skills/story-prep/new_branch.sh <branch-name> [base-branch] [remote]
#
# Branch name must match: ^(feat/|chore/|spike/|fix/)[a-z0-9]+(-[a-z0-9]+)*$
# Base branch defaults to 'main'; remote defaults to 'origin'.
# ============================================================================

set -eo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/../../.."
cd "$PROJECT_ROOT"

usage() {
    echo "Usage: $0 <branch-name> [base-branch] [remote]" >&2
    echo "Branch name must start with 'feat/' or 'fix/' or 'chore/' or 'spike/' followed by lowercase letters, numbers, or hyphens." >&2
    echo "Base branch defaults to 'main' if not specified. Remote defaults to 'origin'." >&2
    echo "Example: $0 feat/user-authentication" >&2
    echo "Example: $0 fix/login-bug" >&2
    echo "Example: $0 feat/new-feature develop" >&2
    exit 1
}

if [ $# -eq 0 ]; then
    echo "Error: No branch name provided." >&2
    usage
fi

new_branch_name=$1
base_branch=${2:-main}
remote=${3:-origin}

# Validate before any git side effects, so a typo costs nothing.
if ! [[ $new_branch_name =~ ^(feat/|chore/|spike/|fix/)[a-z0-9]+(-[a-z0-9]+)*$ ]]; then
    echo "Error: Invalid branch name format: '$new_branch_name'" >&2
    usage
fi

if git show-ref --verify --quiet "refs/heads/$new_branch_name"; then
    echo "Error: Branch '$new_branch_name' already exists locally." >&2
    echo "Check it out instead: git checkout $new_branch_name" >&2
    exit 1
fi

# A dirty tree would be carried onto the new branch, mixing unrelated work in.
if [ -n "$(git status --porcelain)" ]; then
    echo "Error: Working tree is not clean. Commit or stash first." >&2
    git status --short >&2
    exit 1
fi

git fetch "$remote"

echo "Creating new branch: $new_branch_name from base: $base_branch"

git checkout "$base_branch"

# --ff-only: refuse rather than silently create a merge commit on the base
# branch when it has diverged from the remote. A diverged local base is resolved
# deliberately (see SKILL.md Phase 2), never as a side effect here.
if ! git merge --ff-only "$remote/$base_branch"; then
    echo "Error: '$base_branch' has diverged from '$remote/$base_branch' and cannot fast-forward." >&2
    echo "Resolve that first, then re-run. Local-only commits on $base_branch:" >&2
    git log --oneline "$remote/$base_branch..$base_branch" >&2
    exit 1
fi

git checkout -b "$new_branch_name"
git push -u "$remote" "$new_branch_name"
