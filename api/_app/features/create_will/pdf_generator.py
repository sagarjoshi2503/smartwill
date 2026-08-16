"""Server-side PDF generation for the All India (Non-Goan) Will.

Renders templates/all_india_will.yaml.j2 (see that file's header comment
for the block-type vocabulary) into a flat list of content blocks via
Jinja2 + PyYAML, then walks that list once building a ReportLab Platypus
story. Pure-Python (ReportLab + Jinja2 + PyYAML have no native system
dependencies), so this runs identically on Vercel serverless, AKS, and
local Docker — see api/CLAUDE.md's "no code path knows which of these
three it's running under" principle.
"""

import io
import json
from pathlib import Path

import yaml
from jinja2 import Environment
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import BaseDocTemplate, Frame, PageBreak, PageTemplate, Paragraph

from _app.features.create_will.pdf_context import build_pdf_context

TEMPLATE_PATH = Path(__file__).parent / "templates" / "all_india_will.yaml.j2"

_MARGIN = 25.4 * mm
# Matches the browser preview's `.pdf-page-content{padding-bottom:10mm}`
# (AllIndiaWillDocument.tsx) — the bottom slice of the normal 1" margin
# reserved for the per-page signature footer, so body content never
# collides with it.
_FOOTER_RESERVE = 10 * mm
_FOOTER_TEXT = "Testator's Signature: __________ Witness 1: ______ Witness 2: ______"

_env = Environment(trim_blocks=True, lstrip_blocks=True)
_env.filters["yamlstr"] = json.dumps

_STYLES = {
    "title": ParagraphStyle(
        "title", fontName="Times-Bold", fontSize=16, leading=20, alignment=TA_CENTER, spaceAfter=14,
    ),
    "heading": ParagraphStyle(
        "heading", fontName="Times-Bold", fontSize=13, leading=18, alignment=TA_CENTER, spaceAfter=14,
    ),
    "subheading": ParagraphStyle(
        "subheading", fontName="Times-Roman", fontSize=12, leading=20, spaceAfter=4,
    ),
    "paragraph": ParagraphStyle(
        "paragraph", fontName="Times-Roman", fontSize=12, leading=20, alignment=TA_JUSTIFY, spaceAfter=10,
    ),
}


def _draw_signature_footer(canvas, doc) -> None:
    """Runs automatically on every page ReportLab paginates to — this is
    the real, server-side equivalent of the browser preview's CSS
    `position:absolute;bottom:0` trick (AllIndiaWillDocument.tsx): the
    testator/witness attestation line is a legal requirement on every
    physical page, not just the final signature page."""
    canvas.saveState()
    canvas.setFont("Times-Roman", 10)
    canvas.drawString(doc.leftMargin, doc.bottomMargin + 2 * mm, _FOOTER_TEXT)
    canvas.restoreState()


def _build_story(blocks: list) -> list:
    story = []
    for block in blocks:
        if not isinstance(block, dict):
            continue
        block_type = block.get("type")
        if block_type == "pagebreak":
            story.append(PageBreak())
            continue
        style = _STYLES.get(block_type)
        text = block.get("text")
        if style is not None and text:
            story.append(Paragraph(text, style))
    return story


def generate_all_india_will_pdf(will_data: dict) -> bytes:
    context = build_pdf_context(will_data)
    template_text = TEMPLATE_PATH.read_text(encoding="utf-8")
    rendered_yaml = _env.from_string(template_text).render(**context)
    blocks = yaml.safe_load(rendered_yaml) or []

    buffer = io.BytesIO()
    doc = BaseDocTemplate(
        buffer, pagesize=A4,
        topMargin=_MARGIN, bottomMargin=_MARGIN, leftMargin=_MARGIN, rightMargin=_MARGIN,
    )
    content_height = doc.height - _FOOTER_RESERVE
    frame = Frame(doc.leftMargin, doc.bottomMargin + _FOOTER_RESERVE, doc.width, content_height, id="body")
    doc.addPageTemplates([PageTemplate(id="all-india-will", frames=[frame], onPage=_draw_signature_footer)])

    doc.build(_build_story(blocks))
    return buffer.getvalue()
