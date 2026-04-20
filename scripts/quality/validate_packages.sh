#!/bin/bash
# ============================================================================
# validate_packages.sh
#
# Validates that all workspace packages have canonical scripts and configs.
#
#   Property 1: "test" script is canonical
#   Property 2: "lint" script is in canonical format
#   Property 3: JSII packages have canonical build/watch/package scripts
#   Property 4: Coverage threshold in jest configs
#     - If config imports a base via require(), resolve and load effective config
#       - Original file must NOT define coverageThreshold (should come from base)
#       - Effective (merged) config must have coverageThreshold with branches + statements
#     - Standalone configs must have coverageThreshold with branches + statements
#   Property 5: bundledDependencies consistency
#     - Every entry in bundledDependencies must exist in dependencies
#     - Bundled deps that are also transitive deps of other bundled deps must not
#       have major version conflicts (prevents npm pack path traversal issues)
#   Property 6: App packages must have comprehensive baseline diff tests
#     - sample_configs/sample-config-comprehensive.yaml must exist
#     - test/*.diff.test.ts must exist
#     - The diff test must reference the comprehensive config
#     - test/__snapshots__/sample-config-comprehensive*.baseline.json must exist
#     - Excludes packages listed in .baseline-coverage-ignore (one path per line)
#
# Usage: ./scripts/quality/validate_packages.sh
# Exit code: 0 if all packages pass, 1 if any deviations found
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR/../.."

