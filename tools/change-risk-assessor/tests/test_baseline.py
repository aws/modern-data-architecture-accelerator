# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""Tests for baseline generation pipeline."""

import zipfile

from change_risk_assessor.baseline import (
    _zip_config_bundle,
    _zip_directory,
    _zip_templates,
)


class TestZipDirectory:
    def test_zips_all_files(self, tmp_path):
        src = tmp_path / "src"
        src.mkdir()
        (src / "a.txt").write_text("aaa")
        (src / "sub").mkdir()
        (src / "sub" / "b.txt").write_text("bbb")

        out = tmp_path / "out.zip"
        _zip_directory(source_dir=src, output_path=out)

        with zipfile.ZipFile(out) as zf:
            names = zf.namelist()
            assert "a.txt" in names
            assert "sub/b.txt" in names

    def test_excludes_by_prefix(self, tmp_path):
        src = tmp_path / "src"
        src.mkdir()
        (src / "keep.txt").write_text("keep")
        (src / "asset.abc123").mkdir()
        (src / "asset.abc123" / "code.js").write_text("js")

        out = tmp_path / "out.zip"
        _zip_directory(
            source_dir=src, output_path=out,
            exclude_prefixes=("asset.",),
        )

        with zipfile.ZipFile(out) as zf:
            names = zf.namelist()
            assert "keep.txt" in names
            assert not any("asset" in n for n in names)

    def test_excludes_by_name(self, tmp_path):
        src = tmp_path / "src"
        src.mkdir()
        (src / "keep.txt").write_text("keep")
        (src / ".DS_Store").write_text("junk")

        out = tmp_path / "out.zip"
        _zip_directory(
            source_dir=src, output_path=out,
            exclude_names=(".DS_Store",),
        )

        with zipfile.ZipFile(out) as zf:
            names = zf.namelist()
            assert "keep.txt" in names
            assert ".DS_Store" not in names


class TestZipConfigBundle:
    def test_excludes_git_and_node_modules(self, tmp_path):
        src = tmp_path / "config"
        src.mkdir()
        (src / "mdaa.yaml").write_text("config: true")
        (src / ".git").mkdir()
        (src / ".git" / "HEAD").write_text("ref")
        (src / "node_modules").mkdir()
        (src / "node_modules" / "pkg.js").write_text("pkg")

        out = tmp_path / "config.zip"
        _zip_config_bundle(config_path=src, output_path=out)

        with zipfile.ZipFile(out) as zf:
            names = zf.namelist()
            assert "mdaa.yaml" in names
            assert not any(".git" in n for n in names)
            assert not any("node_modules" in n for n in names)


class TestZipTemplates:
    def test_excludes_assets_and_stderr(self, tmp_path):
        src = tmp_path / "synth"
        src.mkdir()
        (src / "template.yaml").write_text("Resources: {}")
        (src / "synth_stderr.log").write_text("warnings")
        (src / "asset.abc123").mkdir()
        (src / "asset.abc123" / "lambda.zip").write_bytes(b"fake")

        out = tmp_path / "templates.zip"
        _zip_templates(synth_dir=src, output_path=out)

        with zipfile.ZipFile(out) as zf:
            names = zf.namelist()
            assert "template.yaml" in names
            assert "synth_stderr.log" not in names
            assert not any("asset" in n for n in names)
