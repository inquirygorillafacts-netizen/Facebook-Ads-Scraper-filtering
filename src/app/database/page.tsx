"use client";

import { useEffect, useState, useMemo, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/store/useAppStore";
import { FilterBar } from "@/components/database/FilterBar";
import { SyncStatus } from "@/components/database/SyncStatus";
import { LeadTable } from "@/components/database/LeadTable";
import { ExportModal } from "@/components/database/ExportModal";
import type { FilterType } from "@/types";

function DatabaseContent() {
  const searchParams = useSearchParams();
  const {
    leads,
    campaigns,
    isLoading,
    isSyncing,
    syncedAt,
    isFromCache,
    loadCache,
    syncFromFirestore,
  } = useAppStore();

  const [selectedCampaign, setSelectedCampaign] = useState("all");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showExport, setShowExport] = useState(false);

  // Load data on mount
  useEffect(() => {
    const hasCache = loadCache();
    if (!hasCache) {
      syncFromFirestore().catch(console.error);
    }
  }, []);

  // Set campaign from URL param
  useEffect(() => {
    const campaignParam = searchParams.get("campaign");
    if (campaignParam) {
      setSelectedCampaign(campaignParam);
    }
  }, [searchParams]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filter leads
  const filteredLeads = useMemo(() => {
    let filtered = leads;

    // Campaign filter
    if (selectedCampaign !== "all") {
      filtered = filtered.filter(
        (l) => l._campaignId === selectedCampaign
      );
    }

    // Contact type filter
    switch (filterType) {
      case "phone_only":
        filtered = filtered.filter((l) => l.phone);
        break;
      case "email_only":
        filtered = filtered.filter((l) => l.email);
        break;
      case "both":
        filtered = filtered.filter((l) => l.phone && l.email);
        break;
      case "whatsapp_sent":
        filtered = filtered.filter((l) => l.whatsappSent);
        break;
      case "whatsapp_pending":
        filtered = filtered.filter((l) => !l.whatsappSent && l.phone);
        break;
    }

    // Search filter
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.name?.toLowerCase().includes(query) ||
          l.phone?.includes(query) ||
          l.email?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [leads, selectedCampaign, filterType, debouncedSearch]);

  const handleSync = useCallback(async () => {
    try {
      await syncFromFirestore();
      toast.success(
        `Synced! ${leads.length} leads loaded.`
      );
    } catch {
      toast.error("Sync failed. Please try again.");
    }
  }, [syncFromFirestore, leads.length]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-4"
      >
        {/* Filter Bar */}
        <FilterBar
          campaigns={campaigns}
          selectedCampaign={selectedCampaign}
          onCampaignChange={setSelectedCampaign}
          filterType={filterType}
          onFilterChange={setFilterType}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Sync Status */}
        <SyncStatus
          syncedAt={syncedAt}
          isFromCache={isFromCache}
          isSyncing={isSyncing}
          onSync={handleSync}
        />

        {/* Results Bar */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-secondary">
            <span className="font-medium text-text-primary">
              {filteredLeads.length}
            </span>{" "}
            leads found
          </p>
          <button
            onClick={() => setShowExport(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-text-primary bg-white border border-border hover:bg-gray-50 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>

        {/* Lead Table */}
        <LeadTable leads={filteredLeads} />
      </motion.div>

      {/* Export Modal */}
      <ExportModal
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        filteredLeads={filteredLeads}
        allLeads={leads}
      />
    </div>
  );
}

export default function DatabasePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      }
    >
      <DatabaseContent />
    </Suspense>
  );
}
