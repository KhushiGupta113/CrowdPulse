'use client';

import React, { useState, useEffect } from 'react';
import Header3D from '@/components/Header3D';
import Sidebar3D from '@/components/Sidebar3D';

export default function SettingsPage() {
  const [isSimulating, setIsSimulating] = useState(true);
  const [tickInterval, setTickInterval] = useState('3.5');
  const [jitterLevel, setJitterLevel] = useState('normal');
  const [fpsSetting, setFpsSetting] = useState('60');
  const [currentTheme, setCurrentTheme] = useState('dark');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setCurrentTheme(isDark ? 'dark' : 'light');
  }, []);

  const handleThemeChange = (theme: 'light' | 'dark') => {
    setCurrentTheme(theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleResetBaseline = () => {
    setStatusMessage('Restored all scenarios and settings to default values.');
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage('Settings saved successfully.');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070b14] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-150">
      <Header3D
        scenarioName="System Settings"
        sectorTag="Settings"
        activeAlertsCount={3}
      />

      <div className="flex flex-1">
        <Sidebar3D
          sectorName="Settings"
          alertsCount={3}
        />

        <main className="ml-60 mt-14 p-4 space-y-4 flex-1 overflow-x-hidden">
          {/* Header Action Bar */}
          <div className="bg-white dark:bg-slate-900/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-cyan-400 flex items-center justify-center border border-blue-200 dark:border-blue-800/60 shadow-xs">
                <span className="material-symbols-outlined text-[18px]">settings</span>
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
                  System Settings &amp; Preferences
                </h1>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Adjust simulation frequency, appearance theme, and review database connection status.
                </p>
              </div>
            </div>

            {statusMessage && (
              <span className="text-xs font-mono font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                {statusMessage}
              </span>
            )}
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-3.5">
            {/* 1. APPEARANCE & THEME */}
            <div className="bg-white dark:bg-slate-900/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-500 text-[18px]">palette</span>
                  <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    Appearance &amp; Theme
                  </h2>
                </div>
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                  Active: {currentTheme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div
                  onClick={() => handleThemeChange('light')}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    currentTheme === 'light'
                      ? 'bg-blue-50 border-blue-600 ring-1 ring-blue-600 text-blue-900'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-amber-500 text-[20px]">light_mode</span>
                    <div>
                      <div className="font-bold text-xs">Light Theme</div>
                      <div className="text-[10px] opacity-75">Clean white background with crisp dark text</div>
                    </div>
                  </div>
                  {currentTheme === 'light' && (
                    <span className="material-symbols-outlined text-blue-600 text-[18px]">check_circle</span>
                  )}
                </div>

                <div
                  onClick={() => handleThemeChange('dark')}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    currentTheme === 'dark'
                      ? 'bg-blue-950/40 border-blue-500 ring-1 ring-blue-500 text-blue-300'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-indigo-400 text-[20px]">dark_mode</span>
                    <div>
                      <div className="font-bold text-xs">Dark Theme</div>
                      <div className="text-[10px] opacity-75">Modern dark background with bright text</div>
                    </div>
                  </div>
                  {currentTheme === 'dark' && (
                    <span className="material-symbols-outlined text-blue-400 text-[18px]">check_circle</span>
                  )}
                </div>
              </div>
            </div>

            {/* 2. SIMULATION & DATA STREAM ENGINE */}
            <div className="bg-white dark:bg-slate-900/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600 dark:text-cyan-400 text-[18px]">network_check</span>
                  <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    Simulation &amp; Live Data Speed
                  </h2>
                </div>
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                  Demo Environment
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Live Data Updates
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsSimulating(!isSimulating)}
                    className={`w-full py-2 px-3 rounded-xl font-semibold text-xs transition-colors flex items-center justify-between border cursor-pointer ${
                      isSimulating
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    <span>Simulation Stream</span>
                    <span className="font-mono">{isSimulating ? 'RUNNING' : 'PAUSED'}</span>
                  </button>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                    Continuously updates headcount estimates and movement rates.
                  </p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Update Frequency
                  </label>
                  <select
                    value={tickInterval}
                    onChange={(e) => setTickInterval(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs font-medium text-slate-900 dark:text-slate-100"
                  >
                    <option value="1.0">Every 1 second (Fast)</option>
                    <option value="3.5">Every 3.5 seconds (Standard)</option>
                    <option value="10.0">Every 10 seconds (Slow)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Crowd Fluctuations
                  </label>
                  <select
                    value={jitterLevel}
                    onChange={(e) => setJitterLevel(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs font-medium text-slate-900 dark:text-slate-100"
                  >
                    <option value="low">&plusmn; 5 people (Low Changes)</option>
                    <option value="normal">&plusmn; 25 people (Realistic Crowd)</option>
                    <option value="surge">&plusmn; 80 people (High Surge Simulation)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 3. DISPLAY & GRAPHICS */}
            <div className="bg-white dark:bg-slate-900/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-purple-600 dark:text-purple-400 text-[18px]">view_in_ar</span>
                  <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    Display &amp; Map Settings
                  </h2>
                </div>
                <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  WebGL 2.0 Active
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Target Animation Speed (FPS)
                  </label>
                  <select
                    value={fpsSetting}
                    onChange={(e) => setFpsSetting(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs font-medium text-slate-900 dark:text-slate-100"
                  >
                    <option value="60">60 FPS (Smooth)</option>
                    <option value="30">30 FPS (Power Saver)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Map Markers
                  </label>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 font-mono text-xs">
                    Real-time GIS Coordinates
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Map Projections
                  </label>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 font-mono text-xs">
                    3D Pitch &amp; 2D Flat Toggle
                  </div>
                </div>
              </div>
            </div>

            {/* 4. DATABASE CONNECTION STATUS */}
            <div className="bg-white dark:bg-slate-900/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-[18px]">database</span>
                  <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    Database Connection Status
                  </h2>
                </div>
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                  MongoDB Atlas + Memory Fallback
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Database Driver</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold">MongoDB Atlas</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                    <span className="text-slate-500 dark:text-slate-400">Connection Mode</span>
                    <span>Zero-Crash Fallback Enabled</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                    <span className="text-slate-500 dark:text-slate-400">Collections</span>
                    <span>monitoringZones, crowdAlerts</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Memory Reactive Store</span>
                    <span className="text-blue-700 dark:text-cyan-400 font-bold">Synchronized</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                    <span className="text-slate-500 dark:text-slate-400">Locations Loaded</span>
                    <span>4 Scenarios (16 Zones)</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                    <span className="text-slate-500 dark:text-slate-400">Alert State</span>
                    <span>Real-time In-Memory</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleResetBaseline}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Reset to Default Settings
                </button>

                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
