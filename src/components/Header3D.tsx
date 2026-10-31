'use client';

import React from 'react';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';

interface Header3DProps {
  scenarioName?: string;
  sectorTag?: string;
  activeAlertsCount?: number;
}

export default function Header3D({
  scenarioName = 'Central Park Festival',
  sectorTag = 'Open Grounds',
  activeAlertsCount = 4,
}: Header3DProps) {
  return (
    <header className="fixed top-0 left-0 right-0 h-14 z-50 bg-white/95 dark:bg-[#070b14]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 px-3.5 sm:px-4 flex items-center justify-between shadow-xs select-none font-sans transition-colors duration-150 text-slate-900 dark:text-slate-100">
      {/* Left: Brand Identity & Location Context */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
        {/* Brand Anchor */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 group shrink-0 focus:outline-none focus:ring-1 focus:ring-cyan-500 rounded-xl"
        >
          <div className="relative w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-900/30 border border-cyan-400/30 group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-[19px] text-white">radar</span>
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse border border-white dark:border-[#070b14]"></span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-extrabold text-[14px] tracking-wider text-slate-900 dark:text-white font-mono">
                CROWDPULSE
              </span>
              <span className="text-[9px] font-bold text-cyan-600 dark:text-cyan-400 font-mono bg-cyan-100 dark:bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-300 dark:border-cyan-800/60 uppercase tracking-widest hidden sm:inline-block">
                LIVE OPS
              </span>
            </div>
            <span className="text-[9.5px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 tracking-wide hidden sm:block">
              Real-Time Crowd Intelligence &amp; Emergency Hub
            </span>
          </div>
        </Link>

        {/* Selected Sector Context Pill */}
        <div className="hidden lg:flex items-center gap-2 text-xs bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl max-w-[260px] xl:max-w-[380px] min-w-0 shrink">
          <span className="material-symbols-outlined text-cyan-600 dark:text-cyan-400 text-[16px] shrink-0">location_on</span>
          <span
            className="font-semibold text-slate-800 dark:text-slate-200 truncate text-[12px]"
            title={scenarioName}
          >
            {scenarioName}
          </span>
          <span className="text-slate-500 dark:text-slate-400 text-[10px] font-mono border-l border-slate-300 dark:border-slate-800 pl-2 shrink-0">
            {sectorTag}
          </span>
        </div>
      </div>

      {/* Center: Live Sensor Telemetry Indicator */}
      <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-full font-mono text-[11px] text-slate-600 dark:text-slate-300 shrink-0 shadow-inner">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="font-semibold text-slate-700 dark:text-slate-200 text-[10.5px] tracking-wide">
          SENSORS ONLINE
        </span>
        <span className="text-slate-400 dark:text-slate-600">•</span>
        <span className="text-cyan-600 dark:text-cyan-400 font-mono text-[10px]">Atlas Stream Active</span>
      </div>

      {/* Right Controls: Notifications Bell with Alert Badge, Theme, Settings */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Working Light/Dark Theme Toggle Button */}
        <ThemeToggle />

        {/* Notifications Bell with Integrated Alert Badge */}
        <Link
          href="/alerts"
          className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/90 dark:hover:bg-slate-800/90 border border-slate-300 dark:border-slate-800 transition-all flex items-center justify-center group"
          title={activeAlertsCount > 0 ? `${activeAlertsCount} Active Emergency Alerts` : 'Alerts & Safety Notifications'}
        >
          <span className="material-symbols-outlined text-[19px] text-slate-600 dark:text-slate-300 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
            notifications
          </span>
          {activeAlertsCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-rose-600 text-white font-mono text-[10px] font-bold px-1.5 py-0.2 rounded-full border-2 border-white dark:border-[#070b14] animate-pulse shadow-md shadow-rose-950/80">
              {activeAlertsCount}
            </span>
          )}
        </Link>

        {/* Settings Quick Link */}
        <Link
          href="/settings"
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/90 dark:hover:bg-slate-800/90 border border-slate-300 dark:border-slate-800 transition-colors flex items-center justify-center group"
          title="System Settings"
        >
          <span className="material-symbols-outlined text-[19px] text-slate-600 dark:text-slate-300 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
            settings
          </span>
        </Link>
      </div>
    </header>
  );
}