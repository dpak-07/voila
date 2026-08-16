import Plotly from 'plotly.js-dist-min';
import createPlotComponent from 'react-plotly.js/factory';

// Explicitly disable MathJax typesetting on Plotly instance to prevent convertToTspans runtime exceptions
if (Plotly && typeof Plotly.setPlotConfig === 'function') {
  try {
    Plotly.setPlotConfig({ typesetMath: false, MathJaxConfig: 'local' });
  } catch (e) {
    // Ignore if already configured
  }
}

if (typeof window !== 'undefined') {
  window.PlotlyConfig = { MathJaxConfig: 'local', typesetMath: false };
}

export const Plot = createPlotComponent(Plotly);
export default Plot;
