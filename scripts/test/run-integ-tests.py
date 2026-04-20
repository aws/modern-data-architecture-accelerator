#!/usr/bin/env python3
"""
Run MDAA integration tests using CDK CLI directly.

Tests are organized by split (for parallel CI execution) defined in:
  integ/constructs/splits.yaml

Each test file defines a CDK app with test stacks that are deployed/destroyed.
Fixture resources (VPC, KMS) are passed via environment variables:
  INTEG_KMS_KEY_ARN, INTEG_VPC_ID, INTEG_PRIVATE_SUBNETS, INTEG_AZS

Convention: fixture stacks have "Fixture" in the name and are skipped.
Only stacks WITHOUT "Fixture" in the name are deployed/destroyed.

Optimization: all tests are synthesized in parallel before sequential deploy/destroy,
eliminating repeated ts-node compilation overhead.

Usage:
  # Mode 1: Run a specific split by name (reads from splits.yaml)
  AWS_REGION=us-east-1 python3 scripts/run-integ-tests.py split_0
  AWS_REGION=us-east-1 python3 scripts/run-integ-tests.py split_1
  AWS_REGION=us-east-1 python3 scripts/run-integ-tests.py split_2

  # Mode 2: Run all tests in a directory (local dev)
  AWS_REGION=us-east-1 python3 scripts/run-integ-tests.py packages/constructs/L2/s3-constructs

  # Mode 3: Run all tests from all splits
  AWS_REGION=us-east-1 python3 scripts/run-integ-tests.py
"""

import fnmatch
import json
import os
import re
import subprocess
import sys
import tempfile
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Optional

import yaml


# ---- Configuration ----

SCRIPT_DIR = Path(__file__).parent.resolve()
PROJECT_ROOT = SCRIPT_DIR.parent.parent
SPLITS_CONFIG = PROJECT_ROOT / "integ" / "constructs" / "splits.yaml"
FIXTURE_STACK_NAME = "MdaaIntegInfraFixtureStack"
ENV_VARS_MAP = [
    ("INTEG_KMS_KEY_ARN", "KmsKeyArn"),
    ("INTEG_VPC_ID", "VpcId"),
    ("INTEG_PRIVATE_SUBNETS", "PrivateSubnets"),
    ("INTEG_AZS", "AvailabilityZones"),
]


# ---- Helper Functions ----


def is_integ_test_file(file_path: str) -> bool:
    """
    Check if a file path is a valid integration test file.

    Integration test files must:
    - End with '.integ.ts' (the TypeScript source file)
    - This filters out '.integ.d.ts' and '.integ.js'

    Args:
        file_path: The file path to check (can be relative or absolute)

    Returns:
        True if the file is a valid integration test source file
    """
    return file_path.endswith(".integ.ts")


# ---- YAML Parsing Functions ----


def load_splits_config() -> dict:
    """Load and validate the splits.yaml configuration file."""
    if not SPLITS_CONFIG.exists():
        print(f"ERROR: Split config not found at {SPLITS_CONFIG}", file=sys.stderr)
        sys.exit(1)

    try:
        with open(SPLITS_CONFIG, "r") as f:
            config = yaml.safe_load(f)
    except yaml.YAMLError as e:
        print(f"ERROR: Failed to parse splits.yaml: {e}", file=sys.stderr)
        sys.exit(1)

    if not config or "splits" not in config:
        print("ERROR: splits.yaml missing 'splits' key", file=sys.stderr)
        sys.exit(1)

    # Validate each split has required fields
    for i, split in enumerate(config["splits"]):
        if "name" not in split:
            print(f"ERROR: Split at index {i} missing required 'name' field", file=sys.stderr)
            sys.exit(1)
        if "tests" not in split:
            print(f"ERROR: Split '{split['name']}' missing required 'tests' field", file=sys.stderr)
            sys.exit(1)

    return config


