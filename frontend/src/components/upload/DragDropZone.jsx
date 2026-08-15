import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
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
    if (!file.name.match(/\.(csv|xlsx|xls)$/i)) {
      setError('Please upload a valid CSV or Excel dataset (.csv, .xlsx, .xls).');
      return;
    }

    setError(null);
    setIsUploading(true);
    setUploadProgress(10);

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
      }, 1000);
    } catch (err) {
      console.error('[Upload error]:', err);
      setIsUploading(false);
      setUploadProgress(null);
      setError(err.response?.data?.detail || 'Upload failed. Please check server logs.');
    }
  };

  return (
    <div className="w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center relative overflow-hidden ${
          isDragging
            ? 'border-zinc-400 bg-zinc-900/90'
            : isUploading
            ? 'border-zinc-500 bg-zinc-900/90'
            : 'border-zinc-800 hover:border-zinc-600 bg-zinc-950/60 hover:bg-zinc-900/80'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".csv,.xlsx,.xls"
          className="hidden"
        />

        <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center mx-auto mb-4 shadow-sm">
          {isUploading ? (
            <UploadCloud className="w-7 h-7 text-zinc-200 animate-bounce" />
          ) : (
            <UploadCloud className="w-7 h-7 text-zinc-100" />
          )}
        </div>

        <h3 className="font-display font-bold text-lg text-zinc-100 mb-1">
          {isUploading ? 'Ingesting Dataset & Launching In-Memory Pipeline...' : 'Drag & drop customer dataset CSV'}
        </h3>
        <p className="text-xs font-mono text-zinc-400 max-w-md mx-auto leading-relaxed">
          Supports multi-million row social-support exports. Automatically resolves Kaggle Twitter, Zendesk, and custom schemas.
        </p>

        {/* Upload Progress Bar */}
        {uploadProgress !== null && (
          <div className="mt-6 max-w-sm mx-auto">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-200 mb-1.5 font-bold">
              <span>Syncing to S3 & Parsing...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-zinc-950 overflow-hidden border border-zinc-800">
              <div
                className="h-full bg-zinc-100 transition-all duration-300 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error notification */}
        {error && (
          <div className="mt-4 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default DragDropZone;
