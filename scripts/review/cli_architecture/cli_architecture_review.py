#!/usr/bin/env python3
"""
CLI Architecture Review — validates the MDAA CLI shell-safety guardrails.

The CLI (`packages/cli`) interpolates trusted-but-user-supplied config values into
the shell commands it runs. Two layers keep that safe: fail-fast parameter validation
(`config-field-policy.ts`) and universal sink quoting (`shell-command.ts`). This agent
blocks a merge that breaks any of the three invariants:

  1. every parameter has best-effort validation;
  2. every sink has zero-trust quoting of its input;
  3. every validator and sink is fully tested.

Unlike the per-package reviewers, this agent targets a single package (`packages/cli`),
which the L2/L3/app reviewers deliberately exclude. It:

1. Detects whether `packages/cli/lib` or `packages/cli/test` changed in this MR
2. Collects the code diff (pre-parsed into anchored chunks), the full source of the
   security-critical files, and the validator/sink test files
3. Pipes the context through Kiro headless for a shell-safety assessment
4. Produces a JSON report and a Code Quality report for the GitLab MR

Outputs:
  cli-architecture-review/report.json               - Full structured report
  cli-architecture-review/codequality-report.json   - GitLab Code Quality report

Environment:
  KIRO_API_KEY                          - Required for assessment
  KIRO_MODEL                            - Optional, default claude-opus-4.8
  KIRO_EFFORT                           - Optional, default high
  KIRO_TIMEOUT                          - Optional, default 600s

Usage:
  python3 scripts/review/cli_architecture/cli_architecture_review.py [--output-dir cli-architecture-review]
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

# Add scripts/ to Python path so review.lib imports work when run directly
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from review.lib.nx_graph import PROJECT_ROOT, _target_ref
from review.lib.kiro_integration import run_kiro_assessment, KiroError, _parse_risk_json, _parse_risk_level
from review.lib.report import to_codequality_json
from review.lib.thread_lifecycle import compute_source_hash
from review.lib.file_collector import collect_files
from review.lib.temp_files import temp_review_files
from review.lib.diff_parser import parse_diff_chunks, format_chunks_for_prompt, attach_source_hashes

# The CLI package this agent guards. The L2/L3/app reviewers exclude it, so its
# shell-safety invariants would otherwise go unreviewed.
CLI_PACKAGE_ROOT = "packages/cli"


KIRO_PROMPT = """\
You are reviewing the MDAA CLI shell-safety guardrails for package '{package_name}'.

Read the steering file #[[file:agent_rules/review-cli-architecture.md]] for the complete
invariants and the CI Agent Usage section for output format.

Package: {package_name}

Your ONLY job is to determine whether this MR preserves the three invariants:
  1. every config parameter has best-effort validation (config-field-policy.ts);
  2. every shell-command sink quotes its input by construction (shell-command.ts);
  3. every validator and sink is fully tested (config-field-policy.test.ts,
     shell-command.test.ts, deployment-target-validator.test.ts).

Code diff (pre-parsed diff chunks with pre-computed anchors and hashes) — read from: {code_chunks_file}

Full current source of the security-critical files — read from: {security_source_file}

Current validator/sink test files — read from: {security_tests_file}

CRITICAL — Scope boundaries:
- Review ONLY the three shell-safety invariants above. Do NOT flag general architecture,
  layering, unrelated test coverage, encryption/IAM, documentation, or style — those are
  handled by other agents.
- Only flag invariants broken by code CHANGED in this MR. An invariant that was already
  unmet before the MR and is untouched by it is out of scope.

CRITICAL — Line number rules:
- The `line` field MUST be copied from the Anchor value of the diff chunk that contains
  the issue (e.g. "Anchor: L42" -> 42). For an issue in a full-source file with no diff
  chunk, use that file's line number. Do NOT compute your own line numbers. If you cannot
  attribute the issue to a line, use 0.

Write your assessment to the file {output_file} as a JSON object following the schema in
the CI Agent Usage section of the steering file. No preamble, no markdown fences, no
explanation outside the JSON. The file must contain ONLY valid JSON.
"""


class ChangeDetectionError(Exception):
    """Raised when the git diff used for change detection fails to run.

    A failed diff (bad target ref, shallow clone missing the ref, dubious-ownership
    refusal, etc.) must not be mistaken for "no CLI changes" — that would silently
    skip the shell-safety review and let unreviewed code merge. We fail loud instead.
    """


def cli_changed() -> bool:
    """Return True if any lib/ or test/ file under packages/cli changed in this MR.

    Raises ChangeDetectionError if git itself fails, rather than returning False.
    A silent False here would pass the whole review through as a no-op (the exact
    false-negative the compliance reviewer guards against via lib/safety.py).
    """
    result = subprocess.run(
        ["git", "diff", "--name-only", _target_ref(), "--",
         f"{CLI_PACKAGE_ROOT}/lib/", f"{CLI_PACKAGE_ROOT}/test/"],
        capture_output=True, text=True, cwd=str(PROJECT_ROOT),
    )
    if result.returncode != 0:
        raise ChangeDetectionError(
            f"git diff against {_target_ref()} failed (exit {result.returncode}): "
            f"{result.stderr.strip() or 'no stderr'}"
        )
    changed = [f.strip() for f in result.stdout.strip().split("\n") if f.strip()]
    return bool(changed)


def collect_code_diff() -> str:
    """Get the git diff for the CLI package's lib/ and test/ directories."""
    result = subprocess.run(
        ["git", "diff", _target_ref(), "--",
         f"{CLI_PACKAGE_ROOT}/lib/", f"{CLI_PACKAGE_ROOT}/test/"],
        capture_output=True, text=True, cwd=str(PROJECT_ROOT),
    )
    diff = result.stdout.strip()
    return diff if diff else "(no lib/ or test/ changes)"


