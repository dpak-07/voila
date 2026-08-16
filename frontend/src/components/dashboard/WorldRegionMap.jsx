import React, { useState } from 'react';
import Plot from 'react-plotly.js';
import { 
  Globe, 
  MapPin, 
  AlertCircle, 
  ArrowUpRight, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  ShieldAlert,
  RotateCcw,
  Sparkles,
  Info
} from 'lucide-react';
import { useRun } from '../../context/RunContext';

export function WorldRegionMap({ regionalData = [], totalRecords = 100000 }) {
  const { filters, updateFilter } = useRun();
  const [hoveredRegion, setHoveredRegion] = useState(null);

  // 5 Geographic Global Regions with Real Latitudes & Longitudes
  const regionalPresets = [
    {
      id: 'North America',
      code: 'NA',
      name: 'North America',
      lat: 39.5,
      lon: -98.3,
      share: 0.52,
      defaultNeg: 19.8,
      defaultFcr: 84.2,
      defaultLatency: 89,
      topIssue: 'Account Verification & 2FA Latency',
    },
    {
      id: 'Europe',
      code: 'EU',
      name: 'Europe (EMEA)',
      lat: 51.5,
      lon: 12.5,
      share: 0.22,
      defaultNeg: 23.4,
      defaultFcr: 79.6,
      defaultLatency: 112,
      topIssue: 'Payment Gateway Authentication (3DS)',
    },
    {
      id: 'Asia Pacific',
      code: 'APAC',
      name: 'Asia Pacific',
      lat: 25.0,
      lon: 105.0,
      share: 0.14,
      defaultNeg: 27.1,
      defaultFcr: 73.8,
      defaultLatency: 145,
      topIssue: 'Cross-Border Shipment Tracking Lag',
    },
    {
      id: 'Latin America',
      code: 'LATAM',
      name: 'Latin America',
      lat: -14.2,
      lon: -55.0,
      share: 0.07,
      defaultNeg: 25.8,
      defaultFcr: 76.2,
      defaultLatency: 130,
      topIssue: 'Localized Refund Processing Queues',
    },
    {
      id: 'Middle East & Africa',
      code: 'MEA',
      name: 'Middle East & Africa',
      lat: 8.0,
      lon: 28.0,
      share: 0.05,
      defaultNeg: 21.6,
      defaultFcr: 81.0,
      defaultLatency: 98,
      topIssue: 'Mobile Carrier Billing Verification',
    },
  ];

  // Merge live backend data
  const regions = regionalPresets.map((preset) => {
    const live = Array.isArray(regionalData) ? regionalData.find(
      (r) => r.region?.toLowerCase() === preset.id.toLowerCase() || r.region?.toLowerCase() === preset.code.toLowerCase()
    ) : null;

    const vol = live ? (Number(live.total_conversations || live.volume || 0)) : Math.round(totalRecords * preset.share);
    const neg = live ? (Number(live.negative_sentiment_percentage ?? live.negTone ?? preset.defaultNeg)) : preset.defaultNeg;
    const fcr = live ? (Number(live.resolution_rate ?? live.fcr_rate ?? preset.defaultFcr)) : preset.defaultFcr;
    const lat = live ? (Number(live.avg_response_time_minutes ?? live.avg_response_time ?? preset.defaultLatency)) : preset.defaultLatency;

    return {
      ...preset,
      volume: vol > 0 ? vol : Math.round(totalRecords * preset.share),
      negTone: neg,
      fcr: fcr,
      avgLatency: lat,
      status: neg > 26.0 ? 'critical' : neg > 22.0 ? 'elevated' : 'stable',
    };
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'critical':
        return {
          fill: '#f43f5e',
          text: 'text-rose-600',
          dot: 'bg-rose-500',
        };
      case 'elevated':
        return {
          fill: '#f59e0b',
          text: 'text-amber-600',
          dot: 'bg-amber-500',
        };
      default:
        return {
          fill: '#10b981',
          text: 'text-emerald-600',
          dot: 'bg-emerald-500',
        };
    }
  };

  const selectedRegion = filters.region || '';

  // Prepare Plotly Scattergeo Data
  const lats = regions.map((r) => r.lat);
  const lons = regions.map((r) => r.lon);
  const names = regions.map((r) => `<b>${r.code}</b><br>${r.name}`);
  const sizes = regions.map((r) => {
    const isSel = selectedRegion.toLowerCase() === r.id.toLowerCase() || selectedRegion.toLowerCase() === r.code.toLowerCase();
    const base = Math.max(22, Math.min(42, Math.sqrt(r.volume) / 3.2));
    return isSel ? base + 12 : base;
  });
  const colors = regions.map((r) => {
    const isSel = selectedRegion.toLowerCase() === r.id.toLowerCase() || selectedRegion.toLowerCase() === r.code.toLowerCase();
    return getStatusColor(r.status).fill;
  });
  const borderColors = regions.map((r) => {
    const isSel = selectedRegion.toLowerCase() === r.id.toLowerCase() || selectedRegion.toLowerCase() === r.code.toLowerCase();
    return isSel ? '#ffffff' : '#0f172a';
  });
  const borderWidths = regions.map((r) => {
    const isSel = selectedRegion.toLowerCase() === r.id.toLowerCase() || selectedRegion.toLowerCase() === r.code.toLowerCase();
    return isSel ? 3.5 : 2.0;
  });

  const hoverTexts = regions.map(
    (r) =>
      `<b>${r.name}</b><br>` +
      `• Total Volume: <b>${r.volume.toLocaleString()} msgs</b><br>` +
      `• Customer Friction: <b>${r.negTone.toFixed(1)}% Negative</b><br>` +
      `• Resolution (FCR): <b>${r.fcr.toFixed(1)}%</b><br>` +
      `• Avg SLA Latency: <b>${r.avgLatency.toFixed(0)} mins</b><br>` +
      `<i>Click to filter entire dashboard</i>`
  );

  const handlePlotClick = (event) => {
    if (event.points && event.points[0]) {
      const idx = event.points[0].pointIndex;
      const clickedRegion = regions[idx];
      if (clickedRegion) {
        const isSel = selectedRegion.toLowerCase() === clickedRegion.id.toLowerCase() || selectedRegion.toLowerCase() === clickedRegion.code.toLowerCase();
        updateFilter('region', isSel ? '' : clickedRegion.id);
      }
    }
  };

  return (
    <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-5">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white shadow-xs">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <span>Real Geographic World Map & Regional Friction Footprint</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Natural Earth Vector GIS
              </span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Authentic high-resolution world map with interactive regional telemetry hotspots
            </p>
          </div>
        </div>

        {/* Active Filter Indicator */}
        {selectedRegion ? (
          <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-800">
            <span>Filtered Scope: <strong className="text-indigo-950 font-bold">{selectedRegion}</strong></span>
            <button
              onClick={() => updateFilter('region', '')}
              className="text-indigo-500 hover:text-rose-600 font-bold ml-1.5 transition-colors cursor-pointer"
              title="Reset to Global Scope"
            >
              ✕ Clear Filter
            </button>
          </div>
        ) : (
          <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
            <Info className="w-3.5 h-3.5" />
            Showing Global Aggregation
          </span>
        )}
      </div>

      {/* Real High-Definition Plotly Natural Earth World Map */}
      <div className="relative w-full bg-[#0b1120] rounded-2xl overflow-hidden shadow-inner border border-slate-800 min-h-[380px] flex items-center justify-center">
        <Plot
          data={[
            {
              type: 'scattergeo',
              mode: 'markers+text',
              lat: lats,
              lon: lons,
              text: regions.map((r) => r.code),
              textposition: 'middle center',
              textfont: {
                family: 'system-ui, -apple-system, sans-serif',
                size: 10,
                color: '#ffffff',
                weight: 900,
              },
              hoverinfo: 'text',
              hovertext: hoverTexts,
              hoverlabel: {
                bgcolor: '#0f172a',
                bordercolor: '#6366f1',
                font: {
                  family: 'system-ui, -apple-system, sans-serif',
                  size: 12,
                  color: '#ffffff',
                },
              },
              marker: {
                size: sizes,
                color: colors,
                opacity: 0.88,
                line: {
                  color: borderColors,
                  width: borderWidths,
                },
              },
            },
          ]}
          layout={{
            geo: {
              scope: 'world',
              projection: {
                type: 'natural earth',
              },
              showland: true,
              landcolor: '#1e293b',
              showocean: true,
              oceancolor: '#070b14',
              showcountries: true,
              countrycolor: '#334155',
              countrywidth: 0.8,
              showcoastlines: true,
              coastlinecolor: '#475569',
              coastlinewidth: 0.9,
              showsubunits: false,
              showframe: false,
              bgcolor: '#070b14',
            },
            paper_bgcolor: '#070b14',
            plot_bgcolor: '#070b14',
            margin: { l: 0, r: 0, t: 0, b: 0 },
            autosize: true,
            height: 380,
          }}
          config={{
            displayModeBar: false,
            responsive: true,
            scrollZoom: false,
          }}
          onClick={handlePlotClick}
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* 5 Bottom Regional Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {regions.map((reg) => {
          const isSelected = selectedRegion.toLowerCase() === reg.id.toLowerCase() || selectedRegion.toLowerCase() === reg.code.toLowerCase();
          const colors = getStatusColor(reg.status);

          return (
            <button
              key={reg.id}
              onClick={() => updateFilter('region', isSelected ? '' : reg.id)}
              className={`p-4 rounded-xl border text-left flex flex-col justify-between space-y-2.5 transition-all shadow-2xs hover:shadow-xs cursor-pointer ${
                isSelected
                  ? 'bg-indigo-50/90 border-indigo-500 ring-2 ring-indigo-200'
                  : 'bg-white hover:bg-slate-50 border-slate-200/90'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <MapPin className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-indigo-600' : 'text-slate-500'}`} />
                  <span className="font-display font-extrabold text-xs text-slate-900 truncate">
                    {reg.name}
                  </span>
                </div>
                <span className={`w-2 h-2 rounded-full shrink-0 ${colors.dot}`} />
              </div>

              {/* Volume & Negativity Friction */}
              <div className="flex items-baseline justify-between pt-0.5">
                <span className="font-display font-black text-sm text-slate-900">
                  {reg.volume.toLocaleString()} <span className="text-[10px] font-normal text-slate-500">msgs</span>
                </span>
                <span className={`text-xs font-bold ${colors.text}`}>
                  {reg.negTone.toFixed(1)}% Neg
                </span>
              </div>

              {/* SLA & FCR Stats */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600 font-medium">
                <span>FCR: <strong className="text-slate-900 font-bold">{reg.fcr.toFixed(1)}%</strong></span>
                <span>SLA: <strong className="text-slate-900 font-bold">{reg.avgLatency.toFixed(0)}m</strong></span>
              </div>

              {/* Top Issue Footnote */}
              <div className="text-[10px] text-slate-500 truncate" title={reg.topIssue}>
                {reg.topIssue}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default WorldRegionMap;
