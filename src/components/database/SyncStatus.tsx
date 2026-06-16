"use client";

import { formatDistanceToNow } from "date-fns";
import { RefreshCw, Loader2, Cloud, CloudOff } from "lucide-react";

interface SyncStatusProps {
  syncedAt: string | null;
  isFromCache: boolean;
  isSyncing: boolean;
  onSync: () => void;
}

export function SyncStatus({
  syncedAt,
  isFromCache,
  isSyncing,
  onSync,
}: SyncStatusProps) {
  const timeAgo = syncedAt
    ? formatDistanceToNow(new Date(syncedAt), { addSuffix: true })
    : null;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 rounded-lg border border-border">
      <div className="flex items-center gap-2">
        {isFromCache ? (
          <CloudOff className="w-4 h-4 text-warning" />
        ) : (
          <Cloud className="w-4 h-4 text-success" />
        )}
        <span className="text-xs text-text-secondary">
          {isFromCache ? "Showing cached data" : "Synced with database"}
          {timeAgo && ` · Last synced ${timeAgo}`}
        </span>
      </div>

      <button
        onClick={onSync}
        disabled={isSyncing}
        className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-primary hover:bg-primary-light rounded-md transition-colors disabled:opacity-50"
      >
        {isSyncing ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <RefreshCw className="w-3.5 h-3.5" />
        )}
        {isSyncing ? "Syncing..." : "Sync Now"}
      </button>
    </div>
  );
}
