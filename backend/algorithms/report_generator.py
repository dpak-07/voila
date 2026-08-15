import io
import re
from datetime import datetime, timezone
from typing import Any, Dict, List

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
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
    KeepTogether
)


class BarChartFlowable(Flowable):
    """Clean bar chart for PDF reports."""

    def __init__(self, rows: List[Dict[str, Any]], label_key: str, value_key: str, width: float = 6.9 * inch, height: float = 2.0 * inch, color=colors.HexColor("#4f46e5")):
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
        left = 2.2 * inch
        bar_area = self.width - left - 0.5 * inch
        row_h = self.height / max(1, len(self.rows))
        self.canv.setFont("Helvetica", 7.5)
        for idx, row in enumerate(self.rows):
            y = self.height - ((idx + 1) * row_h) + 4
            label = str(row.get(self.label_key) or "")[:35]
            value = float(row.get(self.value_key) or 0)
            bar_w = (value / max_value) * bar_area
            self.canv.setFillColor(colors.HexColor("#1e293b"))
            self.canv.drawString(0, y + 2, label)
            self.canv.setFillColor(self.color)
            self.canv.roundRect(left, y, bar_w, 9, 2, fill=1, stroke=0)
            self.canv.setFillColor(colors.HexColor("#0f172a"))
            self.canv.drawString(left + bar_w + 5, y + 1, f"{value:,.1f}")


class TrendChartFlowable(Flowable):
    """Line chart for sentiment and response time trends."""

    def __init__(self, rows: List[Dict[str, Any]], keys: List[str], width: float = 6.9 * inch, height: float = 2.0 * inch):
        super().__init__()
        self.rows = rows[-20:]
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
        self.canv.setFillColor(colors.HexColor("#64748b"))
        self.canv.drawString(left, 4, str(self.rows[0].get("day") or ""))
        self.canv.drawRightString(left + plot_w, 4, str(self.rows[-1].get("day") or ""))


