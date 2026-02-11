#!/bin/bash
# ============================================================================
# validate_packages.sh
#
# Validates that all workspace packages have canonical scripts and configs.
#
#   Property 1: "test" script is canonical
#   Property 2: "test:coverage" script is canonical
#   Property 3: "test:snapshots" script is canonical
#   Property 4: "test:snapshots:update" script is canonical
#   Property 5: "lint" script is in canonical format
#   Property 6: JSII packages have canonical build/watch/package scripts
#   Property 7: Coverage threshold in jest configs
#     - If config imports a base via require(), resolve and load effective config
#       - Original file must NOT define coverageThreshold (should come from base)
#       - Effective (merged) config must have coverageThreshold with branches + statements
#     - Standalone configs must have coverageThreshold with branches + statements
#
# Usage: ./scripts/validate_packages.sh
# Exit code: 0 if all packages pass, 1 if any deviations found
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR/.."

CANONICAL_TEST="jest --passWithNoTests --testPathIgnorePatterns='.*\\.snapshot\\.test\\.ts'"
CANONICAL_COVERAGE="jest --passWithNoTests --coverage --testPathIgnorePatterns='.*\\.snapshot\\.test\\.ts'"
CANONICAL_SNAPSHOT="jest --passWithNoTests --testPathPattern='.*\\.snapshot\\.test\\.ts'"
CANONICAL_SNAPSHOT_UPDATE="jest --passWithNoTests --testPathPattern='.*\\.snapshot\\.test\\.ts' --updateSnapshot"

CANONICAL_JSII_BUILD="export JSII_SILENCE_WARNING_UNTESTED_NODE_VERSION=1 && jsii --project-references"
CANONICAL_JSII_WATCH="jsii -w  --project-references"
CANONICAL_JSII_PACKAGE="jsii-pacmak --npmignore=false"

ERRORS=0
CHECKED=0

discover_packages() {
  node -e "
    const fs = require('fs');
    const cp = require('child_process');
    const root = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    for (const ws of root.workspaces || []) {
      const dirs = cp.execSync('ls -d ' + ws + ' 2>/dev/null || true', { encoding: 'utf8' })
        .trim().split('\n').filter(Boolean);
      dirs.forEach(d => console.log(d));
    }
  "
}

read_script() {
  local pkg_json="$1"
  local script_name="$2"
  node -e "
    const pkg = require('./${pkg_json}');
    const val = (pkg.scripts || {})['${script_name}'];
    if (val !== undefined) process.stdout.write(val);
    else process.stdout.write('__MISSING__');
  "
}

fail() {
  local pkg="$1"
  local msg="$2"
  echo "  FAIL [$pkg]: $msg"
  ERRORS=$((ERRORS + 1))
}

is_jsii_package() {
  local pkg_json="$1"
  node -e "
    const pkg = require('./${pkg_json}');
    process.exit(pkg.jsii ? 0 : 1);
  "
}

cd "$PROJECT_ROOT"

echo "Verifying package consistency..."
echo ""

