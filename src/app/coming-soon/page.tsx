"use client";

import { motion } from "framer-motion";
import {
  Rocket,
  Radio,
  Users2,
  StickyNote,
  MessageSquare,
  Link2,
  BarChart2,
} from "lucide-react";

const features = [
  {
    icon: Radio,
    title: "Batch Outreach Tracker",
    description:
      "Track which batch of leads received which MSG91 template. See open rates, delivery status, and link clicks.",
    color: "bg-blue-50 text-blue-600",
  },
  {
    icon: Users2,
    title: "Duplicate Detection Across Campaigns",
    description:
      "Automatically find and highlight phone numbers that appear in multiple campaigns. Avoid messaging the same prospect twice from different keyword uploads.",
    color: "bg-purple-50 text-purple-600",
  },
  {
    icon: StickyNote,
    title: "Lead Notes & Status Tracking",
    description:
      'Add personal notes to any lead. Set statuses like "Interested", "Not Interested", "Follow Up", "Converted". Filter database by status.',
    color: "bg-amber-50 text-amber-600",
  },
  {
    icon: MessageSquare,
    title: "Bulk WhatsApp Status Update",
    description:
      "After sending MSG91 blast, upload the delivery report CSV and auto-mark all successfully delivered leads as WA Sent.",
    color: "bg-green-50 text-green-600",
  },
  {
    icon: Link2,
    title: "MSG91 Direct Integration",
    description:
      "Send WhatsApp/SMS messages directly from LeadSync Pro without downloading and re-uploading to MSG91. Connect your MSG91 API key and blast from here.",
    color: "bg-red-50 text-red-600",
  },
  {
    icon: BarChart2,
    title: "Lead Scoring",
    description:
      "Automatically score each prospect based on number of active ads running, Facebook page follower count, and website presence quality.",
    color: "bg-indigo-50 text-indigo-600",
  },
];

export default function ComingSoonPage() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-indigo-500 to-purple-600 px-8 py-12 mb-8"
      >
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <Rocket className="w-7 h-7 text-white" />
            <h2 className="text-2xl font-bold text-white">
              What&apos;s Coming to LeadSync Pro
            </h2>
          </div>
          <p className="text-indigo-100 text-sm max-w-lg">
            We&apos;re actively building the next set of features. These are already
            planned and in development.
          </p>
        </div>

        {/* Decorative circles */}
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/5" />
        <div className="absolute -right-4 -bottom-12 w-40 h-40 rounded-full bg-white/5" />
      </motion.div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {features.map((feature, idx) => {
          const Icon = feature.icon;
          return (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * idx, duration: 0.4 }}
              className="bg-white rounded-xl border border-border p-5 hover:shadow-md transition-shadow duration-200 group"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${feature.color}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <h3 className="text-sm font-semibold text-text-primary">
                      {feature.title}
                    </h3>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary-light text-primary uppercase tracking-wider">
                      Coming Soon
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
