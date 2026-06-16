"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";

interface CampaignNameModalProps {
  isOpen: boolean;
  detectedName: string;
  onConfirm: (name: string) => void;
  onSkip: (name: string) => void;
}

export function CampaignNameModal({
  isOpen,
  detectedName,
  onConfirm,
  onSkip,
}: CampaignNameModalProps) {
  const [name, setName] = useState(detectedName);

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
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="text-base font-semibold text-text-primary">
              Name this campaign
            </h3>
          </div>

          <p className="text-sm text-text-secondary mb-4">
            We detected the keyword from your filename:
          </p>

          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            placeholder="Enter campaign name..."
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") onConfirm(name);
            }}
          />

          <p className="text-xs text-text-muted mt-2 mb-5">
            Edit above or leave as-is
          </p>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => onSkip(detectedName)}
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-gray-50 rounded-lg transition-colors"
            >
              Skip → Use filename
            </button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => onConfirm(name || detectedName)}
              className="px-5 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors shadow-sm"
            >
              ✅ Confirm Name
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
