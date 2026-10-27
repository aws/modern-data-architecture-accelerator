#!/bin/bash
set -euo pipefail

# Builds and tests installer/ from a strict `npm ci`. installer/ is outside the npm workspaces
# and the nx graph, so the repo-level build/test scripts never touch it. Shared by the
# feature_merge_installer_test MR job and validate_release_commit.sh.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/../../installer"

# Suppress WASI experimental warnings (matches npm_install_repo.sh)
export NODE_NO_WARNINGS=1

npm ci
npm run build
npm test
