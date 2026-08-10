#!/usr/bin/env python3
"""
Starter Kit Test Runner — determines affected modules and runs targeted tests.

Run from the single @aws-mdaa/starter-kits package (starter_kits/). Iterates
every kit (each subdirectory of starter_kits/ with an mdaa.yaml) and, for each,
determines which tests need to run based on what changed:

  1. mdaa.yaml changed → CLI baseline test runs
  2. mdaa.yaml context values changed → module synth tests run for modules
     whose config files reference the changed context keys
  3. Module config file changed → that module's synth test runs
  4. Upstream module code changed (via nx affected) → synth tests for modules
     using that package run
  5. @aws-mdaa/cli changed (via nx affected) → CLI baseline test runs
  6. NX_RUN_ALL=true or UPDATE_BASELINES=true → run all tests for all kits

Each kit's diff test file lives at starter_kits/test/<kit>/<kit>.diff.test.ts.
Jest is invoked per affected kit, scoped to that kit's test file path (test
names like "shared/roles synth baseline" are not unique across kits, so a name
pattern alone is insufficient — the file path disambiguates).

Usage (from the starter_kits/ package directory):
  python3 ../scripts/test/test_starter_kit.py              # all kits
  python3 ../scripts/test/test_starter_kit.py --kit smus_data_mesh  # one kit
  python3 ../scripts/test/test_starter_kit.py --list-kits  # print kit names, one per line

The --kit selector lets CI run one job per kit (e.g. a dynamically generated
child pipeline); --list-kits is what the generator uses to enumerate them.

Environment:
  NX_RUN_ALL        - If "true", run all tests regardless of affected detection
  UPDATE_BASELINES  - If "true", passed through to Jest for baseline updates
  CI_MERGE_REQUEST_TARGET_BRANCH_NAME - Target branch for affected detection (CI)
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path


def get_repo_root() -> Path:
    """Get the repository root directory."""
    result = subprocess.run(
        ["git", "rev-parse", "--show-toplevel"],
        capture_output=True, text=True, check=True,
    )
    return Path(result.stdout.strip())


def get_nx_base() -> str:
    """Compute the nx affected base ref (merge-base with target branch)."""
    target = os.environ.get("CI_MERGE_REQUEST_TARGET_BRANCH_NAME")
    target_ref = f"origin/{target}" if target else "origin/main"
    result = subprocess.run(
        ["git", "merge-base", target_ref, "HEAD"],
        capture_output=True, text=True, check=True,
    )
    return result.stdout.strip()


def get_target_ref() -> str:
    """Git ref to compare against for file-level diff detection."""
    target = os.environ.get("CI_MERGE_REQUEST_TARGET_BRANCH_NAME")
    return f"origin/{target}" if target else "origin/main"


def get_changed_files() -> list[str]:
    """Get files changed between target ref and HEAD."""
    try:
        nx_base = get_nx_base()
        result = subprocess.run(
            ["git", "diff", "--name-only", nx_base],
            capture_output=True, text=True, check=True,
        )
        return [f.strip() for f in result.stdout.strip().split("\n") if f.strip()]
    except subprocess.CalledProcessError:
        return []


def get_file_diff(file_path: str) -> str:
    """Get the unified diff for a specific file."""
    try:
        nx_base = get_nx_base()
        result = subprocess.run(
            ["git", "diff", nx_base, "--", file_path],
            capture_output=True, text=True, check=True,
        )
        return result.stdout
    except subprocess.CalledProcessError:
        return ""


def parse_nx_projects(stdout: str) -> set[str]:
    """Extract @aws-mdaa package names from `nx show projects` output.

    nx emits a single-line JSON array (`["@aws-mdaa/cli",...]`), so parse JSON
    first. Falls back to one-name-per-line for other output formats.
    """
    out = stdout.strip()
    if not out:
        return set()
    try:
        parsed = json.loads(out)
    except json.JSONDecodeError:
        pass
    else:
        if isinstance(parsed, list):
            return {p for p in parsed if isinstance(p, str) and p.startswith("@aws-mdaa/")}
    return {line.strip() for line in out.split("\n") if line.strip().startswith("@aws-mdaa/")}


def get_nx_affected_packages(repo_root: Path) -> set[str]:
    """Get the full list of affected @aws-mdaa packages from nx.

    This includes transitive dependents — nx already computes the full graph.
    """
    nx_base = get_nx_base()
    nx_head = "HEAD" if os.environ.get("CI") == "true" else ""

    cmd = ["npx", "nx", "show", "projects", "--affected", f"--base={nx_base}"]
    if nx_head:
        cmd.append(f"--head={nx_head}")

    try:
        result = subprocess.run(
            cmd,
            capture_output=True, text=True, timeout=60,
            cwd=str(repo_root),
        )
        if result.returncode == 0:
            return parse_nx_projects(result.stdout)
        print(f"WARNING: nx show projects --affected exited with code {result.returncode}", file=sys.stderr)
        if result.stderr.strip():
            print(f"  stderr: {result.stderr.strip()[:200]}", file=sys.stderr)
    except subprocess.TimeoutExpired:
        print("WARNING: nx show projects --affected timed out after 60s", file=sys.stderr)

    return set()


def parse_mdaa_yaml(kit_dir: Path) -> dict:
    """Parse the kit's mdaa.yaml and return the full config dict."""
    mdaa_yaml = kit_dir / "mdaa.yaml"
    if not mdaa_yaml.is_file():
        return {}

    try:
        import yaml
        with open(mdaa_yaml) as f:
            return yaml.safe_load(f) or {}
    except ImportError:
        print("WARNING: PyYAML not available. Cannot parse mdaa.yaml for module-level filtering.", file=sys.stderr)
        print("WARNING: Falling back to running all tests.", file=sys.stderr)
        return {}


