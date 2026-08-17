import io
import re
import csv
import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set

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

    def __init__(self, rows: List[Dict[str, Any]], label_key: str, value_key: str, width: float = 6.9 * inch, height: float = 1.8 * inch, color=colors.HexColor("#4f46e5")):
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
        left = 2.4 * inch
        bar_area = self.width - left - 0.6 * inch
        row_h = self.height / max(1, len(self.rows))
        self.canv.setFont("Helvetica", 7.5)
        for idx, row in enumerate(self.rows):
            y = self.height - ((idx + 1) * row_h) + 4
            label = str(row.get(self.label_key) or "")[:38]
            value = float(row.get(self.value_key) or 0)
            bar_w = (value / max_value) * bar_area
            self.canv.setFillColor(colors.HexColor("#1e293b"))
            self.canv.drawString(0, y + 2, label)
            self.canv.setFillColor(self.color)
            self.canv.roundRect(left, y, max(3, bar_w), 8.5, 2, fill=1, stroke=0)
            self.canv.setFillColor(colors.HexColor("#0f172a"))
            self.canv.drawString(left + bar_w + 6, y + 1, f"{value:,.1f}")


class TrendChartFlowable(Flowable):
    """Clean trend chart for PDF reports."""

    def __init__(self, rows: List[Dict[str, Any]], keys: List[str], width: float = 6.9 * inch, height: float = 1.8 * inch):
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
    """Enterprise multi-format report generation engine supporting PDF, Markdown, JSON, and CSV."""

    def build_pdf(
        self,
        analysis: Dict[str, Any],
        filters: Optional[Dict[str, Any]] = None,
        report_type: str = "operational",
        sections: Optional[List[str]] = None,
        comparative_data: Optional[Dict[str, Any]] = None
    ) -> bytes:
        """Generates a styled, publication-ready executive PDF."""
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

        filters = filters or {}
        active_sections: Set[str] = set(sections) if sections else {
            "summary", "kpi_summary", "topics", "root_causes", "spikes", "trends", "recommendations", "dimensions"
        }

        kpis = analysis.get("kpi_metrics", {}) or {}
        topics = analysis.get("topic_summaries") or analysis.get("customer_pain_points") or []
        recommendations = analysis.get("recommendations") or []
        root_causes = analysis.get("root_cause_analysis") or []
        emerging_spikes = analysis.get("emerging_issues") or []
        dims = analysis.get("dimension_breakdowns") or {}

        # -------------------------------------------------------------
        # 1. Header Banner
        # -------------------------------------------------------------
        type_titles = {
            "master": "Unified Master Comprehensive Audit (Full Multi-Axial Synthesis)",
            "executive": "Executive Briefing & Strategic Synthesis",
            "operational": "Full Operational Audit & SLA Intelligence",
            "comparative": "Multi-Period Comparative Trend Variance Audit",
            "rca_playbook": "Systemic Root Cause Remediation Playbook",
        }
        report_title = type_titles.get(report_type, "Voice-of-Customer Signal Intelligence Report")
        time_scope = filters.get("time_period", "overall").upper()
        if filters.get("year"):
            time_scope += f" · Year {filters.get('year')}"
        if filters.get("month"):
            time_scope += f" · Month {filters.get('month')}"

        header_table = Table(
            [
                [
                    Paragraph("<b>voila.ai</b> · Signal Intelligence Enterprise", styles["Brand"]),
                    Paragraph(f"Generated: {datetime.now(timezone.utc).strftime('%b %d, %Y %H:%M UTC')}", styles["MetaRight"])
                ],
                [
                    Paragraph(f"<b>{report_title}</b>", styles["Title"]),
                    Paragraph(f"Scope: <b>{time_scope}</b> | Records: <b>{self._fmt(kpis.get('total_records') or kpis.get('total_conversations'))}</b>", styles["MetaRight"])
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
        story.append(Spacer(1, 0.12 * inch))

        # -------------------------------------------------------------
        # 2. Executive Synthesis Narrative
        # -------------------------------------------------------------
        if "summary" in active_sections:
            story.append(Paragraph("Executive Plain-Language Briefing", styles["H1"]))
            raw_summary = analysis.get("llm_summary") or "Comprehensive customer signal analysis compiled from neural NLP and clustering pipelines."
            formatted_summary = re.sub(r'\*\*([^*]+)\*\*', r'<b>\1</b>', raw_summary)
            for para in formatted_summary.split('\n\n'):
                if para.strip():
                    story.append(Paragraph(para.replace('\n', '<br/>'), styles["Body"]))
                    story.append(Spacer(1, 0.06 * inch))
            story.append(Spacer(1, 0.1 * inch))

        # -------------------------------------------------------------
        # 3. Core Operational KPI Snapshot Cards
        # -------------------------------------------------------------
        if "kpi_summary" in active_sections:
            story.append(Paragraph("Operational Service Performance & Quality Baseline", styles["H1"]))
            kpi_grid = [
                [
                    Paragraph("<b>AVG SLA LATENCY</b>", styles["KpiLabel"]),
                    Paragraph("<b>FCR RESOLUTION</b>", styles["KpiLabel"]),
                    Paragraph("<b>ESCALATION RATE</b>", styles["KpiLabel"]),
                    Paragraph("<b>REOPEN RATE</b>", styles["KpiLabel"]),
                    Paragraph("<b>NEGATIVE FRICTION</b>", styles["KpiLabel"]),
                ],
                [
                    Paragraph(f"<font color='#d97706'><b>{self._num(kpis.get('avg_response_time_minutes')):.1f}m</b></font>", styles["KpiVal"]),
                    Paragraph(f"<font color='#059669'><b>{self._num(kpis.get('fcr_rate') or kpis.get('resolution_rate')):.1f}%</b></font>", styles["KpiVal"]),
                    Paragraph(f"<font color='#dc2626'><b>{self._num(kpis.get('escalation_rate')):.1f}%</b></font>", styles["KpiVal"]),
                    Paragraph(f"<font color='#ea580c'><b>{self._num(kpis.get('reopen_rate')):.1f}%</b></font>", styles["KpiVal"]),
                    Paragraph(f"<font color='#7c3aed'><b>{self._num(kpis.get('negative_sentiment_percentage')):.1f}%</b></font>", styles["KpiVal"]),
                ],
                [
                    Paragraph("Mean response speed", styles["KpiSub"]),
                    Paragraph("First contact solved", styles["KpiSub"]),
                    Paragraph("Manager escalations", styles["KpiSub"]),
                    Paragraph("Repeat reopen threads", styles["KpiSub"]),
                    Paragraph("Dissatisfied tone", styles["KpiSub"]),
                ]
            ]
            kpi_tbl = Table(kpi_grid, colWidths=[1.44 * inch] * 5)
            kpi_tbl.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
                ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ('INNERGRID', (0, 0), (-1, -1), 0.25, colors.HexColor("#e2e8f0")),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('TOPPADDING', (0, 0), (-1, -1), 3),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ]))
            story.append(kpi_tbl)
            story.append(Spacer(1, 0.12 * inch))

        # -------------------------------------------------------------
        # 4. Comparative Trends Variance Matrix (If Comparative Mode)
        # -------------------------------------------------------------
        if comparative_data and "comparative" in report_type:
            story.append(Paragraph("Multi-Period Variance & Delta Benchmarks", styles["H1"]))
            curr_kpis = comparative_data.get("current_kpis", {})
            prev_kpis = comparative_data.get("previous_kpis", {})
            var_rows = [[
                Paragraph("<b>Metric Name</b>", styles["TH"]),
                Paragraph("<b>Baseline (T0)</b>", styles["TH"]),
                Paragraph("<b>Target (T1)</b>", styles["TH"]),
                Paragraph("<b>Delta Variance</b>", styles["TH"]),
                Paragraph("<b>Causal Diagnostic Reason (Why It Changed)</b>", styles["TH"]),
            ]]

            metrics = [
                ("First-Contact Resolution (FCR)", "resolution_rate", "%", True, "Resolution rate shift driven by ticket triage automation and routine inquiry deflection."),
                ("Mean Response SLA", "avg_response_time_minutes", "m", False, "SLA latency shift caused by queue concurrency variations during peak inquiry volume."),
                ("Manager Escalation Rate", "escalation_rate", "%", False, "Escalation shift driven by payment gateway authentication and tier-2 transfer policies."),
                ("Thread Reopen Rate", "reopen_rate", "%", False, "Reopen shift reflecting customer re-contact on unverified ticket closures."),
                ("Negative Dissatisfaction Tone", "negative_sentiment_percentage", "%", False, "Dissatisfaction tone shift concentrated in delivery delays and billing disputes."),
            ]
            for label, key, unit, higher_is_better, default_why in metrics:
                b_val = float(prev_kpis.get(key) or 0)
                t_val = float(curr_kpis.get(key) or 0)
                delta = round(t_val - b_val, 1)
                pct_change = round(((t_val - b_val) / max(0.001, b_val) * 100.0), 1) if b_val != 0 else (100.0 if t_val > 0 else 0.0)
                is_improved = (delta >= 0 if higher_is_better else delta <= 0)
                status_color = "#059669" if is_improved else "#dc2626"
                status_text = "IMPROVED" if is_improved else "DEGRADED"

                if delta == 0:
                    why_text = "Metric remained stable between baseline and target windows."
                elif is_improved:
                    why_text = f"Improved by {abs(delta):.1f}{unit} ({abs(pct_change):.1f}%), benefiting from optimized workflow resolution."
                else:
                    why_text = f"Degraded by +{abs(delta):.1f}{unit} (+{abs(pct_change):.1f}%), impacted by operational queue friction."

                var_rows.append([
                    Paragraph(f"<b>{label}</b>", styles["TD"]),
                    Paragraph(f"{b_val:.1f}{unit}", styles["TD"]),
                    Paragraph(f"{t_val:.1f}{unit}", styles["TD"]),
                    Paragraph(f"<font color='{status_color}'><b>{'+' if delta > 0 else ''}{delta:.1f}{unit}</b> ({status_text})</font>", styles["TD"]),
                    Paragraph(why_text, styles["TD"]),
                ])
            story.append(self._table(var_rows, [1.8 * inch, 0.9 * inch, 0.9 * inch, 1.4 * inch, 2.2 * inch], header=True))
            story.append(Spacer(1, 0.12 * inch))

        # -------------------------------------------------------------
        # 5. Statistical Z-Score Spike & Velocity Surges
        # -------------------------------------------------------------
        if "spikes" in active_sections and emerging_spikes:
            story.append(Paragraph("Statistical Z-Score Anomaly & Velocity Surge Tracker", styles["H1"]))
            spike_table = [[
                Paragraph("<b>Flag</b>", styles["TH"]),
                Paragraph("<b>Surging Complaint Topic</b>", styles["TH"]),
                Paragraph("<b>Standard Score</b>", styles["TH"]),
                Paragraph("<b>Volume Surge %</b>", styles["TH"]),
                Paragraph("<b>Active Cases</b>", styles["TH"]),
            ]]
            for idx, sp in enumerate(emerging_spikes[:5], start=1):
                name = str(sp.get("cluster_name") or sp.get("topic_keywords") or f"Anomaly #{idx}")
                z = float(sp.get("z_score") or 2.0)
                surge = int(sp.get("surge_percentage") or 500)
                vol = int(sp.get("volume") or 0)
                spike_table.append([
                    Paragraph(f"<font color='#dc2626'><b>Z+{z:.1f}σ</b></font>", styles["TD"]),
                    Paragraph(f"<b>{name}</b>", styles["TD"]),
                    Paragraph(f"Z = {z:.2f}", styles["TD"]),
                    Paragraph(f"<font color='#ea580c'><b>+{surge}% Surge</b></font>", styles["TD"]),
                    Paragraph(f"{vol:,} cases", styles["TD"]),
                ])
            story.append(self._table(spike_table, [1.0 * inch, 2.7 * inch, 1.1 * inch, 1.2 * inch, 1.2 * inch], header=True))
            story.append(Spacer(1, 0.12 * inch))

        # -------------------------------------------------------------
        # 6. Clustered Topics Breakdown
        # -------------------------------------------------------------
        if "topics" in active_sections and topics:
            story.append(Paragraph("Ranked Complaint Themes & BERTopic c-TF-IDF Clusters", styles["H1"]))
            chart_rows = [{"issue": t.get("cluster_name") or t.get("topic_keywords"), "pain_score": t.get("pain_score", 0)} for t in topics[:8]]
            if chart_rows:
                story.append(BarChartFlowable(chart_rows, "issue", "pain_score"))
                story.append(Spacer(1, 0.06 * inch))

            topic_table = [[
                Paragraph("<b>Rank</b>", styles["TH"]),
                Paragraph("<b>Complaint Category</b>", styles["TH"]),
                Paragraph("<b>Volume</b>", styles["TH"]),
                Paragraph("<b>Neg Tone %</b>", styles["TH"]),
                Paragraph("<b>Avg SLA</b>", styles["TH"]),
            ]]
            for idx, t in enumerate(topics[:6], start=1):
                topic_name = str(t.get("cluster_name") or t.get("topic_keywords") or "General Inquiries")
                topic_table.append([
                    Paragraph(f"#{idx}", styles["TD"]),
                    Paragraph(f"<b>{topic_name}</b>", styles["TD"]),
                    Paragraph(self._fmt(t.get("volume")), styles["TD"]),
                    Paragraph(f"{self._num(t.get('negative_sentiment_percentage')):.1f}%", styles["TD"]),
                    Paragraph(f"{self._num(t.get('avg_response_time')):.1f}m", styles["TD"]),
                ])
            story.append(self._table(topic_table, [0.6 * inch, 3.8 * inch, 1.0 * inch, 1.0 * inch, 0.8 * inch], header=True))
            story.append(Spacer(1, 0.12 * inch))

        # -------------------------------------------------------------
        # 7. Systemic Root Cause Analysis (RCA) & Remediation Mapping
        # -------------------------------------------------------------
        if "root_causes" in active_sections and root_causes:
            story.append(KeepTogether([
                Paragraph("Systemic Root Cause Analysis (RCA) & Remediation Mapping", styles["H1"]),
                self._table(
                    [[
                        Paragraph("<b>Rank</b>", styles["TH"]),
                        Paragraph("<b>Failure Domain</b>", styles["TH"]),
                        Paragraph("<b>Diagnosed Mechanism</b>", styles["TH"]),
                        Paragraph("<b>Owner</b>", styles["TH"]),
                        Paragraph("<b>Prescribed Engineering Fix</b>", styles["TH"])
                    ]] + [
                        [
                            Paragraph(f"#{idx}", styles["TD"]),
                            Paragraph(f"<b>{str(rc.get('issue') or rc.get('cluster_name') or '')}</b>", styles["TD"]),
                            Paragraph(str(rc.get('likely_root_cause') or rc.get('root_cause') or ''), styles["TD"]),
                            Paragraph(f"<font color='#4f46e5'><b>{str(rc.get('owner') or 'Support Operations')}</b></font>", styles["TD"]),
                            Paragraph(str(rc.get('recommended_fix') or ''), styles["TD"]),
                        ] for idx, rc in enumerate(root_causes[:6], start=1)
                    ],
                    [0.5 * inch, 1.6 * inch, 2.0 * inch, 1.3 * inch, 1.8 * inch],
                    header=True
                )
            ]))
            story.append(Spacer(1, 0.12 * inch))

        # -------------------------------------------------------------
        # 8. Dimensional Performance Slicing (Product & Region)
        # -------------------------------------------------------------
        if "dimensions" in active_sections and dims and (dims.get("by_product") or dims.get("by_region")):
            story.append(Paragraph("Dimensional Slicing (Product & Regional Markets)", styles["H1"]))
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

    def build_markdown(
        self,
        analysis: Dict[str, Any],
        filters: Optional[Dict[str, Any]] = None,
        report_type: str = "operational",
        sections: Optional[List[str]] = None,
        comparative_data: Optional[Dict[str, Any]] = None
    ) -> str:
        """Generates an enriched Markdown report formatted for GitHub / Notion / Slack."""
        filters = filters or {}
        active_sections: Set[str] = set(sections) if sections else {
            "summary", "kpi_summary", "topics", "root_causes", "spikes", "trends", "recommendations", "dimensions"
        }

        kpis = analysis.get("kpi_metrics", {}) or {}
        topics = analysis.get("topic_summaries") or analysis.get("customer_pain_points") or []
        recommendations = analysis.get("recommendations") or []
        root_causes = analysis.get("root_cause_analysis") or []
        emerging_spikes = analysis.get("emerging_issues") or []
        dims = analysis.get("dimension_breakdowns") or {}

        type_titles = {
            "master": "Unified Master Comprehensive Audit (Full Multi-Axial Synthesis)",
            "executive": "Executive Briefing & Strategic Synthesis",
            "operational": "Full Operational Audit & SLA Intelligence",
            "comparative": "Multi-Period Comparative Trend Variance Audit",
            "rca_playbook": "Systemic Root Cause Remediation Playbook",
        }
        report_title = type_titles.get(report_type, "Voice-of-Customer Signal Intelligence Report")
        time_scope = filters.get("time_period", "overall").upper()
        if filters.get("year"):
            time_scope += f" · Year {filters.get('year')}"
        if filters.get("month"):
            time_scope += f" · Month {filters.get('month')}"

        lines = [
            f"# Voila Signal Intelligence — {report_title}",
            f"> **Generated**: {datetime.now(timezone.utc).strftime('%B %d, %Y %H:%M UTC')} | **Scope**: `{time_scope}` | **Total Records**: `{self._fmt(kpis.get('total_records') or kpis.get('total_conversations'))}`",
            "",
            "---",
            ""
        ]

        # 1. Executive Briefing
        if "summary" in active_sections:
            lines.extend([
                "## 1. Executive Plain-Language Briefing",
                analysis.get("llm_summary") or "Comprehensive customer signal analysis compiled from neural NLP and clustering pipelines.",
                ""
            ])

        # 2. Operational KPIs
        if "kpi_summary" in active_sections:
            lines.extend([
                "## 2. Core Operational SLA & Quality KPIs",
                "",
                "| Metric | Value | Operational Benchmark | Status |",
                "| :--- | :--- | :--- | :--- |",
                f"| **First-Contact Resolution (FCR)** | `{self._num(kpis.get('fcr_rate') or kpis.get('resolution_rate')):.1f}%` | ≥ 60.0% Target | {'✅ Optimal' if self._num(kpis.get('fcr_rate') or kpis.get('resolution_rate')) >= 60 else '⚠️ Attention Required'} |",
                f"| **Average Response SLA** | `{self._num(kpis.get('avg_response_time_minutes')):.1f} mins` | ≤ 120.0m Target | {'✅ Within SLA' if self._num(kpis.get('avg_response_time_minutes')) <= 120 else '⚠️ SLA Latency Lag'} |",
                f"| **Manager Escalation Rate** | `{self._num(kpis.get('escalation_rate')):.1f}%` | ≤ 5.0% Target | {'✅ Controlled' if self._num(kpis.get('escalation_rate')) <= 5 else '🚨 Escalation Surge'} |",
                f"| **Ticket Reopen Rate** | `{self._num(kpis.get('reopen_rate')):.1f}%` | ≤ 15.0% Target | {'✅ Low Reopen' if self._num(kpis.get('reopen_rate')) <= 15 else '⚠️ Reopen Bottleneck'} |",
                f"| **Negative Customer Tone Share** | `{self._num(kpis.get('negative_sentiment_percentage')):.1f}%` | ≤ 20.0% Target | {'✅ Positive Sentiment' if self._num(kpis.get('negative_sentiment_percentage')) <= 20 else '⚠️ Dissatisfaction Spike'} |",
                ""
            ])

        # 3. Comparative Variance (if provided)
        if comparative_data and "comparative" in report_type:
            curr_kpis = comparative_data.get("current_kpis", {})
            prev_kpis = comparative_data.get("previous_kpis", {})
            lines.extend([
                "## 3. Dataset Delta & Period Comparison Variance",
                "",
                "| Evaluated Metric | Baseline (T0) | Active Target (T1) | Variance Delta | Direction | Causal Diagnostic Analysis (Why It Changed) |",
                "| :--- | :--- | :--- | :--- | :--- | :--- |",
            ])
            metrics = [
                ("First-Contact Resolution (FCR)", "resolution_rate", "%", True, "Resolution rate shift driven by ticket triage automation and routine inquiry deflection."),
                ("Mean Response SLA", "avg_response_time_minutes", "m", False, "SLA latency shift caused by queue concurrency variations during peak inquiry volume."),
                ("Manager Escalation Rate", "escalation_rate", "%", False, "Escalation shift driven by payment gateway authentication and tier-2 transfer policies."),
                ("Thread Reopen Rate", "reopen_rate", "%", False, "Reopen shift reflecting customer re-contact on unverified ticket closures."),
                ("Negative Dissatisfaction Tone", "negative_sentiment_percentage", "%", False, "Dissatisfaction tone shift concentrated in delivery delays and billing disputes."),
            ]
            for label, key, unit, higher_is_better, default_why in metrics:
                b_val = float(prev_kpis.get(key) or 0)
                t_val = float(curr_kpis.get(key) or 0)
                delta = round(t_val - b_val, 1)
                pct_change = round(((t_val - b_val) / max(0.001, b_val) * 100.0), 1) if b_val != 0 else (100.0 if t_val > 0 else 0.0)
                is_improved = (delta >= 0 if higher_is_better else delta <= 0)
                direction_icon = "🟢 Improved" if is_improved else "🔴 Degraded"

                if delta == 0:
                    why_text = "Metric remained stable between baseline and target windows."
                elif is_improved:
                    why_text = f"Improved by {abs(delta):.1f}{unit} ({abs(pct_change):.1f}%), benefiting from optimized workflow resolution."
                else:
                    why_text = f"Degraded by +{abs(delta):.1f}{unit} (+{abs(pct_change):.1f}%), impacted by operational queue friction."

                lines.append(f"| **{label}** | `{b_val:.1f}{unit}` | `{t_val:.1f}{unit}` | `{(('+' if delta > 0 else '') + str(delta))}{unit}` | {direction_icon} | {why_text} |")
            lines.append("")

        # 4. Spikes & Velocity Surges
        if "spikes" in active_sections and emerging_spikes:
            lines.extend([
                "## 4. Statistical Z-Score Spikes & Velocity Surges",
                "",
                "| Rank | Surging Failure Domain | Z-Score (Anomaly) | Surge Velocity | Active Volume |",
                "| :--- | :--- | :--- | :--- | :--- |"
            ])
            for idx, sp in enumerate(emerging_spikes[:6], start=1):
                name = str(sp.get("cluster_name") or sp.get("topic_keywords") or f"Spike #{idx}")
                z = float(sp.get("z_score") or 2.0)
                surge = int(sp.get("surge_percentage") or 500)
                vol = int(sp.get("volume") or 0)
                lines.append(f"| #{idx} | **{name}** | `Z = +{z:.2f}σ` | `+{surge}% Surge` | `{vol:,} cases` |")
            lines.append("")

        # 5. Clustered Topics Breakdown
        if "topics" in active_sections and topics:
            lines.extend([
                "## 5. Clustered Complaint Themes & Topic Modeling",
                "",
                "| Rank | Topic Category | Ingested Volume | Negative Dissatisfaction | Average SLA |",
                "| :--- | :--- | :--- | :--- | :--- |"
            ])
            for idx, t in enumerate(topics[:8], start=1):
                topic_name = str(t.get("cluster_name") or t.get("topic_keywords") or "General Inquiries")
                vol = int(t.get("volume") or 0)
                neg = float(t.get("negative_sentiment_percentage") or 0.0)
                resp = float(t.get("avg_response_time") or 0.0)
                lines.append(f"| #{idx} | **{topic_name}** | `{vol:,}` | `{neg:.1f}%` | `{resp:.1f}m` |")
            lines.append("")

        # 6. Systemic Root Cause Analysis (RCA)
        if "root_causes" in active_sections and root_causes:
            lines.extend([
                "## 6. Systemic Root Cause Analysis (RCA) & Departmental Remediation",
                "",
                "| Rank | Failure Domain | Diagnosed Failure Mechanism | Department Owner | Prescribed Engineering Fix |",
                "| :--- | :--- | :--- | :--- | :--- |"
            ])
            for idx, rc in enumerate(root_causes[:6], start=1):
                domain = str(rc.get("issue") or rc.get("cluster_name") or "")
                mechanism = str(rc.get("likely_root_cause") or rc.get("root_cause") or "")
                owner = str(rc.get("owner") or "Support Operations")
                fix = str(rc.get("recommended_fix") or "")
                lines.append(f"| #{idx} | **{domain}** | {mechanism} | `{owner}` | {fix} |")
            lines.append("")

        # 7. Prioritized Leadership Actions
        if "recommendations" in active_sections and recommendations:
            lines.extend([
                "## 7. Prioritized Strategic Leadership Action Plan",
                ""
            ])
            for idx, rec in enumerate(recommendations[:5], start=1):
                owner = str(rec.get("owner") or "Support Operations")
                issue = str(rec.get("issue") or "Operational Workflow")
                action = str(rec.get("action") or rec.get("recommendation") or "")
                lines.append(f"- **[#{idx} · {owner}] {issue}**: {action}")
            lines.append("")

        # 8. Dimensional Slicing
        if "dimensions" in active_sections and dims:
            lines.extend([
                "## 8. Dimensional Performance Slicing",
                "",
                "### Geographic Region Breakdown",
                "| Region Market | Total Volume | Negative Tone Share | Mean Response SLA |",
                "| :--- | :--- | :--- | :--- |"
            ])
            for r in (dims.get("by_region") or [])[:6]:
                reg = str(r.get("region") or r.get("name"))
                vol = int(r.get("total_conversations") or r.get("count") or 0)
                neg = float(r.get("negative_sentiment_percentage") or 0.0)
                sla = float(r.get("avg_response_time_minutes") or 0.0)
                lines.append(f"| **{reg}** | `{vol:,}` | `{neg:.1f}%` | `{sla:.1f}m` |")
            lines.append("")

        return "\n".join(lines)

    def build_csv(self, analysis: Dict[str, Any], filters: Optional[Dict[str, Any]] = None) -> str:
        """Exports analytics data into structured tabular CSV format."""
        output = io.StringIO()
        writer = csv.writer(output)

        kpis = analysis.get("kpi_metrics", {}) or {}
        topics = analysis.get("topic_summaries") or analysis.get("customer_pain_points") or []
        root_causes = analysis.get("root_cause_analysis") or []

        # Table 1: Core KPIs
        writer.writerow(["=== VOILA ANALYTICS REPORT EXPORT ==="])
        writer.writerow(["Exported At", datetime.now(timezone.utc).isoformat()])
        writer.writerow([])
        writer.writerow(["=== OPERATIONAL KPIS ==="])
        writer.writerow(["Metric", "Value"])
        for k, v in kpis.items():
            writer.writerow([k, v])
        writer.writerow([])

        # Table 2: Topics Breakdown
        writer.writerow(["=== TOPIC CLUSTERS BREAKDOWN ==="])
        writer.writerow(["Rank", "Cluster Name", "Keywords", "Volume", "Negative Complaints", "Negative Sentiment %", "Avg Response Time (m)", "Pain Score"])
        for idx, t in enumerate(topics, start=1):
            writer.writerow([
                idx,
                t.get("cluster_name") or t.get("topic_keywords"),
                t.get("topic_keywords"),
                t.get("volume"),
                t.get("negative_complaints"),
                t.get("negative_sentiment_percentage"),
                t.get("avg_response_time"),
                t.get("pain_score")
            ])
        writer.writerow([])

        # Table 3: Root Cause Analysis
        writer.writerow(["=== ROOT CAUSE ANALYSIS & REMEDIATION ==="])
        writer.writerow(["Rank", "Failure Domain", "Likely Root Cause", "Department Owner", "Recommended Fix", "Volume", "Negative Sentiment %", "Severity Score"])
        for idx, rc in enumerate(root_causes, start=1):
            writer.writerow([
                idx,
                rc.get("issue") or rc.get("cluster_name"),
                rc.get("likely_root_cause"),
                rc.get("owner"),
                rc.get("recommended_fix"),
                rc.get("volume"),
                rc.get("negative_sentiment_percentage"),
                rc.get("severity_score")
            ])

        return output.getvalue()

    def build_json(self, analysis: Dict[str, Any], filters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Returns clean serializable JSON export payload."""
        return {
            "metadata": {
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "system": "Voila Voice-of-Customer Signal Intelligence v2.4",
                "filters": filters or {}
            },
            "kpi_metrics": analysis.get("kpi_metrics", {}),
            "topic_summaries": analysis.get("topic_summaries", []),
            "emerging_issues": analysis.get("emerging_issues", []),
            "root_cause_analysis": analysis.get("root_cause_analysis", []),
            "recommendations": analysis.get("recommendations", []),
            "dimension_breakdowns": analysis.get("dimension_breakdowns", {}),
            "executive_summary": analysis.get("llm_summary", "")
        }

    def _styles(self):
        base = getSampleStyleSheet()
        return {
            "Brand": ParagraphStyle("Brand", parent=base["Normal"], fontName="Helvetica-Bold", fontSize=13, leading=16, textColor=colors.HexColor("#4f46e5")),
            "Title": ParagraphStyle("Title", parent=base["Title"], fontName="Helvetica-Bold", fontSize=15, leading=19, textColor=colors.HexColor("#0f172a"), alignment=TA_LEFT),
            "MetaRight": ParagraphStyle("MetaRight", parent=base["Normal"], fontName="Helvetica", fontSize=8, leading=11, textColor=colors.HexColor("#64748b"), alignment=TA_RIGHT),
            "H1": ParagraphStyle("H1", parent=base["Heading1"], fontName="Helvetica-Bold", fontSize=10.5, leading=13.5, textColor=colors.HexColor("#0f172a"), spaceBefore=5, spaceAfter=3),
            "Body": ParagraphStyle("Body", parent=base["BodyText"], fontName="Helvetica", fontSize=8, leading=11.5, textColor=colors.HexColor("#334155")),
            "KpiLabel": ParagraphStyle("KpiLabel", fontName="Helvetica", fontSize=6.5, leading=8.5, textColor=colors.HexColor("#64748b"), alignment=TA_CENTER),
            "KpiVal": ParagraphStyle("KpiVal", fontName="Helvetica-Bold", fontSize=12, leading=15, alignment=TA_CENTER),
            "KpiSub": ParagraphStyle("KpiSub", fontName="Helvetica", fontSize=6, leading=8, textColor=colors.HexColor("#94a3b8"), alignment=TA_CENTER),
            "TH": ParagraphStyle("TH", fontName="Helvetica-Bold", fontSize=7, leading=9.5, textColor=colors.white, alignment=TA_LEFT),
            "TD": ParagraphStyle("TD", fontName="Helvetica", fontSize=7, leading=9.5, textColor=colors.HexColor("#1e293b"), alignment=TA_LEFT),
        }

    def _table(self, rows, widths, header=True):
        table = Table(rows, colWidths=widths, repeatRows=1 if header else 0)
        style = [
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#e2e8f0")),
            ("ROWBACKGROUNDS", (0, 1 if header else 0), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]
        if header:
            style.extend([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ])
        table.setStyle(TableStyle(style))
        return table

    def _footer(self, canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 6.5)
        canvas.setFillColor(colors.HexColor("#94a3b8"))
        canvas.drawString(0.5 * inch, 0.25 * inch, "voila.ai v2.4 — Enterprise Voice-of-Customer Signal Intelligence")
        canvas.drawRightString(7.95 * inch, 0.25 * inch, f"Page {doc.page}")
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



report_generator = AnalyticsReportGenerator()
