"""
Shared pytest fixtures for baseline review tests.
"""
import os
import subprocess
import sys

import pytest

# Add the scripts/review/lib and scripts/review/baseline directories to Python path
# so we can import the modules under test.
review_root = os.path.join(os.path.dirname(__file__), "..")
scripts_root = os.path.join(review_root, "..")
sys.path.insert(0, scripts_root)

from review.lib import kiro_integration


class FakeKiro:
    """Stand-in for kiro-cli. Each run writes the next queued answer to the
    output file; once the queue is exhausted the last answer repeats."""

    def __init__(self, workdir):
        self.workdir = workdir
        self.answers = []
        self.calls = []

    def run(self, cmd, **kwargs):
        (output_path,) = self.workdir.glob("kiro-risk-*.json")
        output_path.write_text(self.answers[min(len(self.calls), len(self.answers) - 1)])
        self.calls.append(cmd)
        return subprocess.CompletedProcess(cmd, 0, stdout="", stderr="")


@pytest.fixture
def fake_kiro(monkeypatch, tmp_path):
    """Run the real run_kiro_assessment against a stubbed kiro-cli, without sleeps."""
    fake = FakeKiro(tmp_path)
    monkeypatch.setenv("KIRO_API_KEY", "test-key")
    monkeypatch.setattr(kiro_integration, "PROJECT_ROOT", tmp_path)
    monkeypatch.setattr(kiro_integration, "load_preamble", lambda: "")
    monkeypatch.setattr(kiro_integration.shutil, "which", lambda _: "/usr/bin/kiro-cli")
    monkeypatch.setattr(kiro_integration.subprocess, "run", fake.run)
    monkeypatch.setattr(kiro_integration.time, "sleep", lambda _: None)
    return fake
