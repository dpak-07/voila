import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Sparkles, FileSpreadsheet, ShieldCheck, HardDrive, Zap, Clock } from 'lucide-react';
import { uploadApi } from '../../api/upload';
import { useRun } from '../../context/RunContext';

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatSpeed(bytesPerSec) {
  if (bytesPerSec < 1024) return `${Math.round(bytesPerSec)} B/s`;
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
  return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
}

export function DragDropZone({ onUploadSuccess }) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [error, setError] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [fileInfo, setFileInfo] = useState(null);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [phase, setPhase] = useState(null); // 'uploading' | 'processing' | null
  const fileInputRef = useRef(null);
  const { refetchRuns } = useRun();
  const startTimeRef = useRef(null);
  const lastLoadedRef = useRef(0);
  const lastTimeRef = useRef(null);

  // Tick elapsed timer during upload
  useEffect(() => {
    if (!phase) return;
    const interval = setInterval(() => {
      if (startTimeRef.current) {
        setElapsedSec((Date.now() - startTimeRef.current) / 1000);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file) => {
    if (!file.name.match(/\.(csv|xlsx|xls|parquet)$/i)) {
      setError('Please upload a valid CSV, Excel, or Parquet dataset.');
      return;
    }

    setError(null);
    setIsUploading(true);
    setPhase('uploading');
    setUploadProgress(0);
    setUploadSpeed(0);
    setElapsedSec(0);
    startTimeRef.current = Date.now();
    lastLoadedRef.current = 0;
    lastTimeRef.current = Date.now();
    setFileInfo({ name: file.name, size: file.size });

    try {
      const res = await uploadApi.uploadFile(file, (percent) => {
        setUploadProgress(percent);

        // Calculate upload speed
        const now = Date.now();
        const elapsed = (now - (lastTimeRef.current || now)) / 1000;
        if (elapsed > 0.3) {
          const loaded = (percent / 100) * file.size;
          const delta = loaded - lastLoadedRef.current;
          setUploadSpeed(delta / elapsed);
          lastLoadedRef.current = loaded;
          lastTimeRef.current = now;
        }
      });

      setUploadProgress(100);
      setPhase('processing');
      setUploadSpeed(0);

      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(null);
        setPhase(null);
        setFileInfo(null);
        setElapsedSec(0);
        refetchRuns();
        if (onUploadSuccess) onUploadSuccess(res.run_id);
      }, 800);
    } catch (err) {
      console.error('[Upload error]:', err);
      setIsUploading(false);
      setUploadProgress(null);
      setPhase(null);
      setFileInfo(null);
      setElapsedSec(0);
      setError(err.response?.data?.detail || 'Upload failed. Please check server logs.');
    }
  };

  const formatElapsed = (sec) => {
    if (sec < 1) return '<1s';
    if (sec < 60) return `${Math.floor(sec)}s`;
    return `${Math.floor(sec / 60)}m ${Math.floor(sec % 60)}s`;
  };

  return (
    <div className="h-full flex flex-col justify-between p-5 rounded-3xl glass-card border border-slate-200/90 dark:border-white/10 shadow-lg space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-display font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
            <UploadCloud className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Upload Dataset
          </span>
          <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-[10px] font-mono font-bold">
            CSV / Parquet
          </span>
        </div>
        <p className="text-[11px] font-sans text-slate-500 dark:text-slate-400">
          Upload customer conversation exports. Supports Twitter, Zendesk, Salesforce, and custom schemas.
        </p>
      </div>

      {/* Drop Zone Box */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`p-6 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center relative overflow-hidden flex flex-col items-center justify-center min-h-[160px] ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
            : isUploading
            ? 'border-indigo-400 bg-indigo-50/30 dark:bg-indigo-950/20'
            : 'border-slate-300 dark:border-white/15 hover:border-indigo-500 bg-slate-50/50 dark:bg-slate-950/50 hover:bg-slate-100/50 dark:hover:bg-slate-900/60'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".csv,.xlsx,.xls,.parquet"
          className="hidden"
        />

        <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center mb-2.5 shadow-2xs">
          {phase === 'processing' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 animate-pulse" />
          ) : (
            <UploadCloud className={`w-5 h-5 text-indigo-600 dark:text-indigo-400 ${isUploading ? 'animate-bounce' : ''}`} />
          )}
        </div>

        <h4 className="font-display font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
          {phase === 'processing'
            ? 'Upload complete — Pipeline processing...'
            : isUploading
            ? 'Uploading Dataset...'
            : 'Drag & drop your CSV or click to browse'}
        </h4>
        <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-1">
          Max file size 500MB · Automatic column mapping
        </p>

        {/* File info + progress */}
        {isUploading && fileInfo && (
          <div className="w-full max-w-xs mt-3 space-y-1.5">
            {/* File details bar */}
            <div className="flex items-center justify-center gap-3 text-[10px] font-mono text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <HardDrive className="w-3 h-3" />
                {formatFileSize(fileInfo.size)}
              </span>
              {phase === 'uploading' && uploadSpeed > 0 && (
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3 text-indigo-500" />
                  {formatSpeed(uploadSpeed)}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatElapsed(elapsedSec)}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  phase === 'processing'
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                    : 'bg-indigo-600'
                }`}
                style={{ width: `${uploadProgress}%` }}
              />
            </div>

            {/* Progress text */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                {phase === 'processing'
                  ? 'Processing...'
                  : `${uploadProgress}% Uploaded`
                }
              </span>
              {phase === 'uploading' && uploadSpeed > 0 && fileInfo.size > 0 && (
                <span className="text-[10px] font-mono text-slate-400">
                  {formatFileSize(Math.max(0, (uploadProgress / 100) * fileInfo.size - 0))} / {formatFileSize(fileInfo.size)}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-mono flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Schema Guarantee Badge */}
      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-100 dark:border-white/10">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          Auto-resolves text & timestamp
        </span>
        <span>Asynchronous Vectorization</span>
      </div>
    </div>
  );
}

export default DragDropZone;
