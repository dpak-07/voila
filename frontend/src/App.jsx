import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashb";
import DataExtract from "./pages/DataExtract";
import Insights from "./pages/Insights";
import Voila from "./pages/Voila";

function App() {
  return (
    <BrowserRouter>

      <Routes>

        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route path="/login" element={<Login />} />

        <Route path="/dashboard" element={<Dashboard />} />

        <Route path="/data-extract" element={<DataExtract />} />

        <Route path="/insights" element={<Insights />} />

        <Route path="/voila" element={<Voila />} />

      </Routes>

    </BrowserRouter>
  );
}

export default App;