def get_kit_modules(config: dict) -> list[dict]:
    """Extract the list of modules with their domain/module names and config paths.

    Returns a list of dicts:
    [{"domain": "govern", "module": "roles", "module_path": "@aws-mdaa/roles",
      "config_files": ["./govern/roles.yaml"]}, ...]
    """
    if not config:
        return []

    modules = []
    domains = config.get("domains", {})
    env_templates = config.get("env_templates", {})

    for domain_name, domain_config in domains.items():
        if not isinstance(domain_config, dict):
            continue
        environments = domain_config.get("environments", {})
        for _env_name, env_config in environments.items():
            if not isinstance(env_config, dict):
                continue

            # Direct modules
            env_modules = env_config.get("modules", {})
            for mod_name, mod_config in (env_modules or {}).items():
                if not isinstance(mod_config, dict):
                    continue
                module_path = mod_config.get("module_path", "")
                config_files = mod_config.get("module_configs", [])
                if module_path:
                    modules.append({
                        "domain": domain_name,
                        "module": mod_name,
                        "module_path": module_path,
                        "config_files": config_files or [],
                    })

            # Template-based modules
            template_name = env_config.get("template")
            if template_name and template_name in env_templates:
                template_modules = env_templates[template_name].get("modules", {})
                for mod_name, mod_config in (template_modules or {}).items():
                    if not isinstance(mod_config, dict):
                        continue
                    module_path = mod_config.get("module_path", "")
                    config_files = mod_config.get("module_configs", [])
                    if module_path:
                        modules.append({
                            "domain": domain_name,
                            "module": mod_name,
                            "module_path": module_path,
                            "config_files": config_files or [],
                        })

    return modules


def find_context_keys_in_file(file_path: Path) -> set[str]:
    """Find all {{context:key}} references in a file."""
    if not file_path.is_file():
        return set()
    content = file_path.read_text()
    return set(re.findall(r"\{\{context:([\w-]+)\}\}", content))


def get_changed_context_keys(kit_dir: Path, repo_root: Path) -> set[str]:
    """Detect which context keys in mdaa.yaml have changed values.

    Parses the diff of mdaa.yaml to find context keys whose values changed.
    """
    kit_rel = str(kit_dir.relative_to(repo_root))
    mdaa_rel = f"{kit_rel}/mdaa.yaml"
    diff_output = get_file_diff(mdaa_rel)

    if not diff_output:
        return set()

    changed_keys: set[str] = set()
    in_context = False

    for line in diff_output.split("\n"):
        # Track whether we're in the context: section
        if re.match(r"^[+-]?\s*context:\s*$", line):
            in_context = True
            continue

        # Exit context section on unindented key (new top-level section)
        if in_context and not line.startswith(("+", "-", " ", "@")) and line.strip():
            in_context = False
            continue

        if not in_context:
            continue

        # Only look at added or removed lines (actual changes)
        if not line.startswith(("+", "-")) or line.startswith(("+++", "---")):
            continue

        # Extract the key from "  key: value" pattern (keys may contain hyphens)
        match = re.match(r"^[+-]\s+([\w-]+)\s*:", line)
        if match:
            changed_keys.add(match.group(1))

    return changed_keys


