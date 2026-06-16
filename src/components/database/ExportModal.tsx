"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download } from "lucide-react";
import { downloadCSV, downloadExcel } from "@/lib/exportHelpers";
import { toast } from "sonner";
import type { RawLead, ExportType, ExportFormat } from "@/types";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  filteredLeads: RawLead[];
  allLeads: RawLead[];
}

export function ExportModal({
  isOpen,
  onClose,
  filteredLeads,
  allLeads,
}: ExportModalProps) {
  const [scope, setScope] = useState<"filtered" | "all">("filtered");
  const [exportType, setExportType] = useState<ExportType>("msg91");
  const [fileType, setFileType] = useState<ExportFormat>("csv");

  if (!isOpen) return null;

  const leads = scope === "filtered" ? filteredLeads : allLeads;

  const handleExport = () => {
    if (fileType === "csv") {
      downloadCSV(leads, exportType);
    } else {
      downloadExcel(leads, exportType);
    }

    const count =
      exportType === "msg91"
        ? leads.filter((l) => l.phone).length
        : leads.length;
    toast.success(
      `Exported ${count} leads as ${fileType.toUpperCase()}`
    );
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      >
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
          className="bg-white rounded-xl border border-border shadow-lg w-full max-w-sm mx-4 p-6"
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold text-text-primary">
              Export Leads
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-text-muted" />
            </button>
          </div>

          {/* Scope */}
          <div className="mb-4">
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">
              Which leads?
            </p>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="scope"
                  checked={scope === "filtered"}
                  onChange={() => setScope("filtered")}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-sm text-text-primary">
                  Current filter ({filteredLeads.length} leads)
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="scope"
                  checked={scope === "all"}
                  onChange={() => setScope("all")}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-sm text-text-primary">
                  All leads ({allLeads.length} leads)
                </span>
              </label>
            </div>
          </div>

          {/* Export Format */}
          <div className="mb-4">
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">
              Export format
            </p>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  checked={exportType === "msg91"}
                  onChange={() => setExportType("msg91")}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-sm text-text-primary">
                  MSG91 format (Mobile + Name only)
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  checked={exportType === "full"}
                  onChange={() => setExportType("full")}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-sm text-text-primary">
                  Full details (all fields)
                </span>
              </label>
            </div>
          </div>

          {/* File Type */}
          <div className="mb-5">
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">
              File type
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setFileType("csv")}
                className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  fileType === "csv"
                    ? "border-primary bg-primary-light text-primary"
                    : "border-border text-text-secondary hover:bg-gray-50"
                }`}
              >
                CSV
              </button>
              <button
                onClick={() => setFileType("excel")}
                className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  fileType === "excel"
                    ? "border-primary bg-primary-light text-primary"
                    : "border-border text-text-secondary hover:bg-gray-50"
                }`}
              >
                Excel
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-medium text-text-secondary hover:bg-gray-50 rounded-lg border border-border transition-colors"
            >
              Cancel
            </button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleExport}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              Download
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
