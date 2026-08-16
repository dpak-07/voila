import React from 'react';
import { Layers, Globe, Package, TrendingUp, AlertTriangle } from 'lucide-react';
import { EmptyDiagnostic } from '../common/EmptyDiagnostic';

export function DimensionMatrix({ dimensionBreakdowns = {} }) {
  const byProduct = Array.isArray(dimensionBreakdowns?.by_product) ? dimensionBreakdowns.by_product : [];
  const byRegion = Array.isArray(dimensionBreakdowns?.by_region) ? dimensionBreakdowns.by_region : [];

  const maxProductVol = Math.max(...byProduct.map(p => p.count ?? p.total_conversations ?? p.volume ?? 0), 1);
  const maxRegionVol = Math.max(...byRegion.map(r => r.count ?? r.total_conversations ?? r.volume ?? 0), 1);

  const hasDimensions = byProduct.length > 0 || byRegion.length > 0;

  const productColors = [
    'from-indigo-500 to-blue-500',
    'from-violet-500 to-purple-500',
    'from-emerald-500 to-teal-500',
    'from-amber-500 to-orange-500',
    'from-rose-500 to-pink-500',
    'from-cyan-500 to-sky-500',
  ];

  const regionColors = [
    'from-emerald-500 to-green-600',
    'from-indigo-500 to-violet-600',
    'from-cyan-500 to-blue-600',
    'from-amber-500 to-yellow-600',
    'from-rose-500 to-red-600',
    'from-purple-500 to-fuchsia-600',
  ];

  return (
    <div className="p-6 rounded-2xl glass-card space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
        <div>
          <h3 className="font-display font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30">
              <Layers className="w-4 h-4" />
            </span>
            <span>Dimensional Breakdown & Category Slicing</span>
          </h3>
          <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
            Categorical decomposition across product lines and geographic customer regions
          </p>
        </div>
      </div>

      {!hasDimensions ? (
        <EmptyDiagnostic
          title="No Product or Region Metadata in Active Run"
          message="The current CSV/database ingestion does not include 'product' or 'region' columns. Categorical slicing requires ingestion of these attributes."
          requiredFields={["product", "region"]}
          compact={false}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* By Product */}
          <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-display font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Package className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Product Line Segmentation</span>
              </h4>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                {byProduct.length} products
              </span>
            </div>

            <div className="space-y-2.5">
              {byProduct.map((p, idx) => {
                const name = p.product || p.name || p.key || 'Unknown Product';
                const count = p.count ?? p.total_conversations ?? p.volume ?? 0;
                const negTone = p.negative_sentiment_percentage ?? p.neg_rate ?? null;
                const pct = Math.round((count / maxProductVol) * 100);
                const gradient = productColors[idx % productColors.length];

                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">{name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600 dark:text-slate-400">{count.toLocaleString()} msgs</span>
                        {negTone !== null && (
                          <span className="text-rose-600 dark:text-rose-400 font-bold">
                            {negTone.toFixed(1)}% Neg
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${gradient}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* By Region */}
          <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-display font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Geographic Territory Distribution</span>
              </h4>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                {byRegion.length} territories
              </span>
            </div>

            <div className="space-y-2.5">
              {byRegion.map((r, idx) => {
                const name = r.region || r.name || r.key || 'Global Territory';
                const count = r.count ?? r.total_conversations ?? r.volume ?? 0;
                const negTone = r.negative_sentiment_percentage ?? r.neg_rate ?? null;
                const pct = Math.round((count / maxRegionVol) * 100);
                const gradient = regionColors[idx % regionColors.length];

                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">{name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600 dark:text-slate-400">{count.toLocaleString()} msgs</span>
                        {negTone !== null && (
                          <span className="text-rose-600 dark:text-rose-400 font-bold">
                            {negTone.toFixed(1)}% Neg
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${gradient}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DimensionMatrix;