class AnalyticsReportGenerator:
    """Builds a downloadable executive analytics PDF from the unified analytics payload."""

    def build_pdf(self, analysis: Dict[str, Any], filters: Dict[str, Any] | None = None) -> bytes:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=0.5 * inch,
            leftMargin=0.5 * inch,
            topMargin=0.5 * inch,
            bottomMargin=0.5 * inch,
            title="Voila Voice-of-Customer Signal Intelligence Report",
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

        # 1. Header Banner
        header_table = Table(
            [
                [
                    Paragraph("<b>voila.ai</b> · Signal Intelligence", styles["Brand"]),
                    Paragraph(f"Generated: {datetime.now(timezone.utc).strftime('%b %d, %Y %H:%M UTC')}", styles["MetaRight"])
                ],
                [
                    Paragraph("Executive Voice-of-Customer Intelligence & Root Cause Report", styles["Title"]),
                    Paragraph(f"Filters: {self._filter_text(filters or {})}", styles["MetaRight"])
                ]
            ],
            colWidths=[4.8 * inch, 2.4 * inch]
        )
        header_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ]))
        story.append(header_table)
        story.append(Spacer(1, 0.15 * inch))

        # 2. Executive Synthesis Narrative
        story.append(Paragraph("Executive Plain-Language Intelligence Briefing", styles["H1"]))
        raw_summary = analysis.get("llm_summary") or "Operational metrics evaluated dynamically over the active ingestion dataset."
        # Format bold tags
        formatted_summary = re.sub(r'\*\*([^*]+)\*\*', r'<b>\1</b>', raw_summary)
        for para in formatted_summary.split('\n\n'):
            if para.strip():
                story.append(Paragraph(para.replace('\n', '<br/>'), styles["Body"]))
                story.append(Spacer(1, 0.08 * inch))
        story.append(Spacer(1, 0.12 * inch))

        # 3. Core Operational KPI Snapshot Cards (Table Format)
        story.append(Paragraph("Core Operational SLA & Quality KPIs", styles["H1"]))
        kpi_grid = [
            [
                Paragraph("<b>AVG RESPONSE TIME</b>", styles["KpiLabel"]),
                Paragraph("<b>RESOLUTION RATE</b>", styles["KpiLabel"]),
                Paragraph("<b>ESCALATION RATE</b>", styles["KpiLabel"]),
                Paragraph("<b>REOPEN RATE</b>", styles["KpiLabel"]),
                Paragraph("<b>NEGATIVE FRICTION</b>", styles["KpiLabel"]),
            ],
            [
                Paragraph(f"<font color='#d97706'><b>{self._num(kpis.get('avg_response_time_minutes')):.1f} min</b></font>", styles["KpiVal"]),
                Paragraph(f"<font color='#059669'><b>{self._num(kpis.get('fcr_rate') or kpis.get('resolution_rate')):.1f}%</b></font>", styles["KpiVal"]),
                Paragraph(f"<font color='#dc2626'><b>{self._num(kpis.get('escalation_rate')):.1f}%</b></font>", styles["KpiVal"]),
                Paragraph(f"<font color='#ea580c'><b>{self._num(kpis.get('reopen_rate')):.1f}%</b></font>", styles["KpiVal"]),
                Paragraph(f"<font color='#7c3aed'><b>{self._num(kpis.get('negative_sentiment_percentage')):.1f}%</b></font>", styles["KpiVal"]),
            ],
            [
                Paragraph("First contact speed", styles["KpiSub"]),
                Paragraph("Resolved tickets", styles["KpiSub"]),
                Paragraph("Manager escalations", styles["KpiSub"]),
                Paragraph("Reopened threads", styles["KpiSub"]),
                Paragraph("Customer tone", styles["KpiSub"]),
            ]
        ]
        kpi_tbl = Table(kpi_grid, colWidths=[1.44 * inch] * 5)
        kpi_tbl.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ('INNERGRID', (0, 0), (-1, -1), 0.25, colors.HexColor("#e2e8f0")),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(kpi_tbl)
        story.append(Spacer(1, 0.15 * inch))

        # 4. Top Ranked Customer Pain Points
        story.append(Paragraph("Ranked Complaint Themes & Customer Friction", styles["H1"]))
        chart_rows = [{"issue": t.get("cluster_name") or t.get("topic_keywords"), "pain_score": t.get("pain_score", 0)} for t in topics[:8]]
        if chart_rows:
            story.append(BarChartFlowable(chart_rows, "issue", "pain_score"))
            story.append(Spacer(1, 0.08 * inch))

        topic_table = [[
            Paragraph("<b>Rank</b>", styles["TH"]),
            Paragraph("<b>Complaint Category</b>", styles["TH"]),
            Paragraph("<b>Volume</b>", styles["TH"]),
            Paragraph("<b>Neg Tone %</b>", styles["TH"]),
            Paragraph("<b>Avg Response</b>", styles["TH"]),
        ]]
        for idx, t in enumerate(topics[:6], start=1):
            topic_name = str(t.get("cluster_name") or t.get("topic_keywords") or "General Inquiries")
            topic_table.append([
                Paragraph(f"#{idx}", styles["TD"]),
                Paragraph(f"<b>{topic_name}</b>", styles["TD"]),
                Paragraph(self._fmt(t.get("volume")), styles["TD"]),
                Paragraph(f"{self._num(t.get('negative_sentiment_percentage')):.1f}%", styles["TD"]),
                Paragraph(f"{self._num(t.get('avg_response_time')):.1f} min", styles["TD"]),
            ])
        story.append(self._table(topic_table, [0.6 * inch, 3.8 * inch, 1.0 * inch, 1.0 * inch, 0.8 * inch], header=True))
        story.append(Spacer(1, 0.15 * inch))

        # Page 2: Root Causes & Strategic Recommendations
        story.append(PageBreak())
        story.append(Paragraph("Systemic Root Cause Analysis (RCA) & Departmental Mapping", styles["H1"]))
        if root_causes:
            root_rows = [[
                Paragraph("<b>Rank</b>", styles["TH"]),
                Paragraph("<b>Failure Domain</b>", styles["TH"]),
                Paragraph("<b>Diagnosed Failure Mechanism</b>", styles["TH"]),
                Paragraph("<b>Owner</b>", styles["TH"]),
                Paragraph("<b>Prescribed Engineering / Support Fix</b>", styles["TH"])
            ]]
            for idx, rc in enumerate(root_causes[:6], start=1):
                root_rows.append([
                    Paragraph(f"#{idx}", styles["TD"]),
                    Paragraph(f"<b>{str(rc.get('issue') or rc.get('cluster_name') or '')}</b>", styles["TD"]),
                    Paragraph(str(rc.get('likely_root_cause') or rc.get('root_cause') or ''), styles["TD"]),
                    Paragraph(f"<font color='#4f46e5'><b>{str(rc.get('owner') or 'Support Operations')}</b></font>", styles["TD"]),
                    Paragraph(str(rc.get('recommended_fix') or ''), styles["TD"]),
                ])
            story.append(self._table(root_rows, [0.5 * inch, 1.5 * inch, 2.0 * inch, 1.2 * inch, 2.0 * inch], header=True))
        else:
            story.append(Paragraph("No root-cause analysis was generated for this dataset.", styles["Body"]))
        story.append(Spacer(1, 0.15 * inch))

        # Strategic Action Items
        story.append(Paragraph("Prioritized Leadership Action Items & Interventions", styles["H1"]))
        if recommendations:
            rec_rows = [[
                Paragraph("<b>#</b>", styles["TH"]),
                Paragraph("<b>Department Owner</b>", styles["TH"]),
                Paragraph("<b>Target Issue</b>", styles["TH"]),
                Paragraph("<b>Actionable Strategic Intervention</b>", styles["TH"])
            ]]
            for idx, rec in enumerate(recommendations[:6], start=1):
                rec_rows.append([
                    Paragraph(f"#{idx}", styles["TD"]),
                    Paragraph(f"<font color='#059669'><b>{str(rec.get('owner') or 'Support Operations')}</b></font>", styles["TD"]),
                    Paragraph(f"<b>{str(rec.get('issue') or '')}</b>", styles["TD"]),
                    Paragraph(str(rec.get('action') or rec.get('recommendation') or ''), styles["TD"]),
                ])
            story.append(self._table(rec_rows, [0.4 * inch, 1.4 * inch, 1.8 * inch, 3.6 * inch], header=True))
        story.append(Spacer(1, 0.15 * inch))

        # Dimensional Performance Breakdown
        if dims and (dims.get("by_product") or dims.get("by_region")):
            story.append(Paragraph("Dimensional Slicing (Product & Geographic Regions)", styles["H1"]))
            dim_grid = []
            by_prod = dims.get("by_product") or []
            by_reg = dims.get("by_region") or []
            
            p_rows = [[Paragraph("<b>Product</b>", styles["TH"]), Paragraph("<b>Volume</b>", styles["TH"]), Paragraph("<b>Neg %</b>", styles["TH"])]]
            for p in by_prod[:5]:
                p_rows.append([
                    Paragraph(str(p.get("product") or p.get("name")), styles["TD"]),
                    Paragraph(self._fmt(p.get("total_conversations") or p.get("count")), styles["TD"]),
                    Paragraph(f"{self._num(p.get('negative_sentiment_percentage')):.1f}%", styles["TD"])
                ])
            
            r_rows = [[Paragraph("<b>Region</b>", styles["TH"]), Paragraph("<b>Volume</b>", styles["TH"]), Paragraph("<b>Neg %</b>", styles["TH"])]]
            for r in by_reg[:5]:
                r_rows.append([
                    Paragraph(str(r.get("region") or r.get("name")), styles["TD"]),
                    Paragraph(self._fmt(r.get("total_conversations") or r.get("count")), styles["TD"]),
                    Paragraph(f"{self._num(r.get('negative_sentiment_percentage')):.1f}%", styles["TD"])
                ])
            
            prod_table = self._table(p_rows, [1.8 * inch, 0.9 * inch, 0.8 * inch], header=True)
            reg_table = self._table(r_rows, [1.8 * inch, 0.9 * inch, 0.8 * inch], header=True)
            
            dim_layout = Table([[prod_table, reg_table]], colWidths=[3.6 * inch, 3.6 * inch])
            dim_layout.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (-1, -1), 0),
                ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ]))
            story.append(dim_layout)

        doc.build(story, onFirstPage=self._footer, onLaterPages=self._footer)
        return buffer.getvalue()

    def _styles(self):
        base = getSampleStyleSheet()
        return {
            "Brand": ParagraphStyle("Brand", parent=base["Normal"], fontName="Helvetica-Bold", fontSize=14, leading=17, textColor=colors.HexColor("#4f46e5")),
            "Title": ParagraphStyle("Title", parent=base["Title"], fontName="Helvetica-Bold", fontSize=16, leading=20, textColor=colors.HexColor("#0f172a"), alignment=TA_LEFT),
            "MetaRight": ParagraphStyle("MetaRight", parent=base["Normal"], fontName="Helvetica", fontSize=8, leading=11, textColor=colors.HexColor("#64748b"), alignment=TA_RIGHT),
            "H1": ParagraphStyle("H1", parent=base["Heading1"], fontName="Helvetica-Bold", fontSize=11, leading=14, textColor=colors.HexColor("#0f172a"), spaceBefore=6, spaceAfter=4),
            "Body": ParagraphStyle("Body", parent=base["BodyText"], fontName="Helvetica", fontSize=8.5, leading=12, textColor=colors.HexColor("#334155")),
            "KpiLabel": ParagraphStyle("KpiLabel", fontName="Helvetica", fontSize=7, leading=9, textColor=colors.HexColor("#64748b"), alignment=TA_CENTER),
            "KpiVal": ParagraphStyle("KpiVal", fontName="Helvetica-Bold", fontSize=13, leading=16, alignment=TA_CENTER),
            "KpiSub": ParagraphStyle("KpiSub", fontName="Helvetica", fontSize=6.5, leading=8.5, textColor=colors.HexColor("#94a3b8"), alignment=TA_CENTER),
            "TH": ParagraphStyle("TH", fontName="Helvetica-Bold", fontSize=7.5, leading=10, textColor=colors.white, alignment=TA_LEFT),
            "TD": ParagraphStyle("TD", fontName="Helvetica", fontSize=7.5, leading=10, textColor=colors.HexColor("#1e293b"), alignment=TA_LEFT),
        }

    def _table(self, rows, widths, header=True):
        table = Table(rows, colWidths=widths, repeatRows=1 if header else 0)
        style = [
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#e2e8f0")),
            ("ROWBACKGROUNDS", (0, 1 if header else 0), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]
        if header:
            style.extend([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ])
        table.setStyle(TableStyle(style))
        return table

    def _footer(self, canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 7)
        canvas.setFillColor(colors.HexColor("#94a3b8"))
        canvas.drawString(0.5 * inch, 0.3 * inch, "voila.ai v2.4 — Confidential Voice-of-Customer Signal Intelligence")
        canvas.drawRightString(7.95 * inch, 0.3 * inch, f"Page {doc.page}")
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
        clean = {k: v for k, v in filters.items() if v and v != "all"}
        if not clean:
            return "All-Time Full Ingestion Dataset"
        return ", ".join(f"{k}: {v}" for k, v in clean.items())


report_generator = AnalyticsReportGenerator()
