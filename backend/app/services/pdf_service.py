"""PDF generation service for feedback reports using ReportLab."""

import io
import logging
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Table,
    TableStyle,
    Paragraph,
    Spacer,
)

logger = logging.getLogger(__name__)


def generate_feedback_pdf(
    title: str,
    transcript: str,
    feedback_rows: list[dict],
    created_at: str | None = None,
) -> bytes:
    """Generate a styled PDF report of the feedback for a narration.

    Args:
        title: The narration title/topic.
        transcript: The full transcript text.
        feedback_rows: List of feedback dicts with keys:
            error_class, original_sentence, error_part, explanation, corrected_sentence.
        created_at: ISO timestamp of the narration (optional).

    Returns:
        PDF file as bytes.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        topMargin=0.5 * inch,
        bottomMargin=0.5 * inch,
        leftMargin=0.5 * inch,
        rightMargin=0.5 * inch,
    )

    styles = getSampleStyleSheet()
    elements = []

    # ── Header ──
    title_style = ParagraphStyle(
        "CustomTitle",
        parent=styles["Title"],
        fontSize=18,
        textColor=colors.HexColor("#1a1a2e"),
        spaceAfter=6,
    )
    elements.append(Paragraph(f"Grammar Feedback Report", title_style))

    subtitle_style = ParagraphStyle(
        "Subtitle",
        parent=styles["Normal"],
        fontSize=11,
        textColor=colors.HexColor("#555555"),
        spaceAfter=4,
    )
    elements.append(Paragraph(f"Topic: {title}", subtitle_style))

    if created_at:
        try:
            dt = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
            date_str = dt.strftime("%B %d, %Y at %I:%M %p")
        except (ValueError, AttributeError):
            date_str = created_at
        elements.append(Paragraph(f"Date: {date_str}", subtitle_style))

    elements.append(Spacer(1, 12))

    # ── Transcript section ──
    transcript_header_style = ParagraphStyle(
        "TranscriptHeader",
        parent=styles["Heading2"],
        fontSize=13,
        textColor=colors.HexColor("#1a1a2e"),
        spaceAfter=4,
    )
    elements.append(Paragraph("Your Transcript", transcript_header_style))

    transcript_style = ParagraphStyle(
        "Transcript",
        parent=styles["Normal"],
        fontSize=9,
        textColor=colors.HexColor("#333333"),
        leading=13,
        spaceAfter=16,
    )
    elements.append(Paragraph(transcript, transcript_style))

    # ── Feedback table ──
    if not feedback_rows:
        elements.append(
            Paragraph(
                "No grammatical errors were found. Great job!",
                styles["Normal"],
            )
        )
    else:
        elements.append(Paragraph("Errors Found", transcript_header_style))
        elements.append(Spacer(1, 6))

        # Cell style for wrapping text in table
        cell_style = ParagraphStyle(
            "CellStyle",
            parent=styles["Normal"],
            fontSize=8,
            leading=10,
            wordWrap="CJK",
        )

        # Table header
        header = ["#", "Category", "Original Sentence", "Error Part", "Explanation", "Corrected Sentence"]

        # Table data
        data = [header]
        for i, row in enumerate(feedback_rows, 1):
            data.append([
                str(i),
                Paragraph(row.get("error_class", "").replace("_", " ").title(), cell_style),
                Paragraph(row.get("original_sentence", ""), cell_style),
                Paragraph(f'<b>{row.get("error_part", "")}</b>', cell_style),
                Paragraph(row.get("explanation", ""), cell_style),
                Paragraph(row.get("corrected_sentence", ""), cell_style),
            ])

        # Column widths (landscape A4 ≈ 11.69 inch, minus margins)
        col_widths = [0.3 * inch, 0.9 * inch, 2.2 * inch, 1.2 * inch, 2.8 * inch, 2.2 * inch]

        table = Table(data, colWidths=col_widths, repeatRows=1)
        table.setStyle(
            TableStyle([
                # Header row
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a1a2e")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 9),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
                ("TOPPADDING", (0, 0), (-1, 0), 8),
                # Data rows
                ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 1), (-1, -1), 8),
                ("TOPPADDING", (0, 1), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 1), (-1, -1), 5),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                # Alternating row colors
                *[
                    ("BACKGROUND", (0, i), (-1, i), colors.HexColor("#f8f9fa"))
                    for i in range(2, len(data), 2)
                ],
                # Grid
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#dee2e6")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (0, 0), (0, -1), "CENTER"),
            ])
        )

        elements.append(table)

    # Build PDF
    doc.build(elements)
    pdf_bytes = buffer.getvalue()
    buffer.close()

    logger.info("PDF generated: %d bytes, %d feedback rows", len(pdf_bytes), len(feedback_rows))
    return pdf_bytes
