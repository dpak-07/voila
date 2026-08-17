import React, { useState, useMemo } from 'react';
import Plot from '../common/Plot';
import { 
  Globe, 
  MapPin, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  ShieldAlert, 
  Filter, 
  Info,
  ChevronRight,
  Sparkles,
  Layers
} from 'lucide-react';
import { useRun } from '../../context/RunContext';

export function UnifiedRegionalIntelligence({ regionData = [], totalRecords = 0 }) {
  const { filters, updateFilter } = useRun();
  const [hoveredRegion, setHoveredRegion] = useState(null);
  const [viewMode, setViewMode] = useState('map'); // 'map' | 'table'

  const regionalPresets = [
    {
      id: 'North America',
      code: 'NA',
      name: 'North America',
      alias: ['us-east', 'us-west', 'north america', 'na', 'usa'],
      lat: 39.0, lon: -98.0,
      flag: '🇺🇸', color: '#6366f1',
    },
    {
      id: 'Europe',
      code: 'EU',
      name: 'Europe (EMEA)',
      alias: ['emea-uk', 'emea-germany', 'europe', 'emea', 'uk', 'germany'],
      lat: 51.0, lon: 14.0,
      flag: '🇪🇺', color: '#3b82f6',
    },
    {
      id: 'Asia Pacific',
      code: 'APAC',
      name: 'Asia Pacific',
      alias: ['apac-singapore', 'apac-india', 'asia pacific', 'apac', 'asia', 'india', 'singapore'],
      lat: 22.0, lon: 98.0,
      flag: '🌏', color: '#f59e0b',
    },
    {
      id: 'Latin America',
      code: 'LATAM',
      name: 'Latin America',
      alias: ['latam-brazil', 'latin america', 'latam', 'brazil'],
      lat: -14.2, lon: -51.9,
      flag: '🇧🇷', color: '#10b981',
    },
    {
      id: 'Middle East & Africa',
      code: 'MEA',
      name: 'Middle East & Africa',
      alias: ['mea-uae', 'middle east', 'mea', 'uae', 'africa'],
      lat: 24.0, lon: 45.0,
      flag: '🇦🇪', color: '#ec4899',
    },
  ];

  // Merge live backend dimensional aggregates with regional presets
  const regions = useMemo(() => {
    const rawArray = Array.isArray(regionData) ? regionData : [];

    return regionalPresets.map((preset) => {
      const match = rawArray.find((r) => {
        const name = (r.region || r.name || r.key || '').toLowerCase();
        return (
          name === preset.id.toLowerCase() ||
          name === preset.code.toLowerCase() ||
          preset.alias.some((a) => name.includes(a))
        );
      });

      if (!match) {
        return { ...preset, volume: 0, negTone: 0, fcr: 0, avgLatency: 0, hasData: false };
      }

      const volume = Number(match.volume || match.count || match.total_records || match.value || 0);
      const negTone = Number(match.negative_sentiment_percentage || match.negative_percentage || match.neg_pct || 0);
      const fcr = Number(match.fcr_rate || match.resolution_rate || 0);
      const avgLatency = Number(match.avg_response_time || match.avg_response_time_minutes || 0);

      return {
        ...preset,
        volume: Math.round(volume),
        negTone: Number(negTone.toFixed(1)),
        fcr: Number(fcr.toFixed(1)),
        avgLatency: Math.round(avgLatency),
        hasData: true,
      };
    });
  }, [regionData]);

  const totalRegionalVolume = useMemo(() => {
    return regions.reduce((acc, r) => acc + (r.volume ?? 0), 0);
  }, [regions]);

  const selectedRegion = filters.region || '';

  const handleRegionClick = (regionId) => {
    if (selectedRegion.toLowerCase() === regionId.toLowerCase()) {
      updateFilter('region', '');
    } else {
      updateFilter('region', regionId);
    }
  };

  const activeDetail = useMemo(() => {
    if (hoveredRegion) return hoveredRegion;
    if (selectedRegion) {
      const found = regions.find(
        (r) =>
          r.id.toLowerCase() === selectedRegion.toLowerCase() ||
          r.code.toLowerCase() === selectedRegion.toLowerCase()
      );
      if (found) return found;
    }
    return regions[0] || regionalPresets[0];
  }, [hoveredRegion, selectedRegion, regions]);

  // Construct Plotly Scattergeo Data
  const plotlyMapData = useMemo(() => {
    const lats = regions.map((r) => r.lat);
    const lons = regions.map((r) => r.lon);
    const names = regions.map((r) => r.name);
    const sizes = regions.map((r) => {
      const isSel = selectedRegion.toLowerCase() === r.id.toLowerCase() || selectedRegion.toLowerCase() === r.code.toLowerCase();
      const baseSize = Math.max(16, Math.min(34, Math.sqrt(r.volume) / 5.5));
      return isSel ? baseSize * 1.35 : baseSize;
    });

    const colors = regions.map((r) => {
      const isSel = selectedRegion.toLowerCase() === r.id.toLowerCase() || selectedRegion.toLowerCase() === r.code.toLowerCase();
      return isSel ? '#ffffff' : r.color;
    });

    const hoverTexts = regions.map(
      (r) =>
        `<b>${r.flag} ${r.name} Support Territory</b><br>` +
        `• Volume: <b>${(r.volume ?? 0).toLocaleString()} conversations</b> (${Math.round(((r.volume ?? 0) / Math.max(1, totalRegionalVolume)) * 100)}%)<br>` +
        `• Friction Rate: <b>${r.negTone ?? 0}% Negative</b><br>` +
        `• Resolution (FCR): <b>${r.fcr ?? 0}%</b><br>` +
        `• SLA Speed: <b>${r.avgLatency ?? 0}m avg latency</b><br>` +
        `• Primary Hotspot: <i>${r.topIssue || 'N/A'}</i>`
    );

    return [
      {
        type: 'scattergeo',
        mode: 'markers+text',
        lat: lats,
        lon: lons,
        text: names,
        textposition: ['top center', 'bottom center', 'top center', 'bottom center', 'top center'],
        textfont: {
          family: 'Plus Jakarta Sans, sans-serif',
          size: 11,
          color: '#ffffff',
          weight: 'bold',
        },
        hoverinfo: 'text',
        hovertext: hoverTexts,
        hoverlabel: {
          bgcolor: '#0f172a',
          bordercolor: '#475569',
          font: { color: '#ffffff', family: 'system-ui, sans-serif', size: 11 },
        },
        marker: {
          size: sizes,
          color: colors,
          opacity: 0.95,
          line: {
            color: '#ffffff',
            width: 2.5,
          },
        },
      },
    ];
  }, [regions, selectedRegion, totalRegionalVolume]);

  const plotlyMapLayout = useMemo(() => {
    return {
      geo: {
        scope: 'world',
        projection: {
          type: 'natural earth',
        },
        showland: true,
        landcolor: '#1e293b',
        showocean: true,
        oceancolor: '#07090e',
        showcountries: true,
        countrycolor: '#334155',
        countrywidth: 0.8,
        showcoastlines: true,
        coastlinecolor: '#475569',
        coastlinewidth: 1,
        showlakes: true,
        lakecolor: '#07090e',
        bgcolor: '#07090e',
        lataxis: {
          range: [-48, 72],
          showgrid: false,
        },
        lonaxis: {
          range: [-135, 145],
          showgrid: false,
        },
      },
      margin: { l: 0, r: 0, t: 0, b: 0 },
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      dragmode: false,
      autosize: true,
    };
  }, []);

  return (
    <div className="p-6 rounded-2xl glass-card space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-xs">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <span>Geographic Friction Footprint & Regional SLA Breakdown</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                5 Geographic Support Regions
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Regional customer conversation volume, response latency, and negative friction share across operating support territories
            </p>
          </div>
        </div>

        {/* Global Filter Indicator / Reset */}
        <div className="flex items-center gap-2 flex-wrap">
          {selectedRegion ? (
            <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-indigo-800 dark:text-indigo-200 shadow-2xs">
              <span>Filtered by Region: <strong className="text-indigo-950 dark:text-white font-bold">{selectedRegion}</strong></span>
              <button
                onClick={() => updateFilter('region', '')}
                className="text-indigo-500 hover:text-rose-600 dark:hover:text-rose-400 font-bold ml-1.5 transition-colors cursor-pointer"
                title="Reset to All Regions"
              >
                ✕ Reset to All Regions
              </button>
            </div>
          ) : (
            <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-white/[0.04] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              All Support Regions Total: <strong className="text-slate-900 dark:text-white">{totalRegionalVolume.toLocaleString()} msgs</strong>
            </span>
          )}

          {/* View Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-white/[0.04] p-1 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-mono">
            <button
              onClick={() => setViewMode('map')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                viewMode === 'map' ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-2xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              World Map View
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-2xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              Regional Table
            </button>
          </div>
        </div>
      </div>

      {/* Main Container: Map View OR Table View */}
      {viewMode === 'map' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left Column: Natural Earth Geographic World Map */}
          <div className="lg:col-span-7 bg-[#07090e] rounded-2xl p-4 border border-slate-800 dark:border-white/10 shadow-xl flex flex-col justify-between min-h-[440px] relative overflow-hidden select-none">
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono pb-2 border-b border-slate-800/80">
              <span className="flex items-center gap-2 text-slate-200 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Regional Telemetry Hotspots
              </span>
              <span className="text-indigo-400 text-[11px]">Click any regional node to filter dashboard</span>
            </div>

            {/* Plotly GIS Map */}
            <div className="relative w-full h-[320px] sm:h-[350px] my-1">
              <Plot
                data={plotlyMapData}
                layout={plotlyMapLayout}
                config={{
                  displayModeBar: false,
                  responsive: true,
                  typesetMath: false,
                }}
                useResizeHandler={true}
                style={{ width: '100%', height: '100%' }}
                onClick={(e) => {
                  if (e.points && e.points.length > 0) {
                    const pointIndex = e.points[0].pointIndex;
                    if (regions[pointIndex]) {
                      handleRegionClick(regions[pointIndex].id);
                    }
                  }
                }}
                onHover={(e) => {
                  if (e.points && e.points.length > 0) {
                    const pointIndex = e.points[0].pointIndex;
                    if (regions[pointIndex]) {
                      setHoveredRegion(regions[pointIndex]);
                    }
                  }
                }}
              />
            </div>

            {/* Bottom HUD Telemetry Strip */}
            <div className="bg-slate-900/95 dark:bg-slate-950/90 rounded-xl p-3.5 border border-slate-800 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <span className="text-base">{activeDetail.flag}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-white font-display font-bold text-sm">{activeDetail.name} Region</strong>
                    <span className="text-slate-400 font-mono text-[11px]">({activeDetail.volume.toLocaleString()} msgs)</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">{activeDetail.subMarkets}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 font-mono text-xs">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Friction Rate</span>
                  <strong className="text-rose-400 font-bold">{activeDetail.negTone}% Neg</strong>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Resolution FCR</span>
                  <strong className="text-emerald-400 font-bold">{activeDetail.fcr}%</strong>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Mean Latency</span>
                  <strong className="text-amber-400 font-bold">{activeDetail.avgLatency}m SLA</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Ranked Regional Support Cards */}
          <div className="lg:col-span-5 space-y-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 px-1">
              <span>Geographic Support Regions</span>
              <span>Ticket Volume & Friction</span>
            </div>

            {regions.map((reg) => {
              const isSelected = selectedRegion.toLowerCase() === reg.id.toLowerCase() || selectedRegion.toLowerCase() === reg.code.toLowerCase();
              const pctShare = Math.round((reg.volume / Math.max(1, totalRegionalVolume)) * 100);

              return (
                <div
                  key={reg.id}
                  onClick={() => handleRegionClick(reg.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer shadow-xs ${
                    isSelected
                      ? 'bg-indigo-50/95 dark:bg-indigo-600/20 border-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-500/30'
                      : 'bg-white/80 dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-white/[0.04] border-slate-200 dark:border-white/10'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm">{reg.flag}</span>
                      <span className="font-display font-extrabold text-xs text-slate-900 dark:text-white truncate">
                        {reg.name}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-bold px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10">
                        {pctShare}%
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <strong className="font-display font-black text-xs text-slate-900 dark:text-white">
                        {reg.volume.toLocaleString()} msgs
                      </strong>
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold border font-mono"
                        style={{
                          backgroundColor: `${reg.color}15`,
                          color: reg.color,
                          borderColor: `${reg.color}40`,
                        }}
                      >
                        {reg.negTone}% Neg
                      </span>
                    </div>
                  </div>

                  {/* 3 Pillar SLA & FCR Badges */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-white/10 text-[11px] font-mono">
                    <div className="bg-slate-50/80 dark:bg-slate-950/60 p-1.5 rounded-xl border border-slate-100 dark:border-white/10">
                      <span className="text-[9px] text-slate-500 dark:text-slate-400 block uppercase font-bold">SLA Latency</span>
                      <strong className="text-slate-900 dark:text-slate-200">{reg.avgLatency}m</strong>
                    </div>
                    <div className="bg-slate-50/80 dark:bg-slate-950/60 p-1.5 rounded-xl border border-slate-100 dark:border-white/10">
                      <span className="text-[9px] text-slate-500 dark:text-slate-400 block uppercase font-bold">Resolution FCR</span>
                      <strong className="text-emerald-700 dark:text-emerald-400">{reg.fcr}%</strong>
                    </div>
                    <div className="bg-slate-50/80 dark:bg-slate-950/60 p-1.5 rounded-xl border border-slate-100 dark:border-white/10 min-w-0">
                      <span className="text-[9px] text-slate-500 dark:text-slate-400 block uppercase font-bold">Top Hotspot</span>
                      <span className="text-[10px] text-slate-700 dark:text-slate-300 font-bold truncate block" title={reg.topIssue}>
                        {reg.topIssue}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Table View */
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-slate-50 dark:bg-white/[0.02] text-slate-700 dark:text-slate-300 font-mono text-[11px] uppercase border-b border-slate-200 dark:border-white/10">
              <tr>
                <th className="p-3.5 font-bold">Support Region</th>
                <th className="p-3.5 font-bold">Operating Sub-Regions</th>
                <th className="p-3.5 font-bold">Conversation Volume</th>
                <th className="p-3.5 font-bold">Volume Share</th>
                <th className="p-3.5 font-bold">Negative Tone (%)</th>
                <th className="p-3.5 font-bold">FCR Resolution (%)</th>
                <th className="p-3.5 font-bold">Mean SLA Latency</th>
                <th className="p-3.5 font-bold">Primary Friction Hotspot</th>
                <th className="p-3.5 font-bold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-mono">
              {regions.map((reg) => (
                <tr
                  key={reg.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors"
                >
                  <td className="p-3.5 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{reg.flag}</span>
                    <span>{reg.name}</span>
                  </td>
                  <td className="p-3.5 text-slate-600 dark:text-slate-400 font-sans text-xs">{reg.subMarkets}</td>
                  <td className="p-3.5 font-bold text-slate-900 dark:text-white">{reg.volume.toLocaleString()}</td>
                  <td className="p-3.5 text-slate-700 dark:text-slate-300">{Math.round((reg.volume / Math.max(1, totalRegionalVolume)) * 100)}%</td>
                  <td className="p-3.5 font-bold text-rose-600 dark:text-rose-400">{reg.negTone}%</td>
                  <td className="p-3.5 font-bold text-emerald-600 dark:text-emerald-400">{reg.fcr}%</td>
                  <td className="p-3.5 text-slate-800 dark:text-slate-200">{reg.avgLatency}m</td>
                  <td className="p-3.5 text-slate-700 dark:text-slate-300 font-sans text-xs">{reg.topIssue}</td>
                  <td className="p-3.5 text-center">
                    <button
                      onClick={() => handleRegionClick(reg.id)}
                      className="px-3 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-500/30 text-xs font-bold transition-colors cursor-pointer"
                    >
                      {selectedRegion.toLowerCase() === reg.id.toLowerCase() ? 'Clear' : 'Filter'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default UnifiedRegionalIntelligence;
