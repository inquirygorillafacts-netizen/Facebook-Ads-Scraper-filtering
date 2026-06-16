"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { FileDropzone } from "@/components/import/FileDropzone";
import { ProcessingModal } from "@/components/import/ProcessingModal";
import { CampaignNameModal } from "@/components/import/CampaignNameModal";
import { ResultModal } from "@/components/import/ResultModal";
import { parseMetaAdsCSV, extractCampaignName } from "@/lib/csvParser";
import type { SelectedFile, RawLead, FileStats, ProcessingStep } from "@/types";

interface ProcessedResult {
  leads: RawLead[];
  stats: FileStats;
  fileName: string;
  campaignName: string;
}

export default function ImportPage() {
  const [files, setFiles] = useState<SelectedFile[]>([]);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentFileName, setCurrentFileName] = useState("");
  const [progress, setProgress] = useState(0);
  const [steps, setSteps] = useState<ProcessingStep[]>([]);

  // Campaign name modal
  const [showCampaignName, setShowCampaignName] = useState(false);
  const [detectedName, setDetectedName] = useState("");
  const [pendingResult, setPendingResult] = useState<{
    leads: RawLead[];
    stats: FileStats;
    fileName: string;
  } | null>(null);

  // Result modal
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<ProcessedResult | null>(null);

  const handleFilesSelected = useCallback((selected: SelectedFile[]) => {
    setFiles(selected);
  }, []);

  const handleRemoveFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const processFiles = async () => {
    if (files.length === 0) {
      toast.error("Please select at least one CSV file");
      return;
    }

    // Process first file (or loop for multi-file support)
    for (const selectedFile of files) {
      await processSingleFile(selectedFile);
    }
  };

  const processSingleFile = async (selectedFile: SelectedFile) => {
    setIsProcessing(true);
    setCurrentFileName(selectedFile.name);
    setProgress(0);

    const initialSteps: ProcessingStep[] = [
      { label: "Reading file...", status: "pending" },
      { label: "Grouping by company (Page ID)...", status: "pending" },
      { label: "Extracting phone numbers...", status: "pending" },
      { label: "Filtering valid leads...", status: "pending" },
      { label: "Done!", status: "pending" },
    ];
    setSteps(initialSteps);

    try {
      // Step 1: Reading file
      updateStep(0, "active");
      setProgress(10);
      await delay(400);

      // Step 2: Grouping
      updateStep(0, "done");
      updateStep(1, "active");
      setProgress(30);
      await delay(300);

      // Step 3: Extracting (actual processing happens here)
      updateStep(1, "done");
      updateStep(2, "active");
      setProgress(50);

      const parsed = await parseMetaAdsCSV(selectedFile.file);

      // Step 4: Filtering
      updateStep(2, "done");
      updateStep(3, "active");
      setProgress(80);
      await delay(300);

      // Step 5: Done
      updateStep(3, "done");
      updateStep(4, "done");
      setProgress(100);
      await delay(500);

      setIsProcessing(false);

      // Show campaign name modal
      const detected = extractCampaignName(selectedFile.name);
      setDetectedName(detected);
      setPendingResult({
        leads: parsed.leads,
        stats: parsed.stats,
        fileName: selectedFile.name,
      });
      setShowCampaignName(true);
    } catch (error) {
      setIsProcessing(false);
      toast.error("Failed to process file", {
        description:
          error instanceof Error ? error.message : "Please try again",
      });
    }
  };

  const updateStep = (index: number, status: ProcessingStep["status"]) => {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, status } : s))
    );
  };

  const handleCampaignNameConfirm = (name: string) => {
    setShowCampaignName(false);
    if (pendingResult) {
      setResult({
        ...pendingResult,
        campaignName: name,
      });
      setShowResult(true);
    }
  };

  const handleResultClose = () => {
    setShowResult(false);
    setResult(null);
    setFiles([]);
    setPendingResult(null);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h2 className="text-base font-semibold text-text-primary mb-1">
          Import Meta Ads Library File
        </h2>
        <p className="text-sm text-text-secondary mb-6">
          Upload your CSV file from Meta Ads Library. The tool will
          automatically extract, clean, and deduplicate leads.
        </p>

        <FileDropzone
          files={files}
          onFilesSelected={handleFilesSelected}
          onRemoveFile={handleRemoveFile}
        />

        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4"
          >
            <p className="text-xs text-text-muted mb-3">
              Each file will be processed as a separate campaign.
            </p>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={processFiles}
              disabled={isProcessing}
              className="w-full py-3 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover active:bg-primary-hover disabled:opacity-60 transition-all shadow-sm flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "🔄 Process Files"
              )}
            </motion.button>
          </motion.div>
        )}
      </motion.div>

      {/* Processing Modal */}
      <ProcessingModal
        isOpen={isProcessing}
        fileName={currentFileName}
        progress={progress}
        steps={steps}
      />

      {/* Campaign Name Modal */}
      <CampaignNameModal
        isOpen={showCampaignName}
        detectedName={detectedName}
        onConfirm={handleCampaignNameConfirm}
        onSkip={handleCampaignNameConfirm}
      />

      {/* Result Modal */}
      {result && (
        <ResultModal
          isOpen={showResult}
          onClose={handleResultClose}
          leads={result.leads}
          stats={result.stats}
          campaignName={result.campaignName}
          originalFileName={result.fileName}
        />
      )}
    </div>
  );
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