def get_split_tests(config: dict, split_name: str) -> list[str]:
    """Get test patterns for a specific split."""
    for split in config["splits"]:
        if split["name"] == split_name:
            return split.get("tests", [])

    available = ", ".join(s["name"] for s in config["splits"])
    print(f"ERROR: Unknown split: {split_name}. Available: {available}", file=sys.stderr)
    sys.exit(1)


def get_all_split_names(config: dict) -> list[str]:
    """Get all split names from the configuration."""
    return [split["name"] for split in config["splits"]]


def get_all_split_tests(config: dict) -> list[str]:
    """Get all test patterns from all splits."""
    all_tests = []
    for split in config["splits"]:
        all_tests.extend(split.get("tests", []))
    return all_tests


def find_test_split(config: dict, test_file: str) -> str:
    """Find which split a test file belongs to."""
    for split in config["splits"]:
        for test in split.get("tests", []):
            if test == test_file:
                return split["name"]
            # Also check if the test matches via glob pattern
            if "*" in test or "?" in test:
                if fnmatch.fnmatch(test_file, test):
                    return split["name"]
    return "unassigned"


def check_duplicate_splits(config: dict) -> bool:
    """
    Check for tests that match multiple splits.
    Returns True if no duplicates found, False otherwise.
    """
    # Build a map of test file -> list of splits it belongs to
    test_to_splits: dict[str, list[str]] = {}

    for split in config["splits"]:
        split_name = split.get("name", "unknown")
        tests = split.get("tests", [])

        for test_pattern in tests:
            # For direct file paths (no glob), just record the mapping
            if "*" not in test_pattern and "?" not in test_pattern:
                if test_pattern not in test_to_splits:
                    test_to_splits[test_pattern] = []
                test_to_splits[test_pattern].append(split_name)
            else:
                # For glob patterns, resolve them and record mappings
                for root, _, files in os.walk(PROJECT_ROOT):
                    for f in files:
                        full_path = Path(root) / f
                        rel_path = str(full_path.relative_to(PROJECT_ROOT))
                        if fnmatch.fnmatch(rel_path, test_pattern):
                            # Only include valid integration test source files
                            if is_integ_test_file(rel_path):
                                if rel_path not in test_to_splits:
                                    test_to_splits[rel_path] = []
                                test_to_splits[rel_path].append(split_name)

    # Check for duplicates
    duplicates = [(test_file, splits) for test_file, splits in test_to_splits.items() if len(splits) > 1]

    if duplicates:
        for test_file, splits in duplicates:
            print(f"ERROR: Test {test_file} matches multiple splits: {', '.join(splits)}", file=sys.stderr)
        return False

    return True


# ---- Glob Pattern Resolution ----


def resolve_glob_patterns(patterns: list[str]) -> list[str]:
    """Resolve glob patterns to actual file paths."""
    resolved = set()

    for pattern in patterns:
        if "*" in pattern or "?" in pattern:
            # Resolve glob pattern by walking the directory tree
            matches = []
            for root, _, files in os.walk(PROJECT_ROOT):
                for f in files:
                    full_path = Path(root) / f
                    rel_path = str(full_path.relative_to(PROJECT_ROOT))
                    if fnmatch.fnmatch(rel_path, pattern):
                        # Only include valid integration test source files
                        if is_integ_test_file(rel_path):
                            matches.append(rel_path)

            if not matches:
                print(f"WARNING: Pattern '{pattern}' matched no files", file=sys.stderr)
            else:
                resolved.update(matches)
        else:
            # Direct file path
            resolved.add(pattern)

    return sorted(resolved)


# ---- Test Discovery ----


def discover_tests_from_directory(test_path: Path) -> list[str]:
    """Discover all integ.ts tests in a directory (recursive)."""
    tests = []
    for root, _, files in os.walk(test_path):
        for f in sorted(files):
            full_path = Path(root) / f
            rel_path = str(full_path.relative_to(PROJECT_ROOT))
            if is_integ_test_file(rel_path):
                tests.append(rel_path)
    return sorted(tests)


