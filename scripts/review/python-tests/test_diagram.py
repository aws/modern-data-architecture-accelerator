"""Tests for the shared L3 architecture diagram helpers."""

from __future__ import annotations

import base64
import sys
import urllib.parse
import zlib
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from review.lib.diagram import (
    DiagramParseError,
    changed_diagrams,
    describe_diagram,
    diagram_source_hash,
    parse_drawio,
    thread_source_hash,
)

GUARDRAIL = "packages/constructs/L3/ai/bedrock-guardrail-l3-construct"
BUILDER = "packages/constructs/L3/ai/bedrock-builder-l3-construct"

MODEL = """\
<mxGraphModel><root>
  <mxCell id="0"/>
  <mxCell id="1" parent="0"/>
  <mxCell id="guardrail" value="Bedrock&lt;br&gt;Guardrail" vertex="1" parent="1"/>
  <mxCell id="key" value="KMS Key" vertex="1" parent="1"/>
  <mxCell id="icon" value="" vertex="1" parent="1"/>
  <object id="harness" label="&lt;b&gt;AgentCore&lt;/b&gt;&amp;nbsp;Harness"><mxCell vertex="1" parent="1"/></object>
  <mxCell id="e1" value="Encrypted by" edge="1" parent="1" source="guardrail" target="key"/>
  <mxCell id="e2" value="" edge="1" parent="1" source="harness" target="guardrail"/>
  <mxCell id="e2-label" value="Uses (Optional)" style="edgeLabel" vertex="1" parent="e2"/>
  <mxCell id="e3" value="" edge="1" parent="1" source="icon" target="harness"/>
  <mxCell id="e4" value="Floating arrow" edge="1" parent="1"/>
</root></mxGraphModel>"""


def _mxfile(page: str) -> str:
    return f'<mxfile host="Electron"><diagram name="Page-1" id="p1">{page}</diagram></mxfile>'


def _compressed(model: str) -> str:
    deflate = zlib.compressobj(wbits=-15)
    raw = deflate.compress(urllib.parse.quote(model).encode()) + deflate.flush()
    return base64.b64encode(raw).decode()


def _construct(tmp_path: Path, root: str, docs: dict[str, str]) -> None:
    (tmp_path / root / "lib").mkdir(parents=True)
    (tmp_path / root / "docs").mkdir()
    for name, content in docs.items():
        (tmp_path / root / "docs" / name).write_text(content)


class TestChangedDiagrams:
    def test_lib_change_selects_the_construct_diagram(self, tmp_path):
        _construct(tmp_path, GUARDRAIL, {"bedrock-guardrail.drawio": "<mxfile/>"})
        changed = [f"{GUARDRAIL}/lib/bedrock-guardrail-l3-construct.ts"]
        assert changed_diagrams(changed, tmp_path) == [f"{GUARDRAIL}/docs/bedrock-guardrail.drawio"]

    def test_docs_change_selects_the_construct_diagram(self, tmp_path):
        _construct(tmp_path, GUARDRAIL, {"bedrock-guardrail.drawio": "<mxfile/>"})
        changed = [f"{GUARDRAIL}/docs/bedrock-guardrail.png"]
        assert changed_diagrams(changed, tmp_path) == [f"{GUARDRAIL}/docs/bedrock-guardrail.drawio"]

    def test_construct_without_drawio_is_skipped(self, tmp_path):
        _construct(tmp_path, GUARDRAIL, {"bedrock-guardrail.png": ""})
        assert changed_diagrams([f"{GUARDRAIL}/lib/index.ts"], tmp_path) == []

    def test_test_readme_and_app_changes_are_ignored(self, tmp_path):
        _construct(tmp_path, GUARDRAIL, {"bedrock-guardrail.drawio": "<mxfile/>"})
        changed = [
            f"{GUARDRAIL}/test/bedrock-guardrail.compliance.test.ts",
            f"{GUARDRAIL}/README.md",
            "packages/apps/ai/bedrock-builder-app/lib/config-schema.json",
            "packages/constructs/L2/s3-constructs/lib/index.ts",
        ]
        assert changed_diagrams(changed, tmp_path) == []

    def test_each_construct_listed_once(self, tmp_path):
        _construct(tmp_path, GUARDRAIL, {"bedrock-guardrail.drawio": "<mxfile/>"})
        changed = [f"{GUARDRAIL}/lib/a.ts", f"{GUARDRAIL}/lib/b.ts", f"{GUARDRAIL}/docs/bedrock-guardrail.drawio"]
        assert changed_diagrams(changed, tmp_path) == [f"{GUARDRAIL}/docs/bedrock-guardrail.drawio"]


