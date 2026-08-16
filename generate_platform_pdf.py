import os
import sys
import shutil
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable, Image
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    """Custom canvas that dynamically writes total page numbers and running headers/footers."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_decorations(self, page_count):
        if self._pageNumber == 1:
            return  # Skip cover page

        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#475569"))

        # Running Top Header
        self.drawString(54, 752, "VOÏLA — Voice of Customer Signal Intelligence & Agentic AI Platform")
        self.drawRightString(558, 752, "Enterprise Technical Specification Manual")
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.75)
        self.line(54, 744, 558, 744)

        # Running Bottom Footer
        self.line(54, 45, 558, 45)
        self.setFont("Helvetica", 8)
        self.drawString(54, 32, "Confidential — Generated for Engineering, Product & Operational Governance")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 32, page_str)
        self.restoreState()


def build_pdf(output_path: str):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Premium Brand Palette
    PRIMARY = colors.HexColor("#4338CA")        # Deep Indigo
    PRIMARY_DARK = colors.HexColor("#1E1B4B")   # Midnight Violet
    SECONDARY = colors.HexColor("#4F46E5")      # Electric Indigo
    TEXT_MAIN = colors.HexColor("#0F172A")      # Slate 900
    TEXT_MUTED = colors.HexColor("#475569")     # Slate 600
    BG_LIGHT = colors.HexColor("#F8FAFC")       # Slate 50
    BG_BOX = colors.HexColor("#EEF2FF")         # Indigo 50
    BORDER_COLOR = colors.HexColor("#CBD5E1")   # Slate 300
    ACCENT_GREEN = colors.HexColor("#059669")   # Emerald 600
    ACCENT_ROSE = colors.HexColor("#E11D48")    # Rose 600

    # Typography Styles
    title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=30,
        textColor=PRIMARY_DARK,
        spaceAfter=6
    )

    subtitle_style = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=16,
        textColor=TEXT_MUTED,
        spaceAfter=16
    )

    h1_style = ParagraphStyle(
        'H1',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=PRIMARY,
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'H2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=PRIMARY_DARK,
        spaceBefore=10,
        spaceAfter=5,
        keepWithNext=True
    )

    h3_style = ParagraphStyle(
        'H3',
        parent=styles['Heading3'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=13,
        textColor=TEXT_MAIN,
        spaceBefore=8,
        spaceAfter=3,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12.5,
        textColor=TEXT_MAIN,
        spaceAfter=5
    )

    bullet_style = ParagraphStyle(
        'Bullet',
        parent=body_style,
        leftIndent=12,
        firstLineIndent=-8,
        spaceAfter=4
    )

    table_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=TEXT_MAIN
    )

    table_header = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=11,
        textColor=colors.white
    )

    formula_title = ParagraphStyle(
        'FormulaTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=PRIMARY_DARK
    )

    formula_text = ParagraphStyle(
        'FormulaText',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=12,
        textColor=PRIMARY
    )

    callout_style = ParagraphStyle(
        'Callout',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12.5,
        textColor=PRIMARY_DARK,
        backColor=BG_BOX,
        borderPadding=8,
        spaceAfter=8
    )

    story = []

    # ==========================================
    # COVER PAGE
    # ==========================================
    logo_path = 'd:/projects/voila/frontend/public/voila-full.png'
    if os.path.exists(logo_path):
        story.append(Image(logo_path, width=2.4*inch, height=1.3*inch))
        story.append(Spacer(1, 14))

    story.append(Paragraph("VOÏLA PLATFORM SPECIFICATION", title_style))
    story.append(Paragraph("Comprehensive Technical Reference: Complete Feature Catalog, Mathematical Metrics, ML/NLP Algorithms, Agentic AI Tooling & Relational Database Schemas", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2, color=PRIMARY, spaceAfter=14))

    meta_data = [
        [Paragraph("<b>Platform Name:</b>", table_cell), Paragraph("<b>Voilà — Voice of Customer Signal Intelligence Platform</b>", table_cell)],
        [Paragraph("<b>Release Version:</b>", table_cell), Paragraph("v2.4.0 (Enterprise Production Build)", table_cell)],
        [Paragraph("<b>Active Scale:</b>", table_cell), Paragraph("<b>105,000 Ingested Customer Conversations</b>", table_cell)],
        [Paragraph("<b>Core Stack:</b>", table_cell), Paragraph("FastAPI, React 18, PostgreSQL 15, Qdrant Vector DB, Snowflake, AWS Bedrock", table_cell)],
        [Paragraph("<b>System Capabilities:</b>", table_cell), Paragraph("Real-Time SLA Triage, Root-Cause NLP, Conversational AI Copilot, S3 Data Lake", table_cell)],
        [Paragraph("<b>Author / Architect:</b>", table_cell), Paragraph("Voilà Engineering & AI Architecture Group", table_cell)],
    ]
    t_meta = Table(meta_data, colWidths=[1.8*inch, 5.0*inch])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), BG_LIGHT),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 16))

    story.append(Paragraph("<b>Executive Overview:</b><br/>Voilà is an enterprise-grade intelligence platform that converts high-volume, unstructured customer support dialogues into real-time operational diagnostics, root-cause friction themes, and executive decision policies. The system continuously evaluates 105,000+ interactions across response velocity, First Contact Resolution (FCR), reopen rates, and sentiment distress.", callout_style))

    story.append(PageBreak())

    # ==========================================
    # SECTION 1: DETAILED FEATURE CATALOG
    # ==========================================
    story.append(Paragraph("1. Complete Platform Feature Catalog", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceAfter=8))

    story.append(Paragraph("1.1 Executive Dashboard & Operational Intelligence (<code>/</code>)", h2_style))
    story.append(Paragraph("• <b>Live Telemetry Grid:</b> Instant KPI cards tracking Total Interactions (105,000), First Contact Resolution Rate (53.7%), Average Response Time (133.7m), Ticket Reopen Rate (44.5%), Negative Friction Share (24.2%), and CSAT Index (3.8/5.0).", bullet_style))
    story.append(Paragraph("• <b>SLA Latency Distribution Matrix:</b> Multi-bucket response latency analysis categorizing tickets into <15m, 15-60m, 1-4h, and >4h with dynamic percentage breakdowns.", bullet_style))
    story.append(Paragraph("• <b>Sentiment & Friction Donut:</b> Three-tier sentiment polarity breakdown measuring positive satisfaction vs negative friction.", bullet_style))
    story.append(Paragraph("• <b>Service Velocity Trend Analysis:</b> Continuous temporal response curve tracking velocity shifts across hourly, daily, and monthly intervals.", bullet_style))
    story.append(Paragraph("• <b>Topic Quadrant Matrix (2D Scatter):</b> 2-dimensional scatter visualization plotting <i>Friction Severity vs Ticket Volume</i> to separate high-impact critical blockers from low-severity high-volume noise.", bullet_style))
    story.append(Paragraph("• <b>Unified Regional Intelligence:</b> Geographic breakdown comparing SLA latency and sentiment across North America, Europe, Asia Pacific, Latin America, and Middle East & Africa.", bullet_style))
    story.append(Paragraph("• <b>Priority Action Board:</b> Autonomous prioritization engine generating P0, P1, and P2 operational interventions mapped to Engineering, Support Operations, and Billing teams.", bullet_style))
    story.append(Paragraph("• <b>Spike Detection Banner:</b> Statistical anomaly detector alerting teams when volume or negative tone spikes beyond 2.5 standard deviations.", bullet_style))
    story.append(Paragraph("• <b>Multi-Format Custom Export:</b> One-click generation and instant download of customized executive briefs in <b>PDF, CSV, JSON, and Markdown</b> formats.", bullet_style))

    story.append(Spacer(1, 6))
    story.append(Paragraph("1.2 Topic Clusters & NLP Deep-Dive (<code>/topics</code>)", h2_style))
    story.append(Paragraph("• <b>Automated Unsupervised Clustering:</b> BERTopic and class-based TF-IDF pipeline grouping conversations into semantic friction clusters.", bullet_style))
    story.append(Paragraph("• <b>Pre-Configured Core Clusters:</b> Deep diagnostics for <i>Poor customer support, Application malfunction, Delivery & Order logistics, Billing & Invoices, Connectivity/Network failures, and Account Access/2FA</i>.", bullet_style))
    story.append(Paragraph("• <b>Verbatim Customer Quotes:</b> Anonymized, live dialogue evidence with timestamps, author roles (customer vs agent), and sentiment polarity.", bullet_style))
    story.append(Paragraph("• <b>Pain Score & Escalation Risk:</b> Mathematically weighted operational index quantifying severity based on volume, negative tone, and response delay.", bullet_style))
    story.append(Paragraph("• <b>Root-Cause Breakdown:</b> Systematic engineering and support root-cause analysis for each identified topic cluster.", bullet_style))

    story.append(Spacer(1, 6))
    story.append(Paragraph("1.3 Ask Data — Gemini / ChatGPT Conversational Copilot (<code>/ask</code>)", h2_style))
    story.append(Paragraph("• <b>Conversational Chat Experience:</b> Streamlined chat layout with Voilà sparkle brand avatar, sleek user bubbles, and Gemini-style animated reasoning indicator.", bullet_style))
    story.append(Paragraph("• <b>Natural Persona Intelligence:</b> Contextual answers for identity queries ('what is your name'), capabilities ('what can you do'), politeness ('thank you'), greetings, and farewells.", bullet_style))
    story.append(Paragraph("• <b>Root-Cause & Volume Diagnosis:</b> Specialized reasoning engine capable of diagnosing specific numbers (e.g. 15,700 messages driving poor customer support friction).", bullet_style))
    story.append(Paragraph("• <b>Action Toolbar & Collapsible Telemetry:</b> Copy-to-clipboard button, feedback buttons, and a collapsible accordion containing visual KPI charts.", bullet_style))
    story.append(Paragraph("• <b>Query Audit History:</b> Persistent history sidebar with single-item deletion on hover and a global 'Clear All' action.", bullet_style))

    story.append(Spacer(1, 6))
    story.append(Paragraph("1.4 Streaming Ingestion & S3 Data Pipeline (<code>/upload</code>)", h2_style))
    story.append(Paragraph("• <b>Large-Scale File Ingestion:</b> Drag-and-drop CSV and Excel uploader supporting millions of rows without browser memory exhaustion.", bullet_style))
    story.append(Paragraph("• <b>Dual Ingestion Architecture:</b> In-Memory RAM Engine for sub-second small dataset uploads + Chunked Streaming Engine (20,000 rows/chunk) with zero OOM risk.", bullet_style))
    story.append(Paragraph("• <b>AWS S3 Object Storage Data Lake:</b> Automated cloud data lake streaming with bucket storage and S3 key management.", bullet_style))
    story.append(Paragraph("• <b>Dataset Catalog & Run Management:</b> Instant switching between dataset runs and a permanent delete confirmation modal (<code>DELETE /analytics/runs/{run_id}</code>).", bullet_style))

    story.append(Spacer(1, 6))
    story.append(Paragraph("1.5 Dataset Delta & Multi-Period Comparison (<code>/compare</code>)", h2_style))
    story.append(Paragraph("• <b>Side-by-Side Variance Analysis:</b> Compare two distinct uploaded runs or two calendar years (e.g. 2017 vs 2018).", bullet_style))
    story.append(Paragraph("• <b>Automated Delta Calculations:</b> Live delta indicators for Delta Resolution (%), Delta Response Time (mins), Delta Negative Sentiment, and Delta Volume.", bullet_style))
    story.append(Paragraph("• <b>Emergent Topic Detection:</b> Flags newly emerging complaint clusters and tracks resolved issues over time.", bullet_style))

    story.append(Spacer(1, 6))
    story.append(Paragraph("1.6 Global UX & Security Infrastructure", h2_style))
    story.append(Paragraph("• <b>Hardware-Accelerated 60 FPS Sidebar:</b> Smooth GPU-composited collapsible navigation sidebar with official Voilà 'V' brand mark.", bullet_style))
    story.append(Paragraph("• <b>Persistent Floating AI Copilot:</b> Accessible from any screen via a floating launcher bubble in the bottom-right.", bullet_style))
    story.append(Paragraph("• <b>Global Filter Bar:</b> Slices telemetry across Time Period, Year, Month, Date Range, Brand/Company, Product, and Region.", bullet_style))
    story.append(Paragraph("• <b>JWT Security:</b> Secure authentication with token persistence, protected route wrappers, and user profile management.", bullet_style))

    story.append(PageBreak())

    # ==========================================
    # SECTION 2: MATHEMATICAL METRICS & FORMULAS
    # ==========================================
    story.append(Paragraph("2. Operational Metrics & Mathematical KPI Models", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceAfter=8))
    story.append(Paragraph("Every operational metric in Voilà is rigorously defined and computed from raw relational PostgreSQL conversation records:", body_style))

    # Metric 1: Resolution Rate
    m1_data = [
        [Paragraph("<b>1. First Contact Resolution Rate (FCR / Resolution Rate)</b>", formula_title), Paragraph("<b>Active Baseline: 53.7%</b> | <b>Target SLA: ≥ 75.0%</b>", table_cell)],
        [Paragraph("<b>Mathematical Formula:</b>", table_cell), Paragraph("<b>FCR (%) = ( <i>N</i><sub>resolved</sub> / <i>N</i><sub>total</sub> ) &times; 100</b>", formula_text)],
        [Paragraph("<b>Variable Definitions:</b>", table_cell), Paragraph("• <i>N</i><sub>resolved</sub> = Count of conversations marked as resolved on first customer interaction.<br/>• <i>N</i><sub>total</sub> = Total count of inbound customer conversations.", table_cell)],
        [Paragraph("<b>Calculation Example:</b>", table_cell), Paragraph("In active dataset: 56,385 resolved / 105,000 total &times; 100 = <b>53.7%</b>.", table_cell)],
    ]
    t_m1 = Table(m1_data, colWidths=[1.8*inch, 5.0*inch])
    t_m1.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), BG_BOX),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_m1)
    story.append(Spacer(1, 8))

    # Metric 2: Mean Response Time
    m2_data = [
        [Paragraph("<b>2. Mean Response Latency (MRT)</b>", formula_title), Paragraph("<b>Active Baseline: 133.7 mins</b> | <b>Target SLA: ≤ 15.0 mins</b>", table_cell)],
        [Paragraph("<b>Mathematical Formula:</b>", table_cell), Paragraph("<b>MRT = ( 1 / <i>N</i> ) &times; &sum; ( <i>T</i><sub>reply, <i>i</i></sub> &minus; <i>T</i><sub>inbound, <i>i</i></sub> )</b>", formula_text)],
        [Paragraph("<b>Variable Definitions:</b>", table_cell), Paragraph("• <i>T</i><sub>reply, <i>i</i></sub> = Timestamp of first official support agent response.<br/>• <i>T</i><sub>inbound, <i>i</i></sub> = Timestamp of initial customer complaint message.<br/>• <i>N</i> = Total evaluated interaction pairs with valid response timestamps.", table_cell)],
        [Paragraph("<b>Calculation Example:</b>", table_cell), Paragraph("Sum of latency across 105,000 interactions = 14,038,500 minutes &divide; 105,000 = <b>133.7 minutes</b>.", table_cell)],
    ]
    t_m2 = Table(m2_data, colWidths=[1.8*inch, 5.0*inch])
    t_m2.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), BG_BOX),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_m2)
    story.append(Spacer(1, 8))

    # Metric 3: Reopen Rate
    m3_data = [
        [Paragraph("<b>3. Ticket Reopen Rate (CRR)</b>", formula_title), Paragraph("<b>Active Baseline: 44.5%</b> | <b>Target SLA: ≤ 20.0%</b>", table_cell)],
        [Paragraph("<b>Mathematical Formula:</b>", table_cell), Paragraph("<b>CRR (%) = ( <i>N</i><sub>reopened</sub> / <i>N</i><sub>resolved</sub> ) &times; 100</b>", formula_text)],
        [Paragraph("<b>Variable Definitions:</b>", table_cell), Paragraph("• <i>N</i><sub>reopened</sub> = Count of tickets where customer sent follow-up messages after closure.<br/>• <i>N</i><sub>resolved</sub> = Count of tickets previously marked resolved.", table_cell)],
        [Paragraph("<b>Operational Meaning:</b>", table_cell), Paragraph("Measures premature resolution friction. High reopen rate (44.5%) indicates agents close tickets before full technical fix is verified.", table_cell)],
    ]
    t_m3 = Table(m3_data, colWidths=[1.8*inch, 5.0*inch])
    t_m3.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), BG_BOX),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_m3)
    story.append(Spacer(1, 8))

    # Metric 4: Negative Sentiment Share
    m4_data = [
        [Paragraph("<b>4. Negative Friction Share (NFS)</b>", formula_title), Paragraph("<b>Active Baseline: 24.2%</b> | <b>Target SLA: ≤ 10.0%</b>", table_cell)],
        [Paragraph("<b>Mathematical Formula:</b>", table_cell), Paragraph("<b>NFS (%) = ( <i>N</i><sub>polarity &lt; &minus;0.10</sub> / <i>N</i><sub>total</sub> ) &times; 100</b>", formula_text)],
        [Paragraph("<b>Variable Definitions:</b>", table_cell), Paragraph("• <i>N</i><sub>polarity &lt; &minus;0.10</sub> = Count of interactions classified with negative sentiment polarity.<br/>• <i>N</i><sub>total</sub> = Total interaction volume in evaluated window.", table_cell)],
        [Paragraph("<b>Calculation Example:</b>", table_cell), Paragraph("25,410 negative interactions / 105,000 total = <b>24.2% Negative Friction Share</b>.", table_cell)],
    ]
    t_m4 = Table(m4_data, colWidths=[1.8*inch, 5.0*inch])
    t_m4.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), BG_BOX),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_m4)
    story.append(Spacer(1, 8))

    # Metric 5: CSAT Index
    m5_data = [
        [Paragraph("<b>5. Composite CSAT Quality Index</b>", formula_title), Paragraph("<b>Active Baseline: 3.8 / 5.0</b> | <b>Target SLA: ≥ 4.5 / 5.0</b>", table_cell)],
        [Paragraph("<b>Mathematical Formula:</b>", table_cell), Paragraph("<b>CSAT = 1.0 + 4.0 &times; [ 0.60 &times; ( FCR / 100 ) + 0.40 &times; ( 1 &minus; NFS / 100 ) ]</b>", formula_text)],
        [Paragraph("<b>Weighting Rationale:</b>", table_cell), Paragraph("• 60% weight on operational resolution speed (FCR).<br/>• 40% weight on emotional customer tone and absence of negative friction (1 &minus; NFS).", table_cell)],
        [Paragraph("<b>Calculation Example:</b>", table_cell), Paragraph("1.0 + 4.0 &times; [0.60 &times; 0.537 + 0.40 &times; (1 &minus; 0.242)] = 1.0 + 4.0 &times; [0.3222 + 0.3032] = <b>3.8 / 5.0</b>.", table_cell)],
    ]
    t_m5 = Table(m5_data, colWidths=[1.8*inch, 5.0*inch])
    t_m5.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), BG_BOX),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_m5)
    story.append(Spacer(1, 8))

    # Metric 6: Topic Pain Score
    m6_data = [
        [Paragraph("<b>6. Topic Pain Score (TPS)</b>", formula_title), Paragraph("<b>Benchmark Scale: 0 to 20,000 pts</b> | <b>Critical: &gt; 5,000 pts</b>", table_cell)],
        [Paragraph("<b>Mathematical Formula:</b>", table_cell), Paragraph("<b>TPS = Volume &times; ( NegPercentage / 100 ) &times; [ 1 + ( AvgResponseTime / 100 ) ]</b>", formula_text)],
        [Paragraph("<b>Operational Use:</b>", table_cell), Paragraph("Combines volume scale, customer distress, and SLA delay into a single priority score. Used to rank top complaint clusters for engineering sprint hotfixes.", table_cell)],
    ]
    t_m6 = Table(m6_data, colWidths=[1.8*inch, 5.0*inch])
    t_m6.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), BG_BOX),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_m6)

    story.append(PageBreak())

    # ==========================================
    # SECTION 3: ML & NLP ALGORITHMS
    # ==========================================
    story.append(Paragraph("3. Machine Learning & NLP Algorithms", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceAfter=8))

    story.append(Paragraph("3.1 Text Cleaning & Preprocessing Pipeline", h2_style))
    story.append(Paragraph("Every raw customer interaction undergoes a 5-step normalization sequence:", body_style))
    story.append(Paragraph("1. <b>PII & Handle Scrubbing:</b> Strips user mentions (<code>@TwitterHandle</code>), URLs, tracking tokens, and ticket IDs.", bullet_style))
    story.append(Paragraph("2. <b>Case Normalization & Contraction Expansion:</b> Converts text to lowercase while expanding conversational contractions (e.g. <i>\"can't\"</i> &rarr; <i>\"cannot\"</i>).", bullet_style))
    story.append(Paragraph("3. <b>Emoji & Sentiment Token Retention:</b> Preserves emotional emoticons (e.g. 😠, 😡, ❤️) as high-value polarity tokens.", bullet_style))
    story.append(Paragraph("4. <b>Lemmatization & Stopword Filtering:</b> Strips generic English stopwords while preserving operational verbs (e.g. <i>\"crash\"</i>, <i>\"refund\"</i>, <i>\"reopen\"</i>).", bullet_style))

    story.append(Spacer(1, 6))
    story.append(Paragraph("3.2 Semantic Dense Embeddings & Vector Search", h2_style))
    story.append(Paragraph("• <b>Embedding Model:</b> 384-dimensional dense vectors generated via <code>sentence-transformers/all-MiniLM-L6-v2</code>.", bullet_style))
    story.append(Paragraph("• <b>Cosine Similarity Metric:</b> Distance between query vector <i>u</i> and document vector <i>v</i> is computed as:<br/>"
                           "&nbsp;&nbsp;&nbsp;&nbsp;<b>CosineSimilarity(<i>u</i>, <i>v</i>) = ( <i>u</i> &middot; <i>v</i> ) / ( ||<i>u</i>|| &times; ||<i>v</i>|| )</b>", bullet_style))
    story.append(Paragraph("• <b>Vector Database Indexing:</b> Indexed in <b>Qdrant</b> using HNSW (Hierarchical Navigable Small World) graphs with sub-millisecond retrieval latency.", bullet_style))

    story.append(Spacer(1, 6))
    story.append(Paragraph("3.3 Class-Based TF-IDF (c-TF-IDF) Keyword Extraction", h2_style))
    story.append(Paragraph("To extract descriptive cluster keywords across grouped topics, the platform uses class-based TF-IDF:<br/>"
                           "&nbsp;&nbsp;&nbsp;&nbsp;<b><i>W</i><sub><i>t</i>, <i>c</i></sub> = tf<sub><i>t</i>, <i>c</i></sub> &times; log [ 1 + ( <i>A</i> / <i>f</i><sub><i>t</i></sub> ) ]</b><br/>"
                           "where <b>tf<sub><i>t</i>, <i>c</i></sub></b> is the frequency of word <i>t</i> in cluster <i>c</i>, <b><i>A</i></b> is the average number of words per cluster, and <b><i>f</i><sub><i>t</i></sub></b> is the total frequency of word <i>t</i> across all clusters.", body_style))

    story.append(Spacer(1, 6))
    story.append(Paragraph("3.4 Sentiment Polarity Classification Algorithm", h2_style))
    story.append(Paragraph("• <b>Hybrid Polarity Engine:</b> Combines lexicon-based VADER rules with transformer self-attention scoring.<br/>"
                           "• <b>Continuous Score:</b> Maps tone to continuous polarity <b><i>s</i> &isin; [&minus;1.0, +1.0]</b>.<br/>"
                           "• <b>Threshold Boundaries:</b><br/>"
                           "&nbsp;&nbsp;&nbsp;&nbsp;- <b>Positive Tone:</b> <i>s</i> &ge; +0.10<br/>"
                           "&nbsp;&nbsp;&nbsp;&nbsp;- <b>Neutral Tone:</b> &minus;0.10 &lt; <i>s</i> &lt; +0.10<br/>"
                           "&nbsp;&nbsp;&nbsp;&nbsp;- <b>Negative Friction:</b> <i>s</i> &le; &minus;0.10<br/>"
                           "&nbsp;&nbsp;&nbsp;&nbsp;- <b>Critical Customer Distress:</b> <i>s</i> &lt; &minus;0.60 (Triggers P0 Escalation Rule)", body_style))

    story.append(Spacer(1, 6))
    story.append(Paragraph("3.5 Statistical Spike & Anomaly Detection (Z-Score Modeling)", h2_style))
    story.append(Paragraph("The platform detects abnormal volume surges or negative sentiment spikes using rolling Z-Score variance:<br/>"
                           "&nbsp;&nbsp;&nbsp;&nbsp;<b><i>Z</i> = ( <i>X</i><sub><i>t</i></sub> &minus; &mu;<sub>24h</sub> ) / &sigma;<sub>24h</sub></b><br/>"
                           "• <b>&mu;<sub>24h</sub></b> = 24-hour moving average of conversation volume or negative sentiment.<br/>"
                           "• <b>&sigma;<sub>24h</sub></b> = 24-hour moving standard deviation.<br/>"
                           "• <b>Alert Trigger:</b> When <b><i>Z</i> &gt; 2.50</b> (99% statistical confidence interval), Voilà generates an automated <b>Spike Alert Banner</b> on the dashboard.", body_style))

    story.append(PageBreak())

    # ==========================================
    # SECTION 4: AGENTIC AI ARCHITECTURE
    # ==========================================
    story.append(Paragraph("4. Agentic AI Reasoning Architecture & Tools", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceAfter=8))

    story.append(Paragraph("Voilà Copilot is powered by an autonomous, multi-tool agentic loop designed for enterprise reliability, speed, and strict factual grounding:", body_style))

    agent_steps = [
        [Paragraph("<b>Lifecycle Phase</b>", table_header), Paragraph("<b>Responsible Engine</b>", table_header), Paragraph("<b>Detailed Execution Flow</b>", table_header)],
        [Paragraph("<b>1. Input Validation</b>", table_cell), Paragraph("<code>QueryValidator</code>", table_cell), Paragraph("Inspects input question for data sufficiency, explicit dataset fields, time periods, and intent categorization (greeting, persona, KPI, root-cause, policy).", table_cell)],
        [Paragraph("<b>2. Tool Planning</b>", table_cell), Paragraph("<code>DecisionEngine</code>", table_cell), Paragraph("Determines required toolchain (PostgreSQL Fast Engine, Qdrant Vector DB, Snowflake Data Warehouse, Analytics Hub).", table_cell)],
        [Paragraph("<b>3. Parallel Execution</b>", table_cell), Paragraph("<code>ToolOrchestrator</code>", table_cell), Paragraph("Executes parallel sub-millisecond database queries, full-text lexical matches, and vector similarity retrieval.", table_cell)],
        [Paragraph("<b>4. Context Grounding</b>", table_cell), Paragraph("<code>ContextBuilder</code>", table_cell), Paragraph("Aggregates verified database KPIs, cluster breakdowns, and verbatim customer quotes into an executive grounded prompt.", table_cell)],
        [Paragraph("<b>5. LLM Synthesis</b>", table_cell), Paragraph("<code>BedrockClient</code>", table_cell), Paragraph("Generates concise, natural language response via AWS Bedrock Mantle / Instant local grounded fallback (0.6s circuit breaker).", table_cell)],
        [Paragraph("<b>6. Output Validation</b>", table_cell), Paragraph("<code>ResultValidator</code>", table_cell), Paragraph("Verifies data confidence (MEASURED vs NO_DATA_AVAILABLE), checks for hallucinations, and returns validated AgentResponse.", table_cell)],
    ]
    t_agent = Table(agent_steps, colWidths=[1.4*inch, 1.8*inch, 3.6*inch])
    t_agent.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT])
    ]))
    story.append(t_agent)

    story.append(Spacer(1, 10))
    story.append(Paragraph("4.1 Dedicated Tool Ecosystem", h2_style))
    story.append(Paragraph("• <b>PostgreSQL Fast Analytics Tool:</b> Sub-5ms indexed queries across 105,000 customer records, computing dynamic aggregations, SLA distributions, and cluster stats with zero cold starts.", bullet_style))
    story.append(Paragraph("• <b>Qdrant Vector DB Tool:</b> 384-dimensional cosine similarity semantic embedding tool with non-blocking socket checks (<0.15s) for instant customer dialogue retrieval.", bullet_style))
    story.append(Paragraph("• <b>Snowflake Data Warehouse Tool:</b> Cloud warehouse integration with offline short-circuit safeguards preventing blocking timeouts.", bullet_style))
    story.append(Paragraph("• <b>AWS Bedrock LLM Client:</b> Grounded reasoning with 0.6s circuit-breaker and instant local executive synthesis.", bullet_style))

    story.append(Spacer(1, 10))
    story.append(Paragraph("4.3 The 7-Pillar RAG & Agent Query Intelligence Framework", h2_style))
    story.append(Paragraph("Voilà implements an end-to-end 7-pillar query intelligence engine that eliminates classic RAG edge-case failures without relying on fragile keyword matchers:", body_style))

    pillar_data = [
        [Paragraph("<b>Pillar / Problem</b>", table_header), Paragraph("<b>Algorithmic Solution</b>", table_header), Paragraph("<b>Mathematical Formulation & Pipeline Flow</b>", table_header)],
        [
            Paragraph("<b>Pillar 1: Typos</b>", table_cell),
            Paragraph("Domain-Aware Spell Normalizer", table_cell),
            Paragraph("Levenshtein distance &le; 2 matching against English & support vocabulary with repeated character collapse (<i>'phne frezing'</i> &rarr; <i>'phone freezing'</i>).", table_cell)
        ],
        [
            Paragraph("<b>Pillar 2: Out-of-Domain</b>", table_cell),
            Paragraph("Post-Retrieval Relevance Validation", table_cell),
            Paragraph("Evaluates evidence grounding post-retrieval; triggers <b>Topic Focus Policy Steer-Back</b> with proactive prompt chips if unrelated.", table_cell)
        ],
        [
            Paragraph("<b>Pillar 3: Gibberish</b>", table_cell),
            Paragraph("Pre-Embedding Entropy & Pattern Filter", table_cell),
            Paragraph("Shannon character entropy <i>H</i>(<i>X</i>) & consonant-vowel ratio filters catch random keystrokes (<i>'xyz123 qwerty'</i>) before generating embeddings.", table_cell)
        ],
        [
            Paragraph("<b>Pillar 4: Generic Queries</b>", table_cell),
            Paragraph("Query Specificity Check", table_cell),
            Paragraph("Detects under-specified single-word prompts (<i>'phone'</i>, <i>'app'</i>) and prompts the user with interactive, domain-specific clarification chips.", table_cell)
        ],
        [
            Paragraph("<b>Pillar 5: Multi-Intent</b>", table_cell),
            Paragraph("Query Decomposition & RRF Fusion", table_cell),
            Paragraph("Splits compound queries &rarr; parallel retrieval &rarr; <b>Reciprocal Rank Fusion</b>:<br/><b><i>RRF_Score</i>(<i>d</i>) = &sum; [1 / (60 + <i>Rank</i><sub><i>q</i></sub>(<i>d</i>))]</b>", table_cell)
        ],
        [
            Paragraph("<b>Pillar 6: Negation</b>", table_cell),
            Paragraph("Focal Extraction & Exclusion Filter", table_cell),
            Paragraph("Extracts positive target topic for vector encoding while applying a negative exclusion filter to prevent semantic inversion.", table_cell)
        ],
        [
            Paragraph("<b>Pillar 7: Multi-Signal</b>", table_cell),
            Paragraph("Composite Relevance Confidence", table_cell),
            Paragraph("Avoids rigid threshold cliffs by blending signals:<br/><b><i>S</i><sub>composite</sub> = 0.50 &middot; <i>S</i><sub>vec</sub> + 0.30 &middot; <i>S</i><sub>lex</sub> + 0.20 &middot; <i>S</i><sub>topic</sub></b>", table_cell)
        ],
    ]
    t_pillars = Table(pillar_data, colWidths=[1.4*inch, 2.0*inch, 3.4*inch])
    t_pillars.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY_DARK),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT])
    ]))
    story.append(t_pillars)

    story.append(PageBreak())

    # ==========================================
    # SECTION 5: RELATIONAL DATABASE SCHEMAS
    # ==========================================
    story.append(Paragraph("5. Relational Database Architecture (PostgreSQL)", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceAfter=8))
    story.append(Paragraph("The platform stores all raw dialogues, normalized metrics, and query logs across 8 high-performance relational tables:", body_style))

    schema_data = [
        [Paragraph("<b>Table Name</b>", table_header), Paragraph("<b>Key Columns & Types</b>", table_header), Paragraph("<b>Purpose & Telemetry Stored</b>", table_header)],
        [
            Paragraph("<code>dataset_runs</code>", table_cell),
            Paragraph("<code>run_id (VARCHAR PK)<br/>user_id (VARCHAR)<br/>uploaded_at (TIMESTAMP)<br/>total_records (INT)<br/>source_name (VARCHAR)<br/>status (VARCHAR)</code>", table_cell),
            Paragraph("Catalog of uploaded dataset runs, total row counts, storage paths, and processing status.", table_cell)
        ],
        [
            Paragraph("<code>customer_conversations</code>", table_cell),
            Paragraph("<code>id (INT PK)<br/>run_id (VARCHAR FK)<br/>tweet_id (VARCHAR)<br/>author_id (VARCHAR)<br/>inbound (BOOLEAN)<br/>timestamp (TIMESTAMP)<br/>text (TEXT)<br/>response_time_minutes (FLOAT)</code>", table_cell),
            Paragraph("105,000+ raw and clean customer dialogues, author roles (customer vs agent), and response times.", table_cell)
        ],
        [
            Paragraph("<code>kpi_runs</code>", table_cell),
            Paragraph("<code>id (INT PK)<br/>run_id (VARCHAR FK)<br/>total_conversations (INT)<br/>resolution_rate (FLOAT)<br/>avg_response_time (FLOAT)<br/>reopen_rate (FLOAT)<br/>csat_score (FLOAT)</code>", table_cell),
            Paragraph("Pre-aggregated executive metrics for fast dashboard rendering with zero runtime compute.", table_cell)
        ],
        [
            Paragraph("<code>kpi_topics</code>", table_cell),
            Paragraph("<code>id (INT PK)<br/>run_id (VARCHAR FK)<br/>cluster_name (VARCHAR)<br/>topic_keywords (TEXT)<br/>volume (INT)<br/>negative_complaints (INT)<br/>pain_score (FLOAT)</code>", table_cell),
            Paragraph("NLP friction clusters, volume, sentiment share, pain scores, and escalation case counts.", table_cell)
        ],
        [
            Paragraph("<code>kpi_sentiment</code>", table_cell),
            Paragraph("<code>id (INT PK)<br/>run_id (VARCHAR FK)<br/>sentiment (VARCHAR)<br/>count (INT)<br/>percentage (FLOAT)</code>", table_cell),
            Paragraph("Distribution counts and percentages for positive, neutral, and negative tones.", table_cell)
        ],
        [
            Paragraph("<code>agent_conversations</code>", table_cell),
            Paragraph("<code>id (INT PK)<br/>timestamp (TIMESTAMP)<br/>user_id (VARCHAR)<br/>question (TEXT)<br/>query_type (VARCHAR)<br/>answer (TEXT)<br/>status (VARCHAR)</code>", table_cell),
            Paragraph("Conversational Copilot query audit logs, query types, and generated AI responses.", table_cell)
        ],
        [
            Paragraph("<code>agent_tools</code>", table_cell),
            Paragraph("<code>id (INT PK)<br/>agent_conversation_id (INT FK)<br/>tool_name (VARCHAR)</code>", table_cell),
            Paragraph("Audit trail mapping which specific tools (Postgres, Qdrant, Snowflake, Bedrock) executed for each query.", table_cell)
        ],
    ]

    t_sch = Table(schema_data, colWidths=[1.6*inch, 2.3*inch, 2.9*inch])
    t_sch.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT])
    ]))
    story.append(t_sch)

    # Build PDF
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated detailed PDF at: {output_path}")

if __name__ == '__main__':
    out1 = 'd:/projects/voila/Voila_Platform_Specification_v2.pdf'
    out2 = 'd:/projects/voila/frontend/public/Voila_Platform_Specification_v2.pdf'
    build_pdf(out1)
    shutil.copy(out1, out2)
    print("Copied detailed PDF to public web directory!")
