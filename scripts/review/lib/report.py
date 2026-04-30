"""
JUnit XML report generation for review tools.
"""
from __future__ import annotations

import re
from xml.etree.ElementTree import Element, SubElement, tostring
from xml.dom.minidom import parseString


def _sanitize_xml(text: str) -> str:
    """Remove characters that are invalid in XML 1.0."""
    return re.sub(
        r'[^\x09\x0A\x0D\x20-\uD7FF\uE000-\uFFFD\U00010000-\U0010FFFF]',
        '',
        text,
    )


def to_junit_xml(
    entries: list[dict],
    suite_name: str = "Review",
    failure_count: int | None = None,
) -> str:
    """Generate JUnit XML from a list of entry dicts.

    Each entry must have:
      - name: testcase name (e.g., "module/config")
      - file: file path
      - status: "pass", "fail", or "info"
      - message: failure message (only used when status is "fail")
      - detail: failure detail text (only used when status is "fail")
      - info: informational text (only used when status is "info")
    """
    if failure_count is None:
        failure_count = sum(1 for e in entries if e.get("status") == "fail")

    testsuites = Element("testsuites")
    testsuite = SubElement(testsuites, "testsuite", {
        "name": suite_name,
        "tests": str(len(entries)),
        "failures": str(failure_count),
    })

    for entry in entries:
        testcase = SubElement(testsuite, "testcase", {
            "name": entry["name"],
            "classname": suite_name.lower().replace(" ", "-"),
            "file": entry.get("file", ""),
        })

        if entry.get("status") == "fail":
            failure = SubElement(testcase, "failure", {
                "message": entry.get("message", ""),
            })
            failure.text = _sanitize_xml(entry.get("detail", ""))
        elif entry.get("status") == "info":
            SubElement(testcase, "system-out").text = entry.get("info", "")

    raw = tostring(testsuites, encoding="unicode")
    return parseString(raw).toprettyxml(indent="  ", encoding=None)
