import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Zap, 
  Cpu, 
  Activity, 
  HardDrive, 
  CheckCircle, 
  Play, 
  Sparkles, 
  ArrowRight, 
  Layers,
  RefreshCw
} from 'lucide-react';
import { analyticsApi } from '../../api/analytics';

export function LiveStreamingProgressBanner() {
  const queryClient = useQueryClient();
  const [isLaunching, setIsLaunching] = useState(false);
  const [activeStreamId, setActiveStreamId] = useState(null);

  // Poll current stream status only when actively streaming
  const { data: streamData, refetch } = useQuery({
    queryKey: ['live_stream_status', activeStreamId],
    queryFn: () => analyticsApi.getStreamStatus(activeStreamId || 'latest'),
    refetchInterval: (query) => {
      const stream = query.state.data?.stream;
      return stream?.status === 'streaming' ? 1000 : false;
    },
    staleTime: 30000,
  });

  const stream = streamData?.stream || {};
  const isStreaming = stream.status === 'streaming';
  const isCompleted = stream.status === 'completed';

  // Invalidate dashboard queries upon completion
  useEffect(() => {
    if (isCompleted) {
      queryClient.invalidateQueries({ queryKey: ['analytics_kpis'] });
      queryClient.invalidateQueries({ queryKey: ['dataset_runs'] });
    }
  }, [isCompleted, queryClient]);

  const handleLaunchStreamingDemo = async () => {
    try {
      setIsLaunching(true);
      const res = await analyticsApi.triggerBenchmarkStream(20000);
      if (res.run_id) {
        setActiveStreamId(res.run_id);
        refetch();
      }
    } catch (err) {
      console.error('Failed to trigger stream:', err);
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 text-white shadow-lg space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-600/80 border border-indigo-400/30 text-white shadow-md shadow-indigo-500/20">
            <Zap className={`w-5 h-5 ${isStreaming ? 'animate-bounce text-amber-300' : 'text-indigo-200'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-black text-sm text-white tracking-tight">
                Progressive Streaming Engine
              </h3>
              {isStreaming ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-mono font-bold flex items-center gap-1.5 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  LIVE STREAMING ACTIVE
                </span>
              ) : isCompleted ? (
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 text-[10px] font-mono font-bold flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                  STREAMING SYNCED
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-mono font-bold">
                  STREAMING
                </span>
              )}
            </div>
            <p className="text-xs font-mono text-slate-400 mt-0.5">
              Processes data in chunks and updates dashboard in real-time
            </p>
          </div>
        </div>

        {/* Action Trigger Button */}
        <button
          onClick={handleLaunchStreamingDemo}
          disabled={isLaunching || isStreaming}
          className={`px-4 py-2 rounded-xl font-mono text-xs font-bold flex items-center gap-2 transition-all shadow-md ${
            isStreaming
              ? 'bg-emerald-600/40 text-emerald-200 border border-emerald-500/40 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400/30 hover:shadow-indigo-500/25 active:scale-95'
          }`}
        >
          {isStreaming ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Streaming 100k Dataset...</span>
            </>
          ) : isLaunching ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Starting Stream...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Launch 100k Streaming Demo</span>
            </>
          )}
        </button>
      </div>

      {/* Live Progress Bar & Telemetry */}
      {(isStreaming || isCompleted) && (
        <div className="pt-2 border-t border-indigo-900/60 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="font-bold text-indigo-300">
                Chunk #{stream.current_chunk || 1}
              </span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-200 font-bold">
                {(stream.processed_records || 0).toLocaleString()} / {(stream.total_records || 0).toLocaleString()} rows
              </span>
              <span className="text-slate-400">({stream.progress_percentage || 0}%)</span>
            </div>

            <div className="flex items-center gap-4 text-[11px] text-slate-300">
              <span className="flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-amber-400" />
                <span>Speed: <strong className="text-white">~{(stream.speed_rows_per_sec || 0).toLocaleString()} rows/s</strong></span>
              </span>
              <span className="flex items-center gap-1">
                <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                <span>Memory: <strong className="text-cyan-300">{stream.memory_mb || 0} MB</strong></span>
              </span>
            </div>
          </div>

          {/* Animated Progress Bar */}
          <div className="w-full bg-slate-800/80 rounded-full h-2.5 overflow-hidden border border-slate-700">
            <div
              className="bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 h-2.5 rounded-full transition-all duration-300 shadow-sm"
              style={{ width: `${Math.max(5, stream.progress_percentage || 0)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default LiveStreamingProgressBanner;
