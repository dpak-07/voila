import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  UploadCloud,
  RefreshCw,
  CheckCircle2,
  XCircle,
} from "lucide-react";

import { api, getUsername, logout } from "../api";

const fmt = (n) =>
  n == null || Number.isNaN(Number(n)) ? "--" : Number(n).toLocaleString();

const getStatusTone = (value) => {
  const normalized = String(value || "").toUpperCase();
  if (["SUCCESS", "READY", "COMPLETED"].includes(normalized)) return "success";
  if (["FAILED", "ERROR"].includes(normalized)) return "danger";
  return "warning";
};

function DataExtract() {
  const navigate = useNavigate();
  const userName = getUsername() || "Analyst";
  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const [status, setStatus] = useState([]);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const [s, r] = await Promise.all([api.status(), api.runs()]);
      setStatus(s.pipeline_logs || []);
      setRuns(r.runs || []);
    } catch (e) {
      setUploadError(e.message || "Failed to load pipeline status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const doUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setUploadError("");
    setUploadResult(null);
    try {
      const res = await api.upload(file);
      setUploadResult(res);
      setTimeout(loadStatus, 1500);
    } catch (err) {
      setUploadError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const selectedFileLabel = file
    ? `${file.name} | ${Math.max(1, Math.round(file.size / 1024))} KB`
    : "Accepted formats: CSV, XLSX, XLS";

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
            className="dashboard-nav-link active"
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
              <UploadCloud size={15} />
              Data
            </div>
            <h1>Dataset Upload</h1>
            <p>Upload a file and review pipeline activity from the backend.</p>
          </div>

          <div className="dashboard-actions">
            <button className="generate-btn" onClick={loadStatus} disabled={loading}>
              <RefreshCw size={16} className={loading ? "spin" : ""} />
              Refresh
            </button>
          </div>
        </section>

        <div className="page-stack">
          <div className="dashboard-card surface-section">
            <div className="surface-stack">
              <form onSubmit={doUpload} className="upload-form">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="file-input-shell"
                />

                <button
                  type="submit"
                  className="generate-btn"
                  disabled={uploading || !file}
                >
                  <UploadCloud size={16} />
                  {uploading ? "Uploading..." : "Upload"}
                </button>
              </form>

              <div className="surface-row">
                <span className="inline-note">{selectedFileLabel}</span>
                <span className="inline-note">
                  {runs.length} dataset version{runs.length === 1 ? "" : "s"} available
                </span>
              </div>

              {uploadError && (
                <p className="feedback-message error">{uploadError}</p>
              )}

              {uploadResult && (
                <div className="success-grid">
                  <div className="success-card">
                    <CheckCircle2 size={16} />
                    <strong>Run started: {uploadResult.run_id}</strong>
                    <span>{fmt(uploadResult.total_rows)} rows processed</span>
                    <span>{uploadResult.s3_uri}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="dashboard-card">
            <div className="card-header">
              <div>
                <h2>Pipeline Status</h2>
                <p>Recent pipeline steps returned by the backend.</p>
              </div>
            </div>

            <div className="data-table-shell">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Run</th>
                    <th>Step</th>
                    <th>Status</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {status.length === 0 && (
                    <tr>
                      <td colSpan="4" className="table-empty">
                        No pipeline activity recorded yet.
                      </td>
                    </tr>
                  )}

                  {status.map((item, index) => (
                    <tr key={index}>
                      <td className="table-cell-dim">
                        {String(item.run_id || "").slice(0, 8)}
                      </td>
                      <td>{item.step}</td>
                      <td>
                        <span className={`status-pill ${getStatusTone(item.status)}`}>
                          {item.status || "PENDING"}
                        </span>
                      </td>
                      <td className="table-cell-dim">
                        {String(item.timestamp || "").slice(0, 19)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="dashboard-card">
            <div className="card-header">
              <div>
                <h2>Dataset Versions</h2>
                <p>Uploaded dataset runs returned by the backend.</p>
              </div>
            </div>

            <div className="data-table-shell">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Run ID</th>
                    <th>Uploaded</th>
                    <th>Rows</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.length === 0 && (
                    <tr>
                      <td colSpan="4" className="table-empty">
                        No datasets uploaded yet.
                      </td>
                    </tr>
                  )}

                  {runs.map((run) => {
                    const ready = String(run.status).toLowerCase() === "ready";
                    return (
                      <tr key={run.run_id}>
                        <td className="table-cell-dim">
                          {String(run.run_id).slice(0, 8)}
                        </td>
                        <td>
                          {String(run.uploaded_at || "")
                            .replace("T", " ")
                            .slice(0, 19)}
                        </td>
                        <td>{fmt(run.total_records)}</td>
                        <td>
                          <span className={`status-pill ${ready ? "success" : "warning"}`}>
                            {ready ? (
                              <>
                                <CheckCircle2 size={13} />
                                READY
                              </>
                            ) : (
                              <>
                                <XCircle size={13} />
                                {String(run.status || "pending").toUpperCase()}
                              </>
                            )}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default DataExtract;