def discover_tests(arg: Optional[str]) -> tuple[list[str], str, str]:
    """
    Determine invocation mode and discover tests.
    Returns (tests, discovery_mode, split_name).
    """
    config = None
    split_name = ""

    if arg is None:
        # Mode 3: Run all tests from all splits
        discovery_mode = "all-splits"
        print("=== Discovering tests from all splits ===")

        config = load_splits_config()

        print("--- Checking for duplicate split assignments ---")
        if not check_duplicate_splits(config):
            sys.exit(1)
        print("  No duplicate assignments found")
        print()

        patterns = get_all_split_tests(config)
        if not patterns:
            print("ERROR: No tests found in splits.yaml", file=sys.stderr)
            sys.exit(1)

        tests = resolve_glob_patterns(patterns)

    elif re.match(r"^split_\d+$", arg):
        # Mode 1: Run a specific split by name
        split_name = arg
        discovery_mode = "split-name"
        print(f"=== Discovering tests for split: {split_name} ===")

        config = load_splits_config()

        print("--- Checking for duplicate split assignments ---")
        if not check_duplicate_splits(config):
            sys.exit(1)
        print("  No duplicate assignments found")
        print()

        patterns = get_split_tests(config, split_name)
        if not patterns:
            print(f"ERROR: No tests found for split {split_name}", file=sys.stderr)
            sys.exit(1)

        tests = resolve_glob_patterns(patterns)

    else:
        # Mode 2: Run all tests in a directory (legacy/local dev)
        discovery_mode = "directory"

        if os.path.isabs(arg):
            test_path = Path(arg)
        else:
            test_path = PROJECT_ROOT / arg

        if not test_path.is_dir():
            print(f"ERROR: Test path not found: {test_path}", file=sys.stderr)
            sys.exit(1)

        print(f"=== Discovering tests in directory: {arg} ===")
        tests = discover_tests_from_directory(test_path)

    return tests, discovery_mode, split_name


# ---- Validation ----


def validate_test_files(tests: list[str]) -> list[str]:
    """Validate that all test files exist. Returns list of valid tests."""
    print()
    print("--- Validating test files ---")

    missing_files = []
    valid_tests = []

    for test in tests:
        full_path = PROJECT_ROOT / test
        if full_path.is_file():
            valid_tests.append(test)
        else:
            missing_files.append(test)
            print(f"ERROR: Test file not found: {test}")

    if missing_files:
        print()
        print(f"ERROR: {len(missing_files)} test file(s) not found. Aborting.")
        sys.exit(1)

    return valid_tests


# ---- AWS/CloudFormation Helpers ----


