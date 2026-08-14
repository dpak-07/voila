import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Sparkles, KeyRound } from "lucide-react";

import { api, setToken, setUsername, isAuthenticated } from "../api";

function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [usernameInput, setUsernameInput] = useState("admin");
  const [passwordInput, setPasswordInput] = useState("password123");
  const [emailInput, setEmailInput] = useState("admin@voila.ai");

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

    try {
      const res = await api.login(usernameInput.trim(), passwordInput);
      finishAuth(res, usernameInput.trim());
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

    try {
      await api.register({
        username: usernameInput.trim(),
        email: emailInput.trim(),
        password: passwordInput,
      });
      const res = await api.login(usernameInput.trim(), passwordInput);
      finishAuth(res, usernameInput.trim());
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCreds = () => {
    setUsernameInput("admin");
    setPasswordInput("password123");
    setError("");
  };

  return (
    <div className="auth-page">
      <main className="auth-card">
        <div className="auth-brand">
          <div className="auth-brand-icon">
            <Sparkles size={22} />
          </div>
          <span>VOILA</span>
        </div>

        <h1>{mode === "login" ? "Sign in" : "Create account"}</h1>
        <p className="auth-subtitle">
          {mode === "login"
            ? "Access the Voice-of-Customer intelligence platform."
            : "Register an analyst account for the platform."}
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
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
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
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
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
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="auth-input"
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          {mode === "login" && (
            <div className="auth-demo-hint">
              <span>Demo account: <strong>admin</strong> / <strong>password123</strong></span>
              <button type="button" className="btn-fill-demo" onClick={fillDemoCreds}>
                Auto-fill
              </button>
            </div>
          )}

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
