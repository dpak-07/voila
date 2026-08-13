import {
  BrainCircuit,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  Smile,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Sparkles,
  CircleAlert,
} from "lucide-react";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import { useNavigate } from "react-router-dom";


// ===============================
// MOCK DATA
// Later this will come from FastAPI
// ===============================

const sentimentData = [
  { day: "1", positive: 61, neutral: 24, negative: 15 },
  { day: "5", positive: 63, neutral: 23, negative: 14 },
  { day: "10", positive: 66, neutral: 21, negative: 13 },
  { day: "15", positive: 65, neutral: 22, negative: 13 },
  { day: "20", positive: 69, neutral: 20, negative: 11 },
  { day: "25", positive: 71, neutral: 18, negative: 11 },
  { day: "30", positive: 74, neutral: 17, negative: 9 },
];

const painPointData = [
  { issue: "Billing", volume: 32 },
  { issue: "Network", volume: 25 },
  { issue: "Support", volume: 19 },
  { issue: "Delivery", volume: 13 },
  { issue: "Account", volume: 9 },
];

const resolutionData = [
  { week: "W1", resolution: 76, escalation: 14 },
  { week: "W2", resolution: 79, escalation: 12 },
  { week: "W3", resolution: 82, escalation: 11 },
  { week: "W4", resolution: 84, escalation: 10 },
  { week: "W5", resolution: 87, escalation: 9 },
];

const sentimentMix = [
  { name: "Positive", value: 74 },
  { name: "Neutral", value: 17 },
  { name: "Negative", value: 9 },
];


// ===============================
// KPI DATA
// ===============================

const kpis = [
  {
    title: "Conversations",
    value: "128.4K",
    change: "+12.8%",
    trend: "up",
    icon: MessageSquare,
  },
  {
    title: "Resolution Rate",
    value: "87.4%",
    change: "+6.2%",
    trend: "up",
    icon: CheckCircle2,
  },
  {
    title: "Escalation Rate",
    value: "8.7%",
    change: "-2.4%",
    trend: "down",
    icon: AlertTriangle,
  },
  {
    title: "Sentiment Score",
    value: "92.1",
    change: "+4.8%",
    trend: "up",
    icon: Smile,
  },
  {
    title: "AI Confidence",
    value: "94.8%",
    change: "High confidence",
    trend: "up",
    icon: BrainCircuit,
  },
];


// ===============================
// DASHBOARD
// ===============================

function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="dashboard-page">

      {/* =========================
          NAVBAR
      ========================= */}

      <nav className="dashboard-navbar">

        <div className="dashboard-logo">
          <div className="dashboard-logo-icon">
            <Sparkles size={18} />
          </div>

          <span>VOILA</span>
        </div>


        <div className="dashboard-nav-links">

            <button
                className="dashboard-nav-link active"
                onClick={() => navigate("/dashboard")}
            >Dashboard
            </button>

            <button
                className="dashboard-nav-link"
                onClick={() => navigate("/data-extract")}
                >
                Data
            </button>

            <button
                className="dashboard-nav-link"
                onClick={() => navigate("/insights")}
                >Insights
            </button>

            <button
                className="dashboard-nav-link voila-nav-link"
                onClick={() => navigate("/")}
            >
                <Sparkles size={14} />
                Voila
            </button>

