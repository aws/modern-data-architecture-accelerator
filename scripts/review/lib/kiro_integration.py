"""
Kiro CLI invocation and risk JSON parsing.

Extracted from scripts/quality/baseline_review.py for reuse across review tools.
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import tempfile
import time
from pathlib import Path

from review.lib.nx_graph import PROJECT_ROOT


class KiroError(Exception):
    """Raised when a Kiro CLI invocation fails."""
    pass


class KiroNotFoundError(KiroError):
    """Raised when kiro-cli is not installed."""
    pass


class KiroAuthError(KiroError):
    """Raised when KIRO_API_KEY is not set."""
    pass


class KiroTimeoutError(KiroError):
    """Raised when kiro-cli exceeds the configured timeout."""
    pass


def run_kiro_assessment(prompt: str, validate_json: bool = False) -> str:
    """Pipe a prompt through Kiro headless and return the assessment.

    Kiro writes the assessment to a temp file to avoid terminal UI noise in stdout.
    The prompt must include an {output_file} placeholder that will be replaced with
    the path to the temp file.

    If validate_json is True, the output is parsed as JSON after each attempt.
    If parsing fails, the attempt is retried (up to max_retries). This avoids
    regex fallback parsing and ensures structured output.

    Raises:
        KiroNotFoundError: kiro-cli not installed
        KiroAuthError: KIRO_API_KEY not set
        KiroTimeoutError: kiro-cli exceeded timeout
        KiroError: kiro-cli failed or produced no output
    """
    if not shutil.which("kiro-cli"):
        raise KiroNotFoundError("kiro-cli not found on PATH")

    if not os.environ.get("KIRO_API_KEY"):
        raise KiroAuthError("KIRO_API_KEY environment variable not set")

    env = {**os.environ, "KIRO_LOG_NO_COLOR": "1"}

    max_retries = 3
    last_output = ""
    for attempt in range(max_retries):
        # Create a fresh temp file for each attempt
        output_file = tempfile.NamedTemporaryFile(
            suffix=".json", prefix="kiro-risk-", delete=False, dir=str(PROJECT_ROOT)
        )
        output_path = output_file.name
        output_file.close()

        formatted_prompt = prompt.replace("{output_file}", output_path)

        try:
            result = subprocess.run(
                [
                    "kiro-cli", "chat",
                    "--no-interactive",
                    "--trust-tools=write",
                    formatted_prompt,
                ],
                capture_output=True,
                text=True,
                timeout=int(os.environ.get("KIRO_TIMEOUT", "600")),
                cwd=str(PROJECT_ROOT),
                env=env,
            )
            if result.returncode != 0:
                stderr = result.stderr.strip()
                if "database is locked" in stderr and attempt < max_retries - 1:
                    wait = (attempt + 1) * 5
                    print(f"  Database locked, retrying in {wait}s (attempt {attempt + 1}/{max_retries})...")
                    time.sleep(wait)
                    continue
                raise KiroError(f"kiro-cli failed (exit code {result.returncode}): {stderr}")

            # Read the assessment from the file Kiro wrote
            if not os.path.isfile(output_path) or os.path.getsize(output_path) == 0:
                if attempt < max_retries - 1:
                    print(f"  Empty output, retrying (attempt {attempt + 1}/{max_retries})...")
                    time.sleep((attempt + 1) * 3)
                    continue
                raise KiroError("kiro-cli did not write assessment to output file")

            with open(output_path) as f:
                output = f.read().strip()

            last_output = output

            # Validate JSON if requested
            if validate_json:
                parsed = _parse_risk_json(output)
                if parsed is None:
                    if attempt < max_retries - 1:
                        print(f"  Output is not valid JSON, retrying (attempt {attempt + 1}/{max_retries})...")
                        time.sleep((attempt + 1) * 3)
                        continue
                    # Final attempt failed — return raw output, let caller handle it
                    print(f"  Warning: output is not valid JSON after {max_retries} attempts")

            print(f"  Risk assessment received ({len(output)} chars)")
            return output
        except subprocess.TimeoutExpired:
            raise KiroTimeoutError(
                f"kiro-cli timed out after {os.environ.get('KIRO_TIMEOUT', '600')}s"
            )
        finally:
            if os.path.isfile(output_path):
                os.unlink(output_path)

    # If we got output but it wasn't valid JSON, return it anyway
    if last_output:
        return last_output
    raise KiroError("kiro-cli exhausted all retries")


def _parse_risk_json(raw: str) -> dict | None:
    """Try to parse Kiro's risk assessment output as JSON.

    Handles cases where Kiro wraps JSON in markdown fences.
    Returns the parsed dict or None if parsing fails.
    """
    text = raw.strip()
    # Strip markdown code fences if present
    if text.startswith("```"):
        lines = text.split("\n")
        if lines[-1].strip() == "```":
            lines = lines[1:-1]
        else:
            lines = lines[1:]
        text = "\n".join(lines).strip()

    try:
        data = json.loads(text)
        if isinstance(data, dict) and "findings" in data:
            return data
    except (json.JSONDecodeError, ValueError):
        pass
    return None


def _parse_risk_level(risk_assessment: str | dict) -> str:
    """Extract the overall risk level from the Kiro risk assessment output.

    Accepts either a parsed JSON dict or raw string.
    Returns UNKNOWN if the output cannot be parsed.
    """
    if isinstance(risk_assessment, dict):
        return risk_assessment.get("overall_risk", "UNKNOWN").upper()
    parsed = _parse_risk_json(risk_assessment)
    if parsed:
        return parsed.get("overall_risk", "UNKNOWN").upper()
    return "UNKNOWN"