def modules_affected_by_context_changes(
    kit_modules: list[dict],
    changed_context_keys: set[str],
    kit_dir: Path,
) -> list[dict]:
    """Find modules whose config files reference any of the changed context keys."""
    affected = []
    for mod in kit_modules:
        for config_path in mod["config_files"]:
            full_path = (kit_dir / config_path).resolve()
            referenced_keys = find_context_keys_in_file(full_path)
            if referenced_keys & changed_context_keys:
                affected.append(mod)
                break
    return affected


def modules_affected_by_config_changes(
    kit_modules: list[dict],
    changed_files: list[str],
    kit_dir: Path,
    repo_root: Path,
) -> list[dict]:
    """Find modules whose config files have been directly modified."""
    kit_rel = str(kit_dir.relative_to(repo_root))
    affected = []

    for mod in kit_modules:
        for config_path in mod["config_files"]:
            # Normalize config path relative to repo root
            normalized = os.path.normpath(os.path.join(kit_rel, config_path))
            if normalized in changed_files:
                affected.append(mod)
                break

    return affected


def mdaa_yaml_changed(kit_dir: Path, changed_files: list[str], repo_root: Path) -> bool:
    """Check if the kit's mdaa.yaml has changed."""
    kit_rel = str(kit_dir.relative_to(repo_root))
    return f"{kit_rel}/mdaa.yaml" in changed_files


def get_tested_modules(test_file: Path) -> set[tuple[str, str]]:
    """Extract (domain, module) pairs that have a baselineModuleSynth test.

    Scans the kit's diff test file for baselineModuleSynth('kit', 'domain',
    'module', ...) calls. These are the modules that actually have a synth
    baseline test registered. A module declared in mdaa.yaml but missing here
    would match no Jest test, so --testNamePattern + --passWithNoTests would
    silently pass it green — see find_untested_targets().
    """
    tested: set[tuple[str, str]] = set()
    if not test_file.is_file():
        return tested

    # baselineModuleSynth('kit_name', 'domain', 'module', ...)
    call_re = re.compile(
        r"baselineModuleSynth\(\s*['\"][^'\"]+['\"]\s*,\s*"
        r"['\"]([^'\"]+)['\"]\s*,\s*['\"]([^'\"]+)['\"]"
    )
    content = test_file.read_text()
    for match in call_re.finditer(content):
        tested.add((match.group(1), match.group(2)))
    return tested


def find_untested_targets(
    affected_module_set: set[tuple[str, str]],
    tested_modules: set[tuple[str, str]],
) -> list[tuple[str, str]]:
    """Return targeted (domain, module) pairs that have no registered synth test.

    An empty tested_modules set means the test file could not be read or parsed;
    in that case we do not flag anything (avoid false positives) and let Jest run.
    """
    if not tested_modules:
        return []
    return sorted(affected_module_set - tested_modules)


def discover_kits(kits_root: Path) -> list[str]:
    """List kit names (subdirectories of starter_kits/ that contain an mdaa.yaml).

    Excludes the centralized 'test' directory and any non-kit entries.
    """
    kits = []
    for entry in sorted(kits_root.iterdir()):
        if not entry.is_dir() or entry.name == "test":
            continue
        if (entry / "mdaa.yaml").is_file():
            kits.append(entry.name)
    return kits


def kit_test_file(kits_root: Path, kit: str) -> Path:
    """Path to a kit's diff test file under the centralized test directory."""
    return kits_root / "test" / kit / f"{kit}.diff.test.ts"


# The package whose code assembles the shell commands the CLI baseline records.
# Matched against the nx affected set, so transitive changes (e.g. a config
# utility the CLI depends on) select the baseline too.
CLI_PACKAGE = "@aws-mdaa/cli"