def collect_full_source() -> str:
    """Read all of the CLI package's lib/ source (no truncation — read on demand by Kiro).

    Globbed rather than curated so a newly-added sink or validator file is reviewed
    automatically. max_chars=0 mirrors the compliance/architecture reviewers: content
    goes to a temp file Kiro reads incrementally, so there is no prompt-size budget.
    """
    return collect_files(
        PROJECT_ROOT / CLI_PACKAGE_ROOT / "lib", "**/*.ts", max_chars=0,
        empty_message="(no security-critical source files found)",
    )


def collect_test_source() -> str:
    """Read all of the CLI package's test/ source (validator/sink coverage + the
    compile-time types.negative.ts contract). Globbed so new tests are covered."""
    return collect_files(
        PROJECT_ROOT / CLI_PACKAGE_ROOT / "test", "**/*.ts", max_chars=0,
        empty_message="(no validator/sink test files found)",
    )


def assess_cli() -> dict:
    """Run the Kiro shell-safety assessment for the CLI package."""
    print(f"  [start] {CLI_PACKAGE_ROOT}")

    code_diff = collect_code_diff()
    code_chunks = parse_diff_chunks(code_diff)
    chunks_text = format_chunks_for_prompt(code_chunks)
    security_source = collect_full_source()
    security_tests = collect_test_source()

    with temp_review_files(
        {"chunks": chunks_text, "source": security_source, "tests": security_tests},
        prefix="cli-arch-",
        directory=str(PROJECT_ROOT),
    ) as paths:
        prompt = KIRO_PROMPT.format(
            package_name=CLI_PACKAGE_ROOT,
            code_chunks_file=paths["chunks"],
            security_source_file=paths["source"],
            security_tests_file=paths["tests"],
            output_file="{output_file}",
        )
        assessment = run_kiro_assessment(prompt, validate_json=True)

    parsed = _parse_risk_json(assessment)
    findings = parsed.get("findings", []) if parsed else []
    summary = parsed.get("summary", "") if parsed else ""
    risk_level = _parse_risk_level(assessment)

    # Attach chunk content hashes to findings for per-chunk source tracking.
    attach_source_hashes(findings, code_chunks)

    print(f"  [done]  {CLI_PACKAGE_ROOT} — {risk_level} ({len(findings)} findings)")

    return {
        "package": CLI_PACKAGE_ROOT,
        "root": CLI_PACKAGE_ROOT,
        "type": "cli",
        "risk_level": risk_level,
        "risk_summary": summary,
        "findings": findings,
        "risk_assessment": assessment,
        "source_hash": compute_source_hash(str(PROJECT_ROOT / CLI_PACKAGE_ROOT)),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="CLI architecture (shell-safety) review report generator")
    parser.add_argument("--output-dir", default="cli-architecture-review")
    args = parser.parse_args()

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"Checking for changes under {CLI_PACKAGE_ROOT}...")
    try:
        changed = cli_changed()
    except ChangeDetectionError as e:
        print("\n" + "=" * 70)
        print("REVIEW AGENT FAILURE: Change detection failed")
        print("=" * 70)
        print(f"\n{e}")
        print("\nThe review did NOT run. Failing to prevent unreviewed code from merging.")
        print("\n" + "=" * 70)
        sys.exit(1)

    if not changed:
        print(f"No {CLI_PACKAGE_ROOT} lib/ or test/ changes detected.")
        (output_dir / "report.json").write_text("[]")
        (output_dir / "codequality-report.json").write_text("[]")
        print("Empty reports written. Thread posting will confirm agent ran.")
        return

    print(f"{CLI_PACKAGE_ROOT} changed — running shell-safety assessment.")

    entries: list[dict] = []
    try:
        entries.append(assess_cli())
    except KiroError as e:
        print(f"  [error] {CLI_PACKAGE_ROOT} — {e}", file=sys.stderr)
        entries.append({
            "package": CLI_PACKAGE_ROOT,
            "root": CLI_PACKAGE_ROOT,
            "type": "cli",
            "risk_level": "UNKNOWN",
            "risk_summary": f"Assessment failed: {e}",
            "findings": [],
            "risk_assessment": "",
            "source_hash": compute_source_hash(str(PROJECT_ROOT / CLI_PACKAGE_ROOT)),
        })

    (output_dir / "report.json").write_text(json.dumps(entries, indent=2))
    print(f"\nReport written to {output_dir / 'report.json'}")

    cq_path = output_dir / "codequality-report.json"
    cq_path.write_text(to_codequality_json(entries, agent_name="cli-architecture"))
    print(f"Code Quality report written to {cq_path}")

    risk_counts: dict[str, int] = {}
    for e in entries:
        risk_counts[e["risk_level"]] = risk_counts.get(e["risk_level"], 0) + 1
    print(f"\nSummary: {', '.join(f'{v} {k}' for k, v in sorted(risk_counts.items()))}")


if __name__ == "__main__":
    main()
