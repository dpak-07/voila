import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Global Plotly configuration to prevent MathJax typesetMath undefined runtime errors
if (typeof window !== 'undefined') {
  window.PlotlyConfig = { MathJaxConfig: 'local', typesetMath: false };
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
