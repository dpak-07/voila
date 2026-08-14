import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  Send,
  BrainCircuit,
  RefreshCw,
  BarChart3,
  UploadCloud,
  Layers,
  Bot,
  LogOut,
  ChevronRight,
  Zap,
} from "lucide-react";

import { api, getUsername, logout } from "../api";

export default function Voila() {
  const navigate = useNavigate();
  const userName = getUsername() || "Analyst";
  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const [messages, setMessages] = useState([
    {
      role: "ai",
      text: "👋 Hello! I am Voila, your autonomous Voice-of-Customer AI Analyst. I am connected directly to your PostgreSQL database with access to sentiment transformers, topic clustering, and SLA analysis tools. What would you like to investigate?",
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

  const send = async (e, customPrompt) => {
    if (e) e.preventDefault();
    const question = (customPrompt || input).trim();
    if (!question || loading) return;

    setMessages((current) => [...current, { role: "user", text: question }]);
    if (!customPrompt) setInput("");
    setLoading(true);

    try {
      const res = await api.ask(question);
      const answer = res.answer ?? "No answer returned.";
      const meta = res.query_type
        ? `[Query: ${res.query_type}${res.required_tools?.length ? " | Tools: " + res.required_tools.join(", ") : ""}]`
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
          text: `Error: ${err.message || "Failed to reach the AI agent."}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      {/* SIDEBAR */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800/80 flex flex-col shrink-0 sticky top-0 h-screen z-30 select-none">
        <div className="p-5 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
            <Sparkles size={20} />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
              VOILA <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-bold">AI</span>
            </h2>
            <p className="text-[11px] text-slate-400 font-medium">Autonomous Agent</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <button
            onClick={() => navigate("/dashboard")}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-all"
          >
            <BarChart3 size={17} />
            <span>Dashboard</span>
          </button>
          <button
            onClick={() => navigate("/data-extract")}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-all"
          >
            <UploadCloud size={17} />
            <span>Dataset Ingestion</span>
          </button>
          <button
            onClick={() => navigate("/insights")}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-all"
          >
            <Layers size={17} />
            <span>Run Comparison</span>
          </button>
          <button
            onClick={() => navigate("/voila")}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white shadow-md shadow-indigo-600/30 transition-all"
          >
            <Bot size={17} />
            <span>AI Full Workspace</span>
          </button>
        </nav>

        <div className="p-3 border-t border-slate-800/80">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors border border-rose-500/20"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* MAIN CHAT CONSOLE */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950">
        <header className="sticky top-0 z-20 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-8 py-3.5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <Bot size={20} className="text-indigo-400" />
              Voila Autonomous Agent Workspace
            </h1>
            <p className="text-xs text-slate-400">Natural language reasoning grounded against PostgreSQL support conversation tables.</p>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Agent Ready
          </span>
        </header>

        {/* Chat Messages */}
        <main className="flex-1 p-8 space-y-4 overflow-y-auto flex flex-col max-w-5xl mx-auto w-full">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`p-4 rounded-2xl max-w-[85%] leading-relaxed ${
                m.role === "user"
                  ? "ml-auto bg-indigo-600 text-white font-medium shadow-md shadow-indigo-600/20 text-sm"
                  : "mr-auto bg-slate-900 border border-slate-800 text-slate-200 shadow-sm text-sm"
              }`}
            >
              <div className="whitespace-pre-wrap">{m.text}</div>
              {m.meta && <div className="text-xs text-indigo-400 font-mono mt-2 pt-2 border-t border-slate-800">{m.meta}</div>}
            </div>
          ))}

          {loading && (
            <div className="mr-auto bg-slate-900 border border-slate-800 p-4 rounded-2xl text-xs text-indigo-300 flex items-center gap-2">
              <RefreshCw size={14} className="animate-spin" />
              <span>Voila Agent is reasoning across dataset clusters and computing metrics...</span>
            </div>
          )}

          <div ref={endRef} />
        </main>

        {/* Input Bar & Prompts */}
        <div className="p-6 bg-slate-900/90 border-t border-slate-800 backdrop-blur-md">
          <div className="max-w-5xl mx-auto space-y-3">
            <div className="flex gap-2 overflow-x-auto text-xs pb-1">
              {[
                "Which topics have the highest negative sentiment?",
                "What is our current mean response SLA vs resolution rate?",
                "Give me the top 3 recommended actions for engineering.",
                "Compare latest dataset run with previous baseline.",
              ].map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => send(null, p)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 font-medium border border-slate-700 whitespace-nowrap transition-colors flex items-center gap-1.5"
                >
                  <Zap size={12} />
                  <span>{p}</span>
                </button>
              ))}
            </div>

            <form onSubmit={(e) => send(e)} className="flex gap-2">
              <input
                type="text"
                placeholder="Ask Voila anything about your customer support analytics..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 shadow-inner"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold disabled:opacity-50 transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/30"
              >
                <span>Ask</span>
                <Send size={15} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
