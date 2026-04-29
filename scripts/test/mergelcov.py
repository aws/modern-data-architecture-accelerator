# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""Merge per-package lcov.info files into a single report for SonarQube.

Jest produces a coverage/lcov.info inside each package directory with
paths relative to the package root (e.g. SF:lib/foo.ts). SonarQube
needs a single file with paths relative to the repository root. This
script finds every lcov.info under the repo, rewrites the SF: entries
to use repo-relative paths, and writes the merged result to
./coverage/merged_lcov.info.
"""

import os
import re
from pathlib import Path

MERGED_OUTPUT_FILE = Path("./coverage/merged_lcov.info")

# lcov SF: lines produced by Jest use paths relative to the package
# root, e.g. "SF:lib/some-file.ts". We need to prepend the package
# directory so SonarQube can resolve them from the repo root.
SF_PATTERN = re.compile(r"^SF:(.*)$", re.MULTILINE)


def _repo_root() -> Path:
    """Return the repository root (three levels up from this script)."""
    # scripts/test/mergelcov.py -> scripts/test -> scripts -> repo root
    return Path(__file__).resolve().parent.parent.parent


def _rewrite_sf_paths(lcov_text: str, package_dir: str) -> str:
    """Prefix SF: entries with the package directory so paths are repo-relative."""
    return SF_PATTERN.sub(lambda m: f"SF:{package_dir}/{m.group(1)}", lcov_text)


def merge_lcov_files(root: Path, output: Path) -> None:
    """Find all lcov.info files under *root*, merge into *output*."""
    lcov_files = sorted(root.rglob("lcov.info"))

    # Exclude files inside .nx/cache — those are Nx build cache
    # artifacts and may contain stale or duplicate coverage data.
    lcov_files = [p for p in lcov_files if ".nx" not in p.parts]

    output.parent.mkdir(parents=True, exist_ok=True)

    merged_count = 0
    with open(output, "w", encoding="utf-8") as outfile:
        for lcov_path in lcov_files:
            if lcov_path.stat().st_size == 0:
                continue

            # Derive the package directory from the lcov path.
            # Structure: <repo>/<package-path>/coverage/lcov.info
            # We want <package-path>.
            package_dir = str(lcov_path.parent.parent.relative_to(root))

            content = lcov_path.read_text(encoding="utf-8")
            rewritten = _rewrite_sf_paths(content, package_dir)

            outfile.write(rewritten)
            if not rewritten.endswith("\n"):
                outfile.write("\n")
            merged_count += 1

    print(f"Merged {merged_count} lcov.info file(s) into {output}")


if __name__ == "__main__":
    repo = _repo_root()
    print(f"Searching for lcov.info files under: {repo}")
    merge_lcov_files(repo, MERGED_OUTPUT_FILE)
