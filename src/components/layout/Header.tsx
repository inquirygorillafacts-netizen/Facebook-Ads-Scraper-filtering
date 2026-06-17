"use client";

import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAppStore } from "@/store/useAppStore";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/import": "Import Tool",
  "/database": "Database",
  "/coming-soon": "Coming Soon",
};

export function Header() {
  const pathname = usePathname();
  const { totalLeads, isSyncing, syncedAt, syncFromFirestore } = useAppStore();
  const title = PAGE_TITLES[pathname || ""] || "LeadSync Pro";

  // Using a simple state to force re-render for the time distance to be accurate if they stay on page
  const [timeAgo, setTimeAgo] = useState<string>("");

  useEffect(() => {
    if (!syncedAt) return;
    
    const updateTime = () => {
      setTimeAgo(formatDistanceToNow(new Date(syncedAt), { addSuffix: true }));
    };
    
    updateTime();
    const interval = setInterval(updateTime, 60000); // update every minute
    return () => clearInterval(interval);
  }, [syncedAt]);

  return (
    <header className="sticky top-0 z-20 h-[60px] bg-white/80 backdrop-blur-md border-b border-border flex items-center justify-between px-8">
      <h1 className="text-lg font-semibold text-text-primary">{title}</h1>
      <div className="flex items-center gap-4">
        {/* Sync Controls */}
        <div className="flex items-center gap-2">
          {syncedAt && (
            <span className="text-xs font-medium text-text-muted">
              {isSyncing ? "Syncing..." : `Synced ${timeAgo}`}
            </span>
          )}
          <button
            onClick={() => syncFromFirestore().catch(console.error)}
            disabled={isSyncing}
            title="Sync Data from Database"
            className={`p-1.5 rounded-md transition-all duration-200 flex items-center justify-center ${
              isSyncing
                ? "text-primary bg-primary-light opacity-70 cursor-not-allowed"
                : "text-text-secondary hover:text-primary hover:bg-primary-light"
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Total Leads Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary-light rounded-lg">
          <span className="text-xs font-medium text-primary">Total Leads</span>
          <span className="text-sm font-bold text-primary font-mono">
            {totalLeads.toLocaleString()}
          </span>
        </div>
      </div>
    </header>
  );
}
