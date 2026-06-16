"use client";

import { motion } from "framer-motion";
import { TrendingUp, Users, Phone, Percent } from "lucide-react";

interface StatsCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  format?: "number" | "percent";
  delay?: number;
}

export function StatsCard({ label, value, icon, format = "number", delay = 0 }: StatsCardProps) {
  const displayValue =
    format === "percent"
      ? `${value}%`
      : typeof value === "number"
      ? value.toLocaleString()
      : value;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
      className="bg-white rounded-xl border border-border p-5 hover:shadow-md transition-shadow duration-200 group"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-2xl font-bold text-text-primary font-mono tracking-tight">
            {displayValue}
          </p>
          <p className="text-sm text-text-secondary mt-1">{label}</p>
        </div>
        <div className="w-10 h-10 rounded-lg bg-primary-light flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors duration-200">
          <div className="text-primary group-hover:text-white transition-colors duration-200">
            {icon}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-3 text-xs text-success">
        <TrendingUp className="w-3.5 h-3.5" />
        <span className="font-medium">Active</span>
      </div>
    </motion.div>
  );
}

export function StatsCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-border p-5 animate-pulse">
      <div className="flex items-start justify-between">
        <div>
          <div className="h-8 w-20 bg-gray-100 rounded" />
          <div className="h-4 w-24 bg-gray-100 rounded mt-2" />
        </div>
        <div className="w-10 h-10 rounded-lg bg-gray-100" />
      </div>
      <div className="h-3 w-16 bg-gray-100 rounded mt-3" />
    </div>
  );
}
