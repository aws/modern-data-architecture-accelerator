"""
Shared helpers for reviewing L3 construct architecture diagrams.

Each L3 construct may keep an editable ``docs/*.drawio`` and its exported ``docs/*.png``.
These helpers find the diagrams an MR could have made stale and describe what a diagram
depicts (shape labels and the connections between shapes) as plain text for a Kiro prompt.
"""

from __future__ import annotations

import base64
import hashlib
import html
import re
import urllib.parse
import xml.etree.ElementTree as ET
import zlib
from dataclasses import dataclass
from pathlib import Path

from review.lib.thread_lifecycle import compute_file_source_hash, compute_source_hash

# A change under an L3 construct's lib/ (what it deploys) or docs/ (the diagram itself).
_L3_DIAGRAM_INPUT = re.compile(r"^(packages/constructs/L3/[^/]+/[^/]+)/(?:lib|docs)/")


class DiagramParseError(Exception):
    """Raised when a .drawio file is not valid draw.io XML."""


@dataclass(frozen=True)
class DiagramContent:
    """What a draw.io diagram depicts."""

    labels: tuple[str, ...]
    connections: tuple[str, ...]


def changed_diagrams(changed_files: list[str], project_root: Path) -> list[str]:
    """Return the ``.drawio`` paths of L3 constructs whose ``lib/`` or ``docs/`` changed.

    Paths are relative to ``project_root``. Constructs without a ``docs/*.drawio`` are
    skipped: a missing diagram is a module-quality finding, not a currency one.
    """
    roots = {m.group(1) for m in map(_L3_DIAGRAM_INPUT.match, changed_files) if m}
    return sorted(
        str(drawio.relative_to(project_root))
        for root in roots
        for drawio in (project_root / root / "docs").glob("*.drawio")
    )


def _cell_label(value: str | None) -> str:
    """Render a draw.io cell value (HTML-formatted text) as one line of plain text."""
    text = html.unescape(re.sub(r"<[^>]+>", " ", value or ""))
    # Capped: labels reach a Kiro prompt, and compressed pages are unreadable in the MR diff.
    return " ".join(text.split())[:200]


def _graph_models(drawio_text: str) -> list[ET.Element]:
    """Return each page's ``mxGraphModel``, inflating pages saved in compressed form."""
    try:
        root = ET.fromstring(drawio_text)
        if root.tag == "mxGraphModel":
            return [root]
        models = []
        for page in root.iter("diagram"):
            model = page.find("mxGraphModel")
            if model is None and (page.text or "").strip():
                inflated = zlib.decompress(base64.b64decode(page.text.strip()), -15)
                model = ET.fromstring(urllib.parse.unquote(inflated.decode("utf-8")))
            if model is not None:
                models.append(model)
        return models
    except (ET.ParseError, ValueError, zlib.error, UnicodeDecodeError) as e:
        raise DiagramParseError(str(e)) from e


def parse_drawio(drawio_text: str) -> DiagramContent:
    """Extract the shape labels and labelled connections a draw.io diagram depicts.

    A connection is rendered as ``source -> target``, followed by the edge's label in
    brackets when it has one. Edge labels may be stored on the edge itself or on child
    label cells. Shapes wrapped in ``<object>``/``<UserObject>`` take the wrapper's label.
    """
    labels: dict[str, str] = {}
    cells: dict[str, ET.Element] = {}
    for model in _graph_models(drawio_text):
        for element in model.iter():
            if element.tag in ("object", "UserObject"):
                cell = element.find("mxCell")
                if cell is not None and element.get("id"):
                    cells[element.get("id")] = cell
                    labels[element.get("id")] = _cell_label(element.get("label"))
            elif element.tag == "mxCell" and element.get("id"):
                cells[element.get("id")] = element
                labels[element.get("id")] = _cell_label(element.get("value"))

    edge_ids = {cell_id for cell_id, cell in cells.items() if cell.get("edge") == "1"}
    edge_labels = {
        edge_id: [labels[edge_id]] if labels[edge_id] else [] for edge_id in edge_ids
    }
    for cell_id, cell in cells.items():
        if cell.get("parent") in edge_ids and labels[cell_id]:
            edge_labels[cell.get("parent")].append(labels[cell_id])

    shape_labels = {
        labels[cell_id]
        for cell_id, cell in cells.items()
        if labels[cell_id] and cell_id not in edge_ids and cell.get("parent") not in edge_ids
    }

    def endpoint(cell_id: str | None) -> str:
        if not cell_id:
            return "(unattached)"
        # An unlabelled icon inside a labelled group (a role icon in its labelled box) takes the group's label.
        parent = cells[cell_id].get("parent") if cell_id in cells else None
        return labels.get(cell_id, "") or labels.get(parent or "", "") or "(unlabelled shape)"

    connections = set()
    for edge_id in edge_ids:
        edge = cells[edge_id]
        if not edge.get("source") and not edge.get("target") and not edge_labels[edge_id]:
            continue
        text = f"{endpoint(edge.get('source'))} -> {endpoint(edge.get('target'))}"
        if edge_labels[edge_id]:
            text += f" [{' / '.join(edge_labels[edge_id])}]"
        connections.add(text)

    return DiagramContent(labels=tuple(sorted(shape_labels)), connections=tuple(sorted(connections)))


def describe_diagram(drawio_path: str, changed_files: list[str], project_root: Path) -> str:
    """Describe a construct's diagram files and what its ``.drawio`` depicts, for a prompt."""
    docs_dir = Path(drawio_path).parent
    docs_files = sorted(p.name for p in (project_root / docs_dir).iterdir() if p.is_file())
    changed_docs = sorted(Path(f).name for f in changed_files if Path(f).parent == docs_dir)

    lines = [
        f"Diagram source: {drawio_path}",
        f"  files in {docs_dir}/: {docs_files or 'NONE'}",
        f"  changed in this MR: {changed_docs or 'NONE'}",
    ]
    try:
        content = parse_drawio((project_root / drawio_path).read_text(encoding="utf-8"))
    except (OSError, DiagramParseError) as e:
        lines.append(f"  (could not read the diagram: {e})")
        return "\n".join(lines)

    lines.append(f"  shape labels: {list(content.labels) or 'NONE'}")
    lines.append("  connections:")
    lines.extend(f"    - {c}" for c in content.connections or ("NONE",))
    return "\n".join(lines)


def diagram_source_hash(drawio_path: str, project_root: Path) -> str:
    """Hash a diagram together with its construct's ``lib/`` sources.

    A diagram-currency finding is caused by a ``lib/`` change while the ``.drawio`` stays the same,
    so a thread keyed by the ``.drawio`` must see ``lib/`` changes as source changes.
    """
    drawio = project_root / drawio_path
    if not drawio.is_file():
        return ""
    hasher = hashlib.sha256(drawio.read_bytes())
    hasher.update(compute_source_hash(str(drawio.parent.parent / "lib")).encode())
    return hasher.hexdigest()[:12]


def thread_source_hash(file_path: str, project_root: Path) -> str:
    """Source hash for a doc-quality thread keyed by ``file_path``: a diagram's covers its construct's lib/."""
    if file_path.endswith(".drawio"):
        return diagram_source_hash(file_path, project_root)
    return compute_file_source_hash(file_path)
