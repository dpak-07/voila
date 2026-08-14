import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  Send,
  BrainCircuit,
  RefreshCw,
} from "lucide-react";

import { api, getUsername, logout } from "../api";

function Voila() {
  const navigate = useNavigate();
  const userName = getUsername() || "Analyst";
  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const [messages, setMessages] = useState([
    {
      role: "ai",
      text: "Hi, I'm Voila, your AI analyst. Ask me about your customer conversations, KPIs, or pain points.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const renderAnswer = (answer) => {
    if (answer == null) return "No answer returned.";
    if (typeof answer === "string") return answer;
    try {
      return JSON.stringify(answer, null, 2);
    } catch (_) {
      return String(answer);
    }
  };

  const send = async (e) => {
    e.preventDefault();
    const question = input.trim();
    if (!question || loading) return;

    setMessages((current) => [...current, { role: "user", text: question }]);
    setInput("");
    setLoading(true);

    try {
      const res = await api.ask(question);
      const answer = res.answer ?? "No answer returned.";
      const meta = res.query_type
        ? `[${res.query_type}${res.required_tools?.length ? " | " + res.required_tools.join(", ") : ""}]`
        : "";
      setMessages((current) => [
        ...current,
        { role: "ai", text: renderAnswer(answer), meta },
      ]);
    } catch (err) {
      setMessages((current) => [
        ...current,
        {
          role: "ai",
          text: `Error: ${err.message || "Failed to reach the agent"}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

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
            className="dashboard-nav-link"
            onClick={() => navigate("/insights")}
          >
            Insights
          </button>
          <button
            className="dashboard-nav-link voila-nav-link active"
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
              AI ANALYST
            </div>
            <h1>Ask Voila</h1>
            <p>
              Real answers computed from your PostgreSQL data by the agentic
              analytics service.
            </p>
          </div>
        </section>

        <div className="dashboard-card chat-shell">
          <div className="chat-header">
            <div className="chat-header-title">
              <div className="chat-header-icon">
                <BrainCircuit size={20} />
              </div>
              <div className="chat-header-copy">
                <h2>Conversation Workspace</h2>
                <p>
                  Ask about sentiment, issue clusters, dataset runs, or KPI
                  changes.
                </p>
              </div>
            </div>

            <div className="chat-status">
              <span></span>
              Agent online
            </div>
          </div>

          <div className="chat-stream">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`chat-bubble ${message.role === "user" ? "user" : "ai"}`}
              >
                {message.text}
                {message.meta && (
                  <div className="chat-bubble-meta">{message.meta}</div>
                )}
              </div>
            ))}

            {loading && (
              <div className="chat-thinking">
                <RefreshCw size={13} className="spin" />
                Voila is thinking...
              </div>
            )}

            <div ref={endRef} />
          </div>

          <form onSubmit={send} className="chat-composer">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about conversations, KPIs, or issues..."
              className="filter-select chat-input"
            />

            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="generate-btn"
            >
              <Send size={16} />
              Send
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default Voila;
