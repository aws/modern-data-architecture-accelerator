"""Tests for diff_parser — pre-parsing unified diffs into structured chunks."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from review.lib.diff_parser import (
    parse_diff_chunks,
    format_chunks_for_prompt,
    attach_source_hashes,
    _compute_anchor_line,
    _compute_content_hash,
    DiffChunk,
)


class TestComputeAnchorLine:
    def test_deletion_anchors_to_first_context_after(self):
        """Deletion: anchor is the first context line after the removed lines."""
        hunk_lines = [
            "     const bucket = new MdaaBucket(this, 'auth-bucket', {",
            "       naming: this.naming,",
            "       encryption: BucketEncryption.KMS,",
            "-      removalPolicy: RemovalPolicy.DELETE,",
            "-      autoDeleteObjects: true,",
            "     });",
        ]
        # new_start=190, context lines at positions 0,1,2 → new_line 190,191,192
        # deletions don't increment → still 193
        # first context after deletions: "     });" → new_line 193
        assert _compute_anchor_line(190, hunk_lines) == 193

    def test_addition_anchors_to_first_context_after(self):
        """Addition: anchor is the first context line after the added lines."""
        hunk_lines = [
            "     this.bucket = bucket;",
            "+    // Tag each bucket",
            "+    Tags.of(bucket).add('zone', bucketDef.zone);",
            "     return bucket;",
            "   }",
        ]
        # new_start=352: context "this.bucket" → 352, +comment → 353, +Tags → 354
        # first context after: "return bucket;" → 355
        assert _compute_anchor_line(352, hunk_lines) == 355

    def test_modification_anchors_to_first_context_after(self):
        """Modification (adjacent - and +): anchor is first context after."""
        hunk_lines = [
            "       effect: Effect.ALLOW,",
            "-      actions: ['sqs:*'],",
            "+      actions: ['sqs:SendMessage', 'sqs:ReceiveMessage'],",
            "       resources: ['*'],",
            "     });",
        ]
        # new_start=183: context "effect" → 183, - doesn't increment,
        # + → 184, context "resources" → 185
        assert _compute_anchor_line(183, hunk_lines) == 185

    def test_eof_no_trailing_context(self):
        """Change at end of file with no trailing context: anchor is last new-file line."""
        hunk_lines = [
            "   }",
            "+  newMethod() {",
            "+    return true;",
            "+  }",
        ]
        # new_start=100: context "}" → 100, + → 101, + → 102, + → 103
        # No trailing context → anchor is last change line (103)
        assert _compute_anchor_line(100, hunk_lines) == 103

    def test_only_deletions_no_trailing_context(self):
        """Pure deletion at EOF: anchor is the position where deletions occurred."""
        hunk_lines = [
            "   }",
            "-  oldMethod() {",
            "-    return false;",
            "-  }",
        ]
        # new_start=100: context "}" → 100 (increments to 101)
        # deletions don't increment → last_change_new_line stays at 101
        # No context after deletions → anchor = 101
        assert _compute_anchor_line(100, hunk_lines) == 101

    def test_no_newline_marker_ignored(self):
        """'No newline at end of file' markers are skipped."""
        hunk_lines = [
            "   return true;",
            "+  // added comment",
            "\\ No newline at end of file",
        ]
        # new_start=50: context → 50, + → 51, \\ skipped
        # No trailing context → anchor = 51
        assert _compute_anchor_line(50, hunk_lines) == 51


class TestComputeContentHash:
    def test_includes_file_path(self):
        """Same content in different files produces different hashes."""
        h1 = _compute_content_hash("lib/a.ts", "some content")
        h2 = _compute_content_hash("lib/b.ts", "some content")
        assert h1 != h2

    def test_same_input_same_hash(self):
        """Deterministic: same inputs always produce same hash."""
        h1 = _compute_content_hash("lib/a.ts", "content")
        h2 = _compute_content_hash("lib/a.ts", "content")
        assert h1 == h2

    def test_hash_length(self):
        """Hash is 12 hex characters."""
        h = _compute_content_hash("file.ts", "stuff")
        assert len(h) == 12
        assert all(c in "0123456789abcdef" for c in h)


class TestParseDiffChunks:
    SAMPLE_DIFF = """\