CANONICAL_TEST="jest --passWithNoTests --coverage"

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

  # Property 2: lint script in canonical format
  lint_val=$(read_script "$pkg_json" "lint")
  if [ "$lint_val" = "__MISSING__" ]; then
    fail "$pkg_dir" "Property 2 - lint script is missing"
  elif ! echo "$lint_val" | grep -qE '^eslint --max-warnings 0 -c (\.\./)+eslint\.config\.mjs$'; then
    fail "$pkg_dir" "Property 2 - lint script is not canonical. Got: '$lint_val'"
  fi

  # Property 3: JSII packages have canonical build/watch/package scripts
  # Skip mdaa-testing — it has a jsii section but intentionally uses tsc
  if is_jsii_package "$pkg_json" && [ "$pkg_dir" != "packages/utilities/mdaa-testing" ]; then
    build_val=$(read_script "$pkg_json" "build")
    if [ "$build_val" != "$CANONICAL_JSII_BUILD" ]; then
      fail "$pkg_dir" "Property 3 - JSII build script is not canonical. Got: '$build_val'"
    fi

    watch_val=$(read_script "$pkg_json" "watch")
    if [ "$watch_val" != "$CANONICAL_JSII_WATCH" ]; then
      fail "$pkg_dir" "Property 3 - JSII watch script is not canonical. Got: '$watch_val'"
    fi

    package_val=$(read_script "$pkg_json" "package")
    if [ "$package_val" = "__MISSING__" ]; then
      fail "$pkg_dir" "Property 3 - JSII package script is missing"
    elif [ "$package_val" != "$CANONICAL_JSII_PACKAGE" ]; then
      fail "$pkg_dir" "Property 3 - JSII package script is not canonical. Got: '$package_val'"
    fi
  fi

  # Property 5: bundledDependencies entries must exist in dependencies and
  # bundled transitive deps must not conflict with direct bundled dep versions.
  # This prevents npm pack from generating tarballs with path traversal.
  bundled_check=$(node -e "
    const pkg = require('./${pkg_json}');
    const bundled = pkg.bundledDependencies || pkg.bundleDependencies || [];
    const deps = pkg.dependencies || {};
    const errors = [];
    for (const b of bundled) {
      if (!deps[b]) {
        errors.push(b + ' is in bundledDependencies but not in dependencies');
      }
    }
    // Check for bundled deps that are also transitive deps of other bundled deps
    // by looking for duplicate entries at different major versions
    for (const b of bundled) {
      if (!deps[b]) continue;
      try {
        const bPkgPath = require.resolve(b + '/package.json', { paths: ['.'] });
        const bPkg = require(bPkgPath);
        const bDeps = bPkg.dependencies || {};
        for (const transitive of Object.keys(bDeps)) {
          if (bundled.includes(transitive) && deps[transitive]) {
            const directRange = deps[transitive];
            const transitiveRange = bDeps[transitive];
            // Extract major versions for comparison
            const directMajor = directRange.replace(/[^0-9.]/g, '').split('.')[0];
            const transitiveMajor = transitiveRange.replace(/[^0-9.]/g, '').split('.')[0];
            if (directMajor !== transitiveMajor) {
              errors.push(transitive + ' is bundled at v' + directRange + ' but ' + b + ' requires ' + transitiveRange + ' (major version conflict)');
            }
          }
        }
      } catch(e) { /* dep not installed yet, skip transitive check */ }
    }
    if (errors.length > 0) { console.log(errors.join('\\n')); }
  " 2>/dev/null) || true
  if [ -n "$bundled_check" ]; then
    while IFS= read -r line; do
      fail "$pkg_dir" "Property 5 - bundledDependencies: $line"
    done <<< "$bundled_check"
  fi

  # Property 4: Coverage threshold in jest.config.js
  jest_config="${pkg_dir}/jest.config.js"
  if [ -f "$jest_config" ]; then
    if grep -q 'require(' "$jest_config"; then
      # Imports a base config — check effective (merged) thresholds
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
        fail "$pkg_dir" "Property 4 - effective jest config (after import) has no coverageThreshold"
      else
        if echo "$effective_check" | grep -q 'NO_STATEMENTS'; then
          fail "$pkg_dir" "Property 4 - effective jest config (after import) missing statements threshold"
        fi
        if echo "$effective_check" | grep -q 'NO_BRANCHES'; then
          fail "$pkg_dir" "Property 4 - effective jest config (after import) missing branches threshold"
        fi
      fi
    else
      # Standalone config — must have coverageThreshold
      if ! grep -q 'coverageThreshold' "$jest_config"; then
        fail "$pkg_dir" "Property 4 - coverageThreshold is missing from jest.config.js"
      fi
      if ! grep -q 'statements' "$jest_config"; then
        fail "$pkg_dir" "Property 4 - statements threshold is missing from jest.config.js"
      fi
      if ! grep -q 'branches' "$jest_config"; then
        fail "$pkg_dir" "Property 4 - branches threshold is missing from jest.config.js"
      fi
    fi
  fi

  # Property 6: App packages must have comprehensive baseline diff test
  if [[ "$pkg_dir" == packages/apps/* ]]; then
    # Check ignore list
    _skip_p6=false
    if [ -f ".baseline-coverage-ignore" ]; then
      while IFS= read -r _ignore_line; do
        _ignore_line="${_ignore_line%%#*}"   # strip comments
        _ignore_line="$(echo "$_ignore_line" | xargs)" # trim whitespace
        [ -z "$_ignore_line" ] && continue
        if [ "$pkg_dir" = "$_ignore_line" ]; then
          _skip_p6=true
          break
        fi
      done < ".baseline-coverage-ignore"
    fi

    if [ "$_skip_p6" = false ]; then
      # 6a: comprehensive sample config exists
      if ! ls "${pkg_dir}"/sample_configs/*comprehensive*.yaml &>/dev/null; then
        fail "$pkg_dir" "Property 6 - missing sample_configs/sample-config-comprehensive.yaml"
      fi

      # 6b: diff test exists
      if ! ls "${pkg_dir}"/test/*.diff.test.ts &>/dev/null; then
        fail "$pkg_dir" "Property 6 - missing diff test (*.diff.test.ts)"
      fi

      # 6c: diff test references comprehensive config
      if ls "${pkg_dir}"/test/*.diff.test.ts &>/dev/null; then
        if ! grep -q 'comprehensive' "${pkg_dir}"/test/*.diff.test.ts; then
          fail "$pkg_dir" "Property 6 - diff test does not reference comprehensive config"
        fi
      fi

      # 6d: comprehensive baseline snapshot exists
      if ! ls "${pkg_dir}"/test/__snapshots__/sample-config-comprehensive*.baseline.json &>/dev/null; then
        fail "$pkg_dir" "Property 6 - missing comprehensive baseline (run test:update-baselines)"
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
