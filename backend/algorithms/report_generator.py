import io
from datetime import datetime, timezone
from typing import Any, Dict, List

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    Flowable,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


class BarChartFlowable(Flowable):
    """Small dependency-light bar chart for PDF reports."""

    def __init__(self, rows: List[Dict[str, Any]], label_key: str, value_key: str, width: float = 6.7 * inch, height: float = 2.0 * inch, color=colors.HexColor("#4f46e5")):
        super().__init__()
        self.rows = rows[:8]
        self.label_key = label_key
        self.value_key = value_key
        self.width = width
        self.height = height
        self.color = color

    def draw(self):
        if not self.rows:
            return
        max_value = max(float(r.get(self.value_key) or 0) for r in self.rows) or 1.0
        left = 1.55 * inch
        bar_area = self.width - left - 0.45 * inch
        row_h = self.height / max(1, len(self.rows))
        self.canv.setFont("Helvetica", 7)
        for idx, row in enumerate(self.rows):
            y = self.height - ((idx + 1) * row_h) + 4
            label = str(row.get(self.label_key) or "")[:28]
            value = float(row.get(self.value_key) or 0)
            bar_w = (value / max_value) * bar_area
            self.canv.setFillColor(colors.HexColor("#334155"))
            self.canv.drawString(0, y + 3, label)
            self.canv.setFillColor(self.color)
            self.canv.roundRect(left, y, bar_w, 9, 2, fill=1, stroke=0)
            self.canv.setFillColor(colors.HexColor("#0f172a"))
            self.canv.drawString(left + bar_w + 4, y + 1, f"{value:,.1f}")


class TrendChartFlowable(Flowable):
    """Simple line chart for sentiment/service trends."""

    def __init__(self, rows: List[Dict[str, Any]], keys: List[str], width: float = 6.7 * inch, height: float = 2.1 * inch):
        super().__init__()
        self.rows = rows[-18:]
        self.keys = keys
        self.width = width
        self.height = height
        self.palette = [colors.HexColor("#10b981"), colors.HexColor("#ef4444"), colors.HexColor("#6366f1")]

    def draw(self):
        if len(self.rows) < 2:
            return
        left, bottom = 0.45 * inch, 0.28 * inch
        plot_w, plot_h = self.width - 0.7 * inch, self.height - 0.55 * inch
        max_val = max(float(row.get(k) or 0) for row in self.rows for k in self.keys) or 1.0
        self.canv.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.canv.line(left, bottom, left, bottom + plot_h)
        self.canv.line(left, bottom, left + plot_w, bottom)
        step = plot_w / max(1, len(self.rows) - 1)
        for k_idx, key in enumerate(self.keys):
            self.canv.setStrokeColor(self.palette[k_idx % len(self.palette)])
            self.canv.setLineWidth(1.5)
            points = []
            for idx, row in enumerate(self.rows):
                x = left + idx * step
                y = bottom + (float(row.get(key) or 0) / max_val) * plot_h
                points.append((x, y))
            for a, b in zip(points, points[1:]):
                self.canv.line(a[0], a[1], b[0], b[1])
        self.canv.setFont("Helvetica", 7)
        self.canv.setFillColor(colors.HexColor("#334155"))
        self.canv.drawString(left, 4, str(self.rows[0].get("day") or ""))
        self.canv.drawRightString(left + plot_w, 4, str(self.rows[-1].get("day") or ""))


