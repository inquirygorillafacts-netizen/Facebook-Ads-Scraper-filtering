"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, Calendar } from "lucide-react";
import { format } from "date-fns";
import type { Campaign } from "@/types";

interface CampaignListProps {
  campaigns: Campaign[];
}

export function CampaignList({ campaigns }: CampaignListProps) {
  const router = useRouter();

  if (campaigns.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white rounded-xl border border-border p-8 text-center"
      >
        <p className="text-text-muted text-sm">
          No campaigns yet. Import your first CSV file to get started.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      className="bg-white rounded-xl border border-border overflow-hidden"
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-gray-50/50">
              <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider px-5 py-3">
                #
              </th>
              <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider px-5 py-3">
                Campaign Name
              </th>
              <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider px-5 py-3">
                Leads
              </th>
              <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider px-5 py-3">
                Phone
              </th>
              <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider px-5 py-3">
                Email
              </th>
              <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider px-5 py-3">
                Date
              </th>
              <th className="text-right text-xs font-medium text-text-muted uppercase tracking-wider px-5 py-3">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {campaigns.slice(0, 10).map((campaign, idx) => (
              <tr
                key={campaign.id}
                className="hover:bg-gray-50/50 transition-colors duration-100"
              >
                <td className="px-5 py-3.5 text-sm text-text-muted font-mono">
                  {idx + 1}
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-sm font-medium text-text-primary">
                    {campaign.name}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-sm font-mono font-medium text-text-primary">
                    {campaign.totalLeads}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-sm font-mono text-text-secondary">
                    {campaign.phoneCount || "—"}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-sm font-mono text-text-secondary">
                    {campaign.emailCount || "—"}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-1.5 text-sm text-text-secondary">
                    <Calendar className="w-3.5 h-3.5" />
                    {campaign.createdAt
                      ? format(new Date(campaign.createdAt), "MMM dd")
                      : "—"}
                  </div>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <button
                    onClick={() =>
                      router.push(`/database?campaign=${campaign.id}`)
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary-light rounded-lg transition-colors duration-150"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
