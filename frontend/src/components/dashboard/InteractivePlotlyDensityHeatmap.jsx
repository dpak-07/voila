import React, { useState, useMemo } from 'react';
import Plot from '../common/Plot';
import { Globe } from 'lucide-react';
import { ConfidenceBadge } from '../common/ConfidenceBadge';
import { EmptyDiagnostic } from '../common/EmptyDiagnostic';

export function InteractivePlotlyDensityHeatmap({ painPoints = [], regionData = [] }) {
  const [plotType, setPlotType] = useState('heatmap');

  const { topics, regions, zDensity, zLatency } = useMemo(() => {
    const t = painPoints.slice(0, 5).map((p) => p.cluster_name);
    const r = regionData.map((rd) => rd.region);

    if (t.length === 0 || r.length === 0) {
      return { topics: t, regions: r, zDensity: [], zLatency: [] };
    }

    const totalVolume = painPoints.reduce((sum, p) => sum + (p.volume || 0), 0);

    const density = t.map((topic) => {
      const pp = painPoints.find((p) => p.cluster_name === topic);
      const topicShare = totalVolume > 0 ? pp.volume / totalVolume : 0;
      return r.map((region) => {
        const rd = regionData.find((d) => d.region === region);
        return Math.round(topicShare * (rd.total_conversations || 0));
      });
    });

    const latency = t.map(() => {
      return r.map((region) => {
        const rd = regionData.find((d) => d.region === region);
        return rd.avg_response_time_minutes || 0;
      });
    });

    return { topics: t, regions: r, zDensity: density, zLatency: latency };
  }, [painPoints, regionData]);

  if (topics.length === 0 || regions.length === 0) {
    return (
      <div className="p-6 rounded-2xl signal-card space-y-4 border border-zinc-200 shadow-2xs overflow-hidden">
        <div className="flex items-center gap-2 pb-3 border-b border-zinc-200">
          <div className="p-1.5 rounded-lg bg-zinc-900 text-white">
            <Globe className="w-4 h-4" />
          </div>
          <h3 className="font-display font-extrabold text-base text-zinc-900 tracking-tight">
            Interactive Cross-Regional Density & SLA Correlation
          </h3>
        </div>
        <EmptyDiagnostic
          title="No Region or Topic Data"
          message="Pain points and region data are required to build the cross-regional density and SLA correlation heatmap."
          requiredFields={['painPoints', 'regionData']}
        />
      </div>
    );
  }

  const activeZ = plotType === 'heatmap' ? zDensity : zLatency;
  const colorScale = plotType === 'heatmap' ? 'Greys' : 'Reds';

  return (
    <div className="p-6 rounded-2xl signal-card space-y-4 border border-zinc-200 shadow-2xs overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-zinc-900 text-white">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-display font-extrabold text-base text-zinc-900 tracking-tight flex items-center gap-2">
              <span>Interactive Cross-Regional Density & SLA Correlation</span>
              <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-800 text-[10px] font-mono font-bold border border-zinc-300">
                Plotly WebGL
              </span>
            </h3>
            <p className="text-xs font-mono text-zinc-500">
              Interactive 2D/3D visualization of complaint volume and response latency across global markets
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg bg-zinc-100 p-0.5 border border-zinc-300">
            <button
              onClick={() => setPlotType('heatmap')}
              className={`px-3 py-1 rounded-md text-xs font-mono font-semibold transition-all ${
                plotType === 'heatmap'
                  ? 'bg-zinc-900 text-white shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Density Heatmap
            </button>
            <button
              onClick={() => setPlotType('surface')}
              className={`px-3 py-1 rounded-md text-xs font-mono font-semibold transition-all ${
                plotType === 'surface'
                  ? 'bg-zinc-900 text-white shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              SLA Latency Heatmap
            </button>
          </div>
          <ConfidenceBadge confidence="measured" size="sm" />
        </div>
      </div>

      <div className="w-full h-80 flex items-center justify-center bg-white rounded-xl border border-zinc-200 p-2">
        <Plot
          data={[
            {
              z: activeZ,
              x: regions,
              y: topics,
              type: 'heatmap',
              colorscale: colorScale,
              reversescale: true,
              hoverongaps: false,
              colorbar: {
                title: plotType === 'heatmap' ? 'Volume' : 'SLA (min)',
                titleside: 'right',
                tickfont: { family: 'monospace', size: 10, color: '#52525b' },
                thickness: 14,
                len: 0.9,
              },
              hovertemplate:
                '<b>Category</b>: %{y}<br>' +
                '<b>Region</b>: %{x}<br>' +
                '<b>' + (plotType === 'heatmap' ? 'Cases' : 'Avg SLA') + '</b>: %{z}' + (plotType === 'heatmap' ? '' : ' mins') +
                '<extra></extra>',
            },
          ]}
          layout={{
            autosize: true,
            margin: { l: 150, r: 50, b: 50, t: 20, pad: 4 },
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent',
            xaxis: {
              tickfont: { family: 'monospace', size: 11, color: '#27272a' },
              gridcolor: '#f4f4f5',
            },
            yaxis: {
              tickfont: { family: 'monospace', size: 11, color: '#27272a' },
              gridcolor: '#f4f4f5',
              autorange: 'reversed',
            },
          }}
          config={{
            responsive: true,
            displayModeBar: true,
            displaylogo: false,
            typesetMath: false,
            modeBarButtonsToRemove: ['lasso2d', 'select2d'],
          }}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    </div>
  );
}
