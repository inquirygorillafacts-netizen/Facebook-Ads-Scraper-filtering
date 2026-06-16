"use client";

import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, X, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { SelectedFile } from "@/types";

interface FileDropzoneProps {
  files: SelectedFile[];
  onFilesSelected: (files: SelectedFile[]) => void;
  onRemoveFile: (index: number) => void;
}

export function FileDropzone({
  files,
  onFilesSelected,
  onRemoveFile,
}: FileDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFiles = useCallback(
    (fileList: FileList) => {
      const csvFiles: SelectedFile[] = [];
      const invalidFiles: string[] = [];

      Array.from(fileList).forEach((file) => {
        if (file.name.toLowerCase().endsWith(".csv")) {
          csvFiles.push({ file, name: file.name, size: file.size });
        } else {
          invalidFiles.push(file.name);
        }
      });

      if (invalidFiles.length > 0) {
        toast.error(`Only CSV files are supported`, {
          description: `Rejected: ${invalidFiles.join(", ")}`,
        });
      }

      if (csvFiles.length > 0) {
        onFilesSelected([...files, ...csvFiles]);
      }
    },
    [files, onFilesSelected]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleClick = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = ".csv";
    input.onchange = (e) => {
      const fileList = (e.target as HTMLInputElement).files;
      if (fileList) handleFiles(fileList);
    };
    input.click();
  }, [handleFiles]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <motion.div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        whileHover={{ scale: 1.005 }}
        whileTap={{ scale: 0.995 }}
        className={`
          relative cursor-pointer rounded-xl border-2 border-dashed p-12
          transition-all duration-200 text-center
          ${
            isDragOver
              ? "border-primary bg-primary-light animate-pulse-border"
              : "border-gray-300 hover:border-primary hover:bg-primary-light/30"
          }
        `}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className={`w-14 h-14 rounded-xl flex items-center justify-center transition-colors duration-200 ${
              isDragOver ? "bg-primary text-white" : "bg-gray-100 text-text-muted"
            }`}
          >
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <p className="text-base font-medium text-text-primary">
              {isDragOver ? "Drop it!" : "Drag & drop your CSV file here"}
            </p>
            <p className="text-sm text-text-muted mt-1">
              or click to browse
            </p>
          </div>
          <p className="text-xs text-text-muted">
            Supports: .csv files from Meta Ads Library · No file size limit
          </p>
        </div>
      </motion.div>

      {/* Selected Files List */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <p className="text-sm font-medium text-text-secondary">
              Selected files ({files.length}):
            </p>
            {files.map((f, idx) => (
              <motion.div
                key={`${f.name}-${idx}`}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                className="flex items-center justify-between bg-white rounded-lg border border-border px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-text-primary">
                    {f.name}
                  </span>
                  <span className="text-xs text-text-muted">
                    [{formatSize(f.size)}]
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFile(idx);
                  }}
                  className="p-1 hover:bg-danger-light rounded-md transition-colors"
                >
                  <X className="w-4 h-4 text-danger" />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