for pkg_dir in $(discover_packages); do
  pkg_json="${pkg_dir}/package.json"

  if [ ! -f "$pkg_json" ]; then
    continue
  fi

  test_val=$(read_script "$pkg_json" "test")
  if [ "$test_val" = "__MISSING__" ]; then
    continue
  fi

  CHECKED=$((CHECKED + 1))

  # Property 1: test script
  if [ "$test_val" != "$CANONICAL_TEST" ]; then
    fail "$pkg_dir" "Property 1 - test script is not canonical. Got: '$test_val'"
  fi

  # Property 2: test:coverage script
  coverage_val=$(read_script "$pkg_json" "test:coverage")
  if [ "$coverage_val" = "__MISSING__" ]; then
    fail "$pkg_dir" "Property 2 - test:coverage script is missing"
  elif [ "$coverage_val" != "$CANONICAL_COVERAGE" ]; then
    fail "$pkg_dir" "Property 2 - test:coverage script is not canonical. Got: '$coverage_val'"
  fi

  # Property 3: test:snapshots script
  snapshot_val=$(read_script "$pkg_json" "test:snapshots")
  if [ "$snapshot_val" = "__MISSING__" ]; then
    fail "$pkg_dir" "Property 3 - test:snapshots script is missing"
  elif [ "$snapshot_val" != "$CANONICAL_SNAPSHOT" ]; then
    fail "$pkg_dir" "Property 3 - test:snapshots script is not canonical. Got: '$snapshot_val'"
  fi

  # Property 4: test:snapshots:update script
  snapshot_update_val=$(read_script "$pkg_json" "test:snapshots:update")
  if [ "$snapshot_update_val" = "__MISSING__" ]; then
    fail "$pkg_dir" "Property 4 - test:snapshots:update script is missing"
  elif [ "$snapshot_update_val" != "$CANONICAL_SNAPSHOT_UPDATE" ]; then
    fail "$pkg_dir" "Property 4 - test:snapshots:update script is not canonical. Got: '$snapshot_update_val'"
  fi

  # Property 5: lint script in canonical format
  lint_val=$(read_script "$pkg_json" "lint")
  if [ "$lint_val" = "__MISSING__" ]; then
    fail "$pkg_dir" "Property 5 - lint script is missing"
  elif ! echo "$lint_val" | grep -qE '^eslint --max-warnings 0 -c (\.\./)+eslint\.config\.mjs$'; then
    fail "$pkg_dir" "Property 5 - lint script is not canonical. Got: '$lint_val'"
  fi

  # Property 6: JSII packages have canonical build/watch/package scripts
  # Skip mdaa-testing — it has a jsii section but intentionally uses tsc
  if is_jsii_package "$pkg_json" && [ "$pkg_dir" != "packages/utilities/mdaa-testing" ]; then
    build_val=$(read_script "$pkg_json" "build")
    if [ "$build_val" != "$CANONICAL_JSII_BUILD" ]; then
      fail "$pkg_dir" "Property 6 - JSII build script is not canonical. Got: '$build_val'"
    fi

    watch_val=$(read_script "$pkg_json" "watch")
    if [ "$watch_val" != "$CANONICAL_JSII_WATCH" ]; then
      fail "$pkg_dir" "Property 6 - JSII watch script is not canonical. Got: '$watch_val'"
    fi

    package_val=$(read_script "$pkg_json" "package")
    if [ "$package_val" = "__MISSING__" ]; then
      fail "$pkg_dir" "Property 6 - JSII package script is missing"
    elif [ "$package_val" != "$CANONICAL_JSII_PACKAGE" ]; then
      fail "$pkg_dir" "Property 6 - JSII package script is not canonical. Got: '$package_val'"
    fi
  fi

  # Property 7: Coverage threshold in jest.config.js
  jest_config="${pkg_dir}/jest.config.js"
  if [ -f "$jest_config" ]; then
    if grep -q 'require(' "$jest_config"; then
      # Imports a base config — must NOT define coverageThreshold locally
      if grep -q 'coverageThreshold' "$jest_config"; then
        fail "$pkg_dir" "Property 7 - jest.config.js imports base config but also defines coverageThreshold locally"
      fi
      # Load effective (merged) config via node and check thresholds
      effective_check=$(node -e "
        const c = require('./${jest_config}');
        const t = c.coverageThreshold && c.coverageThreshold.global;
        if (!t) { console.log('NO_THRESHOLD'); }
        else {
          if (t.statements === undefined) console.log('NO_STATEMENTS');
          if (t.branches === undefined) console.log('NO_BRANCHES');
        }
      " 2>&1) || true
      if echo "$effective_check" | grep -q 'NO_THRESHOLD'; then
        fail "$pkg_dir" "Property 7 - effective jest config (after import) has no coverageThreshold"
      else
        if echo "$effective_check" | grep -q 'NO_STATEMENTS'; then
          fail "$pkg_dir" "Property 7 - effective jest config (after import) missing statements threshold"
        fi
        if echo "$effective_check" | grep -q 'NO_BRANCHES'; then
          fail "$pkg_dir" "Property 7 - effective jest config (after import) missing branches threshold"
        fi
      fi
    else
      # Standalone config — must have coverageThreshold
      if ! grep -q 'coverageThreshold' "$jest_config"; then
        fail "$pkg_dir" "Property 7 - coverageThreshold is missing from jest.config.js"
      fi
      if ! grep -q 'statements' "$jest_config"; then
        fail "$pkg_dir" "Property 7 - statements threshold is missing from jest.config.js"
      fi
      if ! grep -q 'branches' "$jest_config"; then
        fail "$pkg_dir" "Property 7 - branches threshold is missing from jest.config.js"
      fi
    fi
  fi
done

echo ""
echo "Checked $CHECKED packages, found $ERRORS error(s)."

if [ "$ERRORS" -gt 0 ]; then
  echo "VERIFICATION FAILED"
  exit 1
else
  echo "ALL CHECKS PASSED"
  exit 0
fi
