"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion } from "framer-motion";
import { Database, ShieldAlert } from "lucide-react";
import type { Campaign } from "@/types";

export function GlobalStatsCard() {
  const [stats, setStats] = useState({ unique: 0, duplicates: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 24/7 Real-Time Sync using onSnapshot
    const q = query(collection(db, "campaigns"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let totalUniquePhones = 0;
      let totalDuplicatesSkipped = 0;

      snapshot.docs.forEach((doc) => {
        const data = doc.data() as Partial<Campaign>;
        totalUniquePhones += data.phoneCount || 0;
        totalDuplicatesSkipped += data.duplicatesSkipped || 0;
      });

      setStats({
        unique: totalUniquePhones,
        duplicates: totalDuplicatesSkipped,
      });
      setIsLoading(false);
    }, (error) => {
      console.error("Error syncing global stats:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-6 animate-pulse">
        <div className="h-20 bg-white/20 rounded-lg"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-800 rounded-2xl shadow-xl overflow-hidden relative"
    >
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white opacity-10 blur-2xl"></div>
      <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-32 h-32 rounded-full bg-white opacity-10 blur-2xl"></div>
      
      <div className="p-6 sm:p-8 relative z-10">
        <div className="flex flex-col sm:flex-row gap-8 justify-around items-center">
          
          {/* Unique Numbers */}
          <div className="flex items-center gap-5">
            <div className="bg-white/20 p-4 rounded-xl backdrop-blur-sm">
              <Database className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="text-indigo-100 text-sm font-medium uppercase tracking-wider mb-1">
                Total Unique Numbers
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-white font-mono tracking-tight">
                  {stats.unique.toLocaleString()}
                </span>
                <span className="text-indigo-200 text-sm font-medium">Synced</span>
              </div>
            </div>
          </div>

          <div className="hidden sm:block w-px h-16 bg-white/20"></div>

          {/* Duplicates Blocked */}
          <div className="flex items-center gap-5">
            <div className="bg-white/20 p-4 rounded-xl backdrop-blur-sm">
              <ShieldAlert className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="text-purple-100 text-sm font-medium uppercase tracking-wider mb-1">
                Duplicates Blocked
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-white font-mono tracking-tight">
                  {stats.duplicates.toLocaleString()}
                </span>
                <span className="text-purple-200 text-sm font-medium">Prevented</span>
              </div>
            </div>
          </div>

        </div>
      </div>
      
      {/* Footer bar */}
      <div className="bg-black/10 px-6 py-3 flex items-center justify-between backdrop-blur-md">
        <span className="text-xs font-medium text-white/70">
          Global Data Sync • Firebase Realtime (24/7)
        </span>
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>
      </div>
    </motion.div>
  );
}
