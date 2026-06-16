"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2 } from "lucide-react";
import type { ProcessingStep } from "@/types";

interface ProcessingModalProps {
  isOpen: boolean;
  fileName: string;
  progress: number;
  steps: ProcessingStep[];
}

export function ProcessingModal({
  isOpen,
  fileName,
  progress,
  steps,
}: ProcessingModalProps) {
  if (!isOpen) return null;

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
          className="bg-white rounded-xl border border-border shadow-lg w-full max-w-md mx-4 p-6"
        >
          <p className="text-sm font-medium text-text-secondary mb-1">
            Processing
          </p>
          <p className="text-base font-semibold text-text-primary mb-5 truncate">
            {fileName}
          </p>

          {/* Progress Bar */}
          <div className="w-full bg-gray-100 rounded-full h-2 mb-5 overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </div>

          {/* Steps */}
          <div className="space-y-3">
            {steps.map((step, idx) => (
              <div key={idx} className="flex items-center gap-3">
                {step.status === "done" ? (
                  <CheckCircle2 className="w-4.5 h-4.5 text-success flex-shrink-0" />
                ) : step.status === "active" ? (
                  <Loader2 className="w-4.5 h-4.5 text-primary animate-spin flex-shrink-0" />
                ) : (
                  <div className="w-4.5 h-4.5 rounded-full border-2 border-gray-200 flex-shrink-0" />
                )}
                <span
                  className={`text-sm ${
                    step.status === "done"
                      ? "text-text-primary"
                      : step.status === "active"
                      ? "text-primary font-medium"
                      : "text-text-muted"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