def compute_affected(
    kit_dir: Path,
    repo_root: Path,
    changed_files: list[str],
    kit_modules: list[dict],
    affected_packages: set[str],
) -> tuple[bool, set[tuple[str, str]]]:
    """Determine the CLI-baseline flag and affected (domain, module) set.

    Combines the three detection paths: mdaa.yaml/context changes, module config
    file changes, and upstream code changes (nx affected). The affected package
    set is computed once by the caller and passed in (reused across all kits).
    """
    run_cli_baseline = False
    affected_module_set: set[tuple[str, str]] = set()

    # 1. mdaa.yaml changed -> CLI baseline must run; context changes affect modules
    if mdaa_yaml_changed(kit_dir, changed_files, repo_root):
        run_cli_baseline = True
        print(f"[{kit_dir.name}] mdaa.yaml changed: CLI baseline test will run")

        changed_keys = get_changed_context_keys(kit_dir, repo_root)
        if changed_keys:
            print(f"  Context keys changed: {', '.join(sorted(changed_keys))}")
            for m in modules_affected_by_context_changes(kit_modules, changed_keys, kit_dir):
                affected_module_set.add((m["domain"], m["module"]))
                print(f"  -> {m['domain']}/{m['module']} (uses changed context)")

    # 2. Module config files changed -> those modules' synth tests run
    config_affected = modules_affected_by_config_changes(kit_modules, changed_files, kit_dir, repo_root)
    for m in config_affected:
        affected_module_set.add((m["domain"], m["module"]))
    if config_affected:
        names = [f"{m['domain']}/{m['module']}" for m in config_affected]
        print(f"[{kit_dir.name}] module config changes: {', '.join(names)}")

    # 3. Upstream code changes (nx affected handles transitive deps)
    if affected_packages:
        code_affected = [m for m in kit_modules if m["module_path"] in affected_packages]
        for m in code_affected:
            affected_module_set.add((m["domain"], m["module"]))
        if code_affected:
            names = [f"{m['domain']}/{m['module']}" for m in code_affected]
            print(f"[{kit_dir.name}] upstream code changes (nx affected): {', '.join(names)}")

    # 5. CLI change -> command assembly changed -> CLI baseline must run.
    # CLI_PACKAGE is never a kit module_path, so path 3 cannot select it, and a
    # CLI-only change touches no kit mdaa.yaml, so path 1 cannot either. Without
    # this the module synth baselines still run and pass (template output is
    # unaffected by command-string changes) while the CLI baseline goes stale.
    if CLI_PACKAGE in affected_packages:
        run_cli_baseline = True
        print(f"[{kit_dir.name}] {CLI_PACKAGE} affected: CLI baseline test will run")

    return run_cli_baseline, affected_module_set


def report_untested_targets(
    kit: str, test_file: Path, affected_module_set: set[tuple[str, str]]
) -> list[tuple[str, str]]:
    """Return targeted modules in a kit that have no baselineModuleSynth test.

    Such a module would match zero Jest tests, and --passWithNoTests would let
    its changed synth pass with a green build. The caller fails the run loudly.
    """
    untested = find_untested_targets(affected_module_set, get_tested_modules(test_file))
    if untested:
        names = ", ".join(f"{kit}:{d}/{m}" for d, m in untested)
        print(
            f"ERROR: changed module(s) in kit '{kit}' have no synth baseline test: {names}",
            file=sys.stderr,
        )
    return untested


