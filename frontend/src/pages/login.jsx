import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  BrainCircuit,
  BarChart3,
  ShieldCheck,
  ArrowRight,
  MessageSquare,
} from "lucide-react";

function Login() {
  const navigate = useNavigate();

  const handleLogin = (event) => {
    event.preventDefault();

    // Temporary frontend navigation.
    // Later this will call your FastAPI authentication endpoint.
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[#050507] text-white">
      {/* Background Effects */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-violet-600/20 blur-[140px]" />

        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-purple-600/10 blur-[140px]" />

        <div className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/5 blur-[120px]" />
      </div>

      {/* Main Layout */}
      <main className="relative grid min-h-screen lg:grid-cols-2">
        {/* =====================================================
            LEFT SIDE
        ====================================================== */}
        <section className="flex flex-col justify-center px-8 py-16 sm:px-12 lg:px-16 xl:px-24">
          <div className="mx-auto w-full max-w-xl lg:mx-0">
            {/* Brand */}
            <div className="mb-10 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 shadow-lg shadow-violet-500/30">
                <Sparkles size={23} />
              </div>

              <span className="text-2xl font-bold tracking-[0.25em]">
                VOILA
              </span>
            </div>

            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-300">
              <Sparkles size={13} />
              AI CUSTOMER INTELLIGENCE
            </div>

            {/* Heading */}
            <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl xl:text-6xl">
              Turn conversations
              <br />
              into{" "}
              <span className="bg-gradient-to-r from-violet-400 to-purple-300 bg-clip-text text-transparent">
                intelligence.
              </span>
            </h1>

            {/* Description */}
            <p className="mt-6 max-w-lg text-base leading-relaxed text-zinc-400 sm:text-lg">
              Voila transforms customer conversations into actionable insights,
              emerging issues, and intelligent recommendations.
            </p>

            {/* Features */}
            <div className="mt-12 grid max-w-xl gap-3">
              <Feature
                icon={<BrainCircuit size={18} />}
                title="AI-Powered Insights"
                description="Understand what your customers are really saying."
              />

              <Feature
                icon={<BarChart3 size={18} />}
                title="Live Analytics"
                description="Track KPIs, sentiment, and resolution performance."
              />

              <Feature
                icon={<MessageSquare size={18} />}
                title="Ask Voila"
                description="Talk to your AI analyst and explore your data."
              />
            </div>

            {/* Bottom Statement */}
            <div className="mt-10 hidden items-center gap-2 text-xs text-zinc-600 sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Your AI analyst is ready.
            </div>
          </div>
        </section>

        {/* =====================================================
            RIGHT SIDE
        ====================================================== */}
        <section className="flex items-center justify-center px-6 py-12 lg:px-12">
          <div className="w-full max-w-md">
            {/* Login Card */}
            <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.035] p-7 shadow-2xl shadow-black/40 backdrop-blur-2xl sm:p-9">
              {/* Card Glow */}
              <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl" />

              {/* Header */}
              <div className="relative">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
                  <Sparkles size={22} />
                </div>

                <h2 className="text-2xl font-semibold">
                  Welcome back
                </h2>

                <p className="mt-2 text-sm text-zinc-500">
                  Sign in to continue to Voila.
                </p>
              </div>

              {/* Login Form */}
              <form onSubmit={handleLogin} className="relative mt-8">
                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm text-zinc-400"
                  >
                    Email
                  </label>

                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@company.com"
                    autoComplete="email"
                    required
                    className="h-12 w-full rounded-xl border border-white/[0.08] bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/10"
                  />
                </div>

                {/* Password */}
                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="text-sm text-zinc-400"
                    >
                      Password
                    </label>

                    <button
                      type="button"
                      className="text-xs text-violet-400 transition hover:text-violet-300"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    className="h-12 w-full rounded-xl border border-white/[0.08] bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/10"
                  />
                </div>

                {/* Sign In */}
                <button
                  type="submit"
                  className="group mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-sm font-semibold shadow-lg shadow-violet-600/20 transition duration-200 hover:scale-[1.01] hover:shadow-violet-600/30 active:scale-[0.99]"
                >
                  Sign in

                  <ArrowRight
                    size={17}
                    className="transition-transform duration-200 group-hover:translate-x-1"
                  />
                </button>
              </form>

              {/* Divider */}
              <div className="my-7 flex items-center gap-4">
                <div className="h-px flex-1 bg-white/[0.07]" />

                <span className="text-[10px] tracking-widest text-zinc-600">
                  OR
                </span>

                <div className="h-px flex-1 bg-white/[0.07]" />
              </div>

              {/* Google */}
              <button
                type="button"
                className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] text-sm text-zinc-300 transition hover:bg-white/[0.05]"
              >
                {/* Google Icon */}
                <span className="text-base font-bold">G</span>

                Continue with Google
              </button>

              {/* Signup */}
              <p className="mt-7 text-center text-sm text-zinc-500">
                Don't have an account?

                <button
                  type="button"
                  className="ml-1 text-violet-400 transition hover:text-violet-300"
                >
                  Create one
                </button>
              </p>
            </div>

            {/* Security */}
            <div className="mt-5 flex items-center justify-center gap-2 text-xs text-zinc-600">
              <ShieldCheck size={14} />
              Your data is securely protected
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

/* =========================================================
   FEATURE COMPONENT
========================================================= */

function Feature({ icon, title, description }) {
  return (
    <div className="group flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 transition duration-200 hover:border-violet-500/20 hover:bg-violet-500/[0.04]">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300 transition group-hover:bg-violet-500/15">
        {icon}
      </div>

      <div>
        <h3 className="text-sm font-medium text-white">
          {title}
        </h3>

        <p className="mt-1 text-xs leading-relaxed text-zinc-500">
          {description}
        </p>
      </div>
    </div>
  );
}

export default Login;