import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { isAuthenticated } from "./api";

import Login from "./pages/login";
import Dashboard from "./pages/dashb";
import DataExtract from "./pages/dataextract";
import Insights from "./pages/insights";
import Voila from "./pages/voila";

function RequireAuth({ children }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  return (
    <BrowserRouter>

      <Routes>

        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route path="/login" element={<Login />} />

        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />

        <Route
          path="/data-extract"
          element={
            <RequireAuth>
              <DataExtract />
            </RequireAuth>
          }
        />

        <Route
          path="/insights"
          element={
            <RequireAuth>
              <Insights />
            </RequireAuth>
          }
        />

        <Route
          path="/voila"
          element={
            <RequireAuth>
              <Voila />
            </RequireAuth>
          }
        />

        <Route path="*" element={<Navigate to="/login" replace />} />

      </Routes>

    </BrowserRouter>
  );
}

export default App;