class AnalyticsReportGenerator:
    """Builds a downloadable executive analytics PDF from the unified analytics payload."""

    def build_pdf(self, analysis: Dict[str, Any], filters: Dict[str, Any] | None = None) -> bytes:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=0.55 * inch,
            leftMargin=0.55 * inch,
            topMargin=0.55 * inch,
            bottomMargin=0.55 * inch,
            title="Voila Voice-of-Customer Analytics Report",
        )
        styles = self._styles()
        story = []

        kpis = analysis.get("kpi_metrics", {}) or {}
        sentiment = analysis.get("sentiment_distribution", {}) or {}
        topics = analysis.get("topic_summaries") or analysis.get("customer_pain_points") or []
        recommendations = analysis.get("recommendations") or []
        root_causes = analysis.get("root_cause_analysis") or []
        trends = analysis.get("trends") or {}
        dims = analysis.get("dimension_breakdowns") or {}

        story.append(Paragraph("Voila Voice-of-Customer Analytics Report", styles["Title"]))
        generated = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
        story.append(Paragraph(f"Generated {generated} | Filters: {self._filter_text(filters or {})}", styles["Meta"]))
        story.append(Spacer(1, 0.18 * inch))
        story.append(Paragraph(analysis.get("llm_summary") or "No executive summary is available for this dataset.", styles["Body"]))
        story.append(Spacer(1, 0.2 * inch))

        story.append(Paragraph("KPI Snapshot", styles["H1"]))
        kpi_rows = [
            ["Total conversations", self._fmt(kpis.get("total_conversations") or kpis.get("total_records"))],
            ["Avg response time", f"{self._num(kpis.get('avg_response_time_minutes')):.1f} min"],
            ["Resolution / FCR", f"{self._num(kpis.get('fcr_rate') or kpis.get('resolution_rate')):.1f}%"],
            ["Escalation rate", f"{self._num(kpis.get('escalation_rate')):.1f}%"],
            ["Reopen rate", f"{self._num(kpis.get('reopen_rate')):.1f}%"],
            ["Negative sentiment", f"{self._num(kpis.get('negative_sentiment_percentage')):.1f}%"],
        ]
        story.append(self._table(kpi_rows, [2.3 * inch, 1.5 * inch], header=None))
        story.append(Spacer(1, 0.16 * inch))

        story.append(Paragraph("Sentiment And Service Trends", styles["H1"]))
        sentiment_rows = trends.get("sentiment_trend") or []
        if sentiment_rows:
            story.append(TrendChartFlowable(sentiment_rows, ["positive", "negative", "neutral"]))
        else:
            dist_rows = [[k.title(), self._fmt(v.get("count")), f"{self._num(v.get('percentage')):.1f}%"] for k, v in sentiment.items() if isinstance(v, dict)]
            story.append(self._table([["Sentiment", "Count", "Share"]] + dist_rows, [1.7 * inch, 1.2 * inch, 1.2 * inch], header=True))
        story.append(Spacer(1, 0.2 * inch))

        story.append(Paragraph("Top Pain Points By Impact", styles["H1"]))
        chart_rows = [{"issue": t.get("cluster_name") or t.get("topic_keywords"), "pain_score": t.get("pain_score", 0)} for t in topics[:8]]
        story.append(BarChartFlowable(chart_rows, "issue", "pain_score"))
        topic_table = [["Rank", "Issue", "Volume", "Neg %", "Esc", "Avg Response"]]
        for idx, t in enumerate(topics[:8], start=1):
            topic_table.append([
                idx,
                str(t.get("cluster_name") or t.get("topic_keywords") or "")[:38],
                self._fmt(t.get("volume")),
                f"{self._num(t.get('negative_sentiment_percentage')):.1f}%",
                self._fmt(t.get("escalation_cases")),
                f"{self._num(t.get('avg_response_time')):.1f}m",
            ])
        story.append(self._table(topic_table, [0.45 * inch, 2.55 * inch, 0.72 * inch, 0.62 * inch, 0.55 * inch, 0.85 * inch], header=True))

        story.append(PageBreak())
        story.append(Paragraph("Root Cause Analysis", styles["H1"]))
        if root_causes:
            root_rows = [["Rank", "Issue", "Likely root cause", "Owner", "Recommended fix"]]
            for rc in root_causes[:6]:
                root_rows.append([
                    rc.get("rank"),
                    str(rc.get("issue") or "")[:24],
                    str(rc.get("likely_root_cause") or "")[:36],
                    str(rc.get("owner") or "")[:18],
                    str(rc.get("recommended_fix") or "")[:70],
                ])
            story.append(self._table(root_rows, [0.4 * inch, 1.35 * inch, 1.65 * inch, 0.9 * inch, 2.25 * inch], header=True, font_size=7))
        else:
            story.append(Paragraph("No root-cause analysis was generated for this dataset.", styles["Body"]))
        story.append(Spacer(1, 0.18 * inch))

        story.append(Paragraph("Prioritized Recommendations", styles["H1"]))
        if recommendations:
            rec_rows = [["Rank", "Owner", "Issue", "Action"]]
            for rec in recommendations[:6]:
                rec_rows.append([
                    rec.get("rank"),
                    str(rec.get("owner") or "")[:18],
                    str(rec.get("issue") or "")[:28],
                    str(rec.get("action") or "")[:80],
                ])
            story.append(self._table(rec_rows, [0.42 * inch, 1.1 * inch, 1.7 * inch, 3.3 * inch], header=True, font_size=7.3))
        else:
            story.append(Paragraph("No recommendations were generated.", styles["Body"]))
        story.append(Spacer(1, 0.18 * inch))

        if dims:
            story.append(Paragraph("Product / Region / Brand Breakdowns", styles["H1"]))
            for dim_name, rows in dims.items():
                if not rows:
                    continue
                story.append(Paragraph(dim_name.title(), styles["H2"]))
                key = dim_name
                dim_rows = [[dim_name.title(), "Volume", "Neg %", "Resolution"]]
                for row in rows[:6]:
                    dim_rows.append([
                        str(row.get(key) or "")[:26],
                        self._fmt(row.get("total_conversations")),
                        f"{self._num(row.get('negative_sentiment_percentage')):.1f}%",
                        f"{self._num(row.get('resolution_rate')):.1f}%",
                    ])
                story.append(self._table(dim_rows, [2.2 * inch, 0.9 * inch, 0.8 * inch, 0.9 * inch], header=True))
                story.append(Spacer(1, 0.1 * inch))

        story.append(Paragraph("Evidence Samples", styles["H1"]))
        samples = []
        for topic in topics:
            samples.extend(topic.get("sample_texts") or [])
            if len(samples) >= 5:
                break
        if samples:
            for sample in samples[:5]:
                text = str(sample.get("text") or "")[:350]
                story.append(Paragraph(f"- {text}", styles["Small"]))
                story.append(Spacer(1, 0.06 * inch))
        else:
            story.append(Paragraph("No conversation samples were available in this analytics payload.", styles["Body"]))

        doc.build(story, onFirstPage=self._footer, onLaterPages=self._footer)
        return buffer.getvalue()

    def _styles(self):
        base = getSampleStyleSheet()
        return {
            "Title": ParagraphStyle("Title", parent=base["Title"], fontName="Helvetica-Bold", fontSize=21, leading=25, textColor=colors.HexColor("#0f172a"), alignment=TA_LEFT, spaceAfter=8),
            "Meta": ParagraphStyle("Meta", parent=base["Normal"], fontName="Helvetica", fontSize=8, leading=11, textColor=colors.HexColor("#64748b")),
            "H1": ParagraphStyle("H1", parent=base["Heading1"], fontName="Helvetica-Bold", fontSize=12, leading=15, textColor=colors.HexColor("#1e293b"), spaceBefore=8, spaceAfter=6),
            "H2": ParagraphStyle("H2", parent=base["Heading2"], fontName="Helvetica-Bold", fontSize=9.5, leading=12, textColor=colors.HexColor("#334155"), spaceBefore=5, spaceAfter=3),
            "Body": ParagraphStyle("Body", parent=base["BodyText"], fontName="Helvetica", fontSize=9.2, leading=13, textColor=colors.HexColor("#334155")),
            "Small": ParagraphStyle("Small", parent=base["BodyText"], fontName="Helvetica", fontSize=7.8, leading=10.5, textColor=colors.HexColor("#475569")),
        }

    def _table(self, rows, widths, header=True, font_size=8):
        table = Table(rows, colWidths=widths, repeatRows=1 if header else 0)
        style = [
            ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 0), (-1, -1), font_size),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#cbd5e1")),
            ("ROWBACKGROUNDS", (0, 1 if header else 0), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]
        if header:
            style.extend([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ])
        table.setStyle(TableStyle(style))
        return table

    def _footer(self, canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 7)
        canvas.setFillColor(colors.HexColor("#64748b"))
        canvas.drawString(0.55 * inch, 0.32 * inch, "Voila Analytics - GenAI + RAG + Snowflake synchronized report")
        canvas.drawRightString(7.95 * inch, 0.32 * inch, f"Page {doc.page}")
        canvas.restoreState()

    def _num(self, value: Any) -> float:
        try:
            return float(value or 0)
        except (TypeError, ValueError):
            return 0.0

    def _fmt(self, value: Any) -> str:
        try:
            return f"{int(float(value or 0)):,}"
        except (TypeError, ValueError):
            return "0"

    def _filter_text(self, filters: Dict[str, Any]) -> str:
        clean = {k: v for k, v in filters.items() if v}
        if not clean:
            return "All data"
        return ", ".join(f"{k}={v}" for k, v in clean.items())
