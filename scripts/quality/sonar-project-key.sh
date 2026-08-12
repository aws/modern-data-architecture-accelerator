#!/bin/bash
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
#
# Computes the SonarQube project key for the current pipeline context.
#
# This file is SOURCED (not executed) by sonarqube.sh and
# sonarqube-target-baseline.sh so both derive an identical project key.
# Keeping the derivation in one place prevents the baseline scan and the
# MR scan from drifting onto different keys.
#
# SonarQube Community Build supports a single branch per project, so MR
# pipelines use a dedicated project key to avoid clobbering the main-branch
# baseline. The key embeds:
#   - the MR source branch -> isolates each MR
#   - the MR target branch -> retargeting an MR rebaselines
#   - the fork point SHA   -> the branch REBASING rebaselines
#
# The key must name the commit the baseline is anchored to, which is the fork
# point (see sonarqube-target-baseline.sh). Keying on the target branch HEAD
# instead looks equivalent but is not: the two commits differ whenever the
# branch is not rebased onto the latest target. A branch cut at an older
# target commit is keyed by the current target HEAD, so the baseline gets
# recorded at the older fork point under a key naming the newer commit. When
# the branch is later rebased, the key does not change, the baseline scan
# exits early ("project exists"), and the stale period start survives — so
# every commit that landed on the target in between is misclassified as this
# MR's new code. Keying on the fork point ties the key to what it names.
#
# Sets the following variables for the caller:
#   SONAR_BASE_PROJECT_KEY - base key (project path slug or override)
#   SONAR_IS_MR            - "true" in an MR pipeline, otherwise "false"
#   SONAR_TARGET_REF       - target branch ref, e.g. origin/main (MR only)
#   SONAR_TARGET_SHA       - resolved target branch HEAD SHA (MR only)
#   SONAR_FORK_POINT       - commit the baseline anchors to, "" if none (MR only)
#   SONAR_BASELINE_DATE    - sonar.projectDate for the baseline (MR only)
#   SONAR_PROJECT_KEY      - the project key to pass to sonar-scanner
#
# Environment variables (provided by GitLab CI):
#   SONAR_PROJECT_KEY                   - (optional) base key override
#   CI_PROJECT_PATH_SLUG                - default base key
#   CI_PIPELINE_SOURCE                  - pipeline trigger type
#   CI_MERGE_REQUEST_IID                - MR identifier
#   CI_MERGE_REQUEST_SOURCE_BRANCH_NAME - MR source branch
#   CI_MERGE_REQUEST_TARGET_BRANCH_NAME - MR target branch (defaults to main)

# Number of leading hex characters of the fork point SHA folded into the
# MR project key. Long enough to be collision-free in practice, short
# enough to keep the key readable.
SONAR_KEY_SHA_LEN=12

# Key derivation version. Bump this whenever the meaning of the key changes.
# Projects are looked up by key string, so a project recorded under a previous
# derivation would be reused as a baseline even though it was anchored to a
# different commit — silently suppressing the re-baseline the change exists to
# force. v2: anchor the key on the fork point instead of the target HEAD.
SONAR_KEY_VERSION=v2

# Default target branch when CI does not provide one (e.g. local runs).
SONAR_DEFAULT_TARGET_BRANCH=main

# Sanitize an arbitrary string for use inside a SonarQube project key.
# SonarQube keys allow alphanumerics, hyphens, underscores, periods, and
# colons; everything else is replaced with an underscore.
_sonar_sanitize() {
  echo "$1" | sed 's/[^a-zA-Z0-9._:-]/_/g'
}

SONAR_BASE_PROJECT_KEY=${SONAR_PROJECT_KEY:-${CI_PROJECT_PATH_SLUG}}

if [ "${CI_PIPELINE_SOURCE}" = "merge_request_event" ] || [ -n "${CI_MERGE_REQUEST_IID}" ]; then
  SONAR_IS_MR=true

  SONAR_TARGET_REF="origin/${CI_MERGE_REQUEST_TARGET_BRANCH_NAME:-${SONAR_DEFAULT_TARGET_BRANCH}}"

  # Resolve the current target branch HEAD. CI_MERGE_REQUEST_TARGET_BRANCH_SHA
  # is empty in detached MR pipelines, so resolve via the remote ref instead.
  SONAR_TARGET_SHA=$(git rev-parse "${SONAR_TARGET_REF}")

  # Resolve the fork point: the parent of the oldest commit unique to this
  # branch. Commits reachable from the target (including any target commits
  # merged back into this branch) are excluded by "${SONAR_TARGET_REF}..HEAD",
  # so the oldest remaining commit is the branch's first commit and its parent
  # is the divergence point.
  #
  # Left empty when there is nothing to anchor to: a branch with no unique
  # commits, or one whose oldest unique commit is a root commit (orphan branch
  # / unrelated-history MR) with no parent. Callers skip both cases. This file
  # is sourced, so it reports the condition rather than exiting the caller.
  SONAR_FORK_POINT=""
  SONAR_BASELINE_DATE=""
  _sonar_first_mr_commit=$(git rev-list --topo-order --reverse "${SONAR_TARGET_REF}..HEAD" | head -1)
  if [ -n "${_sonar_first_mr_commit}" ]; then
    SONAR_FORK_POINT=$(git rev-parse --verify --quiet "${_sonar_first_mr_commit}^") || SONAR_FORK_POINT=""
  fi

  if [ -n "${SONAR_FORK_POINT}" ]; then
    # Committer date (not author date): rebases rewrite committer dates to the
    # rebase time, so every MR commit sorts strictly after this anchor. Format
    # as yyyy-MM-dd'T'HH:mm:ssZ with a numeric offset and NO colon (e.g.
    # 2026-06-26T18:54:51+0000) — sonar.projectDate rejects the ISO-8601 colon
    # offset (+00:00) that `%cI` produces.
    SONAR_BASELINE_DATE=$(git show -s --date=format:'%Y-%m-%dT%H:%M:%S%z' --format=%cd "${SONAR_FORK_POINT}")
    _sonar_key_sha=${SONAR_FORK_POINT}
  else
    # Nothing to anchor to. Fall back to the target HEAD so the key stays
    # well-formed for the log lines callers print before they skip.
    _sonar_key_sha=${SONAR_TARGET_SHA}
  fi

  _sonar_sanitized_branch=$(_sonar_sanitize "${CI_MERGE_REQUEST_SOURCE_BRANCH_NAME}")
  _sonar_sanitized_target=$(_sonar_sanitize "${CI_MERGE_REQUEST_TARGET_BRANCH_NAME:-${SONAR_DEFAULT_TARGET_BRANCH}}")

  SONAR_PROJECT_KEY="${SONAR_BASE_PROJECT_KEY}-mr-${_sonar_sanitized_branch}-to-${_sonar_sanitized_target}-${SONAR_KEY_VERSION}-${_sonar_key_sha:0:${SONAR_KEY_SHA_LEN}}"
else
  SONAR_IS_MR=false
  SONAR_TARGET_REF=""
  SONAR_TARGET_SHA=""
  SONAR_FORK_POINT=""
  SONAR_BASELINE_DATE=""
  SONAR_PROJECT_KEY="${SONAR_BASE_PROJECT_KEY}"
fi
