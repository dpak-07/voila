import {
  BrainCircuit,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Sparkles,
  CircleAlert,
  RefreshCw,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { api, getUsername, logout } from "../api";

const fmt = (n) =>
  n == null || Number.isNaN(Number(n)) ? "--" : Number(n).toLocaleString();

const pct = (n) => (n == null ? "--" : `${Number(n).toFixed(1)}%`);

function Dashboard() {
  const navigate = useNavigate();
  const userName = getUsername() || "Analyst";
  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("weekly");
  const [runId, setRunId] = useState("");
  const [runs, setRuns] = useState([]);
  const [modalItem, setModalItem] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [res, runList] = await Promise.all([
        api.kpis({ time_period: period, run_id: runId || undefined }),
        api.runs(),
      ]);
      setData(res);
      setRuns(runList.runs || []);
    } catch (e) {
      setError(e.message || "Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  }, [period, runId]);

  useEffect(() => {
    load();
  }, [load]);

  const km = data?.kpis || {};
  const pillars = data?.kpi_pillars || {};
  const sentiment = data?.sentiment_distribution || {};
  const painPoints = data?.customer_pain_points || [];
  const emerging = data?.emerging_issues || [];
  const recurring = data?.recurring_issues || [];
  const priorities = data?.priorities || [];
  const llmSummary = data?.llm_summary || "";
  const sentTrend = data?.trends?.sentiment_trend || [];
  const svcTrend = (data?.trends?.service_trend || []).map((t) => ({
    week: String(t.day || "").slice(5),
    resolution: t.resolution,
    escalation: t.escalation,
  }));

  const mixData = [
    { name: "Positive", value: Number(sentiment?.positive?.percentage ?? 0) },
    { name: "Neutral", value: Number(sentiment?.neutral?.percentage ?? 0) },
    { name: "Negative", value: Number(sentiment?.negative?.percentage ?? 0) },
  ].filter((entry) => entry.value > 0);

  const recurringReduction = Number(pillars.recurring_issues_reduction ?? 0);
  const speedBoost = Number(pillars.ai_speedup_boost ?? 0);

  const kpiCards = [
    {
      title: "Conversations",
      value: fmt(km.total_conversations),
      footer: "Total conversations analyzed",
      trend: null,
      icon: MessageSquare,
    },
    {
      title: "Resolution Rate",
      value: pct(km.resolution_rate),
      footer: `Recurring issue change ${Math.abs(recurringReduction)}%`,
      trend: recurringReduction >= 0 ? "down" : "up",
      icon: CheckCircle2,
    },
    {
      title: "Escalation Rate",
      value: pct(km.escalation_rate),
      footer: `Sentiment escalation multiplier ${pillars.sentiment_escalation_multiplier ?? "--"}x`,
      trend: null,
      icon: AlertTriangle,
    },
    {
      title: "Avg Response Time",
      value:
        km.avg_response_time_minutes != null
          ? `${fmt(km.avg_response_time_minutes)}m`
          : "--",
      footer: `AI speedup ${Math.abs(speedBoost)}%`,
      trend: speedBoost > 0 ? "down" : speedBoost < 0 ? "up" : null,
      icon: Clock,
    },
    {
      title: "Reopen Rate",
      value: pct(km.reopen_rate),
      footer: "Of analyzed conversations",
      trend: null,
      icon: RotateCcw,
    },
  ];

  const maxPainVol = Math.max(
    1,
    ...painPoints.map((point) => Number(point.volume) || 0)
  );

  return (
    <div className="dashboard-page">
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
          >
            Dashboard
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
          >
            Insights
          </button>
          <button
            className="dashboard-nav-link"
            onClick={() => navigate("/voila")}
          >
            Voila
          </button>
        </div>

        <div className="dashboard-user">
          <span>{userName}</span>
          <div className="user-avatar">{userName.charAt(0).toUpperCase()}</div>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </nav>

      <main className="dashboard-container">
        <section className="dashboard-heading">
          <div>
            <div className="dashboard-eyebrow">
              <BrainCircuit size={15} />
              Overview
            </div>
            <h1>Analytics Overview</h1>
            <p>
              {sentTrend.length
                ? `${sentTrend[0].day} to ${sentTrend[sentTrend.length - 1].day} | ${fmt(km.total_conversations)} conversations`
                : "Backend analytics across uploaded conversations."}
            </p>
          </div>

          <div className="dashboard-actions">
            <select
              className="filter-select"
              value={runId}
              onChange={(e) => setRunId(e.target.value)}
              aria-label="Dataset version"
            >
              <option value="">Latest dataset</option>
              {runs.map((run) => (
                <option key={run.run_id} value={run.run_id}>
                  Run {String(run.run_id).slice(0, 8)} | {fmt(run.total_records)} rows
                </option>
              ))}
            </select>

            <select
              className="filter-select"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              aria-label="Time period"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="overall">Overall</option>
            </select>

            <button className="generate-btn" onClick={load} disabled={loading}>
              <RefreshCw size={16} className={loading ? "spin" : ""} />
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </section>

        {error && (
          <div className="dashboard-card dashboard-card--error surface-section">
            <div className="surface-stack">
              <p className="feedback-message error">Failed to load data: {error}</p>
              <div>
                <button className="generate-btn" onClick={load}>
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}

        {loading && !data && (
          <div className="dashboard-card dashboard-card--loading surface-section">
            <RefreshCw size={18} className="spin" />
            <p>Loading analytics...</p>
          </div>
        )}

        {!loading && data && (
          <>
            <section className="kpi-grid">
              {kpiCards.map((kpi) => {
                const Icon = kpi.icon;
                return (
                  <div className="kpi-card" key={kpi.title}>
                    <div className="kpi-card-top">
                      <span>{kpi.title}</span>
                      <div className="kpi-icon">
                        <Icon size={18} />
                      </div>
                    </div>

                    <div className="kpi-value">{kpi.value}</div>

                    <div className="kpi-footer">
                      {kpi.trend === "up" ? (
                        <TrendingUp size={14} />
                      ) : kpi.trend === "down" ? (
                        <TrendingDown size={14} />
                      ) : null}
                      <span className="kpi-change">{kpi.footer}</span>
                    </div>
                  </div>
                );
              })}
            </section>

            <section className="dashboard-grid">
              <div className="dashboard-card sentiment-card">
                <div className="card-header">
                  <div>
                    <h2>Sentiment Trend</h2>
                    <p>Trend data returned by the analytics backend.</p>
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
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sentTrend}>
                      <CartesianGrid stroke="#e5e7eb" vertical={false} />
                      <XAxis
                        dataKey="day"
                        stroke="#64748b"
                        tick={{ fill: "#64748b", fontSize: 11 }}
                      />
                      <YAxis
                        stroke="#64748b"
                        tick={{ fill: "#64748b", fontSize: 11 }}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "#ffffff",
                          border: "1px solid #e5e7eb",
                          borderRadius: "10px",
                          color: "#111827",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="positive"
                        stroke="#15803d"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="neutral"
                        stroke="#94a3b8"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="negative"
                        stroke="#dc2626"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="dashboard-card ai-summary-card">
                <div className="ai-summary-header">
                  <div className="ai-title">
                    <div className="ai-icon">
                      <BrainCircuit size={20} />
                    </div>
                    <div>
                      <span>Summary</span>
                      <small>Backend-generated analysis</small>
                    </div>
                  </div>
                </div>

                <div className="ai-summary-content">
                  <div className="ai-summary-label">Executive summary</div>
                  <h3>{painPoints[0]?.cluster_name || "No topics detected"}</h3>
                  <p>{llmSummary || "No summary returned by the backend."}</p>

                  <div className="ai-metrics">
                    <div>
                      <span>Emerging issues</span>
                      <strong className={emerging.length ? "high" : ""}>
                        {emerging.length}
                      </strong>
                    </div>
                    <div>
                      <span>Recurring issues</span>
                      <strong>{recurring.length}</strong>
                    </div>
                  </div>

                  <button
                    className="ai-explore-btn"
                    onClick={() => navigate("/insights")}
                  >
                    Open insights
                    <ArrowUpRight size={16} />
                  </button>
                </div>
              </div>

              <div className="dashboard-card pain-point-card">
                <div className="card-header">
                  <div>
                    <h2>Top Pain Points</h2>
                    <p>Issues with the highest conversation volume.</p>
                  </div>
                  <button
                    className="view-all-btn"
                    onClick={() => navigate("/insights")}
                  >
                    View all
                  </button>
                </div>

                <div className="pain-point-list">
                  {painPoints.length === 0 && (
                    <p className="empty-state">No topics detected yet.</p>
                  )}
                  {painPoints.map((item, index) => (
                    <div
                      className="pain-point-row"
                      key={item.topic_keywords || index}
                    >
                      <div className="pain-point-name">
                        <span className="pain-rank">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        {item.cluster_name || item.topic_keywords}
                      </div>

                      <div className="pain-bar-container">
                        <div
                          className="pain-bar"
                          style={{
                            width: `${Math.min(
                              100,
                              (Number(item.volume) / maxPainVol) * 100
                            )}%`,
                          }}
                        ></div>
                      </div>

                      <span className="pain-value">{fmt(item.volume)}</span>

                      <div className="pain-actions">
                        <button
                          className="view-samples-btn"
                          onClick={() => setModalItem(item)}
                        >
                          🔍 View samples
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="dashboard-card issue-health-card">
                <div className="card-header">
                  <div>
                    <h2>Issue Health</h2>
                    <p>Current issue counts and service signals.</p>
                  </div>
                  <CircleAlert size={18} />
                </div>

                <div className="issue-health-list">
                  <div className="issue-health-item">
                    <div className="issue-health-icon emerging">
                      <TrendingUp size={16} />
                    </div>
                    <div className="issue-health-text">
                      <strong>Emerging Issues</strong>
                      <span>{emerging.length} detected</span>
                    </div>
                    <b className="issue-up">+{emerging.length}</b>
                  </div>

                  <div className="issue-health-item">
                    <div className="issue-health-icon recurring">
                      <TrendingDown size={16} />
                    </div>
                    <div className="issue-health-text">
                      <strong>Recurring Issues</strong>
                      <span>{recurring.length} active</span>
                    </div>
                    <b className="issue-down">{recurringReduction}%</b>
                  </div>

                  <div className="issue-health-item">
                    <div className="issue-health-icon resolved">
                      <CheckCircle2 size={16} />
                    </div>
                    <div className="issue-health-text">
                      <strong>Resolution Rate</strong>
                      <span>Percent of inbound conversations</span>
                    </div>
                    <b>{pct(km.resolution_rate)}</b>
                  </div>

                  <div className="issue-health-item">
                    <div className="issue-health-icon escalation">
                      <AlertTriangle size={16} />
                    </div>
                    <div className="issue-health-text">
                      <strong>Escalation Rate</strong>
                      <span>Percent escalated</span>
                    </div>
                    <b
                      className={
                        Number(km.escalation_rate) <= 20
                          ? "issue-down"
                          : "issue-up"
                      }
                    >
                      {pct(km.escalation_rate)}
                    </b>
                  </div>
                </div>
              </div>

              <div className="dashboard-card resolution-card">
                <div className="card-header">
                  <div>
                    <h2>Resolution vs Escalation</h2>
                    <p>Service trend returned by the backend.</p>
                  </div>
                </div>

                <div className="chart-container small">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={svcTrend}>
                      <CartesianGrid stroke="#e5e7eb" vertical={false} />
                      <XAxis
                        dataKey="week"
                        stroke="#64748b"
                        tick={{ fill: "#64748b", fontSize: 11 }}
                      />
                      <YAxis
                        stroke="#64748b"
                        tick={{ fill: "#64748b", fontSize: 11 }}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "#ffffff",
                          border: "1px solid #e5e7eb",
                          borderRadius: "10px",
                          color: "#111827",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="resolution"
                        stroke="#1f2937"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="escalation"
                        stroke="#dc2626"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="dashboard-card sentiment-mix-card">
                <div className="card-header">
                  <div>
                    <h2>Sentiment Mix</h2>
                    <p>Current distribution from backend sentiment analysis.</p>
                  </div>
                </div>

                <div className="sentiment-pie-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={
                          mixData.length ? mixData : [{ name: "No data", value: 100 }]
                        }
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={64}
                        outerRadius={92}
                        paddingAngle={3}
                      >
                        {mixData.length ? (
                          <>
                            <Cell fill="#15803d" />
                            <Cell fill="#94a3b8" />
                            <Cell fill="#dc2626" />
                          </>
                        ) : (
                          <Cell fill="#cbd5e1" />
                        )}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "#ffffff",
                          border: "1px solid #e5e7eb",
                          borderRadius: "10px",
                          color: "#111827",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="pie-center">
                    <strong>
                      {Number(sentiment?.positive?.percentage ?? 0).toFixed(0)}%
                    </strong>
                    <span>Positive</span>
                  </div>
                </div>

                <div className="sentiment-legend">
                  <div>
                    <i className="legend-dot positive"></i>
                    Positive
                    <strong>
                      {Number(sentiment?.positive?.percentage ?? 0).toFixed(1)}%
                    </strong>
                  </div>
                  <div>
                    <i className="legend-dot neutral"></i>
                    Neutral
                    <strong>
                      {Number(sentiment?.neutral?.percentage ?? 0).toFixed(1)}%
                    </strong>
                  </div>
                  <div>
                    <i className="legend-dot negative"></i>
                    Negative
                    <strong>
                      {Number(sentiment?.negative?.percentage ?? 0).toFixed(1)}%
                    </strong>
                  </div>
                </div>
              </div>

              <div className="dashboard-card priority-card">
                <div className="card-header">
                  <div>
                    <h2>Priority Issues</h2>
                    <p>Issues flagged by the backend for follow-up.</p>
                  </div>
                  <button
                    className="view-all-btn"
                    onClick={() => navigate("/insights")}
                  >
                    Open insights
                  </button>
                </div>

                <div className="priority-table">
                  <div className="priority-row table-head">
                    <span>Issue</span>
                    <span>Priority</span>
                    <span>Volume</span>
                    <span>Negative</span>
                    <span>Action</span>
                  </div>

                  {priorities.length === 0 && (
                    <div className="priority-row">
                      <span>No priority issues detected yet.</span>
                    </div>
                  )}

                  {priorities.map((item) => (
                    <div
                      className="priority-row"
                      key={item.issue || item.cluster_name}
                    >
                      <strong>{item.cluster_name || item.issue}</strong>
                      <span
                        className={`priority ${String(item.priority).toLowerCase()}`}
                      >
                        {item.priority}
                      </span>
                      <span>{fmt(item.volume)}</span>
                      <span
                        className={
                          Number(item.negative_complaints) > 0
                            ? "negative-text"
                            : "positive-text"
                        }
                      >
                        {item.negative_complaints}
                      </span>
                      <button
                        className="action-btn"
                        onClick={() => navigate("/insights")}
                      >
                        Review
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {modalItem && (
                <div className="modal-overlay" role="dialog" aria-modal="true">
                  <div className="modal">
                    <div className="modal-header">
                      <h3>
                        Sample Conversations — {modalItem.cluster_name || modalItem.topic_keywords}
                      </h3>
                      <button className="modal-close" onClick={() => setModalItem(null)}>
                        Close
                      </button>
                    </div>

                    <div className="modal-body">
                      {Array.isArray(modalItem.sample_texts) && modalItem.sample_texts.length ? (
                        <ul className="samples-list">
                          {modalItem.sample_texts.map((s, i) => (
                            <li key={i} className="sample-row">
                              <div className="sample-text">{s.text}</div>
                              <div className="sample-meta">
                                <span className={`sentiment-pill ${s.sentiment || 'neutral'}`}>
                                  {String(s.sentiment || 'neutral').toUpperCase()}
                                </span>
                                <span className="confidence">Conf: {Number(s.confidence || 0).toFixed(2)}</span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p>No sample conversations available for this topic.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default Dashboard;
