'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface Sidebar3DProps {
  sectorName?: string;
  alertsCount?: number;
}

export default function Sidebar3D({
  sectorName = 'Open Grounds',
  alertsCount = 4,
}: Sidebar3DProps) {
  const pathname = usePathname();

  const navLinks = [
    { label: 'Live Dashboard', href: '/dashboard', icon: 'dashboard' },
    { label: 'Area GIS Map', href: '/area-explorer', icon: 'map' },
    { label: 'Zone Telemetry', href: '/zone-telemetry', icon: 'view_in_ar' },
    {
      label: 'Emergency Alerts',
      href: '/alerts',
      icon: 'warning',
      badge: alertsCount > 0 ? alertsCount : null,
      badgeColor: 'bg-rose-600 text-white shadow-xs shadow-rose-900/50',
    },
    { label: 'Flow & Dynamics', href: '/flow-dynamics', icon: 'stacked_line_chart' },
    { label: 'Threshold Limits', href: '/thresholds', icon: 'tune' },
    { label: 'System Settings', href: '/settings', icon: 'settings' },
  ];

  return (
    <aside className="fixed left-0 top-14 bottom-0 w-60 z-40 bg-white/95 dark:bg-[#070b14]/95 backdrop-blur-md border-r border-slate-200 dark:border-slate-800/80 flex flex-col justify-between py-3.5 text-xs select-none font-sans transition-colors duration-150">
      <div className="space-y-3.5">
        {/* Sector Monitoring Status Card */}
        <div className="mx-3 p-3 bg-slate-100 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800/90 shadow-2xs">
          <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-bold mb-1 tracking-wider uppercase font-mono">
            <span>SECTOR STATUS</span>
            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-mono font-bold bg-emerald-100 dark:bg-emerald-950/70 px-1.5 py-0.5 rounded border border-emerald-300 dark:border-emerald-800/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> ONLINE
            </span>
          </div>
          <div className="font-bold text-slate-800 dark:text-slate-100 text-xs truncate" title={sectorName}>
            {sectorName}
          </div>
          <div className="text-[10px] text-cyan-600 dark:text-cyan-400/80 font-mono mt-0.5 flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-cyan-500"></span>
            Sensors Active &amp; Streaming
          </div>
        </div>

        {/* Navigation Section */}
        <nav aria-label="Main Navigation" className="px-2.5 space-y-1 font-medium">
          <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold">
            Command Modules
          </div>
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href === '/dashboard' && pathname === '/');
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all relative ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-900/20 border border-blue-400/40'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900/80 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span
                    className={`material-symbols-outlined text-[17px] ${
                      isActive ? 'text-white' : 'text-slate-400 dark:text-slate-400'
                    }`}
                  >
                    {link.icon}
                  </span>
                  <span className="truncate">{link.label}</span>
                </div>
                {link.badge && (
                  <span
                    className={`px-1.5 py-0.5 font-mono text-[10px] rounded-full font-bold ${
                      isActive
                        ? 'bg-white text-blue-700'
                        : link.badgeColor || 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Subtle Bottom Version Tag */}
      <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-800/80 text-[10px] text-slate-400 dark:text-slate-500 font-mono text-center tracking-wider">
        CROWDPULSE v1.2
      </div>
    </aside>
  );
}