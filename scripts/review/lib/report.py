"""
Code Quality report generation for review tools.

Generates GitLab Code Quality JSON reports from review agent findings.
Findings appear inline on the MR diff in the Code Quality tab.
"""
from __future__ import annotations

import hashlib
import json

from review.lib.gitlab_threads import _parse_source_position


# Severity mapping from agent risk levels to GitLab Code Quality severity
_SEVERITY_MAP = {
    "BLOCKING": "blocker",
    "HIGH": "critical",
    "MEDIUM": "major",
    "LOW": "minor",
    "UNKNOWN": "info",
}


def to_codequality_json(entries: list[dict], agent_name: str = "review") -> str:
    """Generate GitLab Code Quality report JSON from review findings.

    Each entry must have:
      - package or module: package/module name
      - findings: list of finding dicts, each with:
        - file: source file path
        - line: line number (0 means unknown)
        - risk: severity level (BLOCKING, HIGH, MEDIUM, LOW)
        - category: finding category
        - detail: description of the issue
        - source_hash: (optional) chunk content hash for stable fingerprint

    For baseline entries, findings have:
      - source: "file:Lline" format
      - resource: affected resource
      - change: description
      - risk: severity
      - source_hash: chunk hash

    Returns a JSON string in GitLab Code Quality format.
    """
    issues: list[dict] = []

    for entry in entries:
        findings = entry.get("findings", [])

        for finding in findings:
            # Determine file and line
            file_path = finding.get("file", "")
            line = finding.get("line", 0)

            # Baseline findings use "source" field instead of file/line
            if not file_path and finding.get("source"):
                source = finding["source"]
                parsed = _parse_source_position(source)
                if parsed:
                    file_path, line = parsed
                elif source != "Unknown - Please Investigate":
                    file_path = source

            if not file_path:
                continue  # Can't create a code quality issue without a file

            # Determine description
            detail = finding.get("detail", finding.get("change", ""))
            category = finding.get("category", "general")
            resource = finding.get("resource", "")
            if resource and not detail.startswith(resource):
                detail = f"{resource}: {detail}"

            # Prefix with agent name for identification in the Code Quality widget
            description = f"[{agent_name}] {detail}"

            # Severity
            risk = finding.get("risk", "UNKNOWN").upper()
            severity = _SEVERITY_MAP.get(risk, "info")

            # Fingerprint — stable across runs using source_hash or content
            source_hash = finding.get("source_hash", "")
            if source_hash:
                fingerprint = hashlib.md5(
                    f"{file_path}:{source_hash}:{category}".encode()
                ).hexdigest()
            else:
                fingerprint = hashlib.md5(
                    f"{file_path}:{line}:{category}:{detail[:100]}".encode()
                ).hexdigest()

            issues.append({
                "description": description,
                "check_name": f"{agent_name}/{category}",
                "fingerprint": fingerprint,
                "severity": severity,
                "location": {
                    "path": file_path,
                    "lines": {
                        "begin": max(line, 1),  # GitLab requires >= 1
                    },
                },
            })

    return json.dumps(issues, indent=2)