def run_jest_for_kit(
    kit: str,
    run_cli_baseline: bool,
    affected_module_set: set[tuple[str, str]],
    all_modules: list[dict],
    kits_root: Path,
) -> int:
    """Run Jest for a single kit using the generic test driver.

    Sets STARTER_KIT_NAME and STARTER_KIT_MODULES env vars so the generic
    starter-kit.diff.test.ts can register tests dynamically. jest
    --testNamePattern selects only the affected tests to actually run.
    """
    import json as _json

    patterns: list[str] = []
    if run_cli_baseline:
        patterns.append("CLI command baseline")
    for domain, module in sorted(affected_module_set):
        patterns.append(f"{re.escape(domain)}/{re.escape(module)}")

    test_pattern = "|".join(patterns)

    # The generic test file; all kits share it (per-kit state via env vars).
    generic_test = "test/starter-kit.diff.test.ts"

    # Module list for the generic test driver to register tests from.
    modules_json = _json.dumps(
        [{"domain": m["domain"], "module": m["module"]} for m in all_modules]
    )

    print(f"\n{'-' * 70}")
    print(f"[{kit}] running {len(patterns)} test(s): {test_pattern}")
    print(f"[{kit}] modules registered: {len(all_modules)}")
    jest_cmd = [
        "npx", "jest", "--passWithNoTests", "--coverage",
        "--testPathPattern", generic_test.replace(".", "\\."),
        "--testNamePattern", test_pattern,
    ]
    print(f"[{kit}] $ {' '.join(jest_cmd)}")

    env = {
        **os.environ,
        "STARTER_KIT_NAME": kit,
        "STARTER_KIT_MODULES": modules_json,
    }
    return subprocess.run(jest_cmd, env=env).returncode


def select_kit(
    kit: str,
    kits_root: Path,
    repo_root: Path,
    changed_files: list[str],
    affected_packages: set[str],
) -> tuple[Path, bool, set[tuple[str, str]], list[dict]] | None:
    """Compute the test selection for one kit, or None if nothing is affected.

    Returns (test_file, run_cli_baseline, affected_module_set, all_modules).
    """
    kit_dir = kits_root / kit
    config = parse_mdaa_yaml(kit_dir)
    if not config:
        # Cannot parse this kit's mdaa.yaml — run all its tests to be safe.
        print(f"[{kit}] could not parse mdaa.yaml -> running ALL of its tests")
        return kit_test_file(kits_root, kit), True, set(), []

    kit_modules = get_kit_modules(config)
    print(f"[{kit}] {len(kit_modules)} module(s) declared in mdaa.yaml")
    run_cli_baseline, affected_module_set = compute_affected(
        kit_dir, repo_root, changed_files, kit_modules, affected_packages,
    )
    if not run_cli_baseline and not affected_module_set:
        print(f"[{kit}] no changes affect this kit -> skipping")
        return None
    return kit_test_file(kits_root, kit), run_cli_baseline, affected_module_set, kit_modules


def _run_all_kits(kits: list[str], kits_root: Path, reason: str) -> int:
    """Run every kit's full test suite sequentially via the generic driver."""
    import json as _json

    print(f"\n{'=' * 70}")
    print(f"Running ALL starter kit tests ({reason})")
    print(f"{'=' * 70}")

    exit_code = 0
    for kit in kits:
        kit_dir = kits_root / kit
        config = parse_mdaa_yaml(kit_dir)
        kit_modules = get_kit_modules(config) if config else []
        modules_json = _json.dumps(
            [{"domain": m["domain"], "module": m["module"]} for m in kit_modules]
        )
        env = {**os.environ, "STARTER_KIT_NAME": kit, "STARTER_KIT_MODULES": modules_json}
        print(f"\n[{kit}] running all {len(kit_modules)} module tests")
        rc = subprocess.run(
            [
                "npx", "jest", "--passWithNoTests", "--coverage",
                "--testPathPattern", "test/starter-kit\\.diff\\.test\\.ts",
            ],
            env=env,
        ).returncode
        if rc != 0:
            exit_code = rc
    return exit_code


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    """Parse CLI arguments for the starter kit test runner."""
    parser = argparse.ArgumentParser(description="Starter kit diff test runner.")
    parser.add_argument(
        "--kit",
        help="Restrict the run to a single kit (directory name under starter_kits/). "
        "Used by per-kit CI jobs.",
    )
    parser.add_argument(
        "--list-kits",
        action="store_true",
        help="Print discovered kit names (one per line) and exit. Used by the CI "
        "child-pipeline generator.",
    )
    return parser.parse_args(argv)


