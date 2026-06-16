"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Download,
  Database,
  FileText,
  X,
  Loader2,
  ArrowRight,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { saveCampaign } from "@/lib/firestore";
import { downloadCSV, downloadExcel } from "@/lib/exportHelpers";
import { useAppStore } from "@/store/useAppStore";
import type { RawLead, FileStats } from "@/types";

interface ResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  leads: RawLead[];
  stats: FileStats;
  campaignName: string;
  originalFileName: string;
}

export function ResultModal({
  isOpen,
  onClose,
  leads,
  stats,
  campaignName,
  originalFileName,
}: ResultModalProps) {
  const router = useRouter();
  const addCampaignLocally = useAppStore((s) => s.addCampaignLocally);
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [showExportType, setShowExportType] = useState(false);

  if (!isOpen) return null;

  const handleDownload = (type: "msg91" | "full", format: "csv" | "excel") => {
    if (format === "csv") {
      downloadCSV(leads, type, campaignName);
    } else {
      downloadExcel(leads, type, campaignName);
    }
    
    const count = type === "msg91" ? leads.filter((l) => l.phone).length : leads.length;
    const typeLabel = type === "msg91" ? "MSG91 format" : "Full details";
    toast.success(`${typeLabel} downloaded as ${format.toUpperCase()} — ${count} records`);
    
    setShowExportType(false);
  };

  const handleSaveToFirebase = async () => {
    setIsSaving(true);
    setSaveProgress("Preparing...");

    try {
      const campaignId = await saveCampaign(
        {
          name: campaignName,
          keyword: campaignName,
          originalFileName,
          totalRawRows: stats.totalRawRows,
          totalLeads: stats.validLeads,
          duplicatesSkipped: stats.duplicatesSkipped,
          noContactSkipped: stats.noContactSkipped,
          phoneCount: stats.phoneCount,
          emailCount: stats.emailCount,
        },
        leads,
        (msg) => setSaveProgress(msg)
      );

      // Update local state
      addCampaignLocally(
        {
          id: campaignId,
          name: campaignName,
          keyword: campaignName,
          originalFileName,
          totalRawRows: stats.totalRawRows,
          totalLeads: stats.validLeads,
          duplicatesSkipped: stats.duplicatesSkipped,
          noContactSkipped: stats.noContactSkipped,
          phoneCount: stats.phoneCount,
          emailCount: stats.emailCount,
          chunkCount: Math.ceil(leads.length / 100),
          createdAt: new Date().toISOString(),
          processedAt: new Date().toISOString(),
        },
        leads
      );

      setIsSaved(true);
      toast.success(`${stats.validLeads} leads saved to "${campaignName}"`);
    } catch (error) {
      toast.error("Failed to save to Firebase", {
        description:
          error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const statsCards = [
    { label: "Raw Rows", value: stats.totalRawRows, sublabel: "in CSV" },
    { label: "Companies", value: stats.uniqueCompanies, sublabel: "found" },
    { label: "Valid Leads", value: stats.validLeads, sublabel: "extracted" },
    {
      label: "Ads Skipped",
      value: stats.duplicatesSkipped,
      sublabel: "same company",
    },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm overflow-y-auto py-8"
      >
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
          className="bg-white rounded-xl border border-border shadow-lg w-full max-w-xl mx-4 p-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-success" />
              <h3 className="text-base font-semibold text-text-primary">
                Processing Complete
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-text-muted" />
            </button>
          </div>

          <p className="text-sm text-text-secondary mb-4">
            Campaign: <span className="font-medium text-text-primary">&quot;{campaignName}&quot;</span>
          </p>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {statsCards.map((card) => (
              <div
                key={card.label}
                className="bg-gray-50 rounded-lg p-3 text-center"
              >
                <p className="text-xl font-bold font-mono text-text-primary">
                  {card.value.toLocaleString()}
                </p>
                <p className="text-xs font-medium text-text-secondary mt-0.5">
                  {card.label}
                </p>
                <p className="text-[10px] text-text-muted">{card.sublabel}</p>
              </div>
            ))}
          </div>

          {/* Lead Breakdown */}
          <div className="bg-gray-50 rounded-lg p-4 mb-5 space-y-1.5">
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">
              Lead Breakdown
            </p>
            <p className="text-sm text-text-primary">
              ● {stats.phoneCount} leads have phone number
            </p>
            <p className="text-sm text-text-primary">
              ● {stats.emailCount} leads have email address
            </p>
            <p className="text-sm text-text-primary">
              ● {stats.bothCount} leads have both
            </p>
            <p className="text-sm text-text-muted">
              ● {stats.noContactSkipped} leads skipped (no phone, no email)
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-border my-5" />

          {/* Actions */}
          {isSaved ? (
            <div className="space-y-3">
              <div className="bg-success-light rounded-lg p-4 text-center">
                <CheckCircle2 className="w-6 h-6 text-success mx-auto mb-2" />
                <p className="text-sm font-medium text-emerald-800">
                  Saved! {stats.validLeads} leads added to &quot;{campaignName}&quot;
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => router.push("/database")}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors"
                >
                  View in Database
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-text-primary bg-white border border-border hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Import Another
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-medium text-text-muted uppercase tracking-wider">
                Choose action
              </p>

              <div className="flex gap-3">
                {/* Download Button */}
                <div className="relative flex-1">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setShowExportType(!showExportType)}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-text-primary bg-white border border-border hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Export Data
                  </motion.button>

                  {/* Export Type Dropdown */}
                  <AnimatePresence>
                    {showExportType && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg border border-border shadow-md p-2 space-y-1 z-10"
                      >
                        <p className="px-3 py-1.5 text-[10px] font-bold text-text-muted uppercase tracking-wider">
                          MSG91 (Mobile & Name)
                        </p>
                        <div className="flex gap-1 px-1">
                          <button
                            onClick={() => handleDownload("msg91", "csv")}
                            className="flex-1 text-center py-2 text-xs font-medium rounded-md hover:bg-gray-100 transition-colors bg-gray-50 border border-transparent hover:border-border"
                          >
                            CSV
                          </button>
                          <button
                            onClick={() => handleDownload("msg91", "excel")}
                            className="flex-1 text-center py-2 text-xs font-medium rounded-md hover:bg-gray-100 transition-colors bg-gray-50 border border-transparent hover:border-border text-emerald-700"
                          >
                            Excel
                          </button>
                        </div>

                        <div className="border-t border-border my-1" />

                        <p className="px-3 py-1.5 text-[10px] font-bold text-text-muted uppercase tracking-wider">
                          Full Details (All Fields)
                        </p>
                        <div className="flex gap-1 px-1 pb-1">
                          <button
                            onClick={() => handleDownload("full", "csv")}
                            className="flex-1 text-center py-2 text-xs font-medium rounded-md hover:bg-gray-100 transition-colors bg-gray-50 border border-transparent hover:border-border"
                          >
                            CSV
                          </button>
                          <button
                            onClick={() => handleDownload("full", "excel")}
                            className="flex-1 text-center py-2 text-xs font-medium rounded-md hover:bg-gray-100 transition-colors bg-gray-50 border border-transparent hover:border-border text-emerald-700"
                          >
                            Excel
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Save Button */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSaveToFirebase}
                  disabled={isSaving}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-primary hover:bg-primary-hover disabled:opacity-60 rounded-lg transition-colors shadow-sm"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {saveProgress}
                    </>
                  ) : (
                    <>
                      <Database className="w-4 h-4" />
                      Save to Database
                    </>
                  )}
                </motion.button>
              </div>

              <p className="text-xs text-text-muted text-center">
                Tip: You can do BOTH — download first, then save.
              </p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
