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


def load_preamble() -> str:
    """Load the shared review agent preamble from the canonical rule source.

    Reads the canonical source at agent_rules/review-preamble.md,
    strips YAML front matter, and returns the content with a trailing newline pair.
    Returns empty string if the file doesn't exist.

    Note: This reads the canonical source directly rather than the projected
    .kiro/steering/ file, because the projection is a thin wrapper containing only
    a #[[file:...]] include directive (resolved by Kiro at runtime, not by this
    Python code).
    """
    preamble_path = PROJECT_ROOT / "agent_rules" / "review-preamble.md"
    if not preamble_path.is_file():
        return ""
    raw = preamble_path.read_text()
    parts = raw.split("---", 2)
    if len(parts) >= 3:
        # Content after second --- (skip YAML front matter)
        return parts[2].strip() + "\n\n"
    return raw.strip() + "\n\n"


def _build_kiro_command(prompt_path: str) -> list[str]:
    """Assemble the kiro-cli invocation.

    Extracted so the highest-blast-radius flags (--model, --effort) can be unit
    tested without executing a subprocess. The model and effort are pinned (not
    'auto') to keep findings consistent across runs; both are overridable via
    KIRO_MODEL / KIRO_EFFORT.
    """
    return [
        "kiro-cli", "chat",
        "--no-interactive",
        "--model", os.environ.get("KIRO_MODEL", "claude-opus-4.8"),
        "--effort", os.environ.get("KIRO_EFFORT", "high"),
        "--trust-tools=read,write,shell",
        f"Read and follow the instructions in {prompt_path}",
    ]


def run_kiro_assessment(
    prompt: str,
    validate_json: bool = False,
    required_keys: tuple[str, ...] = ("findings",),
) -> str:
    """Pipe a prompt through Kiro headless and return the assessment.

    Kiro writes the assessment to a temp file to avoid terminal UI noise in stdout.
    The prompt must include an {output_file} placeholder that will be replaced with
    the path to the temp file.

    If validate_json is True, the output is parsed as JSON after each attempt
    and must be an object containing every key in required_keys. If it isn't,
    the attempt is retried (up to max_retries). This avoids regex fallback
    parsing and ensures structured output. The default required_keys matches
    the risk reviewers' output shape; callers with a different shape pass
    their own.

    Environment:
        KIRO_API_KEY    - Required API key for authentication
        KIRO_TIMEOUT    - Max seconds per invocation (default 600)
        KIRO_MODEL      - Model to use (default claude-opus-4.8). Pinned to
                          avoid variance from auto-routing across different models.
        KIRO_EFFORT     - Effort level (default high). Higher effort produces
                          more thorough and consistent assessments.

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

        # Prepend shared review agent preamble from steering file.
        preamble = load_preamble()
        formatted_prompt = preamble + formatted_prompt

        # Write prompt to a temp file to avoid OS argument length limits.
        # Large prompts (many diff chunks, full source) can exceed the ~2MB
        # argv limit when passed as a command-line argument.
        prompt_file = tempfile.NamedTemporaryFile(
            mode="w", suffix=".md", delete=False, dir=str(PROJECT_ROOT)
        )
        prompt_file.write(formatted_prompt)
        prompt_file.close()
        prompt_path = prompt_file.name

        try:
            cmd = _build_kiro_command(prompt_path)
            result = subprocess.run(
                cmd,
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
                if ("rate limit" in stderr.lower() or "quota exceeded" in stderr.lower()) and attempt < max_retries - 1:
                    wait = (attempt + 1) * 30
                    print(f"  Rate limited, retrying in {wait}s (attempt {attempt + 1}/{max_retries})...")
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
                parsed = _parse_risk_json(output, required_keys)
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
            if os.path.isfile(prompt_path):
                os.unlink(prompt_path)

    # If we got output but it wasn't valid JSON, return it anyway
    if last_output:
        return last_output
    raise KiroError("kiro-cli exhausted all retries")


def strip_markdown_fences(text: str) -> str:
    """Strip markdown code fences from text if present.

    Handles both ```json\\n...\\n``` and ```\\n...\\n``` patterns.
    Returns the inner content stripped of the fence lines.
    """
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        if lines[-1].strip() == "```":
            lines = lines[1:-1]
        else:
            lines = lines[1:]
        text = "\n".join(lines).strip()
    return text


def _parse_risk_json(raw: str, required_keys: tuple[str, ...] = ("findings",)) -> dict | None:
    """Try to parse Kiro's risk assessment output as JSON.

    Handles cases where Kiro wraps JSON in markdown fences.
    Returns the parsed dict, or None if parsing fails or the dict is missing
    any of required_keys.
    """
    text = strip_markdown_fences(raw)

    try:
        data = json.loads(text)
        if isinstance(data, dict) and all(key in data for key in required_keys):
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
