import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import confetti from 'canvas-confetti';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  X,
  AlertCircle,
  Sparkles,
  Database,
  ArrowRight,
} from 'lucide-react';

export const UploadDatasetModal: React.FC = () => {
  const { isUploadModalOpen, setIsUploadModalOpen, addToast, refreshData, setRunId } = useApp();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isUploadModalOpen) return null;

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const dropped = e.dataTransfer.files[0];
      if (dropped.name.endsWith('.csv') || dropped.name.endsWith('.xlsx') || dropped.name.endsWith('.xls')) {
        setFile(dropped);
      } else {
        addToast('Unsupported File', 'Please upload a .csv or .xlsx dataset file', 'warning');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = async () => {
    if (!file) {
      addToast('No File Selected', 'Please select a CSV or Excel dataset to upload', 'warning');
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      addToast('Ingestion Launched', `Processing ${file.name} through PostgreSQL, Snowflake & RAG pipeline...`, 'info');
      const response = await api.uploadDataset(file, (pct) => {
        setUploadProgress(Math.min(95, pct));
      });

      setUploadProgress(100);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      addToast('Upload Complete!', `Dataset ${file.name} successfully ingested.`, 'success');
      if (response?.run_id) {
        setRunId(response.run_id);
      }

      await refreshData();
      setTimeout(() => {
        setIsUploadModalOpen(false);
        setFile(null);
        setUploadProgress(0);
      }, 1200);
    } catch (err: any) {
      console.error(err);
      addToast('Ingestion Error', err.response?.data?.detail || 'Failed to upload dataset', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Upload New Support Dataset
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Streams to PostgreSQL, Snowflake &amp; Qdrant Vector RAG
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (!isUploading) setIsUploadModalOpen(false);
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drag & Drop Box */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleFileDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`p-6 rounded-2xl border-2 border-dashed text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-blue-500 bg-blue-50/70'
              : file
              ? 'border-emerald-400 bg-emerald-50/40'
              : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv,.xlsx,.xls"
            className="hidden"
          />

          {file ? (
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-sm">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">{file.name}</p>
                <p className="text-xs text-slate-500 font-mono">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB • Ready for Ingestion
                </p>
              </div>
              <span className="badge-emerald text-xs font-semibold">
                Click to replace file
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-sm">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  Drag &amp; drop your CSV or Excel dataset here
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Supports customer conversations, tweet logs, ticket transcripts (up to 500MB)
                </p>
              </div>
              <button
                type="button"
                className="btn-secondary py-1.5 px-3 text-xs"
              >
                Browse Local Files
              </button>
            </div>
          )}
        </div>

        {/* Upload Progress Indicator */}
        {isUploading && (
          <div className="space-y-2 p-3 bg-blue-50 rounded-xl border border-blue-200">
            <div className="flex justify-between text-xs font-bold text-blue-900">
              <span>Cleaning &amp; Synchronizing Multi-Tier Data...</span>
              <span className="font-mono">{uploadProgress}%</span>
            </div>
            <div className="h-2 w-full bg-blue-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => setIsUploadModalOpen(false)}
            disabled={isUploading}
            className="btn-secondary py-2 px-4"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUploadSubmit}
            disabled={!file || isUploading}
            className="btn-primary py-2 px-5 disabled:opacity-50"
          >
            <span>{isUploading ? 'Ingesting Pipeline...' : 'Process & Generate Analytics'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
