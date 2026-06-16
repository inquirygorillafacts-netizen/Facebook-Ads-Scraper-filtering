"use client";

import { Search } from "lucide-react";
import type { Campaign, FilterType } from "@/types";

interface FilterBarProps {
  campaigns: Campaign[];
  selectedCampaign: string;
  onCampaignChange: (id: string) => void;
  filterType: FilterType;
  onFilterChange: (filter: FilterType) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: "all", label: "All Leads" },
  { value: "phone_only", label: "Has Phone" },
  { value: "email_only", label: "Has Email" },
  { value: "both", label: "Has Both" },
  { value: "whatsapp_sent", label: "WhatsApp Sent" },
  { value: "whatsapp_pending", label: "Pending WhatsApp" },
];

export function FilterBar({
  campaigns,
  selectedCampaign,
  onCampaignChange,
  filterType,
  onFilterChange,
  searchQuery,
  onSearchChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Campaign Dropdown */}
      <select
        value={selectedCampaign}
        onChange={(e) => onCampaignChange(e.target.value)}
        className="px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-w-[180px]"
      >
        <option value="all">All Campaigns</option>
        {campaigns.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      {/* Contact Filter */}
      <select
        value={filterType}
        onChange={(e) => onFilterChange(e.target.value as FilterType)}
        className="px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-w-[160px]"
      >
        {FILTER_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search name, phone, email..."
          className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
        />
      </div>
    </div>
  );
}
