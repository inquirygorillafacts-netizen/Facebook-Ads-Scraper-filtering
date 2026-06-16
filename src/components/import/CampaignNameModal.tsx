"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, AlertTriangle, X } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useRouter } from "next/navigation";

interface CampaignNameModalProps {
  isOpen: boolean;
  detectedName: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

export function CampaignNameModal({
  isOpen,
  detectedName,
  onConfirm,
  onCancel,
}: CampaignNameModalProps) {
  const router = useRouter();
  const campaigns = useAppStore((s) => s.campaigns);
  const [name, setName] = useState(detectedName);
  const [hasCollision, setHasCollision] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(detectedName);
      setHasCollision(false);
    }
  }, [isOpen, detectedName]);

  const handleConfirm = () => {
    const finalName = name.trim() || detectedName;
    const exists = campaigns.some(
      (c) => c.name.toLowerCase() === finalName.toLowerCase()
    );
    if (exists) {
      setHasCollision(true);
      return;
    }
    onConfirm(finalName);
  };

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
          className="bg-white rounded-xl border border-border shadow-lg w-full max-w-md mx-4 overflow-hidden relative"
        >
          {/* Close Button */}
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 p-1.5 text-text-muted hover:text-text-primary hover:bg-gray-100 rounded-lg transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {hasCollision ? (
            <div className="p-6">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-text-primary mb-2 pr-6">
                Campaign Already Exists
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed mb-6">
                You cannot process this file because a campaign named <strong className="text-text-primary">"{name}"</strong> already exists in your database. Please choose a different name or open the existing one.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setHasCollision(false)}
                  className="px-4 py-2.5 text-sm font-medium text-text-secondary hover:bg-gray-50 border border-border rounded-lg transition-colors"
                >
                  Change Name
                </button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    // Navigate to database and optionally filter by name
                    router.push(`/database`);
                  }}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors shadow-sm"
                >
                  Open Existing File
                </motion.button>
              </div>
            </div>
          ) : (
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4 pr-6">
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
                  if (e.key === "Enter") handleConfirm();
                }}
              />

              <p className="text-xs text-text-muted mt-2 mb-5">
                Edit above or confirm as-is
              </p>

              <div className="flex justify-end gap-3">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleConfirm}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors shadow-sm flex-1"
                >
                  ✅ Confirm Name
                </motion.button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
