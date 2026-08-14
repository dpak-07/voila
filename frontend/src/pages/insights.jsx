import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  BrainCircuit,
  Sparkles,
  RefreshCw,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

import { api, getUsername, logout } from "../api";

const fmt = (n) =>
  n == null || Number.isNaN(Number(n)) ? "--" : Number(n).toLocaleString();

const sampleTone = (sentiment) => {
  if (sentiment === "negative") return "negative";
  if (sentiment === "positive") return "positive";
  return "neutral";
};

function Insights() {
  const navigate = useNavigate();
  const userName = getUsername() || "Analyst";
  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const [kpis, setKpis] = useState(null);
  const [runs, setRuns] = useState([]);
  const [compare, setCompare] = useState(null);
  const [compareError, setCompareError] = useState("");
  const [curRun, setCurRun] = useState("");
  const [prevRun, setPrevRun] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [compareLoading, setCompareLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [k, r] = await Promise.all([api.kpis({}), api.runs()]);
      setKpis(k);
      setRuns(r.runs || []);
      if (r.runs && r.runs.length > 0) {
        setCurRun(r.runs[0].run_id);
        if (r.runs.length > 1) setPrevRun(r.runs[1].run_id);
      }
    } catch (e) {
      setError(e.message || "Failed to load insights");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const runCompare = useCallback(async (currentRun, previousRun) => {
    if (!currentRun || !previousRun) return;
    setCompareLoading(true);
    setCompareError("");
    try {
      const res = await api.compare(currentRun, previousRun);
      if (res.status === "error") {
        setCompareError(res.message || "Comparison failed");
        setCompare(null);
      } else {
        setCompare(res);
        setCompareError(res.status === "single_dataset_only" ? res.message : "");
      }
    } catch (e) {
      setCompareError(e.message || "Comparison failed");
    } finally {
      setCompareLoading(false);
    }
  }, []);

  useEffect(() => {
    if (curRun && prevRun) runCompare(curRun, prevRun);
  }, [curRun, prevRun, runCompare]);

  const summary = kpis?.kpi_pillars || {};
  const topics = kpis?.topic_summaries || [];
  const emerging = kpis?.emerging_issues || [];
  const recurring = kpis?.recurring_issues || [];
  const newIssues = kpis?.new_issues || [];
  const matrix = compare?.comparison_summary || {};
  const evolution = compare?.topic_evolution || {};

  const metricLabels = {
    resolution_rate: "Resolution Rate",
    escalation_rate: "Escalation Rate",
    reopen_rate: "Reopen Rate",
    avg_response_time_minutes: "Avg Response Time (min)",
    negative_sentiment_percentage: "Negative Sentiment",
    positive_sentiment_percentage: "Positive Sentiment",
  };

  const comparisonEntries = Object.entries(matrix).filter(
    ([key]) => metricLabels[key]
  );

  const issueGroups = [
    { label: "Emerging Issues", list: emerging, icon: TrendingUp },
    { label: "Recurring Issues", list: recurring, icon: AlertTriangle },
    { label: "New Issues", list: newIssues, icon: MessageSquare },
  ];

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
            className="dashboard-nav-link"
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
            className="dashboard-nav-link active"
            onClick={() => navigate("/insights")}
          >
            Insights
          </button>
          <button
            className="dashboard-nav-link voila-nav-link"
            onClick={() => navigate("/voila")}
          >
            <Sparkles size={14} />
            Voila
          </button>
        </div>

        <div className="dashboard-user">
          <div className="online-dot"></div>
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
              DEEP DIVE
            </div>
            <h1>Insights and Run Comparison</h1>
            <p>
              Topics, issue movement, sample conversations, and dataset deltas
              in one view.
            </p>
          </div>

          <div className="dashboard-actions">
            <button className="generate-btn" onClick={load} disabled={loading}>
              <RefreshCw size={16} className={loading ? "spin" : ""} />
              Refresh
            </button>
          </div>
        </section>

        {error && (
          <div className="dashboard-card dashboard-card--error surface-section">
            <div className="surface-stack">
              <p className="feedback-message error">{error}</p>
              <div>
                <button className="generate-btn" onClick={load}>Retry</button>
              </div>
            </div>
          </div>
        )}

        {loading && !kpis && (
          <div className="dashboard-card dashboard-card--loading surface-section">
            <p>Loading insights...</p>
          </div>
        )}

        {!loading && kpis && (
          <div className="page-stack">
            <div className="dashboard-card surface-section">
              <div className="surface-stack">
                <div className="surface-row">
                  <div>
                    <h2>Dataset Run Comparison</h2>
                    <p className="inline-note">
                      Zero-RAM delta between two uploaded dataset versions.
                    </p>
                  </div>
                </div>

                <div className="comparison-toolbar">
                  <select
                    className="filter-select"
                    value={curRun}
                    onChange={(e) => setCurRun(e.target.value)}
                  >
                    {runs.map((run) => (
                      <option key={run.run_id} value={run.run_id}>
                        Current: {String(run.uploaded_at || "").slice(0, 16)} (
                        {fmt(run.total_records)} rows)
                      </option>
                    ))}
                  </select>

                  <select
                    className="filter-select"
                    value={prevRun}
                    onChange={(e) => setPrevRun(e.target.value)}
                  >
                    {runs.map((run) => (
                      <option key={run.run_id} value={run.run_id}>
                        Previous: {String(run.uploaded_at || "").slice(0, 16)} (
                        {fmt(run.total_records)} rows)
                      </option>
                    ))}
                  </select>

                  {compareLoading && (
                    <span className="compare-progress">Comparing runs...</span>
                  )}
                </div>

                {compareError && (
                  <p className="feedback-message warning">{compareError}</p>
                )}

                {compare && comparisonEntries.length > 0 && (
                  <div className="comparison-grid">
                    {comparisonEntries.map(([key, metric]) => {
                      const improved = metric.trend === "improved";
                      const Icon = improved ? TrendingDown : TrendingUp;
                      return (
                        <div
                          key={key}
                          className={`comparison-card ${improved ? "improved" : "regressed"}`}
                        >
                          <div className="comparison-card-top">
                            <Icon size={15} />
                            {metricLabels[key]}
                          </div>

                          <div className="comparison-card-value">
                            {metric.current}
                            <span className="comparison-card-sub">
                              from {metric.previous}
                            </span>
                          </div>

                          <div className="comparison-card-delta">
                            {metric.delta > 0 ? "+" : ""}
                            {metric.delta} ({metric.percentage_change > 0 ? "+" : ""}
                            {metric.percentage_change}%)
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {compare && (
                  <div className="evolution-grid">
                    {(evolution.new_emerging_topics || []).map((topic) => (
                      <div
                        key={topic.topic_keywords}
                        className="evolution-card new"
                      >
                        <strong>{topic.cluster_name || topic.topic_keywords}</strong>
                        <p>
                          New issue in current upload | volume{" "}
                          {fmt(topic.current_volume)}
                        </p>
                      </div>
                    ))}

                    {(evolution.resolved_or_subsided_topics || []).map((topic) => (
                      <div
                        key={topic.topic_keywords}
                        className="evolution-card resolved"
                      >
                        <strong>{topic.cluster_name || topic.topic_keywords}</strong>
                        <p>
                          Resolved or inactive in current upload | was{" "}
                          {fmt(topic.previous_volume)}
                        </p>
                      </div>
                    ))}

                    {!compareError &&
                      !(evolution.new_emerging_topics || []).length &&
                      !(evolution.resolved_or_subsided_topics || []).length && (
                        <p className="inline-note">
                          No topic evolution between these runs.
                        </p>
                      )}
                  </div>
                )}
              </div>
            </div>

            <section className="kpi-grid">
              {[
                {
                  title: "Emerging Issues",
                  value: emerging.length,
                  sub: "spiking now",
                  icon: TrendingUp,
                },
                {
                  title: "Recurring Issues",
                  value: recurring.length,
                  sub: "systemic",
                  icon: AlertTriangle,
                },
                {
                  title: "New Issues",
                  value: newIssues.length,
                  sub: "first appearance",
                  icon: Sparkles,
                },
                {
                  title: "Resolution Rate",
                  value: `${kpis?.kpis?.resolution_rate ?? "--"}%`,
                  sub: "of inbound",
                  icon: CheckCircle2,
                },
              ].map((card) => {
                const Icon = card.icon;
                return (
                  <div className="kpi-card" key={card.title}>
                    <div className="kpi-card-top">
                      <span>{card.title}</span>
                      <div className="kpi-icon">
                        <Icon size={18} />
                      </div>
                    </div>
                    <div className="kpi-value">{card.value}</div>
                    <div className="kpi-footer">
                      <span className="kpi-change">{card.sub}</span>
                    </div>
                  </div>
                );
              })}
            </section>

            <div className="dashboard-card">
              <div className="card-header">
                <div>
                  <h2>Topics and Sample Conversations</h2>
                  <p>Representative messages backing each detected cluster.</p>
                </div>
              </div>

              <div className="topics-list">
                {topics.length === 0 && (
                  <p className="empty-state">No topics detected yet.</p>
                )}

                {topics.map((topic) => (
                  <div key={topic.topic_keywords} className="insight-topic">
                    <div className="insight-topic-head">
                      <strong>{topic.cluster_name || topic.topic_keywords}</strong>
                      <span className="insight-topic-meta">
                        {fmt(topic.volume)} conversations |{" "}
                        {topic.negative_complaints} negative | pain{" "}
                        {topic.pain_score}
                      </span>
                    </div>

                    <div className="sample-grid">
                      {(topic.sample_texts || []).map((sample, index) => (
                        <div
                          key={index}
                          className={`sample-card ${sampleTone(sample.sentiment)}`}
                        >
                          <p className="sample-copy">"{sample.text}"</p>
                          <span className="sample-sentiment">
                            {sample.sentiment}
                          </span>
                        </div>
                      ))}

                      {!topic.sample_texts?.length && (
                        <p className="inline-note">No sample texts available.</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="issue-columns">
              {issueGroups.map((group) => {
                const Icon = group.icon;
                return (
                  <div className="dashboard-card" key={group.label}>
                    <div className="card-header">
                      <div>
                        <h2>{group.label}</h2>
                        <p>{group.list.length} detected</p>
                      </div>
                      <Icon size={18} />
                    </div>

                    <div className="issue-health-list">
                      {group.list.length === 0 && (
                        <p className="empty-state">None detected.</p>
                      )}

                      {group.list.map((item) => (
                        <div
                          className="issue-health-item"
                          key={item.topic_keywords || item.cluster_name}
                        >
                          <div className="issue-health-text">
                            <strong>{item.cluster_name || item.topic_keywords}</strong>
                            <span>
                              {fmt(item.volume)} conversations |{" "}
                              {item.negative_complaints} negative
                            </span>
                          </div>
                          <b className="issue-up">{item.pain_score}</b>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="dashboard-card surface-section">
              <div className="surface-stack">
                <div>
                  <h2>Executive KPI Pillars</h2>
                  <p className="inline-note">
                    Direct outputs from the analytics engine.
                  </p>
                </div>

                <div className="pillars-grid">
                  {[
                    ["Emerging spikes", summary.emerging_spikes_count],
                    [
                      "Recurring issue reduction",
                      `${summary.recurring_issues_reduction}%`,
                    ],
                    [
                      "Sentiment escalation multiplier",
                      `${summary.sentiment_escalation_multiplier}x`,
                    ],
                    ["Fast mean response time", `${summary.fast_mean_response_time}m`],
                    ["AI speedup boost", `${summary.ai_speedup_boost}%`],
                  ].map(([label, value]) => (
                    <div key={label} className="pillar-card">
                      <span>{label}</span>
                      <strong>{value ?? "--"}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Insights;
