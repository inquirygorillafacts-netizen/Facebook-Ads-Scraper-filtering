"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Copy,
  Check,
  ExternalLink,
  Globe,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// Custom brand icons (Lucide doesn't include brand icons)
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}
import { toast } from "sonner";
import { toggleWhatsappSent } from "@/lib/firestore";
import { useAppStore } from "@/store/useAppStore";
import { LEADS_PER_PAGE } from "@/constants";
import type { RawLead } from "@/types";

interface LeadTableProps {
  leads: RawLead[];
}

export function LeadTable({ leads }: LeadTableProps) {
  const [page, setPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const updateLeadWhatsapp = useAppStore((s) => s.updateLeadWhatsapp);

  const totalPages = Math.max(1, Math.ceil(leads.length / LEADS_PER_PAGE));
  const startIndex = (page - 1) * LEADS_PER_PAGE;
  const pageLeads = leads.slice(startIndex, startIndex + LEADS_PER_PAGE);

  const handleCopy = useCallback(async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1200);
  }, []);

  const handleWhatsappToggle = useCallback(
    async (lead: RawLead) => {
      if (!lead.phone) return;

      const newStatus = !lead.whatsappSent;

      // Optimistic update
      updateLeadWhatsapp(lead.id, lead.phone, newStatus);

      // Background Firestore update
      if (lead._campaignId) {
        toggleWhatsappSent(lead._campaignId, lead.phone, newStatus).catch(console.error);
      }
    },
    [updateLeadWhatsapp]
  );

  if (leads.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-border p-12 text-center">
        <p className="text-sm text-text-muted">
          No leads found matching your filters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full lead-table">
            <thead>
              <tr className="border-b border-border bg-gray-50/50">
                <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider px-4 py-3 w-16">
                  Sr.
                </th>
                <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider px-4 py-3 min-w-[180px]">
                  Name
                </th>
                <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider px-4 py-3 min-w-[140px]">
                  Phone
                </th>
                <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider px-4 py-3 min-w-[180px]">
                  Email
                </th>
                <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider px-4 py-3 min-w-[100px]">
                  Links
                </th>
                <th className="text-center text-xs font-medium text-text-muted uppercase tracking-wider px-4 py-3 w-16">
                  WA
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pageLeads.map((lead, idx) => (
                <tr
                  key={`${lead.id}-${idx}`}
                  className="hover:bg-gray-50/50 transition-colors duration-100"
                >
                  {/* Serial number */}
                  <td className="px-4 py-3 text-xs text-text-muted font-mono">
                    {lead.srNo ? lead.srNo : startIndex + idx + 1}
                  </td>

                  {/* Name */}
                  <td className="px-4 py-3">
                    <span
                      className="text-sm font-medium text-text-primary truncate block max-w-[200px]"
                      title={lead.name || "—"}
                    >
                      {lead.name || (
                        <span className="text-text-muted">—</span>
                      )}
                    </span>
                    {lead._campaignName && (
                      <span className="text-[10px] text-text-muted block mt-0.5">
                        {lead._campaignName}
                      </span>
                    )}
                  </td>

                  {/* Phone */}
                  <td className="px-4 py-3">
                    {lead.phone ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-mono text-text-primary">
                          {lead.phone}
                        </span>
                        <button
                          onClick={() =>
                            handleCopy(lead.phone!, `phone-${lead.id}`)
                          }
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                          title="Copy phone"
                        >
                          {copiedId === `phone-${lead.id}` ? (
                            <Check className="w-3 h-3 text-success" />
                          ) : (
                            <Copy className="w-3 h-3 text-text-muted" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <span className="text-sm text-text-muted">—</span>
                    )}
                  </td>

                  {/* Email */}
                  <td className="px-4 py-3">
                    {lead.email ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-text-primary truncate max-w-[160px]">
                          {lead.email}
                        </span>
                        <button
                          onClick={() =>
                            handleCopy(lead.email!, `email-${lead.id}`)
                          }
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                          title="Copy email"
                        >
                          {copiedId === `email-${lead.id}` ? (
                            <Check className="w-3 h-3 text-success" />
                          ) : (
                            <Copy className="w-3 h-3 text-text-muted" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <span className="text-sm text-text-muted">—</span>
                    )}
                  </td>

                  {/* Links */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {lead.facebook && (
                        <a
                          href={lead.facebook}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 hover:bg-blue-50 rounded transition-colors"
                          title="Facebook"
                        >
                          <FacebookIcon className="w-3.5 h-3.5 text-blue-600" />
                        </a>
                      )}
                      {lead.instagram && (
                        <a
                          href={lead.instagram}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 hover:bg-pink-50 rounded transition-colors"
                          title="Instagram"
                        >
                          <InstagramIcon className="w-3.5 h-3.5 text-pink-600" />
                        </a>
                      )}
                      {lead.website && (
                        <a
                          href={lead.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 hover:bg-green-50 rounded transition-colors"
                          title="Website"
                        >
                          <Globe className="w-3.5 h-3.5 text-green-600" />
                        </a>
                      )}
                      {lead.adsLink && (
                        <a
                          href={lead.adsLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 hover:bg-indigo-50 rounded transition-colors"
                          title="View Ad"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-primary" />
                        </a>
                      )}
                    </div>
                  </td>

                  {/* WhatsApp Sent */}
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleWhatsappToggle(lead)}
                      disabled={!lead.phone}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        lead.whatsappSent
                          ? "bg-success border-success"
                          : "border-gray-300 hover:border-primary"
                      } ${!lead.phone ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      {lead.whatsappSent && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-text-muted">
            Showing {startIndex + 1}–{Math.min(startIndex + LEADS_PER_PAGE, leads.length)} of{" "}
            {leads.length} leads
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 hover:bg-gray-100 rounded-lg border border-border disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-medium text-text-secondary px-2">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 hover:bg-gray-100 rounded-lg border border-border disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
