"use client";

import { useState, useRef } from "react";
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { cancelDocument, fetchDocument, retryDocument, uploadDocument, DocumentItem } from "@/lib/api";
import UploadProgress from "@/components/UploadProgress";

interface FileUploaderProps {
  onUploadSuccess?: (doc: DocumentItem) => void;
}

type StageKey = "validating" | "extracting" | "chunking" | "embedding" | "indexing" | "complete";

export default function FileUploader({ onUploadSuccess }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [stage, setStage] = useState<StageKey>("validating");
  const [currentFileName, setCurrentFileName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [successDoc, setSuccessDoc] = useState<DocumentItem | null>(null);
  const [failedDoc, setFailedDoc] = useState<DocumentItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFile = async (file: File) => {
    setError(null);
    setSuccessDoc(null);
    setFailedDoc(null);
    setUploading(true);
    setCurrentFileName(file.name);
    setStage("validating");

    try {
      const queuedDoc = await uploadDocument(file);
      let doc = queuedDoc;
      setStage("extracting");
      while (doc.status === "processing") {
        await new Promise((resolve) => setTimeout(resolve, 800));
        doc = await fetchDocument(queuedDoc.id);
        const nextStage = doc.stage as StageKey | undefined;
        if (nextStage && ["validating", "extracting", "chunking", "embedding", "indexing"].includes(nextStage)) {
          setStage(nextStage);
        }
      }
      if (doc.status === "failed") {
        setFailedDoc(doc);
        throw new Error(doc.error_message || "Document processing failed.");
      }
      setStage("complete");
      setSuccessDoc(doc);
      onUploadSuccess?.(doc);
    } catch (err: any) {
      setError(err.message || "Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const handleRetry = async () => {
    if (!failedDoc) return;
    setError(null);
    setUploading(true);
    setStage("validating");
    try {
      const queuedDoc = await retryDocument(failedDoc.id);
      let doc = queuedDoc;
      while (doc.status === "processing") {
        await new Promise((resolve) => setTimeout(resolve, 800));
        doc = await fetchDocument(queuedDoc.id);
        if (doc.stage) setStage(doc.stage as StageKey);
      }
      if (doc.status === "failed") throw new Error(doc.error_message || "Document processing failed again.");
      setStage("complete");
      setSuccessDoc(doc);
      setFailedDoc(null);
      onUploadSuccess?.(doc);
    } catch (err: any) {
      setError(err.message || "Retry failed");
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = async () => {
    if (!failedDoc) return;
    try {
      const doc = await cancelDocument(failedDoc.id);
      setFailedDoc(doc);
      setError(doc.error_message || "Processing cancelled.");
      setUploading(false);
    } catch (err: any) {
      setError(err.message || "Unable to cancel processing.");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
          uploading
            ? "border-indigo-500/50 bg-indigo-500/5 cursor-wait"
            : isDragging
            ? "border-indigo-500 bg-indigo-500/10 cursor-pointer"
            : "border-slate-700 hover:border-indigo-500/50 bg-slate-900/40 hover:bg-slate-900/60 cursor-pointer"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt,.csv,.md"
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />

        <div className="flex flex-col items-center justify-center gap-3">
          <div className="p-4 rounded-2xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20">
            {uploading ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : (
              <UploadCloud className="w-8 h-8" />
            )}
          </div>

          <div>
            <p className="text-base font-semibold text-white">
              {uploading ? "Processing & Indexing Document..." : "Click or drag & drop document"}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Supports PDF, DOCX, TXT, CSV, and Markdown (Max 50MB)
            </p>
          </div>
        </div>
      </div>

      {uploading && (
        <UploadProgress currentStage={stage} fileName={currentFileName} />
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
          {failedDoc && <div className="ml-auto flex gap-2 shrink-0"><button onClick={handleRetry} className="rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white">Retry</button><button onClick={handleCancel} className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-200">Cancel</button></div>}
        </div>
      )}

      {successDoc && !uploading && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="font-semibold text-emerald-200">{successDoc.original_filename}</p>
              <p className="text-xs text-emerald-400/80">
                Processed into {successDoc.chunk_count} chunks
              </p>
            </div>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 uppercase font-mono">
            {successDoc.status}
          </span>
        </div>
      )}
    </div>
  );
}
