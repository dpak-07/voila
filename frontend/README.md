# Voila — Voice of Customer Analytics & AI Reasoning (Frontend)

The modern React 18 + Vite + JavaScript (JSX) frontend for **Voila**, featuring Framer Motion micro-animations, Recharts/Plotly telemetry visualizations, TanStack Query per-panel data synchronization, and the signature **Signal Resonance Anchor** for uncompromised data honesty.

---

## Key Features

1. **Voice-of-Customer Signal Design System**:
   - Deep obsidian canvas (`#070A0F` / `#0B0F17`) with Spectral Emerald (`#00E599`), Acoustic Crimson (`#FF4B55`), and Amber Harmonic accents.
   - Distinctive typography pairing: `Space Grotesk` (headings), `JetBrains Mono` (telemetry/numbers), and `Plus Jakarta Sans` (data-dense UI).

2. **Honest Data Contract & Confidence Badges**:
   - Every metric, KPI card, and agent answer carries an explicit confidence state:
     - `[MEASURED : 100% INGESTED]`: Verified database computation with exact sample size.
     - `[ESTIMATED : SAMPLED]`: Statistical proxy estimation with sample bounds.
     - `[NO DATA : METADATA MISSING]`: Honest diagnostic explaining precisely which columns are missing (never fake zeroes or hidden cards).

3. **Core Pages**:
   - **Login & Register**: JWT Bearer token authentication with 401 redirect interceptor.
   - **Upload & Streaming Pipeline**: Drag-and-drop CSV upload with real-time step polling against `/analytics/status` and active run switching.
   - **Analytics Dashboard**: 
     - 5 KPI cards with delta benchmarks.
     - Sentiment timeline with Z-Score spike annotations (Z > 2.0).
     - Tone share distribution donut.
     - 4 Operational pillars (Emerging Spikes, Recurring Friction, Escalation Multiplier, Fast Velocity).
     - Ranked Customer Pain Points with 1-click **"Inspect RAG Evidence"** sliding drawer.
     - 3-column Issue Matrix (Emerging, Recurring, New).
     - LLM-grounded Executive Diagnosis & Actionable Interventions.
     - Product x Region Dimensional Matrix with honest missing-schema fallback.
     - Cross-run dataset comparison view.
   - **Ask the Data (AI Agent)**:
     - Natural language queries with preset shortcuts.
     - Live decision route preview modal (inspecting tool actions before execution).
     - Color-coded response banners distinguishing `success`, `insufficient_data`, and `validation_failed`.
     - Query audit log and historical conversation browser.

---

## Getting Started

### 1. Prerequisites
- Node.js v18+ (v24.x recommended)
- Running Voila backend server on `http://localhost:8000`

### 2. Installation
```bash
cd frontend
npm install
```

### 3. Environment Configuration
Create `.env` or copy `.env.example`:
```env
VITE_API_BASE_URL=http://localhost:8000
```

### 4. Running Locally
Start the development server:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 5. Production Build
```bash
npm run build
npm run preview
```