diff --git a/lib/authorization.ts b/lib/authorization.ts
index abc1234..def5678 100644
--- a/lib/authorization.ts
+++ b/lib/authorization.ts
@@ -190,8 +190,6 @@ export class DataZoneAuthorization extends Construct {
     const bucket = new MdaaBucket(this, 'auth-bucket', {
       naming: this.naming,
       encryption: BucketEncryption.KMS,
-      removalPolicy: RemovalPolicy.DELETE,
-      autoDeleteObjects: true,
     });
     return bucket;
"""

    def test_parses_single_hunk(self):
        chunks = parse_diff_chunks(self.SAMPLE_DIFF)
        assert len(chunks) == 1
        assert chunks[0].file == "lib/authorization.ts"
        assert chunks[0].anchor_line == 193
        assert chunks[0].id == "chunk-0"

    def test_content_hash_stable(self):
        """Same diff always produces same content hash."""
        c1 = parse_diff_chunks(self.SAMPLE_DIFF)
        c2 = parse_diff_chunks(self.SAMPLE_DIFF)
        assert c1[0].content_hash == c2[0].content_hash

    def test_multiple_hunks_same_file(self):
        diff = """\
diff --git a/lib/foo.ts b/lib/foo.ts
--- a/lib/foo.ts
+++ b/lib/foo.ts
@@ -10,3 +10,4 @@ class Foo {
   method1() {
+    console.log('added');
     return 1;
   }
@@ -50,3 +51,4 @@ class Foo {
   method2() {
+    console.log('also added');
     return 2;
   }
"""
        chunks = parse_diff_chunks(diff)
        assert len(chunks) == 2
        assert chunks[0].file == "lib/foo.ts"
        assert chunks[1].file == "lib/foo.ts"
        assert chunks[0].anchor_line == 12  # "return 1;" after the addition
        assert chunks[1].anchor_line == 53  # "return 2;" after the addition
        assert chunks[0].content_hash != chunks[1].content_hash

    def test_multiple_files(self):
        diff = """\
diff --git a/lib/a.ts b/lib/a.ts
--- a/lib/a.ts
+++ b/lib/a.ts
@@ -1,3 +1,4 @@
 line1
+added
 line2
 line3
diff --git a/lib/b.ts b/lib/b.ts
--- a/lib/b.ts
+++ b/lib/b.ts
@@ -5,3 +5,4 @@
 x
+y
 z
 end
"""
        chunks = parse_diff_chunks(diff)
        assert len(chunks) == 2
        assert chunks[0].file == "lib/a.ts"
        assert chunks[1].file == "lib/b.ts"

    def test_empty_diff(self):
        assert parse_diff_chunks("") == []
        assert parse_diff_chunks("   ") == []

    def test_max_chunks_limit(self):
        # Build a diff with many hunks
        hunks = []
        for i in range(20):
            hunks.append(f"""\
diff --git a/lib/f{i}.ts b/lib/f{i}.ts
--- a/lib/f{i}.ts
+++ b/lib/f{i}.ts
@@ -1,2 +1,3 @@
 a
+b
 c
""")
        diff = "\n".join(hunks)
        chunks = parse_diff_chunks(diff, max_chunks=5)
        assert len(chunks) == 5


class TestFormatChunksForPrompt:
    def test_formats_with_metadata(self):
        diff = """\
diff --git a/lib/a.ts b/lib/a.ts
--- a/lib/a.ts
+++ b/lib/a.ts
@@ -10,3 +10,4 @@
 before
+added line
 after
 end
"""
        chunks = parse_diff_chunks(diff)
        formatted = format_chunks_for_prompt(chunks)
        assert "--- chunk-0 ---" in formatted
        assert "File: lib/a.ts" in formatted
        assert "Anchor: L12" in formatted
        assert "Hash:" in formatted
        assert "```diff" in formatted

    def test_empty_returns_message(self):
        assert format_chunks_for_prompt([]) == "(no code changes detected)"


class TestFormatChunkIndex:
    def test_includes_metadata_without_content(self):
        diff = """\
diff --git a/lib/a.ts b/lib/a.ts
--- a/lib/a.ts
+++ b/lib/a.ts
@@ -10,3 +10,4 @@
 before
+added line
 after
 end
"""
        from review.lib.diff_parser import parse_diff_chunks, format_chunk_index
        chunks = parse_diff_chunks(diff)
        index = format_chunk_index(chunks)
        # Should have chunk ID and metadata
        assert "chunk-0" in index
        assert "lib/a.ts" in index
        assert "Hash:" in index
        # Should have a preview of the change
        assert "Preview:" in index
        assert "+added line" in index
        # Should NOT have the full diff content (no ``` blocks)
        assert "```diff" not in index

    def test_empty_returns_message(self):
        from review.lib.diff_parser import format_chunk_index
        assert format_chunk_index([]) == "(no code changes detected)"

    def test_shows_count(self):
        diff = """\
diff --git a/lib/a.ts b/lib/a.ts
--- a/lib/a.ts
+++ b/lib/a.ts
@@ -1,2 +1,3 @@
 a
+b
 c
@@ -10,2 +11,3 @@
 x
+y
 z
"""
        from review.lib.diff_parser import parse_diff_chunks, format_chunk_index
        chunks = parse_diff_chunks(diff)
        index = format_chunk_index(chunks)
        assert "2 total" in index


class TestAttachSourceHashes:
    """Tests for attach_source_hashes."""

    def test_attaches_hash_to_matching_finding(self):
        chunks = [
            DiffChunk(id="chunk-0", file="lib/auth.ts", anchor_line=42, hunk_header="@@", content="+x", content_hash="abc123def456"),
            DiffChunk(id="chunk-1", file="lib/other.ts", anchor_line=10, hunk_header="@@", content="+y", content_hash="xyz789000111"),
        ]
        findings = [
            {"file": "lib/auth.ts", "line": 42, "detail": "issue"},
            {"file": "lib/other.ts", "line": 10, "detail": "another"},
        ]
        attach_source_hashes(findings, chunks)
        assert findings[0]["source_hash"] == "abc123def456"
        assert findings[1]["source_hash"] == "xyz789000111"

    def test_does_not_modify_non_matching_findings(self):
        chunks = [
            DiffChunk(id="chunk-0", file="lib/auth.ts", anchor_line=42, hunk_header="@@", content="+x", content_hash="abc123def456"),
        ]
        findings = [
            {"file": "lib/auth.ts", "line": 99, "detail": "no match"},
        ]
        attach_source_hashes(findings, chunks)
        assert "source_hash" not in findings[0]

    def test_handles_empty_findings_list(self):
        chunks = [
            DiffChunk(id="chunk-0", file="lib/auth.ts", anchor_line=42, hunk_header="@@", content="+x", content_hash="abc123def456"),
        ]
        findings: list[dict] = []
        attach_source_hashes(findings, chunks)
        assert findings == []

    def test_handles_empty_chunks_list(self):
        findings = [
            {"file": "lib/auth.ts", "line": 42, "detail": "issue"},
        ]
        attach_source_hashes(findings, [])
        assert "source_hash" not in findings[0]