def get_stack_output(stack_name: str, output_key: str, region: str) -> Optional[str]:
    """Fetch a CloudFormation stack output value."""
    try:
        result = subprocess.run(
            [
                "aws",
                "cloudformation",
                "describe-stacks",
                "--stack-name",
                stack_name,
                "--region",
                region,
                "--query",
                f"Stacks[0].Outputs[?OutputKey=='{output_key}'].OutputValue",
                "--output",
                "text",
            ],
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()
    except Exception:
        pass
    return None


def get_caller_account() -> str:
    """Get the current AWS account ID."""
    result = subprocess.run(
        ["aws", "sts", "get-caller-identity", "--query", "Account", "--output", "text"],
        capture_output=True,
        text=True,
        check=True,
    )
    return result.stdout.strip()


def setup_fixture_env_vars(region: str) -> None:
    """Set up fixture environment variables, fetching from CloudFormation if needed."""
    print("--- Checking fixture environment variables ---")

    for env_var, output_key in ENV_VARS_MAP:
        value = os.environ.get(env_var)
        if not value:
            value = get_stack_output(FIXTURE_STACK_NAME, output_key, region)
            if value:
                os.environ[env_var] = value
                print(f"  {env_var}={value} (fetched from stack)")
            else:
                print(f"WARNING: {env_var} not set and stack output not found. Tests requiring this will fail.")
        else:
            print(f"  {env_var}={value}")

    print()


# ---- CDK Operations ----


def run_cdk_synth(test: str, out_dir: Path) -> tuple[str, bool, str]:
    """
    Run CDK synth for a single test.
    Returns (test_name, success, log_output).
    """
    test_name = Path(test).stem
    full_test_path = PROJECT_ROOT / test

    log_file = out_dir / "synth.log"
    exit_file = out_dir / "synth.exit"

    try:
        result = subprocess.run(
            ["npx", "cdk", "synth", "--app", f"npx ts-node {full_test_path}", "--output", str(out_dir)],
            capture_output=True,
            text=True,
            cwd=PROJECT_ROOT,
        )

        with open(log_file, "w") as f:
            f.write(result.stdout)
            f.write(result.stderr)

        with open(exit_file, "w") as f:
            f.write(str(result.returncode))

        return test_name, result.returncode == 0, result.stdout + result.stderr

    except Exception as e:
        error_msg = str(e)
        with open(log_file, "w") as f:
            f.write(error_msg)
        with open(exit_file, "w") as f:
            f.write("1")
        return test_name, False, error_msg


def get_stacks_from_assembly(out_dir: Path) -> list[str]:
    """List stacks from a pre-synthesized CDK assembly, filtering out fixture stacks."""
    try:
        result = subprocess.run(
            ["npx", "cdk", "list", "--app", str(out_dir)],
            capture_output=True,
            text=True,
            cwd=PROJECT_ROOT,
        )
        if result.returncode != 0:
            return []

        stacks = []
        for line in result.stdout.strip().split("\n"):
            line = line.strip()
            if line and "Fixture" not in line and re.match(r"^[A-Za-z0-9_-]+$", line):
                stacks.append(line)
        return stacks
    except Exception:
        return []


def deploy_stack(stack: str, out_dir: Path) -> bool:
    """Deploy a single stack from a pre-synthesized assembly."""
    result = subprocess.run(
        ["npx", "cdk", "deploy", stack, "--app", str(out_dir), "--require-approval", "never"],
        cwd=PROJECT_ROOT,
    )
    return result.returncode == 0


def destroy_stack(stack: str, out_dir: Path) -> bool:
    """Destroy a single stack from a pre-synthesized assembly."""
    result = subprocess.run(
        ["npx", "cdk", "destroy", stack, "--app", str(out_dir), "--force"],
        cwd=PROJECT_ROOT,
    )
    return result.returncode == 0


# ---- Main Execution ----


def main() -> int:
    """Main entry point."""
    # Get region from environment
    region = os.environ.get("AWS_REGION") or os.environ.get("AWS_DEFAULT_REGION")
    if not region:
        print("ERROR: AWS_REGION or AWS_DEFAULT_REGION must be set", file=sys.stderr)
        return 1

    os.environ["AWS_REGION"] = region
    os.environ["CDK_DEFAULT_REGION"] = region

    # Parse command line argument
    arg = sys.argv[1] if len(sys.argv) > 1 else None

    # Discover tests
    all_tests, discovery_mode, split_name = discover_tests(arg)

    # Validate test files
    all_tests = validate_test_files(all_tests)

    if not all_tests:
        print("No integration tests found")
        return 0

    # Load config for split membership reporting
    config = None
    if SPLITS_CONFIG.exists():
        try:
            config = load_splits_config()
        except SystemExit:
            config = None

    # Report test discovery
    print()
    print("=== MDAA Integration Tests ===")
    print(f"Region: {region}")
    print(f"Discovery mode: {discovery_mode}")
    if split_name:
        print(f"Split: {split_name}")
    print(f"Tests: {len(all_tests)}")
    print()

    # Report split membership for each test
    for test in all_tests:
        if config:
            split = find_test_split(config, test)
            if split == "unassigned":
                print(f"  - {test} (unassigned)")
            else:
                print(f"  - {test} [{split}]")
        else:
            print(f"  - {test}")
    print()

    # Set CDK_DEFAULT_ACCOUNT if not already set
    if not os.environ.get("CDK_DEFAULT_ACCOUNT"):
        try:
            account = get_caller_account()
            os.environ["CDK_DEFAULT_ACCOUNT"] = account
        except Exception as e:
            print(f"WARNING: Could not get AWS account ID: {e}", file=sys.stderr)

    # Set up fixture environment variables
    setup_fixture_env_vars(region)

    # ---- Phase 1: Parallel synth ----
    synth_dir = Path(tempfile.mkdtemp(prefix="mdaa-integ-synth."))
    print(f"--- Phase 1: Synthesizing {len(all_tests)} tests in parallel ---")
    print(f"  Output: {synth_dir}")

    synth_results: dict[str, tuple[bool, str, Path]] = {}

    with ThreadPoolExecutor(max_workers=min(len(all_tests), os.cpu_count() or 4)) as executor:
        futures = {}
        for test in all_tests:
            test_name = Path(test).stem
            out_dir = synth_dir / test_name
            out_dir.mkdir(parents=True, exist_ok=True)
            future = executor.submit(run_cdk_synth, test, out_dir)
            futures[future] = (test, test_name, out_dir)

        for future in as_completed(futures):
            test, test_name, out_dir = futures[future]
            try:
                _, success, log_output = future.result()
                synth_results[test] = (success, log_output, out_dir)
                if success:
                    print(f"  ✓ Synth OK: {test_name}")
                else:
                    print(f"  ✗ Synth failed: {test_name}")
                    print(log_output)
            except Exception as e:
                synth_results[test] = (False, str(e), out_dir)
                print(f"  ✗ Synth failed: {test_name}")
                print(str(e))

    synth_failed = sum(1 for success, _, _ in synth_results.values() if not success)
    print()
    if synth_failed > 0:
        print(f"ERROR: {synth_failed} test(s) failed to synthesize.")

    # ---- Phase 2: Sequential deploy/destroy from pre-synthesized assemblies ----
    print("--- Phase 2: Deploy/destroy tests ---")
    print()

    passed = 0
    failed = 0

    for test in all_tests:
        test_name = Path(test).stem
        success, _, out_dir = synth_results.get(test, (False, "", synth_dir / test_name))

        # Skip tests that failed synth
        if not success:
            failed += 1
            continue

        # Report split membership
        if config:
            split = find_test_split(config, test)
            if split == "unassigned":
                print(f"--- Running {test_name} in {region} ---")
            else:
                print(f"--- Running {test_name} in {region} [{split}] ---")
        else:
            print(f"--- Running {test_name} in {region} ---")

        # List stacks from the pre-synthesized assembly
        stacks = get_stacks_from_assembly(out_dir)

        if not stacks:
            print(f"  No non-fixture stacks found in {test_name}, skipping.")
            continue

        print(f"  Deploying stacks: {' '.join(stacks)}")

        # Deploy only non-fixture stacks
        deploy_ok = True
        for stack in stacks:
            if not deploy_stack(stack, out_dir):
                print(f"✗ Deploy failed: {test_name} ({stack})")
                deploy_ok = False
                break

        if deploy_ok:
            print(f"✓ Deploy succeeded: {test_name}")

            # Destroy only non-fixture stacks (reverse order)
            destroy_ok = True
            for stack in reversed(stacks):
                if not destroy_stack(stack, out_dir):
                    print(f"✗ Destroy failed: {test_name} ({stack})")
                    destroy_ok = False

            if destroy_ok:
                print(f"✓ Destroy succeeded: {test_name}")
                passed += 1
            else:
                failed += 1
        else:
            failed += 1
            # Try to destroy even if deploy failed
            for stack in reversed(stacks):
                destroy_stack(stack, out_dir)

        print()

    # Cleanup
    import shutil

    shutil.rmtree(synth_dir, ignore_errors=True)

    print("=== Results ===")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    print(f"Total: {passed + failed}")

    return 1 if failed > 0 else 0


if __name__ == "__main__":
    sys.exit(main())
