"use client";

import { usePathname } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/import": "Import Tool",
  "/database": "Database",
  "/coming-soon": "Coming Soon",
};

export function Header() {
  const pathname = usePathname();
  const totalLeads = useAppStore((s) => s.totalLeads);
  const title = PAGE_TITLES[pathname || ""] || "LeadSync Pro";

  return (
    <header className="sticky top-0 z-20 h-[60px] bg-white/80 backdrop-blur-md border-b border-border flex items-center justify-between px-8">
      <h1 className="text-lg font-semibold text-text-primary">{title}</h1>
      <div className="flex items-center gap-3">
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