def main():
    args = parse_args()
    kits_root = Path.cwd()

    # --list-kits: enumerate discovered kits and exit (used by the CI generator).
    if args.list_kits:
        for kit in discover_kits(kits_root):
            print(kit)
        sys.exit(0)

    repo_root = get_repo_root()
    run_all = os.environ.get("NX_RUN_ALL", "false").lower() == "true"
    update_baselines = os.environ.get("UPDATE_BASELINES", "false").lower() == "true"

    if update_baselines:
        os.environ["UPDATE_BASELINES"] = "true"

    kits = discover_kits(kits_root)

    # --kit: restrict to a single kit (per-kit CI job).
    if args.kit:
        if args.kit not in kits:
            print(
                f"ERROR: --kit '{args.kit}' is not a discovered kit. "
                f"Available: {', '.join(kits) if kits else 'none'}",
                file=sys.stderr,
            )
            sys.exit(1)
        kits = [args.kit]

    print(f"{'=' * 70}")
    print("Starter Kit Test Runner")
    print(f"{'=' * 70}")
    print(f"  Working dir      : {kits_root}")
    print(f"  Repo root        : {repo_root}")
    print(f"  Kit filter       : {args.kit or '(all)'}")
    print(f"  Kits to consider : {len(kits)} ({', '.join(kits) if kits else 'none'})")
    print(f"  NX_RUN_ALL       : {run_all}")
    print(f"  UPDATE_BASELINES : {update_baselines}")
    print(f"  Target ref       : {get_target_ref()}")

    if not kits:
        print("No starter kits found (no subdirectories with mdaa.yaml). Nothing to do.")
        sys.exit(0)

    # Force all tests when explicitly requested.
    if run_all:
        reason = "NX_RUN_ALL=true"
        if args.kit:
            sys.exit(_run_all_kits([args.kit], kits_root, f"{reason}, kit={args.kit}"))
        sys.exit(_run_all_kits(kits, kits_root, reason))

    # Determine what changed (shared across all kits).
    changed_files = get_changed_files()
    print(f"\nChanged files vs {get_nx_base()[:12]} (merge-base): {len(changed_files)}")
    for f in changed_files[:40]:
        print(f"    {f}")
    if len(changed_files) > 40:
        print(f"    ... and {len(changed_files) - 40} more")

    if not changed_files:
        sys.exit(_run_all_kits(kits, kits_root, "no changes detected"))

    # Affected package set from nx is computed once and reused for every kit.
    affected_packages = get_nx_affected_packages(repo_root)
    print(f"\nnx affected @aws-mdaa packages: {len(affected_packages)}")
    for pkg in sorted(affected_packages):
        print(f"    {pkg}")

    print(f"\n{'-' * 70}")
    print("Per-kit affected analysis")
    print(f"{'-' * 70}")

    selections: list[tuple[str, bool, set[tuple[str, str]], list[dict]]] = []

    for kit in kits:
        selection = select_kit(kit, kits_root, repo_root, changed_files, affected_packages)
        if selection is None:
            continue
        test_file, run_cli_baseline, affected_module_set, all_modules = selection
        selections.append((kit, run_cli_baseline, affected_module_set, all_modules))

    print(f"\n{'-' * 70}")
    if not selections:
        print("Summary: no changes affect any starter kit. Nothing to run.")
        print(f"{'-' * 70}")
        sys.exit(0)

    print(f"Summary: {len(selections)} of {len(kits)} kit(s) affected; running their tests:")
    for kit, run_cli_baseline, affected_module_set, _all_modules in selections:
        tests = (["CLI command baseline"] if run_cli_baseline else []) + [
            f"{d}/{m}" for d, m in sorted(affected_module_set)
        ]
        print(f"    {kit}: {len(tests)} test(s) -> {', '.join(tests)}")
    print(f"{'-' * 70}")

    # Run each affected kit's tests; aggregate the worst exit code.
    exit_code = 0
    results: list[tuple[str, int]] = []
    for kit, run_cli_baseline, affected_module_set, all_modules in selections:
        rc = run_jest_for_kit(kit, run_cli_baseline, affected_module_set, all_modules, kits_root)
        results.append((kit, rc))
        if rc != 0:
            exit_code = rc

    print(f"\n{'=' * 70}")
    print("Starter Kit Test Runner - results")
    print(f"{'=' * 70}")
    for kit, rc in results:
        print(f"    {'PASS' if rc == 0 else 'FAIL'}  {kit}")
    print(f"  Overall: {'PASS' if exit_code == 0 else 'FAIL'}")
    print(f"{'=' * 70}")
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
