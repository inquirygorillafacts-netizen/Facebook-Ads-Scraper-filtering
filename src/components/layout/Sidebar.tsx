"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  BarChart3,
  Download,
  Database,
  Rocket,
  Zap,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: BarChart3 },
  { label: "Import", href: "/import", icon: Download },
  { label: "Database", href: "/database", icon: Database },
  { label: "Coming Soon", href: "/coming-soon", icon: Rocket },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[240px] bg-white border-r border-border flex flex-col z-30">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center group-hover:bg-primary-hover transition-colors">
            <Zap className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <span className="text-[15px] font-semibold text-text-primary tracking-tight">
              LeadSync Pro
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname?.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-medium
                transition-all duration-150 group
                ${
                  isActive
                    ? "bg-primary-light text-primary"
                    : "text-text-secondary hover:bg-gray-50 hover:text-text-primary"
                }
              `}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 bg-primary-light rounded-lg"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <Icon
                className={`w-[18px] h-[18px] relative z-10 ${
                  isActive ? "text-primary" : "text-text-muted group-hover:text-text-secondary"
                }`}
              />
              <span className="relative z-10">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-border">
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <span>v1.0</span>
          <span>·</span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-warning-light text-amber-700">
            Spark Plan
          </span>
        </div>
      </div>
    </aside>
  );
}
