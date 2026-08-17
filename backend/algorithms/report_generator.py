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

    # ── KPI benchmark definitions ──────────────────────────────────────
    _KPI_BENCHMARKS = {
        "resolution_rate":      {"label": "First-Contact Resolution (FCR)", "unit": "%", "higher_better": True,  "target": 60.0,
                                 "what": "Percentage of customer issues resolved on the very first interaction without requiring follow-up or re-contact.",
                                 "good": "Higher is better. A rate above 60% indicates efficient front-line support.",
                                 "bad":  "Low rates signal that customers must contact support multiple times for the same issue, increasing cost and frustration."},
        "escalation_rate":      {"label": "Manager Escalation Rate", "unit": "%", "higher_better": False, "target": 5.0,
                                 "what": "Percentage of conversations that were escalated from front-line agents to managers or specialized teams.",
                                 "good": "Lower is better. Rates below 5% indicate agents are well-empowered to resolve issues independently.",
                                 "bad":  "High escalation rates suggest agents lack authority, training, or tooling to handle issues at first tier."},
        "reopen_rate":          {"label": "Ticket Reopen Rate", "unit": "%", "higher_better": False, "target": 15.0,
                                 "what": "Percentage of resolved tickets that customers re-opened because the original resolution was unsatisfactory.",
                                 "good": "Lower is better. Rates below 15% show that resolutions are lasting and complete.",
                                 "bad":  "High reopen rates indicate premature closures, inadequate fixes, or poor follow-through."},
        "avg_response_time_minutes": {"label": "Average First Response Time", "unit": "m", "higher_better": False, "target": 120.0,
                                      "what": "Mean time elapsed between a customer submitting a ticket and receiving the first human agent response.",
                                      "good": "Lower is better. Response times under 2 hours meet standard SLA expectations.",
                                      "bad":  "Long response times erode customer trust and correlate with higher churn."},
        "negative_sentiment_percentage": {"label": "Negative Sentiment Share", "unit": "%", "higher_better": False, "target": 20.0,
                                          "what": "Percentage of all conversations where the customer's language expressed frustration, anger, or dissatisfaction.",
                                          "good": "Lower is better. Rates below 20% indicate generally positive customer experience.",
                                          "bad":  "High negative sentiment signals systemic product, service, or process failures."},
        "positive_sentiment_percentage": {"label": "Positive Sentiment Share", "unit": "%", "higher_better": True, "target": 40.0,
                                          "what": "Percentage of all conversations where the customer expressed satisfaction, gratitude, or praise.",
                                          "good": "Higher is better. Rates above 40% indicate strong customer delight.",
                                          "bad":  "Low positive sentiment means few interactions end on a high note."},
        "csat_proxy":           {"label": "Estimated CSAT Proxy", "unit": "%", "higher_better": True, "target": 60.0,
                                 "what": "A calculated estimate of customer satisfaction derived from sentiment analysis, resolution status, and response quality signals.",
                                 "good": "Higher is better. Scores above 60% suggest overall satisfaction with the support experience.",
                                 "bad":  "Low scores indicate the need for end-to-end service quality improvements."},
        "fcr_rate":             {"label": "First-Contact Resolution (FCR)", "unit": "%", "higher_better": True, "target": 60.0,
                                 "what": "Alias for resolution_rate — the percentage of issues resolved on first contact.",
                                 "good": "Higher is better.",
                                 "bad":  "Low rates indicate repeated customer effort."},
    }

    def build_pdf(
        self,
        analysis: Dict[str, Any],
        filters: Optional[Dict[str, Any]] = None,
        report_type: str = "operational",
        sections: Optional[List[str]] = None,
        comparative_data: Optional[Dict[str, Any]] = None
    ) -> bytes:
        """Generates a detailed, publication-ready executive PDF report."""
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
            "summary", "kpi_summary", "sentiment", "sla", "topics",
            "root_causes", "spikes", "trends", "recommendations",
            "dimensions", "methodology"
        }

        kpis = analysis.get("kpi_metrics", {}) or {}
        topics = analysis.get("topic_summaries") or analysis.get("customer_pain_points") or []
        recommendations = analysis.get("recommendations") or []
        root_causes = analysis.get("root_cause_analysis") or []
        emerging_spikes = analysis.get("emerging_issues") or []
        dims = analysis.get("dimension_breakdowns") or {}
        sentiment_dist = analysis.get("sentiment_distribution") or {}
        sla_dist = analysis.get("sla_distribution") or []
        trends = analysis.get("trends") or {}
        total_records = kpis.get("total_records") or kpis.get("total_conversations") or 0

        # ── 1. Header ──────────────────────────────────────────────────
        type_titles = {
            "master": "Unified Master Comprehensive Audit",
            "executive": "Executive Briefing & Strategic Synthesis",
            "operational": "Full Operational Audit & SLA Intelligence",
            "comparative": "Multi-Period Comparative Trend Variance Audit",
            "rca_playbook": "Systemic Root Cause Remediation Playbook",
        }
        report_title = type_titles.get(report_type, "Voice-of-Customer Signal Intelligence Report")
        time_scope = filters.get("time_period", "overall").upper()
        if filters.get("year"):
            time_scope += f" | Year {filters.get('year')}"
        if filters.get("month"):
            time_scope += f" | Month {filters.get('month')}"

        header_table = Table(
            [
                [
                    Paragraph("<b>voila.ai</b>  |  Signal Intelligence Enterprise", styles["Brand"]),
                    Paragraph(f"Generated: {datetime.now(timezone.utc).strftime('%b %d, %Y %H:%M UTC')}", styles["MetaRight"])
                ],
                [
                    Paragraph(f"<b>{report_title}</b>", styles["Title"]),
                    Paragraph(f"Scope: <b>{time_scope}</b>  |  Records Analyzed: <b>{self._fmt(total_records)}</b>", styles["MetaRight"])
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
        story.append(Spacer(1, 0.1 * inch))

        # ── 2. Executive Summary ────────────────────────────────────────
        if "summary" in active_sections:
            story.append(Paragraph("1. Executive Summary", styles["H1"]))
            story.append(Paragraph(
                "This report provides a comprehensive analysis of customer support interactions "
                f"across <b>{self._fmt(total_records)}</b> conversations. Each section below breaks down "
                "a specific dimension of support performance, explains what the metrics mean, and "
                "highlights areas requiring attention.",
                styles["Body"]
            ))
            story.append(Spacer(1, 0.06 * inch))

            raw_summary = analysis.get("llm_summary") or ""
            if isinstance(raw_summary, dict):
                raw_summary = raw_summary.get("summary") or raw_summary.get("text") or str(raw_summary)
            raw_summary = str(raw_summary) if raw_summary else ""
            if raw_summary:
                formatted_summary = re.sub(r'\*\*([^*]+)\*\*', r'<b>\1</b>', raw_summary)
                for para in formatted_summary.split('\n\n'):
                    if para.strip():
                        story.append(Paragraph(para.replace('\n', '<br/>'), styles["Body"]))
                        story.append(Spacer(1, 0.04 * inch))
            story.append(Spacer(1, 0.1 * inch))

        # ── 3. KPI Dashboard ───────────────────────────────────────────
        if "kpi_summary" in active_sections:
            story.append(Paragraph("2. Key Performance Indicators (KPIs)", styles["H1"]))
            story.append(Paragraph(
                "The following dashboard presents the seven core metrics that define support operational health. "
                "Each metric is compared against its industry-standard benchmark to indicate whether performance "
                "is optimal or requires attention.",
                styles["Body"]
            ))
            story.append(Spacer(1, 0.06 * inch))

            kpi_cards = [
                ("avg_response_time_minutes", kpis.get("avg_response_time_minutes")),
                ("resolution_rate", kpis.get("fcr_rate") or kpis.get("resolution_rate")),
                ("escalation_rate", kpis.get("escalation_rate")),
                ("reopen_rate", kpis.get("reopen_rate")),
                ("negative_sentiment_percentage", kpis.get("negative_sentiment_percentage")),
                ("positive_sentiment_percentage", kpis.get("positive_sentiment_percentage")),
                ("csat_proxy", kpis.get("csat_proxy")),
            ]

            kpi_grid = [[
                Paragraph("<b>METRIC</b>", styles["KpiLabel"]),
                Paragraph("<b>VALUE</b>", styles["KpiLabel"]),
                Paragraph("<b>BENCHMARK</b>", styles["KpiLabel"]),
                Paragraph("<b>STATUS</b>", styles["KpiLabel"]),
            ]]
            for key, val in kpi_cards:
                bench = self._KPI_BENCHMARKS.get(key, {})
                num_val = self._num(val)
                unit = bench.get("unit", "%")
                target = bench.get("target", 0)
                higher_better = bench.get("higher_better", True)
                label = bench.get("label", key)

                if higher_better:
                    is_ok = num_val >= target
                else:
                    is_ok = num_val <= target

                status_color = "#059669" if is_ok else "#dc2626"
                status_text = "OPTIMAL" if is_ok else "ATTENTION"

                if unit == "m":
                    display_val = f"{num_val:.1f}m"
                    display_target = f"{'<=' if not higher_better else '>='}{target:.0f}m"
                else:
                    display_val = f"{num_val:.1f}%"
                    display_target = f"{'<=' if not higher_better else '>='}{target:.0f}%"

                kpi_grid.append([
                    Paragraph(f"<b>{label}</b>", styles["TD"]),
                    Paragraph(f"<font color='{status_color}'><b>{display_val}</b></font>", styles["TD"]),
                    Paragraph(display_target, styles["TD"]),
                    Paragraph(f"<font color='{status_color}'><b>{status_text}</b></font>", styles["TD"]),
                ])

            kpi_tbl = Table(kpi_grid, colWidths=[2.8 * inch, 1.3 * inch, 1.3 * inch, 1.3 * inch])
            kpi_tbl.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0f172a")),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
                ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ('INNERGRID', (0, 0), (-1, -1), 0.25, colors.HexColor("#e2e8f0")),
                ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ]))
            story.append(kpi_tbl)
            story.append(Spacer(1, 0.06 * inch))

            story.append(Paragraph("<b>What These Metrics Mean:</b>", styles["Body"]))
            story.append(Spacer(1, 0.03 * inch))
            for key, val in kpi_cards:
                bench = self._KPI_BENCHMARKS.get(key, {})
                if not bench:
                    continue
                story.append(Paragraph(
                    f"<b>{bench['label']}:</b> {bench['what']}",
                    styles["Body"]
                ))
                story.append(Spacer(1, 0.02 * inch))
            story.append(Spacer(1, 0.08 * inch))

        # ── 4. Sentiment Analysis ──────────────────────────────────────
        if "sentiment" in active_sections and sentiment_dist:
            story.append(Paragraph("3. Customer Sentiment Analysis", styles["H1"]))
            story.append(Paragraph(
                "Sentiment analysis classifies every customer message as positive, negative, or neutral "
                "based on the emotional tone of the language used. This provides a direct signal of how "
                "customers feel about their support experience.",
                styles["Body"]
            ))
            story.append(Spacer(1, 0.06 * inch))

            neg = sentiment_dist.get("negative", {})
            pos = sentiment_dist.get("positive", {})
            neu = sentiment_dist.get("neutral", {})

            sent_rows = [[
                Paragraph("<b>Sentiment</b>", styles["TH"]),
                Paragraph("<b>Count</b>", styles["TH"]),
                Paragraph("<b>Share</b>", styles["TH"]),
                Paragraph("<b>Interpretation</b>", styles["TH"]),
            ]]
            sent_rows.append([
                Paragraph("<b><font color='#dc2626'>Negative</font></b>", styles["TD"]),
                Paragraph(self._fmt(neg.get("count", 0)), styles["TD"]),
                Paragraph(f"{self._num(neg.get('percentage', 0)):.1f}%", styles["TD"]),
                Paragraph("Customers expressing frustration, anger, or dissatisfaction with the support experience.", styles["TD"]),
            ])
            sent_rows.append([
                Paragraph("<b><font color='#059669'>Positive</font></b>", styles["TD"]),
                Paragraph(self._fmt(pos.get("count", 0)), styles["TD"]),
                Paragraph(f"{self._num(pos.get('percentage', 0)):.1f}%", styles["TD"]),
                Paragraph("Customers expressing gratitude, satisfaction, or praise for the support received.", styles["TD"]),
            ])
            sent_rows.append([
                Paragraph("<b><font color='#6366f1'>Neutral</font></b>", styles["TD"]),
                Paragraph(self._fmt(neu.get("count", 0)), styles["TD"]),
                Paragraph(f"{self._num(neu.get('percentage', 0)):.1f}%", styles["TD"]),
                Paragraph("Factual, informational exchanges with no strong emotional tone in either direction.", styles["TD"]),
            ])
            story.append(self._table(sent_rows, [1.2 * inch, 1.0 * inch, 0.8 * inch, 3.6 * inch], header=True))
            story.append(Spacer(1, 0.06 * inch))

            neg_pct = self._num(neg.get("percentage", 0))
            if neg_pct > 30:
                story.append(Paragraph(
                    f"<b>Alert:</b> Negative sentiment at {neg_pct:.1f}% exceeds the 30% threshold. "
                    "This indicates a significant portion of customers are dissatisfied and warrants immediate "
                    "investigation into the highest-volume complaint topics.",
                    styles["Body"]
                ))
            elif neg_pct > 20:
                story.append(Paragraph(
                    f"<b>Notice:</b> Negative sentiment at {neg_pct:.1f}% is above the 20% comfort level. "
                    "Monitoring trending complaint topics is recommended to prevent further deterioration.",
                    styles["Body"]
                ))
            else:
                story.append(Paragraph(
                    f"<b>Status:</b> Negative sentiment at {neg_pct:.1f}% is within acceptable bounds. "
                    "Continue monitoring for upward trends in specific complaint clusters.",
                    styles["Body"]
                ))
            story.append(Spacer(1, 0.1 * inch))

        # ── 5. SLA Performance ─────────────────────────────────────────
        if "sla" in active_sections and sla_dist:
            story.append(Paragraph("4. Response Time & SLA Performance", styles["H1"]))
            story.append(Paragraph(
                "Service Level Agreement (SLA) performance measures how quickly customers receive their first "
                "response. This table breaks response times into four tiers, from immediate (under 15 minutes) "
                "to critically delayed (over 4 hours).",
                styles["Body"]
            ))
            story.append(Spacer(1, 0.06 * inch))

            sla_rows = [[
                Paragraph("<b>SLA Tier</b>", styles["TH"]),
                Paragraph("<b>Count</b>", styles["TH"]),
                Paragraph("<b>Share</b>", styles["TH"]),
                Paragraph("<b>Status</b>", styles["TH"]),
                Paragraph("<b>Meaning</b>", styles["TH"]),
            ]]
            sla_meanings = {
                "optimal": "Customers received a response within 15 minutes. This is the gold standard.",
                "standard": "Responses arrived within 1 hour. Acceptable but room for improvement.",
                "warning": "Responses took 1-4 hours. Customers experienced meaningful wait times.",
                "critical": "Responses took over 4 hours. These are critical SLA breaches that damage trust.",
            }
            for tier in sla_dist:
                status = tier.get("status", "standard")
                color = tier.get("color", "#6366f1")
                sla_rows.append([
                    Paragraph(f"<b>{tier.get('tier', '')}</b>", styles["TD"]),
                    Paragraph(self._fmt(tier.get("count", 0)), styles["TD"]),
                    Paragraph(f"{self._num(tier.get('percentage', 0)):.1f}%", styles["TD"]),
                    Paragraph(f"<font color='{color}'><b>{status.upper()}</b></font>", styles["TD"]),
                    Paragraph(sla_meanings.get(status, ""), styles["TD"]),
                ])
            story.append(self._table(sla_rows, [1.6 * inch, 0.9 * inch, 0.8 * inch, 0.9 * inch, 2.4 * inch], header=True))
            story.append(Spacer(1, 0.06 * inch))

            avg_resp = self._num(kpis.get("avg_response_time_minutes"))
            story.append(Paragraph(
                f"<b>Overall Average:</b> {avg_resp:.1f} minutes across all {self._fmt(total_records)} conversations. "
                "A lower average indicates faster, more responsive support operations.",
                styles["Body"]
            ))
            story.append(Spacer(1, 0.1 * inch))

        # ── 6. Comparative Variance (if comparative mode) ──────────────
        if comparative_data and "comparative" in report_type:
            story.append(Paragraph("5. Period-over-Period Variance Analysis", styles["H1"]))
            story.append(Paragraph(
                "This section compares the current period's metrics against a baseline period to identify "
                "improvements or regressions. Each metric includes the direction of change and a diagnostic "
                "explanation of why the shift occurred.",
                styles["Body"]
            ))
            story.append(Spacer(1, 0.06 * inch))

            curr_kpis = comparative_data.get("current_kpis", {})
            prev_kpis = comparative_data.get("previous_kpis", {})
            var_rows = [[
                Paragraph("<b>Metric</b>", styles["TH"]),
                Paragraph("<b>Baseline (T0)</b>", styles["TH"]),
                Paragraph("<b>Current (T1)</b>", styles["TH"]),
                Paragraph("<b>Change</b>", styles["TH"]),
                Paragraph("<b>Diagnostic</b>", styles["TH"]),
            ]]
            metrics = [
                ("First-Contact Resolution", "resolution_rate", "%", True),
                ("Average Response Time", "avg_response_time_minutes", "m", False),
                ("Escalation Rate", "escalation_rate", "%", False),
                ("Reopen Rate", "reopen_rate", "%", False),
                ("Negative Sentiment", "negative_sentiment_percentage", "%", False),
            ]
            for label, key, unit, higher_is_better in metrics:
                b_val = float(prev_kpis.get(key) or 0)
                t_val = float(curr_kpis.get(key) or 0)
                delta = round(t_val - b_val, 1)
                is_improved = (delta >= 0 if higher_is_better else delta <= 0)
                status_color = "#059669" if is_improved else "#dc2626"
                status_text = "IMPROVED" if is_improved else "DEGRADED"
                if delta == 0:
                    why = "Stable between periods."
                elif is_improved:
                    why = f"Improved by {abs(delta):.1f}{unit}. Positive operational trend."
                else:
                    why = f"Degraded by {abs(delta):.1f}{unit}. Requires investigation."

                var_rows.append([
                    Paragraph(f"<b>{label}</b>", styles["TD"]),
                    Paragraph(f"{b_val:.1f}{unit}", styles["TD"]),
                    Paragraph(f"{t_val:.1f}{unit}", styles["TD"]),
                    Paragraph(f"<font color='{status_color}'><b>{'+' if delta > 0 else ''}{delta:.1f}{unit} ({status_text})</b></font>", styles["TD"]),
                    Paragraph(why, styles["TD"]),
                ])
            story.append(self._table(var_rows, [1.5 * inch, 1.0 * inch, 1.0 * inch, 1.5 * inch, 1.6 * inch], header=True))
            story.append(Spacer(1, 0.1 * inch))

        # ── 7. Trend Data ──────────────────────────────────────────────
        if "trends" in active_sections and trends:
            story.append(Paragraph("6. Temporal Trends", styles["H1"]))
            story.append(Paragraph(
                "Trend data shows how key metrics have evolved over time. Upward or downward trajectories "
                "reveal whether operational improvements are taking hold or deteriorating.",
                styles["Body"]
            ))
            story.append(Spacer(1, 0.06 * inch))

            sentiment_trend = trends.get("sentiment_trend") or []
            service_trend = trends.get("service_trend") or []

            if sentiment_trend:
                story.append(Paragraph("<b>Sentiment Trend (Recent Periods)</b>", styles["Body"]))
                trend_rows = [[
                    Paragraph("<b>Period</b>", styles["TH"]),
                    Paragraph("<b>Volume</b>", styles["TH"]),
                    Paragraph("<b>Negative</b>", styles["TH"]),
                    Paragraph("<b>Positive</b>", styles["TH"]),
                    Paragraph("<b>Neutral</b>", styles["TH"]),
                    Paragraph("<b>Neg %</b>", styles["TH"]),
                ]]
                for t in sentiment_trend[-10:]:
                    day = t.get("day") or t.get("period") or ""
                    tot = int(t.get("total") or 0)
                    pos = int(t.get("positive") or 0)
                    neu = int(t.get("neutral") or 0)
                    neg = int(t.get("negative") or 0)
                    neg_pct = round(neg / max(1, tot) * 100.0, 1) if tot else 0.0
                    trend_rows.append([
                        Paragraph(str(day), styles["TD"]),
                        Paragraph(f"{tot:,}", styles["TD"]),
                        Paragraph(f"{neg:,}", styles["TD"]),
                        Paragraph(f"{pos:,}", styles["TD"]),
                        Paragraph(f"{neu:,}", styles["TD"]),
                        Paragraph(f"<font color='#dc2626'>{neg_pct:.1f}%</font>", styles["TD"]),
                    ])
                story.append(self._table(trend_rows, [1.2 * inch, 0.8 * inch, 0.8 * inch, 0.8 * inch, 0.8 * inch, 0.8 * inch], header=True))
                story.append(Spacer(1, 0.06 * inch))

            if service_trend:
                story.append(Paragraph("<b>Service Trend (Recent Periods)</b>", styles["Body"]))
                trend_rows = [[
                    Paragraph("<b>Period</b>", styles["TH"]),
                    Paragraph("<b>Volume</b>", styles["TH"]),
                    Paragraph("<b>Resolution Rate</b>", styles["TH"]),
                    Paragraph("<b>Escalation Rate</b>", styles["TH"]),
                ]]
                for t in service_trend[-10:]:
                    day = t.get("day") or t.get("period") or ""
                    tot = int(t.get("total") or 0)
                    res = self._num(t.get("resolution") or t.get("resolution_rate"))
                    esc = self._num(t.get("escalation") or t.get("escalation_rate"))
                    trend_rows.append([
                        Paragraph(str(day), styles["TD"]),
                        Paragraph(f"{tot:,}", styles["TD"]),
                        Paragraph(f"<font color='#059669'>{res:.1f}%</font>", styles["TD"]),
                        Paragraph(f"<font color='#dc2626'>{esc:.1f}%</font>", styles["TD"]),
                    ])
                story.append(self._table(trend_rows, [1.2 * inch, 0.8 * inch, 1.5 * inch, 1.5 * inch], header=True))
            story.append(Spacer(1, 0.1 * inch))

        # ── 8. Emerging Issues / Spikes ────────────────────────────────
        if "spikes" in active_sections and emerging_spikes:
            story.append(Paragraph("7. Emerging Issues & Statistical Anomalies", styles["H1"]))
            story.append(Paragraph(
                "Z-score analysis detects topics experiencing volume surges significantly above their historical "
                "baseline. A Z-score above 2.0 indicates the surge is statistically unlikely to be random variation "
                "and represents a genuine emerging problem requiring attention.",
                styles["Body"]
            ))
            story.append(Spacer(1, 0.06 * inch))

            spike_table = [[
                Paragraph("<b>Z-Score</b>", styles["TH"]),
                Paragraph("<b>Surging Topic</b>", styles["TH"]),
                Paragraph("<b>Volume Surge</b>", styles["TH"]),
                Paragraph("<b>Active Cases</b>", styles["TH"]),
                Paragraph("<b>Interpretation</b>", styles["TH"]),
            ]]
            for idx, sp in enumerate(emerging_spikes[:5], start=1):
                name = str(sp.get("cluster_name") or sp.get("topic_keywords") or f"Issue #{idx}")
                z = float(sp.get("z_score") or 2.0)
                surge = int(sp.get("surge_percentage") or 500)
                vol = int(sp.get("volume") or 0)

                if z >= 3.0:
                    interp = "Critical surge — immediate investigation required."
                elif z >= 2.5:
                    interp = "Significant anomaly — proactive monitoring recommended."
                else:
                    interp = "Notable increase — track for further escalation."

                spike_table.append([
                    Paragraph(f"<font color='#dc2626'><b>Z={z:.2f}</b></font>", styles["TD"]),
                    Paragraph(f"<b>{name}</b>", styles["TD"]),
                    Paragraph(f"<font color='#ea580c'><b>+{surge}%</b></font>", styles["TD"]),
                    Paragraph(f"{vol:,}", styles["TD"]),
                    Paragraph(interp, styles["TD"]),
                ])
            story.append(self._table(spike_table, [0.9 * inch, 2.0 * inch, 1.1 * inch, 1.0 * inch, 1.7 * inch], header=True))
            story.append(Spacer(1, 0.1 * inch))

        # ── 9. Topic Clusters ──────────────────────────────────────────
        if "topics" in active_sections and topics:
            story.append(Paragraph("8. Complaint Topic Clusters", styles["H1"]))
            story.append(Paragraph(
                "Automated NLP clustering groups thousands of individual conversations into thematic clusters. "
                "Each cluster represents a distinct complaint category, ranked by volume and severity. "
                "Understanding these clusters reveals where the largest customer pain points concentrate.",
                styles["Body"]
            ))
            story.append(Spacer(1, 0.06 * inch))

            chart_rows = [{"issue": t.get("cluster_name") or t.get("topic_keywords"), "pain_score": t.get("pain_score", 0)} for t in topics[:8]]
            if chart_rows:
                story.append(BarChartFlowable(chart_rows, "issue", "pain_score"))
                story.append(Spacer(1, 0.06 * inch))

            topic_table = [[
                Paragraph("<b>Rank</b>", styles["TH"]),
                Paragraph("<b>Topic Cluster</b>", styles["TH"]),
                Paragraph("<b>Volume</b>", styles["TH"]),
                Paragraph("<b>Share of Total</b>", styles["TH"]),
                Paragraph("<b>Negative %</b>", styles["TH"]),
                Paragraph("<b>Avg Response</b>", styles["TH"]),
                Paragraph("<b>Insight</b>", styles["TH"]),
            ]]
            for idx, t in enumerate(topics[:8], start=1):
                topic_name = str(t.get("cluster_name") or t.get("topic_keywords") or "General Inquiries")
                vol = int(t.get("volume") or 0)
                neg = float(t.get("negative_sentiment_percentage") or 0.0)
                resp = float(t.get("avg_response_time") or 0.0)
                share = (vol / max(1, total_records)) * 100

                if neg > 40:
                    insight = "High dissatisfaction — prioritize root cause resolution."
                elif resp > 60:
                    insight = "Slow response — review agent assignment workflow."
                elif share > 10:
                    insight = "High volume — consider deflection or automation."
                else:
                    insight = "Monitor for trend changes."

                topic_table.append([
                    Paragraph(f"#{idx}", styles["TD"]),
                    Paragraph(f"<b>{topic_name}</b>", styles["TD"]),
                    Paragraph(f"{vol:,}", styles["TD"]),
                    Paragraph(f"{share:.1f}%", styles["TD"]),
                    Paragraph(f"{neg:.1f}%", styles["TD"]),
                    Paragraph(f"{resp:.1f}m", styles["TD"]),
                    Paragraph(insight, styles["TD"]),
                ])
            story.append(self._table(topic_table, [0.5 * inch, 1.7 * inch, 0.8 * inch, 0.8 * inch, 0.8 * inch, 0.8 * inch, 1.5 * inch], header=True))
            story.append(Spacer(1, 0.06 * inch))

            if topics:
                top = topics[0]
                top_name = top.get("cluster_name") or top.get("topic_keywords") or "the leading topic"
                top_vol = int(top.get("volume") or 0)
                story.append(Paragraph(
                    f"<b>Key Finding:</b> The highest-volume complaint cluster is <b>{top_name}</b> with "
                    f"<b>{top_vol:,}</b> conversations ({(top_vol/max(1,total_records)*100):.1f}% of all traffic). "
                    "This should be the primary focus for operational improvement efforts.",
                    styles["Body"]
                ))
            story.append(Spacer(1, 0.1 * inch))

        # ── 10. Root Cause Analysis ────────────────────────────────────
        if "root_causes" in active_sections and root_causes:
            story.append(Paragraph("9. Root Cause Analysis (RCA)", styles["H1"]))
            story.append(Paragraph(
                "For each high-impact complaint cluster, the system identifies the underlying root cause — "
                "the systemic reason why the problem persists — and prescribes a specific remediation action "
                "owned by a responsible department.",
                styles["Body"]
            ))
            story.append(Spacer(1, 0.06 * inch))

            rc_table = [[
                Paragraph("<b>#</b>", styles["TH"]),
                Paragraph("<b>Failure Domain</b>", styles["TH"]),
                Paragraph("<b>Root Cause</b>", styles["TH"]),
                Paragraph("<b>Impact</b>", styles["TH"]),
                Paragraph("<b>Owner</b>", styles["TH"]),
                Paragraph("<b>Prescribed Fix</b>", styles["TH"]),
            ]]
            for idx, rc in enumerate(root_causes[:6], start=1):
                domain = str(rc.get("issue") or rc.get("cluster_name") or "")
                cause = str(rc.get("likely_root_cause") or rc.get("root_cause") or "")
                fix = str(rc.get("recommended_fix") or "")
                owner = str(rc.get("owner") or "Support Operations")
                evidence = str(rc.get("evidence") or rc.get("impact") or "")

                rc_table.append([
                    Paragraph(f"#{idx}", styles["TD"]),
                    Paragraph(f"<b>{domain}</b>", styles["TD"]),
                    Paragraph(cause[:200] if cause else "Under analysis", styles["TD"]),
                    Paragraph(evidence[:200] if evidence else "", styles["TD"]),
                    Paragraph(f"<font color='#4f46e5'><b>{owner}</b></font>", styles["TD"]),
                    Paragraph(fix[:200] if fix else "Remediation pending", styles["TD"]),
                ])
            story.append(self._table(rc_table, [0.4 * inch, 1.3 * inch, 1.5 * inch, 1.2 * inch, 1.0 * inch, 1.6 * inch], header=True))
            story.append(Spacer(1, 0.06 * inch))

            story.append(Paragraph(
                f"<b>Summary:</b> {len(root_causes)} root causes identified across the top complaint domains. "
                "Each fix is assigned to a specific department for accountability and tracking.",
                styles["Body"]
            ))
            story.append(Spacer(1, 0.1 * inch))

        # ── 11. Recommendations ────────────────────────────────────────
        if "recommendations" in active_sections and recommendations:
            story.append(Paragraph("10. Strategic Recommendations", styles["H1"]))
            story.append(Paragraph(
                "The following action items are ranked by impact and directly address the root causes "
                "and complaint themes identified in this report. Each recommendation includes the "
                "responsible owner and the specific operational change required.",
                styles["Body"]
            ))
            story.append(Spacer(1, 0.06 * inch))

            rec_table = [[
                Paragraph("<b>#</b>", styles["TH"]),
                Paragraph("<b>Owner</b>", styles["TH"]),
                Paragraph("<b>Issue Addressed</b>", styles["TH"]),
                Paragraph("<b>Recommended Action</b>", styles["TH"]),
            ]]
            for idx, rec in enumerate(recommendations[:8], start=1):
                owner = str(rec.get("owner") or "Support Operations")
                issue = str(rec.get("issue") or "Operational Workflow")
                action = str(rec.get("action") or rec.get("recommendation") or "")
                rec_table.append([
                    Paragraph(f"#{idx}", styles["TD"]),
                    Paragraph(f"<font color='#4f46e5'><b>{owner}</b></font>", styles["TD"]),
                    Paragraph(f"<b>{issue}</b>", styles["TD"]),
                    Paragraph(action[:300] if action else "", styles["TD"]),
                ])
            story.append(self._table(rec_table, [0.4 * inch, 1.3 * inch, 1.8 * inch, 3.1 * inch], header=True))
            story.append(Spacer(1, 0.1 * inch))

        # ── 12. Dimensional Breakdown ──────────────────────────────────
        if "dimensions" in active_sections and dims and (dims.get("by_region") or dims.get("by_company") or dims.get("by_product")):
            story.append(Paragraph("11. Dimensional Breakdown", styles["H1"]))
            story.append(Paragraph(
                "This section slices the data by geographic region, company, and product to identify "
                "where support performance varies most significantly. Variations across dimensions "
                "help pinpoint localized issues that aggregate metrics may obscure.",
                styles["Body"]
            ))
            story.append(Spacer(1, 0.06 * inch))

            by_region = dims.get("by_region") or []
            by_company = dims.get("by_company") or dims.get("by_brand") or []
            by_product = dims.get("by_product") or []

            if by_region:
                story.append(Paragraph("<b>By Geographic Region</b>", styles["Body"]))
                story.append(Spacer(1, 0.03 * inch))
                reg_rows = [[
                    Paragraph("<b>Region</b>", styles["TH"]),
                    Paragraph("<b>Volume</b>", styles["TH"]),
                    Paragraph("<b>Share</b>", styles["TH"]),
                    Paragraph("<b>Negative %</b>", styles["TH"]),
                    Paragraph("<b>Avg Response</b>", styles["TH"]),
                    Paragraph("<b>Resolution Rate</b>", styles["TH"]),
                ]]
                for r in by_region[:8]:
                    r_vol = int(r.get("total_conversations") or r.get("count") or 0)
                    r_share = (r_vol / max(1, total_records)) * 100
                    reg_rows.append([
                        Paragraph(f"<b>{str(r.get('region') or r.get('name'))}</b>", styles["TD"]),
                        Paragraph(self._fmt(r_vol), styles["TD"]),
                        Paragraph(f"{r_share:.1f}%", styles["TD"]),
                        Paragraph(f"{self._num(r.get('negative_sentiment_percentage')):.1f}%", styles["TD"]),
                        Paragraph(f"{self._num(r.get('avg_response_time_minutes')):.1f}m", styles["TD"]),
                        Paragraph(f"{self._num(r.get('resolution_rate')):.1f}%", styles["TD"]),
                    ])
                story.append(self._table(reg_rows, [1.6 * inch, 0.9 * inch, 0.7 * inch, 0.9 * inch, 0.9 * inch, 0.9 * inch], header=True))
                story.append(Spacer(1, 0.06 * inch))

            if by_company:
                story.append(Paragraph("<b>By Company / Brand</b>", styles["Body"]))
                story.append(Spacer(1, 0.03 * inch))
                comp_rows = [[
                    Paragraph("<b>Company</b>", styles["TH"]),
                    Paragraph("<b>Volume</b>", styles["TH"]),
                    Paragraph("<b>Share</b>", styles["TH"]),
                    Paragraph("<b>Negative %</b>", styles["TH"]),
                    Paragraph("<b>Avg Response</b>", styles["TH"]),
                    Paragraph("<b>Resolution Rate</b>", styles["TH"]),
                ]]
                for c in by_company[:10]:
                    c_vol = int(c.get("total_conversations") or c.get("count") or 0)
                    c_share = (c_vol / max(1, total_records)) * 100
                    comp_rows.append([
                        Paragraph(f"<b>{str(c.get('company') or c.get('brand') or c.get('name'))}</b>", styles["TD"]),
                        Paragraph(self._fmt(c_vol), styles["TD"]),
                        Paragraph(f"{c_share:.1f}%", styles["TD"]),
                        Paragraph(f"{self._num(c.get('negative_sentiment_percentage')):.1f}%", styles["TD"]),
                        Paragraph(f"{self._num(c.get('avg_response_time_minutes')):.1f}m", styles["TD"]),
                        Paragraph(f"{self._num(c.get('resolution_rate')):.1f}%", styles["TD"]),
                    ])
                story.append(self._table(comp_rows, [1.6 * inch, 0.9 * inch, 0.7 * inch, 0.9 * inch, 0.9 * inch, 0.9 * inch], header=True))
                story.append(Spacer(1, 0.06 * inch))

            if by_product:
                story.append(Paragraph("<b>By Product</b>", styles["Body"]))
                story.append(Spacer(1, 0.03 * inch))
                prod_rows = [[
                    Paragraph("<b>Product</b>", styles["TH"]),
                    Paragraph("<b>Volume</b>", styles["TH"]),
                    Paragraph("<b>Share</b>", styles["TH"]),
                    Paragraph("<b>Negative %</b>", styles["TH"]),
                    Paragraph("<b>Avg Response</b>", styles["TH"]),
                    Paragraph("<b>Resolution Rate</b>", styles["TH"]),
                ]]
                for p in by_product[:8]:
                    p_vol = int(p.get("total_conversations") or p.get("count") or 0)
                    p_share = (p_vol / max(1, total_records)) * 100
                    prod_rows.append([
                        Paragraph(f"<b>{str(p.get('product') or p.get('name'))}</b>", styles["TD"]),
                        Paragraph(self._fmt(p_vol), styles["TD"]),
                        Paragraph(f"{p_share:.1f}%", styles["TD"]),
                        Paragraph(f"{self._num(p.get('negative_sentiment_percentage')):.1f}%", styles["TD"]),
                        Paragraph(f"{self._num(p.get('avg_response_time_minutes')):.1f}m", styles["TD"]),
                        Paragraph(f"{self._num(p.get('resolution_rate')):.1f}%", styles["TD"]),
                    ])
                story.append(self._table(prod_rows, [1.6 * inch, 0.9 * inch, 0.7 * inch, 0.9 * inch, 0.9 * inch, 0.9 * inch], header=True))
            story.append(Spacer(1, 0.1 * inch))

        # ── 13. Methodology ────────────────────────────────────────────
        if "methodology" in active_sections:
            story.append(Paragraph("12. Methodology & Data Notes", styles["H1"]))
            story.append(Paragraph(
                "All metrics in this report are derived from actual customer support conversation data. "
                "The table below describes how each metric is calculated and whether it is directly measured "
                "from timestamps or inferred through proxy logic.",
                styles["Body"]
            ))
            story.append(Spacer(1, 0.06 * inch))

            methodology = analysis.get("proxy_methodology") or {}
            if isinstance(methodology, dict) and methodology:
                meth_rows = [[
                    Paragraph("<b>Metric</b>", styles["TH"]),
                    Paragraph("<b>Type</b>", styles["TH"]),
                    Paragraph("<b>Description</b>", styles["TH"]),
                    Paragraph("<b>Formula</b>", styles["TH"]),
                ]]
                for key, info in methodology.items():
                    if not isinstance(info, dict):
                        continue
                    label = info.get("label") or key
                    mtype = info.get("type", "proxy")
                    desc = info.get("description", "")
                    formula = info.get("formula", "")
                    type_color = "#059669" if mtype == "measured" else "#6366f1"
                    meth_rows.append([
                        Paragraph(f"<b>{label}</b>", styles["TD"]),
                        Paragraph(f"<font color='{type_color}'><b>{mtype.upper()}</b></font>", styles["TD"]),
                        Paragraph(str(desc)[:200], styles["TD"]),
                        Paragraph(f"<font face='Courier' size='6'>{formula}</font>", styles["TD"]),
                    ])
                story.append(self._table(meth_rows, [1.5 * inch, 0.8 * inch, 2.8 * inch, 1.9 * inch], header=True))
            else:
                story.append(Paragraph(
                    "Detailed methodology data was not available for this analysis run.",
                    styles["Body"]
                ))
            story.append(Spacer(1, 0.06 * inch))

            story.append(Paragraph(
                f"<b>Data Scope:</b> {self._fmt(total_records)} conversations analyzed. "
                f"Date range: {analysis.get('date_range', {}).get('min_date', 'N/A')} to "
                f"{analysis.get('date_range', {}).get('max_date', 'N/A')}.",
                styles["Body"]
            ))
            story.append(Spacer(1, 0.1 * inch))

        # ── Footer ─────────────────────────────────────────────────────
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
        """Generates a detailed Markdown report with full metric explanations."""
        filters = filters or {}
        active_sections: Set[str] = set(sections) if sections else {
            "summary", "kpi_summary", "sentiment", "sla", "topics",
            "root_causes", "spikes", "trends", "recommendations",
            "dimensions", "methodology"
        }

        kpis = analysis.get("kpi_metrics", {}) or {}
        topics = analysis.get("topic_summaries") or analysis.get("customer_pain_points") or []
        recommendations = analysis.get("recommendations") or []
        root_causes = analysis.get("root_cause_analysis") or []
        emerging_spikes = analysis.get("emerging_issues") or []
        dims = analysis.get("dimension_breakdowns") or {}
        sentiment_dist = analysis.get("sentiment_distribution") or {}
        sla_dist = analysis.get("sla_distribution") or []
        trends = analysis.get("trends") or {}
        total_records = kpis.get("total_records") or kpis.get("total_conversations") or 0

        type_titles = {
            "master": "Unified Master Comprehensive Audit",
            "executive": "Executive Briefing & Strategic Synthesis",
            "operational": "Full Operational Audit & SLA Intelligence",
            "comparative": "Multi-Period Comparative Trend Variance Audit",
            "rca_playbook": "Systemic Root Cause Remediation Playbook",
        }
        report_title = type_titles.get(report_type, "Voice-of-Customer Signal Intelligence Report")
        time_scope = filters.get("time_period", "overall").upper()
        if filters.get("year"):
            time_scope += f" | Year {filters.get('year')}"
        if filters.get("month"):
            time_scope += f" | Month {filters.get('month')}"

        lines = [
            f"# Voila Signal Intelligence — {report_title}",
            "",
            f"> **Generated**: {datetime.now(timezone.utc).strftime('%B %d, %Y %H:%M UTC')} | "
            f"**Scope**: `{time_scope}` | "
            f"**Records Analyzed**: `{self._fmt(total_records)}`",
            "",
            "---",
            "",
        ]

        # ── 1. Executive Summary ───────────────────────────────────────
        if "summary" in active_sections:
            lines.extend([
                "## 1. Executive Summary",
                "",
                f"This report provides a comprehensive analysis of customer support interactions "
                f"across **{self._fmt(total_records)}** conversations. Each section below breaks down "
                f"a specific dimension of support performance, explains what the metrics mean, and "
                f"highlights areas requiring attention.",
                "",
            ])
            raw_summary = analysis.get("llm_summary") or ""
            if isinstance(raw_summary, dict):
                raw_summary = raw_summary.get("summary") or raw_summary.get("text") or str(raw_summary)
            raw_summary = str(raw_summary) if raw_summary else ""
            if raw_summary:
                lines.extend([raw_summary, ""])

        # ── 2. KPI Dashboard ───────────────────────────────────────────
        if "kpi_summary" in active_sections:
            lines.extend([
                "## 2. Key Performance Indicators (KPIs)",
                "",
                "The following dashboard presents the seven core metrics that define support operational health. "
                "Each metric is compared against its industry-standard benchmark.",
                "",
                "| Metric | Value | Benchmark | Status |",
                "| :--- | :--- | :--- | :--- |",
            ])
            kpi_cards = [
                ("avg_response_time_minutes", kpis.get("avg_response_time_minutes")),
                ("resolution_rate", kpis.get("fcr_rate") or kpis.get("resolution_rate")),
                ("escalation_rate", kpis.get("escalation_rate")),
                ("reopen_rate", kpis.get("reopen_rate")),
                ("negative_sentiment_percentage", kpis.get("negative_sentiment_percentage")),
                ("positive_sentiment_percentage", kpis.get("positive_sentiment_percentage")),
                ("csat_proxy", kpis.get("csat_proxy")),
            ]
            for key, val in kpi_cards:
                bench = self._KPI_BENCHMARKS.get(key, {})
                num_val = self._num(val)
                unit = bench.get("unit", "%")
                target = bench.get("target", 0)
                higher_better = bench.get("higher_better", True)
                label = bench.get("label", key)
                is_ok = (num_val >= target) if higher_better else (num_val <= target)
                status = "OPTIMAL" if is_ok else "ATTENTION"
                icon = "OPTIMAL" if is_ok else "ATTENTION"
                if unit == "m":
                    lines.append(f"| **{label}** | `{num_val:.1f}m` | {'<=' if not higher_better else '>='}{target:.0f}m | **{icon}** |")
                else:
                    lines.append(f"| **{label}** | `{num_val:.1f}%` | {'<=' if not higher_better else '>='}{target:.0f}% | **{icon}** |")
            lines.append("")

            lines.extend(["### What These Metrics Mean", ""])
            for key, val in kpi_cards:
                bench = self._KPI_BENCHMARKS.get(key, {})
                if bench:
                    lines.append(f"- **{bench['label']}**: {bench['what']}")
            lines.append("")

        # ── 3. Sentiment Analysis ──────────────────────────────────────
        if "sentiment" in active_sections and sentiment_dist:
            lines.extend([
                "## 3. Customer Sentiment Analysis",
                "",
                "Sentiment analysis classifies every customer message as positive, negative, or neutral "
                "based on the emotional tone of the language used.",
                "",
                "| Sentiment | Count | Share | Interpretation |",
                "| :--- | :--- | :--- | :--- |",
            ])
            neg = sentiment_dist.get("negative", {})
            pos = sentiment_dist.get("positive", {})
            neu = sentiment_dist.get("neutral", {})
            lines.append(f"| **Negative** | `{self._fmt(neg.get('count', 0))}` | `{self._num(neg.get('percentage', 0)):.1f}%` | Customers expressing frustration or dissatisfaction |")
            lines.append(f"| **Positive** | `{self._fmt(pos.get('count', 0))}` | `{self._num(pos.get('percentage', 0)):.1f}%` | Customers expressing gratitude or satisfaction |")
            lines.append(f"| **Neutral** | `{self._fmt(neu.get('count', 0))}` | `{self._num(neu.get('percentage', 0)):.1f}%` | Factual, informational exchanges |")
            lines.append("")

            neg_pct = self._num(neg.get("percentage", 0))
            if neg_pct > 30:
                lines.append(f"**Alert:** Negative sentiment at {neg_pct:.1f}% exceeds the 30% threshold — immediate investigation recommended.")
            elif neg_pct > 20:
                lines.append(f"**Notice:** Negative sentiment at {neg_pct:.1f}% is above the 20% comfort level — monitoring recommended.")
            else:
                lines.append(f"**Status:** Negative sentiment at {neg_pct:.1f}% is within acceptable bounds.")
            lines.append("")

        # ── 4. SLA Performance ─────────────────────────────────────────
        if "sla" in active_sections and sla_dist:
            lines.extend([
                "## 4. Response Time & SLA Performance",
                "",
                "SLA performance measures how quickly customers receive their first response. "
                "This table breaks response times into four tiers.",
                "",
                "| SLA Tier | Count | Share | Status | Meaning |",
                "| :--- | :--- | :--- | :--- | :--- |",
            ])
            sla_meanings = {
                "optimal": "Response within 15 minutes — gold standard",
                "standard": "Response within 1 hour — acceptable",
                "warning": "Response took 1-4 hours — meaningful wait",
                "critical": "Response took 4+ hours — critical SLA breach",
            }
            for tier in sla_dist:
                status = tier.get("status", "standard")
                lines.append(
                    f"| **{tier.get('tier', '')}** | `{self._fmt(tier.get('count', 0))}` | "
                    f"`{self._num(tier.get('percentage', 0)):.1f}%` | **{status.upper()}** | "
                    f"{sla_meanings.get(status, '')} |"
                )
            lines.append("")

            avg_resp = self._num(kpis.get("avg_response_time_minutes"))
            lines.append(f"**Overall Average:** {avg_resp:.1f} minutes across {self._fmt(total_records)} conversations.")
            lines.append("")

        # ── 5. Comparative Variance ────────────────────────────────────
        if comparative_data and "comparative" in report_type:
            lines.extend([
                "## 5. Period-over-Period Variance Analysis",
                "",
                "| Metric | Baseline (T0) | Current (T1) | Change | Diagnostic |",
                "| :--- | :--- | :--- | :--- | :--- |",
            ])
            curr_kpis = comparative_data.get("current_kpis", {})
            prev_kpis = comparative_data.get("previous_kpis", {})
            metrics = [
                ("First-Contact Resolution", "resolution_rate", "%", True),
                ("Average Response Time", "avg_response_time_minutes", "m", False),
                ("Escalation Rate", "escalation_rate", "%", False),
                ("Reopen Rate", "reopen_rate", "%", False),
                ("Negative Sentiment", "negative_sentiment_percentage", "%", False),
            ]
            for label, key, unit, higher_is_better in metrics:
                b_val = float(prev_kpis.get(key) or 0)
                t_val = float(curr_kpis.get(key) or 0)
                delta = round(t_val - b_val, 1)
                is_improved = (delta >= 0 if higher_is_better else delta <= 0)
                status_text = "IMPROVED" if is_improved else "DEGRADED"
                if delta == 0:
                    why = "Stable between periods."
                elif is_improved:
                    why = f"Improved by {abs(delta):.1f}{unit}."
                else:
                    why = f"Degraded by {abs(delta):.1f}{unit}."
                lines.append(f"| **{label}** | `{b_val:.1f}{unit}` | `{t_val:.1f}{unit}` | `{delta:+.1f}{unit}` ({status_text}) | {why} |")
            lines.append("")

        # ── 6. Trend Data ──────────────────────────────────────────────
        if "trends" in active_sections and trends:
            lines.extend([
                "## 6. Temporal Trends",
                "",
                "Trend data shows how key metrics have evolved over time.",
                "",
            ])
            sentiment_trend = trends.get("sentiment_trend") or []
            if sentiment_trend:
                lines.extend([
                    "### Sentiment Trend (Recent Periods)",
                    "",
                    "| Period | Volume | Negative | Positive | Neutral | Neg % |",
                    "| :--- | :--- | :--- | :--- | :--- | :--- |",
                ])
                for t in sentiment_trend[-10:]:
                    day = t.get("day") or t.get("period") or ""
                    tot = int(t.get("total") or 0)
                    pos = int(t.get("positive") or 0)
                    neu = int(t.get("neutral") or 0)
                    neg = int(t.get("negative") or 0)
                    neg_pct = round(neg / max(1, tot) * 100.0, 1) if tot else 0.0
                    lines.append(
                        f"| **{day}** | `{tot:,}` | `{neg:,}` | `{pos:,}` | `{neu:,}` | `{neg_pct:.1f}%` |"
                    )
                lines.append("")

            service_trend = trends.get("service_trend") or []
            if service_trend:
                lines.extend([
                    "### Service Trend (Recent Periods)",
                    "",
                    "| Period | Volume | Resolution Rate | Escalation Rate |",
                    "| :--- | :--- | :--- | :--- |",
                ])
                for t in service_trend[-10:]:
                    day = t.get("day") or t.get("period") or ""
                    tot = int(t.get("total") or 0)
                    res = self._num(t.get("resolution") or t.get("resolution_rate"))
                    esc = self._num(t.get("escalation") or t.get("escalation_rate"))
                    lines.append(
                        f"| **{day}** | `{tot:,}` | `{res:.1f}%` | `{esc:.1f}%` |"
                    )
                lines.append("")

        # ── 7. Emerging Issues ─────────────────────────────────────────
        if "spikes" in active_sections and emerging_spikes:
            lines.extend([
                "## 7. Emerging Issues & Statistical Anomalies",
                "",
                "Z-score analysis detects topics experiencing volume surges significantly above baseline. "
                "A Z-score above 2.0 indicates a genuine emerging problem.",
                "",
                "| Z-Score | Surging Topic | Volume Surge | Active Cases | Interpretation |",
                "| :--- | :--- | :--- | :--- | :--- |",
            ])
            for sp in emerging_spikes[:5]:
                name = str(sp.get("cluster_name") or sp.get("topic_keywords") or "Issue")
                z = float(sp.get("z_score") or 2.0)
                surge = int(sp.get("surge_percentage") or 500)
                vol = int(sp.get("volume") or 0)
                if z >= 3.0:
                    interp = "Critical — immediate investigation"
                elif z >= 2.5:
                    interp = "Significant — proactive monitoring"
                else:
                    interp = "Notable — track for escalation"
                lines.append(f"| **Z={z:.2f}** | **{name}** | **+{surge}%** | `{vol:,}` | {interp} |")
            lines.append("")

        # ── 8. Topic Clusters ──────────────────────────────────────────
        if "topics" in active_sections and topics:
            lines.extend([
                "## 8. Complaint Topic Clusters",
                "",
                "NLP clustering groups conversations into thematic clusters, ranked by volume and severity.",
                "",
                "| Rank | Topic Cluster | Volume | Share | Negative % | Avg Response | Insight |",
                "| :--- | :--- | :--- | :--- | :--- | :--- | :--- |",
            ])
            for idx, t in enumerate(topics[:8], start=1):
                topic_name = str(t.get("cluster_name") or t.get("topic_keywords") or "General")
                vol = int(t.get("volume") or 0)
                neg = float(t.get("negative_sentiment_percentage") or 0.0)
                resp = float(t.get("avg_response_time") or 0.0)
                share = (vol / max(1, total_records)) * 100
                if neg > 40:
                    insight = "High dissatisfaction"
                elif resp > 60:
                    insight = "Slow response"
                elif share > 10:
                    insight = "High volume"
                else:
                    insight = "Monitor"
                lines.append(f"| #{idx} | **{topic_name}** | `{vol:,}` | `{share:.1f}%` | `{neg:.1f}%` | `{resp:.1f}m` | {insight} |")
            lines.append("")

            if topics:
                top = topics[0]
                top_name = top.get("cluster_name") or "the leading topic"
                top_vol = int(top.get("volume") or 0)
                lines.append(f"**Key Finding:** The highest-volume complaint cluster is **{top_name}** with **{top_vol:,}** conversations ({(top_vol/max(1,total_records)*100):.1f}% of all traffic).")
                lines.append("")

        # ── 9. Root Cause Analysis ─────────────────────────────────────
        if "root_causes" in active_sections and root_causes:
            lines.extend([
                "## 9. Root Cause Analysis (RCA)",
                "",
                "For each high-impact complaint cluster, the system identifies the underlying root cause "
                "and prescribes a specific remediation action.",
                "",
                "| # | Failure Domain | Root Cause | Impact | Owner | Prescribed Fix |",
                "| :--- | :--- | :--- | :--- | :--- | :--- |",
            ])
            for idx, rc in enumerate(root_causes[:6], start=1):
                domain = str(rc.get("issue") or rc.get("cluster_name") or "")
                cause = str(rc.get("likely_root_cause") or rc.get("root_cause") or "")
                fix = str(rc.get("recommended_fix") or "")
                owner = str(rc.get("owner") or "Support Operations")
                evidence = str(rc.get("evidence") or rc.get("impact") or "")
                lines.append(f"| #{idx} | **{domain}** | {cause[:150]} | {evidence[:100]} | `{owner}` | {fix[:150]} |")
            lines.append("")
            lines.append(f"**Summary:** {len(root_causes)} root causes identified across the top complaint domains.")
            lines.append("")

        # ── 10. Recommendations ────────────────────────────────────────
        if "recommendations" in active_sections and recommendations:
            lines.extend([
                "## 10. Strategic Recommendations",
                "",
                "Action items ranked by impact, directly addressing identified root causes.",
                "",
            ])
            for idx, rec in enumerate(recommendations[:8], start=1):
                owner = str(rec.get("owner") or "Support Operations")
                issue = str(rec.get("issue") or "Operational Workflow")
                action = str(rec.get("action") or rec.get("recommendation") or "")
                lines.append(f"- **[#{idx} · {owner}] {issue}**: {action}")
            lines.append("")

        # ── 11. Dimensional Breakdown ──────────────────────────────────
        if "dimensions" in active_sections and dims:
            lines.extend([
                "## 11. Dimensional Breakdown",
                "",
            ])
            by_region = dims.get("by_region") or []
            if by_region:
                lines.extend([
                    "### By Geographic Region",
                    "",
                    "| Region | Volume | Share | Negative % | Avg Response | Resolution Rate |",
                    "| :--- | :--- | :--- | :--- | :--- | :--- |",
                ])
                for r in by_region[:8]:
                    reg = str(r.get("region") or r.get("name"))
                    r_vol = int(r.get("total_conversations") or r.get("count") or 0)
                    r_share = (r_vol / max(1, total_records)) * 100
                    lines.append(
                        f"| **{reg}** | `{self._fmt(r_vol)}` | `{r_share:.1f}%` | "
                        f"`{self._num(r.get('negative_sentiment_percentage')):.1f}%` | "
                        f"`{self._num(r.get('avg_response_time_minutes')):.1f}m` | "
                        f"`{self._num(r.get('resolution_rate')):.1f}%` |"
                    )
                lines.append("")

            by_company = dims.get("by_company") or dims.get("by_brand") or []
            if by_company:
                lines.extend([
                    "### By Company / Brand",
                    "",
                    "| Company | Volume | Share | Negative % | Avg Response | Resolution Rate |",
                    "| :--- | :--- | :--- | :--- | :--- | :--- |",
                ])
                for c in by_company[:10]:
                    name = str(c.get("company") or c.get("brand") or c.get("name"))
                    c_vol = int(c.get("total_conversations") or c.get("count") or 0)
                    c_share = (c_vol / max(1, total_records)) * 100
                    lines.append(
                        f"| **{name}** | `{self._fmt(c_vol)}` | `{c_share:.1f}%` | "
                        f"`{self._num(c.get('negative_sentiment_percentage')):.1f}%` | "
                        f"`{self._num(c.get('avg_response_time_minutes')):.1f}m` | "
                        f"`{self._num(c.get('resolution_rate')):.1f}%` |"
                    )
                lines.append("")

            by_product = dims.get("by_product") or []
            if by_product:
                lines.extend([
                    "### By Product",
                    "",
                    "| Product | Volume | Share | Negative % | Avg Response | Resolution Rate |",
                    "| :--- | :--- | :--- | :--- | :--- | :--- |",
                ])
                for p in by_product[:8]:
                    name = str(p.get("product") or p.get("name"))
                    p_vol = int(p.get("total_conversations") or p.get("count") or 0)
                    p_share = (p_vol / max(1, total_records)) * 100
                    lines.append(
                        f"| **{name}** | `{self._fmt(p_vol)}` | `{p_share:.1f}%` | "
                        f"`{self._num(p.get('negative_sentiment_percentage')):.1f}%` | "
                        f"`{self._num(p.get('avg_response_time_minutes')):.1f}m` | "
                        f"`{self._num(p.get('resolution_rate')):.1f}%` |"
                    )
                lines.append("")

        # ── 12. Methodology ────────────────────────────────────────────
        if "methodology" in active_sections:
            lines.extend([
                "## 12. Methodology & Data Notes",
                "",
                "All metrics in this report are derived from actual customer support conversation data. "
                "The table below describes how each metric is calculated and whether it is directly measured "
                "or inferred through proxy logic.",
                "",
            ])
            methodology = analysis.get("proxy_methodology") or {}
            if isinstance(methodology, dict) and methodology:
                lines.extend([
                    "| Metric | Type | Description | Formula |",
                    "| :--- | :--- | :--- | :--- |",
                ])
                for key, info in methodology.items():
                    if not isinstance(info, dict):
                        continue
                    label = info.get("label") or key
                    mtype = info.get("type", "proxy")
                    desc = info.get("description", "")
                    formula = info.get("formula", "")
                    lines.append(
                        f"| **{label}** | `{mtype.upper()}` | {desc[:150]} | `{formula}` |"
                    )
                lines.append("")
            else:
                lines.extend([
                    "Detailed methodology data was not available for this analysis run.",
                    "",
                ])
            date_range = analysis.get("date_range") or {}
            lines.append(
                f"**Data Scope:** {self._fmt(total_records)} conversations analyzed. "
                f"Date range: {date_range.get('min_date', 'N/A')} to {date_range.get('max_date', 'N/A')}."
            )
            lines.append("")

        return "\n".join(lines)

    def build_csv(self, analysis: Dict[str, Any], filters: Optional[Dict[str, Any]] = None) -> str:
        """Exports analytics data into structured tabular CSV format."""
        output = io.StringIO()
        writer = csv.writer(output)

        kpis = analysis.get("kpi_metrics", {}) or {}
        topics = analysis.get("topic_summaries") or analysis.get("customer_pain_points") or []
        root_causes = analysis.get("root_cause_analysis") or []
        sentiment_dist = analysis.get("sentiment_distribution") or {}
        sla_dist = analysis.get("sla_distribution") or []

        writer.writerow(["=== VOILA SIGNAL INTELLIGENCE REPORT ==="])
        writer.writerow(["Generated At", datetime.now(timezone.utc).isoformat()])
        writer.writerow([])

        writer.writerow(["=== CORE KPIs ==="])
        writer.writerow(["Metric", "Value", "Benchmark", "Status"])
        for key in ["resolution_rate", "escalation_rate", "reopen_rate", "avg_response_time_minutes",
                     "negative_sentiment_percentage", "positive_sentiment_percentage", "csat_proxy"]:
            val = kpis.get(key)
            bench = self._KPI_BENCHMARKS.get(key, {})
            if val is not None and bench:
                num_val = self._num(val)
                target = bench.get("target", 0)
                higher_better = bench.get("higher_better", True)
                is_ok = (num_val >= target) if higher_better else (num_val <= target)
                writer.writerow([bench.get("label", key), f"{num_val:.1f}{bench.get('unit', '%')}", f"{'<=' if not higher_better else '>='}{target}{bench.get('unit', '%')}", "OPTIMAL" if is_ok else "ATTENTION"])
        writer.writerow([])

        if sentiment_dist:
            writer.writerow(["=== SENTIMENT DISTRIBUTION ==="])
            writer.writerow(["Sentiment", "Count", "Percentage"])
            for sent_type in ["negative", "positive", "neutral"]:
                data = sentiment_dist.get(sent_type, {})
                writer.writerow([sent_type.capitalize(), data.get("count", 0), f"{self._num(data.get('percentage', 0)):.1f}%"])
            writer.writerow([])

        if sla_dist:
            writer.writerow(["=== SLA DISTRIBUTION ==="])
            writer.writerow(["Tier", "Count", "Percentage", "Status"])
            for tier in sla_dist:
                writer.writerow([tier.get("tier", ""), tier.get("count", 0), f"{self._num(tier.get('percentage', 0)):.1f}%", tier.get("status", "")])
            writer.writerow([])

        writer.writerow(["=== TOPIC CLUSTERS ==="])
        writer.writerow(["Rank", "Cluster Name", "Keywords", "Volume", "Negative Complaints", "Negative %", "Avg Response (m)", "Pain Score"])
        for idx, t in enumerate(topics, start=1):
            writer.writerow([idx, t.get("cluster_name") or t.get("topic_keywords"), t.get("topic_keywords"),
                             t.get("volume"), t.get("negative_complaints"), t.get("negative_sentiment_percentage"),
                             t.get("avg_response_time"), t.get("pain_score")])
        writer.writerow([])

        writer.writerow(["=== ROOT CAUSE ANALYSIS ==="])
        writer.writerow(["Rank", "Failure Domain", "Root Cause", "Owner", "Recommended Fix", "Volume", "Negative %", "Severity"])
        for idx, rc in enumerate(root_causes, start=1):
            writer.writerow([idx, rc.get("issue") or rc.get("cluster_name"), rc.get("likely_root_cause"),
                             rc.get("owner"), rc.get("recommended_fix"), rc.get("volume"),
                             rc.get("negative_sentiment_percentage"), rc.get("severity_score")])

        return output.getvalue()

    def build_json(self, analysis: Dict[str, Any], filters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Returns clean serializable JSON export payload."""
        return {
            "metadata": {
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "system": "Voila Voice-of-Customer Signal Intelligence v3.0",
                "filters": filters or {}
            },
            "kpi_metrics": analysis.get("kpi_metrics", {}),
            "sentiment_distribution": analysis.get("sentiment_distribution", {}),
            "sla_distribution": analysis.get("sla_distribution", []),
            "topic_summaries": analysis.get("topic_summaries", []),
            "emerging_issues": analysis.get("emerging_issues", []),
            "root_cause_analysis": analysis.get("root_cause_analysis", []),
            "recommendations": analysis.get("recommendations", []),
            "dimension_breakdowns": analysis.get("dimension_breakdowns", {}),
            "trends": analysis.get("trends", {}),
            "executive_summary": analysis.get("llm_summary", ""),
            "methodology": analysis.get("proxy_methodology", "")
        }

    # ── Styles ─────────────────────────────────────────────────────────
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
        canvas.drawString(0.5 * inch, 0.25 * inch, "voila.ai v3.0 — Enterprise Voice-of-Customer Signal Intelligence")
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

    def _filter_text(self, filters: Dict[str, Any]) -> str:
        clean = {k: v for k, v in filters.items() if v and v != "all"}
        if not clean:
            return "All-Time Full Ingestion Dataset"
        return ", ".join(f"{k}: {v}" for k, v in clean.items())


report_generator = AnalyticsReportGenerator()
