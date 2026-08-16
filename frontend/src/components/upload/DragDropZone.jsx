import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Sparkles, FileSpreadsheet, ShieldCheck } from 'lucide-react';
import { uploadApi } from '../../api/upload';
import { useRun } from '../../context/RunContext';

export function DragDropZone({ onUploadSuccess }) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [error, setError] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const { refetchRuns } = useRun();

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
    setUploadProgress(15);

    try {
      const res = await uploadApi.uploadFile(file, (percent) => {
        setUploadProgress(percent);
      });

      setUploadProgress(100);
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(null);
        refetchRuns();
        if (onUploadSuccess) onUploadSuccess(res.run_id);
      }, 800);
    } catch (err) {
      console.error('[Upload error]:', err);
      setIsUploading(false);
      setUploadProgress(null);
      setError(err.response?.data?.detail || 'Upload failed. Please check server logs.');
    }
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
          <UploadCloud className={`w-5 h-5 text-indigo-600 dark:text-indigo-400 ${isUploading ? 'animate-bounce' : ''}`} />
        </div>

        <h4 className="font-display font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
          {isUploading ? 'Ingesting Dataset & Parsing Schema...' : 'Drag & drop your CSV or click to browse'}
        </h4>
        <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-1">
          Max file size 500MB · Automatic column mapping
        </p>

        {isUploading && uploadProgress !== null && (
          <div className="w-full max-w-xs mt-3 space-y-1">
            <div className="w-full h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 transition-all duration-300 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-bold block">
              {uploadProgress}% Ingested
            </span>
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
