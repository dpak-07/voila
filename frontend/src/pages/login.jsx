import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";

import { api, setToken, setUsername, isAuthenticated } from "../api";

function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  const finishAuth = (res, username) => {
    setToken(res.access_token);
    setUsername(res.user?.username || username);
    navigate("/dashboard");
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(event.target);
    const username = form.get("username") || "";
    const password = form.get("password") || "";

    try {
      const res = await api.login(username, password);
      finishAuth(res, username);
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(event.target);
    const username = form.get("username") || "";
    const email = form.get("email") || "";
    const password = form.get("password") || "";

    try {
      await api.register({ username, email, password });
      const res = await api.login(username, password);
      finishAuth(res, username);
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <main className="auth-card">
        <div className="auth-brand">
          <div className="auth-brand-icon">
            <Sparkles size={18} />
          </div>
          <span>VOILA</span>
        </div>

        <h1>{mode === "login" ? "Sign in" : "Create account"}</h1>
        <p className="auth-subtitle">
          {mode === "login"
            ? "Access the analytics workspace."
            : "Create an account to access the analytics workspace."}
        </p>

        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${mode === "login" ? "active" : ""}`}
            onClick={() => {
              setMode("login");
              setError("");
            }}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`auth-tab ${mode === "register" ? "active" : ""}`}
            onClick={() => {
              setMode("register");
              setError("");
            }}
          >
            Register
          </button>
        </div>

        <form
          onSubmit={mode === "login" ? handleLogin : handleRegister}
          className="auth-form"
        >
          <div className="auth-field">
            <label htmlFor="username" className="auth-label">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              minLength={3}
              placeholder="Enter username"
              className="auth-input"
            />
          </div>

          {mode === "register" && (
            <div className="auth-field">
              <label htmlFor="email" className="auth-label">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="Enter email"
                className="auth-input"
              />
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="password" className="auth-label">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              minLength={6}
              placeholder="Enter password"
              className="auth-input"
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" disabled={loading} className="auth-submit">
            {loading
              ? mode === "login"
                ? "Signing in..."
                : "Creating account..."
              : mode === "login"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <div className="auth-footer">
          {mode === "login" ? "Need an account?" : "Already have an account?"}
          <button
            type="button"
            className="auth-link"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
            }}
          >
            {mode === "login" ? "Register" : "Sign in"}
          </button>
        </div>
      </main>
    </div>
  );
}

export default Login;