class TestParseDrawio:
    def test_shape_labels_are_plain_text(self):
        content = parse_drawio(_mxfile(MODEL))
        assert content.labels == ("AgentCore Harness", "Bedrock Guardrail", "KMS Key")

    def test_edge_labels_are_not_shape_labels(self):
        content = parse_drawio(_mxfile(MODEL))
        assert "Uses (Optional)" not in content.labels
        assert "Encrypted by" not in content.labels

    def test_connections_name_both_ends_and_the_edge_label(self):
        content = parse_drawio(_mxfile(MODEL))
        assert "Bedrock Guardrail -> KMS Key [Encrypted by]" in content.connections
        assert "AgentCore Harness -> Bedrock Guardrail [Uses (Optional)]" in content.connections

    def test_unlabelled_endpoint_and_floating_edge(self):
        content = parse_drawio(_mxfile(MODEL))
        assert "(unlabelled shape) -> AgentCore Harness" in content.connections
        assert "(unattached) -> (unattached) [Floating arrow]" in content.connections

    def test_unlabelled_icon_takes_its_labelled_group_label(self):
        model = """<mxGraphModel><root>
  <mxCell id="0"/><mxCell id="1" parent="0"/>
  <mxCell id="role-box" value="Harness Role" vertex="1" parent="1"/>
  <mxCell id="role-icon" value="" vertex="1" parent="role-box"/>
  <mxCell id="harness" value="AgentCore Harness" vertex="1" parent="1"/>
  <mxCell id="e" value="Assumed by" edge="1" parent="1" source="role-icon" target="harness"/>
</root></mxGraphModel>"""
        assert "Harness Role -> AgentCore Harness [Assumed by]" in parse_drawio(model).connections

    def test_unlabelled_unattached_edge_is_dropped(self):
        model = """<mxGraphModel><root>
  <mxCell id="0"/><mxCell id="1" parent="0"/>
  <mxCell id="e" value="" edge="1" parent="1"/>
</root></mxGraphModel>"""
        assert parse_drawio(model).connections == ()

    def test_long_labels_are_capped(self):
        model = f"""<mxGraphModel><root>
  <mxCell id="0"/><mxCell id="1" parent="0"/>
  <mxCell id="long" value="{'x' * 500}" vertex="1" parent="1"/>
</root></mxGraphModel>"""
        assert parse_drawio(model).labels == ("x" * 200,)

    def test_builder_diagram_names_role_icons_by_their_group(self):
        drawio = Path(__file__).resolve().parents[3] / BUILDER / "docs" / "bedrock-builder.drawio"
        connections = parse_drawio(drawio.read_text()).connections
        assert "Harness Role -> AgentCore Harness [Assumed by]" in connections
        assert "Gateway Role -> AgentCore Gateway [Assumed by]" in connections

    def test_compressed_page(self):
        assert parse_drawio(_mxfile(_compressed(MODEL))) == parse_drawio(_mxfile(MODEL))

    def test_bare_graph_model(self):
        assert parse_drawio(MODEL) == parse_drawio(_mxfile(MODEL))

    @pytest.mark.parametrize("text", ["not xml", _mxfile("not-base64!")])
    def test_invalid_diagram_raises(self, text):
        with pytest.raises(DiagramParseError):
            parse_drawio(text)


class TestDescribeDiagram:
    def test_reports_files_changes_labels_and_connections(self, tmp_path):
        drawio = f"{GUARDRAIL}/docs/bedrock-guardrail.drawio"
        _construct(tmp_path, GUARDRAIL, {"bedrock-guardrail.drawio": _mxfile(MODEL), "bedrock-guardrail.png": ""})

        state = describe_diagram(drawio, [drawio, f"{GUARDRAIL}/lib/index.ts"], tmp_path)

        assert "['bedrock-guardrail.drawio', 'bedrock-guardrail.png']" in state
        assert "changed in this MR: ['bedrock-guardrail.drawio']" in state
        assert "'KMS Key'" in state
        assert "    - Bedrock Guardrail -> KMS Key [Encrypted by]" in state

    def test_unchanged_empty_diagram(self, tmp_path):
        drawio = f"{GUARDRAIL}/docs/bedrock-guardrail.drawio"
        _construct(tmp_path, GUARDRAIL, {"bedrock-guardrail.drawio": _mxfile("<mxGraphModel><root/></mxGraphModel>")})

        state = describe_diagram(drawio, [f"{GUARDRAIL}/lib/index.ts"], tmp_path)

        assert "changed in this MR: NONE" in state
        assert "shape labels: NONE" in state
        assert "    - NONE" in state

    def test_unreadable_diagram_is_reported_not_raised(self, tmp_path):
        drawio = f"{GUARDRAIL}/docs/bedrock-guardrail.drawio"
        _construct(tmp_path, GUARDRAIL, {"bedrock-guardrail.drawio": "not xml"})

        assert "could not read the diagram" in describe_diagram(drawio, [], tmp_path)


class TestDiagramSourceHash:
    DRAWIO = f"{GUARDRAIL}/docs/bedrock-guardrail.drawio"

    def _setup(self, tmp_path):
        _construct(tmp_path, GUARDRAIL, {"bedrock-guardrail.drawio": _mxfile(MODEL)})
        lib = tmp_path / GUARDRAIL / "lib"
        lib.mkdir(parents=True, exist_ok=True)
        (lib / "index.ts").write_text("export const a = 1;\n")
        return lib

    def test_changes_when_the_construct_lib_changes(self, tmp_path):
        lib = self._setup(tmp_path)
        before = diagram_source_hash(self.DRAWIO, tmp_path)
        (lib / "index.ts").write_text("export const a = 2;\n")
        assert before and diagram_source_hash(self.DRAWIO, tmp_path) != before

    def test_changes_when_the_diagram_changes(self, tmp_path):
        self._setup(tmp_path)
        before = diagram_source_hash(self.DRAWIO, tmp_path)
        (tmp_path / self.DRAWIO).write_text(_mxfile("<mxGraphModel><root/></mxGraphModel>"))
        assert diagram_source_hash(self.DRAWIO, tmp_path) != before

    def test_missing_diagram_has_no_hash(self, tmp_path):
        assert diagram_source_hash(self.DRAWIO, tmp_path) == ""

    def test_thread_source_hash_uses_the_diagram_hash_for_drawio_keys(self, tmp_path):
        self._setup(tmp_path)
        assert thread_source_hash(self.DRAWIO, tmp_path) == diagram_source_hash(self.DRAWIO, tmp_path)