</div>


        <div className="dashboard-user">

          <div className="online-dot"></div>

          <span>AI Analyst</span>

          <div className="user-avatar">
            V
          </div>

        </div>

      </nav>


      {/* =========================
          MAIN CONTENT
      ========================= */}

      <main className="dashboard-container">


        {/* HEADER */}

        <section className="dashboard-heading">

          <div>

            <div className="dashboard-eyebrow">
              <BrainCircuit size={15} />
              AI SOCIAL SUPPORT ANALYTICS
            </div>

            <h1>
              Customer Intelligence
            </h1>

            <p>
              Here's what Voila discovered across your
              customer conversations.
            </p>

          </div>


          <div className="dashboard-actions">

            <select className="filter-select">
              <option>Last 30 Days</option>
              <option>Last 7 Days</option>
              <option>Last 90 Days</option>
            </select>

            <button className="generate-btn">
              <Sparkles size={16} />
              Generate Report
            </button>

          </div>

        </section>


        {/* =========================
            KPI ROW
        ========================= */}

        <section className="kpi-grid">

          {kpis.map((kpi) => {

            const Icon = kpi.icon;

            return (

              <div
                className="kpi-card"
                key={kpi.title}
              >

                <div className="kpi-card-top">

                  <span>
                    {kpi.title}
                  </span>

                  <div className="kpi-icon">
                    <Icon size={18} />
                  </div>

                </div>


                <div className="kpi-value">
                  {kpi.value}
                </div>


                <div className="kpi-footer">

                  {kpi.trend === "up" ? (
                    <TrendingUp size={14} />
                  ) : (
                    <TrendingDown size={14} />
                  )}

                  <span className="kpi-change">
                    {kpi.change}
                  </span>

                  <span className="kpi-period">
                    vs previous period
                  </span>

                </div>

              </div>

            );

          })}

        </section>


        {/* =========================
            MAIN ANALYTICS ROW
        ========================= */}

        <section className="dashboard-grid">


          {/* SENTIMENT CHART */}

          <div className="dashboard-card sentiment-card">

            <div className="card-header">

              <div>
                <h2>Customer Sentiment</h2>

                <p>
                  Sentiment trajectory over the last 30 days
                </p>
              </div>


              <div className="chart-legend">

                <span>
                  <i className="legend-dot positive"></i>
                  Positive
                </span>

                <span>
                  <i className="legend-dot neutral"></i>
                  Neutral
                </span>

                <span>
                  <i className="legend-dot negative"></i>
                  Negative
                </span>

              </div>

            </div>


            <div className="chart-container">

              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <LineChart data={sentimentData}>

                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.05)"
                  />

                  <XAxis
                    dataKey="day"
                    stroke="#666"
                    tick={{ fill: "#777", fontSize: 11 }}
                  />

                  <YAxis
                    stroke="#666"
                    tick={{ fill: "#777", fontSize: 11 }}
                  />

                  <Tooltip
                    contentStyle={{
                      background: "#15151d",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                      color: "#fff",
                    }}
                  />

                  <Line
                    type="monotone"
                    dataKey="positive"
                    stroke="#a78bfa"
                    strokeWidth={3}
                    dot={false}
                  />

                  <Line
                    type="monotone"
                    dataKey="neutral"
                    stroke="#777"
                    strokeWidth={2}
                    dot={false}
                  />

                  <Line
                    type="monotone"
                    dataKey="negative"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={false}
                  />

                </LineChart>

              </ResponsiveContainer>

            </div>

          </div>


          {/* AI SUMMARY */}

          <div className="dashboard-card ai-summary-card">

            <div className="ai-summary-glow"></div>

            <div className="ai-summary-header">

              <div className="ai-title">

                <div className="ai-icon">
                  <BrainCircuit size={20} />
                </div>

                <div>
                  <span>VOILA AI</span>

                  <small>
                    Intelligence Engine
                  </small>
                </div>

              </div>


              <div className="ai-live">
                <span></span>
                LIVE
              </div>

            </div>


            <div className="ai-summary-content">

              <div className="ai-summary-label">
                <Sparkles size={14} />
                Something changed
              </div>


              <h3>
                Billing complaints are
                emerging rapidly.
              </h3>


              <p>
                Voila detected a <strong>34%</strong>
                increase in billing-related
                conversations during the last
                14 days.
              </p>


              <div className="ai-metrics">

                <div>
                  <span>Impact</span>
                  <strong className="high">
                    HIGH
                  </strong>
                </div>

                <div>
                  <span>Confidence</span>
                  <strong>
                    96%
                  </strong>
                </div>

              </div>


              <button
                className="ai-explore-btn"
                onClick={() => navigate("/insights")}
              >
                Explore why
                <ArrowUpRight size={16} />
              </button>

            </div>

          </div>


          {/* =========================
              PAIN POINTS
          ========================= */}

          <div className="dashboard-card pain-point-card">

            <div className="card-header">

              <div>
                <h2>Top Customer Pain Points</h2>

                <p>
                  Issues generating the most conversations
                </p>
              </div>

              <button className="view-all-btn">
                View all
              </button>

            </div>


            <div className="pain-point-list">

              {painPointData.map((item, index) => (

                <div
                  className="pain-point-row"
                  key={item.issue}
                >

                  <div className="pain-point-name">

                    <span className="pain-rank">
                      0{index + 1}
                    </span>

                    {item.issue}

                  </div>


                  <div className="pain-bar-container">

                    <div
                      className="pain-bar"
                      style={{
                        width: `${item.volume * 2.7}%`,
                      }}
                    ></div>

                  </div>


                  <span className="pain-value">
                    {item.volume}%
                  </span>

                </div>

              ))}

            </div>

          </div>


          {/* =========================
              ISSUE HEALTH
          ========================= */}

          <div className="dashboard-card issue-health-card">

            <div className="card-header">

              <div>
                <h2>Issue Health</h2>

                <p>
                  Systemic issue movement
                </p>
              </div>

              <CircleAlert size={19} />

            </div>


            <div className="issue-health-list">

              <div className="issue-health-item">

                <div className="issue-health-icon emerging">
                  <TrendingUp size={17} />
                </div>

                <div className="issue-health-text">
                  <strong>Emerging Issues</strong>
                  <span>5 new issues detected</span>
                </div>

                <b className="issue-up">
                  +34%
                </b>

              </div>


              <div className="issue-health-item">

                <div className="issue-health-icon recurring">
                  <TrendingDown size={17} />
                </div>

                <div className="issue-health-text">
                  <strong>Recurring Issues</strong>
                  <span>3 issues declining</span>
                </div>

                <b className="issue-down">
                  -18%
                </b>

              </div>


              <div className="issue-health-item">

                <div className="issue-health-icon resolved">
                  <CheckCircle2 size={17} />
                </div>

                <div className="issue-health-text">
                  <strong>Resolved Issues</strong>
                  <span>24 issues resolved</span>
                </div>

                <b className="issue-up">
                  +12%
                </b>

              </div>


              <div className="issue-health-item">

                <div className="issue-health-icon escalation">
                  <AlertTriangle size={17} />
                </div>

                <div className="issue-health-text">
                  <strong>Escalations</strong>
                  <span>Improving this period</span>
                </div>

                <b className="issue-down">
                  -8%
                </b>

              </div>

            </div>

          </div>


          {/* =========================
              RESOLUTION CHART
          ========================= */}

          <div className="dashboard-card resolution-card">

            <div className="card-header">

              <div>
                <h2>Resolution vs Escalation</h2>

                <p>
                  Weekly service performance
                </p>
              </div>

            </div>


            <div className="chart-container small">

              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <LineChart data={resolutionData}>

                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.05)"
                  />

                  <XAxis
                    dataKey="week"
                    stroke="#666"
                    tick={{ fill: "#777", fontSize: 11 }}
                  />

                  <YAxis
                    stroke="#666"
                    tick={{ fill: "#777", fontSize: 11 }}
                  />

                  <Tooltip
                    contentStyle={{
                      background: "#15151d",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                    }}
                  />

                  <Line
                    type="monotone"
                    dataKey="resolution"
                    stroke="#a78bfa"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                  />

                  <Line
                    type="monotone"
                    dataKey="escalation"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />

                </LineChart>

              </ResponsiveContainer>

            </div>

          </div>


          {/* =========================
              SENTIMENT MIX
          ========================= */}

          <div className="dashboard-card sentiment-mix-card">

            <div className="card-header">

              <div>
                <h2>Sentiment Mix</h2>

                <p>
                  Current conversation distribution
                </p>
              </div>

            </div>


            <div className="sentiment-pie-container">

              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <PieChart>

                  <Pie
                    data={sentimentMix}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={4}
                  >

                    <Cell fill="#a78bfa" />
                    <Cell fill="#666" />
                    <Cell fill="#ef4444" />

                  </Pie>

                  <Tooltip
                    contentStyle={{
                      background: "#15151d",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                    }}
                  />

                </PieChart>

              </ResponsiveContainer>


              <div className="pie-center">

                <strong>
                  74%
                </strong>

                <span>
                  Positive
                </span>

              </div>

            </div>


            <div className="sentiment-legend">

              <div>
                <i className="legend-dot positive"></i>
                Positive
                <strong>74%</strong>
              </div>

              <div>
                <i className="legend-dot neutral"></i>
                Neutral
                <strong>17%</strong>
              </div>

              <div>
                <i className="legend-dot negative"></i>
                Negative
                <strong>9%</strong>
              </div>

            </div>

          </div>


          {/* =========================
              PRIORITY ISSUES
          ========================= */}

          <div className="dashboard-card priority-card">

            <div className="card-header">

              <div>
                <h2>Priority Issues</h2>

                <p>
                  Issues requiring business attention
                </p>
              </div>

              <button
                className="view-all-btn"
                onClick={() => navigate("/insights")}
              >
                Open insights
                <ArrowUpRight size={14} />
              </button>

            </div>


            <div className="priority-table">

              <div className="priority-row table-head">

                <span>Issue</span>
                <span>Priority</span>
                <span>Trend</span>
                <span>Sentiment</span>
                <span>Action</span>

              </div>


              <div className="priority-row">

                <strong>
                  Billing transparency
                </strong>

                <span className="priority high">
                  HIGH
                </span>

                <span className="trend-up">
                  ↑ 34%
                </span>

                <span className="negative-text">
                  Negative
                </span>

                <button className="action-btn">
                  Investigate →
                </button>

              </div>


              <div className="priority-row">

                <strong>
                  Support response time
                </strong>

                <span className="priority high">
                  HIGH
                </span>

                <span className="trend-up">
                  ↑ 21%
                </span>

                <span className="negative-text">
                  Negative
                </span>

                <button className="action-btn">
                  Act now →
                </button>

              </div>


              <div className="priority-row">

                <strong>
                  Network reliability
                </strong>

                <span className="priority medium">
                  MEDIUM
                </span>

                <span className="trend-down">
                  ↓ 18%
                </span>

                <span className="positive-text">
                  Improving
                </span>

                <button className="action-btn">
                  Monitor →
                </button>

              </div>


              <div className="priority-row">

                <strong>
                  Refund delays
                </strong>

                <span className="priority medium">
                  MEDIUM
                </span>

                <span className="trend-up">
                  ↑ 12%
                </span>

                <span className="negative-text">
                  Negative
                </span>

                <button className="action-btn">
                  Review →
                </button>

              </div>

            </div>

          </div>


        </section>

      </main>

    </div>
  );
}

export default Dashboard;