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
    <div className="p-6 rounded-2xl signal-card space-y-4 border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div>
          <h3 className="font-display font-extrabold text-base text-slate-900 flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200">
              <Layers className="w-4 h-4" />
            </span>
            <span>Dimensional Breakdown & Category Slicing</span>
          </h3>
          <p className="text-xs font-mono text-slate-500">
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
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-display font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span className="p-1 rounded bg-indigo-100 text-indigo-700">
                  <Package className="w-3.5 h-3.5" />
                </span>
                <span>Volume by Product</span>
              </h4>
              <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                {byProduct.length} Products
              </span>
            </div>

            {byProduct.length === 0 ? (
              <EmptyDiagnostic title="No Product Dimension" message="Column 'product' not detected." compact={true} />
            ) : (
              <div className="space-y-2.5">
                {byProduct.map((p, idx) => {
                  const count = p.count ?? p.total_conversations ?? p.volume ?? 0;
                  const pct = Math.round((count / maxProductVol) * 100);
                  const negRate = p.negative_sentiment_percentage ?? 0;
                  const gradColor = productColors[idx % productColors.length];

                  return (
                    <div key={idx} className="p-3 rounded-xl bg-white border border-slate-200 font-mono text-xs shadow-2xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-900 font-bold capitalize text-xs">{p.product || p.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{count.toLocaleString()} msgs</span>
                          {negRate > 0 && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${negRate > 20 ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-700'}`}>
                              {negRate}% Neg
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Colorful Progress Bar */}
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full bg-gradient-to-r ${gradColor} transition-all duration-500`}
                          style={{ width: `${Math.max(5, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* By Region */}
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-display font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span className="p-1 rounded bg-emerald-100 text-emerald-700">
                  <Globe className="w-3.5 h-3.5" />
                </span>
                <span>Volume by Geographic Region</span>
              </h4>
              <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {byRegion.length} Regions
              </span>
            </div>

            {byRegion.length === 0 ? (
              <EmptyDiagnostic title="No Region Dimension" message="Column 'region' not detected." compact={true} />
            ) : (
              <div className="space-y-2.5">
                {byRegion.map((r, idx) => {
                  const count = r.count ?? r.total_conversations ?? r.volume ?? 0;
                  const pct = Math.round((count / maxRegionVol) * 100);
                  const negRate = r.negative_sentiment_percentage ?? 0;
                  const gradColor = regionColors[idx % regionColors.length];

                  return (
                    <div key={idx} className="p-3 rounded-xl bg-white border border-slate-200 font-mono text-xs shadow-2xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-900 font-bold capitalize text-xs">{r.region || r.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{count.toLocaleString()} msgs</span>
                          {negRate > 0 && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${negRate > 20 ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-700'}`}>
                              {negRate}% Neg
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Colorful Progress Bar */}
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full bg-gradient-to-r ${gradColor} transition-all duration-500`}
                          style={{ width: `${Math.max(5, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default DimensionMatrix;
