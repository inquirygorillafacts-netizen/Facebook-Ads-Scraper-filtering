"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Users, FolderOpen, Phone, Percent, Plus, Database, Mail } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { StatsCard, StatsCardSkeleton } from "@/components/dashboard/StatsCard";
import { CampaignList } from "@/components/dashboard/CampaignList";

export default function DashboardPage() {
  const router = useRouter();
  const { leads, campaigns, totalLeads, isLoading, loadCache, syncFromFirestore } =
    useAppStore();

  useEffect(() => {
    const hasCache = loadCache();
    if (!hasCache) {
      syncFromFirestore().catch(console.error);
    }
  }, []);

  const phoneLeads = leads.filter((l) => l.phone);
  const emailLeads = leads.filter((l) => l.email);
  const phoneCoverage =
    totalLeads > 0 ? Math.round((phoneLeads.length / totalLeads) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        {isLoading ? (
          <>
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
          </>
        ) : (
          <>
            <StatsCard
              label="Total Leads"
              value={totalLeads}
              icon={<Users className="w-5 h-5" />}
              delay={0}
            />
            <StatsCard
              label="Campaigns"
              value={campaigns.length}
              icon={<FolderOpen className="w-5 h-5" />}
              delay={0.1}
            />
            <StatsCard
              label="With Phone"
              value={phoneLeads.length}
              icon={<Phone className="w-5 h-5" />}
              delay={0.2}
            />
            <StatsCard
              label="Phone Coverage"
              value={phoneCoverage}
              format="percent"
              icon={<Percent className="w-5 h-5" />}
              delay={0.3}
            />
            <StatsCard
              label="With Email"
              value={emailLeads.length}
              icon={<Mail className="w-5 h-5" />}
              delay={0.4}
            />
          </>
        )}
      </div>

      {/* Recent Campaigns */}
      <div>
        <h2 className="text-base font-semibold text-text-primary mb-4">
          Recent Campaigns
        </h2>
        <CampaignList campaigns={campaigns} />
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="flex gap-4"
      >
        <button
          onClick={() => router.push("/import")}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover active:scale-[0.98] transition-all duration-150 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Import New File
        </button>
        <button
          onClick={() => router.push("/database")}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-text-primary text-sm font-medium rounded-lg border border-border hover:bg-gray-50 active:scale-[0.98] transition-all duration-150"
        >
          <Database className="w-4 h-4" />
          View All Leads
        </button>
      </motion.div>
    </div>
  );
}
