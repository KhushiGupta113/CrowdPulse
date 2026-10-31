'use client';

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Header3D from '@/components/Header3D';
import Sidebar3D from '@/components/Sidebar3D';
import ZoneInspector from '@/components/3d/ZoneInspector';
import XGBoostForecastCard from '@/components/3d/XGBoostForecastCard';
import { ScenarioType, ScenarioConfig, ZoneData, CrowdAlert, SCENARIO_CONFIGS } from '@/lib/3d/scenarios';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from 'recharts';

// Dynamically load WebGL GIS Map on client only
const CrowdMap = dynamic(() => import('@/components/3d/CrowdMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[580px] bg-[#070b14] rounded-2xl flex items-center justify-center border border-slate-800">
      <div className="flex flex-col items-center gap-2 text-cyan-400">
        <span className="material-symbols-outlined text-3xl animate-spin">sync</span>
        <span className="text-xs font-mono font-semibold tracking-wider">INITIALIZING GIS ENGINE...</span>
      </div>
    </div>
  ),
});

export default function DashboardPage() {
  const [activeScenario, setActiveScenario] = useState<ScenarioType>('open-ground');
  const [scenarioData, setScenarioData] = useState<ScenarioConfig>(SCENARIO_CONFIGS['open-ground']);
  const [selectedZone, setSelectedZone] = useState<ZoneData>(SCENARIO_CONFIGS['open-ground'].zones[0]);
  const [targetZoneId, setTargetZoneId] = useState<string | null>(null);

  const [showFlow, setShowFlow] = useState(true);
  const [showGates, setShowGates] = useState(true);
  const [is2D, setIs2D] = useState(false);

  // Simulation controls
  const [isSimulating, setIsSimulating] = useState(true);

  // Analytics State
  const [analyticsTimeRange, setAnalyticsTimeRange] = useState<'live' | '15m' | '1h' | '4h'>('live');

  // Dedicated Alert Modal State
  const [inspectingAlert, setInspectingAlert] = useState<CrowdAlert | null>(null);
  const [alertFeedback, setAlertFeedback] = useState<string | null>(null);

  // Check URL query parameters for scenario and zone focus
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const scParam = params.get('scenario') as ScenarioType | null;
    const zoneParam = params.get('zone');

    if (scParam && SCENARIO_CONFIGS[scParam]) {
      setActiveScenario(scParam);
    }
    if (zoneParam) {
      setTargetZoneId(zoneParam);
    }
  }, []);

  // Fetch or update scenario when scenario changes
  useEffect(() => {
    async function loadScenario() {
      try {
        const res = await fetch(`/api/3d/scenarios/${activeScenario}`);
        const json = await res.json();
        if (json.success && json.data) {
          setScenarioData(json.data);
          if (targetZoneId) {
            const matched = json.data.zones.find((z: ZoneData) => z.id === targetZoneId);
            setSelectedZone(matched || json.data.zones[0]);
          } else {
            setSelectedZone(json.data.zones[0]);
          }
        }
      } catch (e) {
        setScenarioData(SCENARIO_CONFIGS[activeScenario]);
        setSelectedZone(SCENARIO_CONFIGS[activeScenario].zones[0]);
      }
    }
    loadScenario();
  }, [activeScenario, targetZoneId]);

  const handleResetView = () => {
    setIs2D(false);
    setShowFlow(true);
    setShowGates(true);
  };

  // Periodic Telemetry Simulation Tick
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/3d/scenarios/${activeScenario}?tick=true`);
        const json = await res.json();
        if (json.success && json.data) {
          setScenarioData(json.data);
          const updated = json.data.zones.find((z: ZoneData) => z.id === selectedZone?.id);
          if (updated) setSelectedZone(updated);
        }
      } catch (e) {}
    }, 4000);

    return () => clearInterval(interval);
  }, [isSimulating, activeScenario, selectedZone?.id]);

  const handleScenarioChange = (type: ScenarioType) => {
    setActiveScenario(type);
  };

  // Alert Action Handlers
  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      const res = await fetch('/api/3d/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId: activeScenario,
          alertId,
          status: 'investigating',
        }),
      });
      const json = await res.json();
      if (json.success) {
        setScenarioData((prev) => ({
          ...prev,
          alerts: prev.alerts.map((a) => (a.id === alertId ? { ...a, status: 'investigating' } : a)),
        }));
        if (inspectingAlert?.id === alertId) {
          setInspectingAlert((prev) => (prev ? { ...prev, status: 'investigating' } : null));
        }
        setAlertFeedback(`Alert ${alertId} acknowledged (Investigating status).`);
        setTimeout(() => setAlertFeedback(null), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      const res = await fetch('/api/3d/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId: activeScenario,
          alertId,
          status: 'resolved',
        }),
      });
      const json = await res.json();
      if (json.success) {
        setScenarioData((prev) => {
          const updatedAlerts = prev.alerts.map((a) => (a.id === alertId ? { ...a, status: 'resolved' as const } : a));
          const remainingActive = updatedAlerts.filter((a) => a.status === 'active' || a.status === 'investigating');
          
          // Re-evaluate zone status dynamically
          const resolvedAlert = prev.alerts.find((a) => a.id === alertId);
          const updatedZones = prev.zones.map((z) => {
            if (resolvedAlert && z.id === resolvedAlert.zoneId) {
              const hasRemainingCritical = remainingActive.some((a) => a.zoneId === z.id && a.severity === 'critical');
              const hasRemainingWarning = remainingActive.some((a) => a.zoneId === z.id && a.severity === 'warning');
              return {
                ...z,
                status: hasRemainingCritical ? ('critical' as const) : hasRemainingWarning ? ('warning' as const) : ('safe' as const),
              };
            }
            return z;
          });

          return {
            ...prev,
            zones: updatedZones,
            alerts: updatedAlerts,
            activeAlertsCount: remainingActive.length,
          };
        });

        // Also update selectedZone if it was the affected zone
        setSelectedZone((prev) => {
          const alertObj = scenarioData.alerts.find((a) => a.id === alertId);
          if (prev && alertObj && prev.id === alertObj.zoneId) {
            return { ...prev, status: 'safe' };
          }
          return prev;
        });

        if (inspectingAlert?.id === alertId) {
          setInspectingAlert((prev) => (prev ? { ...prev, status: 'resolved' } : null));
        }
        setAlertFeedback(`Alert ${alertId} marked as RESOLVED. Map status and chokepoint markers cleared!`);
        setTimeout(() => setAlertFeedback(null), 3500);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Mathematically consistent metrics derived from genuine scenario & zone data
  const occupancyRatio = Math.round((scenarioData.totalPresent / scenarioData.capacityTotal) * 100);
  const criticalZones = scenarioData.zones.filter((z) => z.status === 'critical');
  const warningZones = scenarioData.zones.filter((z) => z.status === 'warning');
  const safeZones = scenarioData.zones.filter((z) => z.status === 'safe');

  const totalInflow = scenarioData.zones.reduce((sum, z) => sum + z.inflowRate, 0);
  const totalOutflow = scenarioData.zones.reduce((sum, z) => sum + z.outflowRate, 0);
  const netFlow = totalInflow - totalOutflow;

  const maxDensityZone = scenarioData.zones.reduce(
    (max, z) => (z.density > max.density ? z : max),
    scenarioData.zones[0]
  );

  // Genuine aggregate headcount trend calculated from sum of zone trends
  const aggregateHeadcountTrend = useMemo(() => {
    const trendLengths = scenarioData.zones.map((z) => z.trend.length);
    const numPoints = Math.min(...trendLengths, 5);
    return Array.from({ length: numPoints }, (_, idx) => {
      return scenarioData.zones.reduce((acc, z) => acc + (z.trend[idx] || z.occupancy), 0);
    });
  }, [scenarioData.zones]);

  // Analytics: Flow Dynamics comparison (Entering vs Leaving)
  const flowDynamicsData = useMemo(() => {
    return scenarioData.zones.map((z) => ({
      name: z.name.split(':')[0],
      fullName: z.name,
      entering: z.inflowRate,
      leaving: z.outflowRate,
      net: z.inflowRate - z.outflowRate,
    }));
  }, [scenarioData.zones]);

  // Analytics: Historical Density progression with genuine trend
  const historicalDensityData = useMemo(() => {
    const labels = ['-20m', '-15m', '-10m', '-5m', 'Now'];
    return labels.map((time, idx) => {
      const point: any = { time };
      scenarioData.zones.forEach((z) => {
        const occ = z.trend[idx] || z.occupancy;
        const radius = z.radius || 6;
        const area = radius * radius * Math.PI;
        point[z.name.split(':')[0]] = parseFloat((occ / area).toFixed(2));
      });
      return point;
    });
  }, [scenarioData.zones]);

  const scenarioTabs = [
    { id: 'open-ground' as ScenarioType, name: 'Central Park Festival', sector: 'Sector 01', icon: 'park' },
    { id: 'urban-intersection' as ScenarioType, name: 'Times Square Commercial', sector: 'Sector 02', icon: 'traffic' },
    { id: 'university-campus' as ScenarioType, name: 'Columbia University Quad', sector: 'Sector 03', icon: 'school' },
    { id: 'transport-hub' as ScenarioType, name: 'Grand Central Terminal', sector: 'Sector 04', icon: 'train' },
  ];

  // Colors for multi-zone density lines
  const zoneColors = ['#06b6d4', '#f59e0b', '#10b981', '#f43f5e', '#818cf8'];

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans transition-colors duration-150">
      <Header3D
        scenarioName={scenarioData.subtitle}
        sectorTag={scenarioData.sectorTag}
        activeAlertsCount={scenarioData.activeAlertsCount}
      />

      <div className="flex flex-1">
        <Sidebar3D
          sectorName={scenarioData.sectorTag}
          alertsCount={scenarioData.activeAlertsCount}
        />

        {/* Main Content Dashboard */}
        <main className="ml-60 mt-14 p-4 space-y-4 flex-1 overflow-x-hidden min-w-0">
          {/* Global Alert Notification Toast */}
          {alertFeedback && (
            <div className="p-3 rounded-xl bg-cyan-950/90 border border-cyan-500/80 text-cyan-200 text-xs font-mono flex items-center justify-between shadow-xl animate-fade-in">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-cyan-400">check_circle</span>
                <span>{alertFeedback}</span>
              </div>
              <button onClick={() => setAlertFeedback(null)} className="text-cyan-400 hover:text-white">
                ✕
              </button>
            </div>
          )}

          {/* 1. TOP SUMMARY KPI CARDS */}
          <section aria-label="Crowd Overview Cards" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
            {/* Card 1: Total People Present */}
            <div className="bg-[#0b1222]/90 p-4 rounded-2xl border border-slate-800 shadow-xl flex flex-col justify-between transition-colors relative overflow-hidden group">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider font-mono">
                  Total People Present
                </span>
                <div className="w-8 h-8 rounded-xl bg-cyan-950/80 text-cyan-400 flex items-center justify-center border border-cyan-800/60 shadow-xs">
                  <span className="material-symbols-outlined text-[18px]">groups</span>
                </div>
              </div>

              <div className="my-1 flex items-baseline justify-between">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold font-mono text-white tracking-tight">
                    {scenarioData.totalPresent.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">/ {scenarioData.capacityTotal.toLocaleString()}</span>
                </div>

                {/* Mini SVG Sparkline */}
                <div className="w-20 h-7" title="Recent aggregate occupancy trend">
                  <svg viewBox="0 0 80 28" className="w-full h-full overflow-visible">
                    <polyline
                      fill="none"
                      stroke="#06b6d4"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={aggregateHeadcountTrend
                        .map((val, idx) => {
                          const min = Math.min(...aggregateHeadcountTrend) * 0.98;
                          const max = Math.max(...aggregateHeadcountTrend) * 1.02;
                          const x = (idx / (aggregateHeadcountTrend.length - 1 || 1)) * 80;
                          const y = 28 - ((val - min) / (max - min || 1)) * 24;
                          return `${x},${y}`;
                        })
                        .join(' ')}
                    />
                  </svg>
                </div>
              </div>

              <div className="mt-2 pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
                <span className="text-cyan-400 font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px]">trending_up</span>
                  +{scenarioData.influxRatePercent}% Influx
                </span>
                <span className="text-slate-400">{occupancyRatio}% of Venue Cap</span>
              </div>

              <div className="w-full bg-slate-900 h-2 rounded-full mt-2 overflow-hidden border border-slate-800">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, occupancyRatio)}%` }}
                />
              </div>
            </div>

            {/* Card 2: High Density Areas */}
            <div className="bg-[#0b1222]/90 p-4 rounded-2xl border border-slate-800 shadow-xl flex flex-col justify-between transition-colors">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider font-mono">
                  High Density Areas
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-950/80 text-amber-400 flex items-center justify-center border border-amber-800/60 shadow-xs">
                  <span className="material-symbols-outlined text-[18px]">warning</span>
                </div>
              </div>

              <div className="my-1 flex items-baseline justify-between">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold font-mono text-amber-400 tracking-tight">
                    {criticalZones.length + warningZones.length} Areas
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">/ {scenarioData.zones.length} Total</span>
                </div>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-800/60">
                  {criticalZones.length > 0 ? 'Surge Active' : 'Monitored'}
                </span>
              </div>

              <div className="mt-2 pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
                <span className="text-rose-400 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                  {criticalZones.length} Critical
                </span>
                <span className="text-amber-400">
                  {warningZones.length} Warning
                </span>
                <span className="text-emerald-400">
                  {safeZones.length} Safe
                </span>
              </div>

              {/* Exact mathematical proportional bar */}
              <div className="w-full bg-slate-900 h-2 rounded-full mt-2 overflow-hidden flex border border-slate-800">
                <div
                  className="bg-rose-500 h-full transition-all duration-500"
                  style={{ width: `${(criticalZones.length / scenarioData.zones.length) * 100}%` }}
                  title={`${criticalZones.length} Critical Zones`}
                />
                <div
                  className="bg-amber-400 h-full transition-all duration-500"
                  style={{ width: `${(warningZones.length / scenarioData.zones.length) * 100}%` }}
                  title={`${warningZones.length} Warning Zones`}
                />
                <div
                  className="bg-emerald-500 h-full transition-all duration-500"
                  style={{ width: `${(safeZones.length / scenarioData.zones.length) * 100}%` }}
                  title={`${safeZones.length} Safe Zones`}
                />
              </div>
            </div>

            {/* Card 3: Safety Alerts */}
            <Link
              href="/alerts"
              className="bg-[#0b1222]/90 p-4 rounded-2xl border border-slate-800 hover:border-rose-800 shadow-xl flex flex-col justify-between transition-colors group cursor-pointer"
            >
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider font-mono text-rose-400">
                  Active Emergency Alerts
                </span>
                <div className="w-8 h-8 rounded-xl bg-rose-950/80 text-rose-400 flex items-center justify-center border border-rose-800/60 group-hover:scale-105 transition-transform shadow-xs">
                  <span className="material-symbols-outlined text-[18px]">notification_important</span>
                </div>
              </div>

              <div className="my-1 flex items-baseline justify-between">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold font-mono text-rose-400 tracking-tight">
                    {scenarioData.activeAlertsCount}
                  </span>
                  <span className="text-xs text-rose-400 font-semibold font-mono">
                    {scenarioData.activeAlertsCount === 1 ? 'Alert Active' : 'Alerts Active'}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-cyan-400 font-semibold flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                  Manage <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </span>
              </div>

              <div className="mt-2 pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
                <span>
                  {scenarioData.alerts.filter((a) => a.severity === 'critical' && a.status !== 'resolved').length} Critical
                </span>
                <span>•</span>
                <span>
                  {scenarioData.alerts.filter((a) => a.severity === 'warning' && a.status !== 'resolved').length} Warning
                </span>
                <span>•</span>
                <span className="text-emerald-400">
                  {scenarioData.alerts.filter((a) => a.status === 'resolved').length} Resolved
                </span>
              </div>

              <div className="w-full bg-slate-900 h-2 rounded-full mt-2 overflow-hidden border border-slate-800">
                <div className="bg-rose-500 h-full rounded-full animate-pulse" style={{ width: '100%' }} />
              </div>
            </Link>

            {/* Card 4: Movement Speed & Circulation */}
            <div className="bg-[#0b1222]/90 p-4 rounded-2xl border border-slate-800 shadow-xl flex flex-col justify-between transition-colors">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider font-mono">
                  Movement Speed &amp; Flow
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-950/80 text-emerald-400 flex items-center justify-center border border-emerald-800/60 shadow-xs">
                  <span className="material-symbols-outlined text-[18px]">sync_alt</span>
                </div>
              </div>

              <div className="my-1 flex items-baseline justify-between">
                <div className="flex items-baseline gap-1">
                  <span
                    className={`text-3xl font-bold font-mono tracking-tight ${
                      netFlow >= 0 ? 'text-emerald-400' : 'text-cyan-400'
                    }`}
                  >
                    {netFlow > 0 ? `+${netFlow}` : netFlow}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">p/min</span>
                </div>
                <div className="text-[10px] font-mono text-slate-300">
                  <span className="text-cyan-400">↑{totalInflow}</span> / <span className="text-amber-400">↓{totalOutflow}</span>
                </div>
              </div>

              <div className="mt-2 pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Circulation:</span>
                <span className="text-emerald-400 font-semibold">
                  {Math.abs(netFlow) > 200 ? 'Surge Influx' : 'Fluid Circulation'}
                </span>
              </div>

              <div className="w-full bg-slate-900 h-2 rounded-full mt-2 overflow-hidden border border-slate-800">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: '80%' }} />
              </div>
            </div>
          </section>

          {/* 2. LIVE MAP & ZONE INSPECTOR CENTERPIECE */}
          <section aria-label="Map and Zone Details" className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
            {/* Map Container (8 cols) */}
            <div className="lg:col-span-8 space-y-3.5">
              <div className="bg-[#0b1222]/95 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col transition-colors">
                {/* Scenario Tabs Header */}
              <div className="px-3.5 py-2.5 bg-[#070b14] border-b border-slate-800 flex flex-wrap items-center justify-between gap-2.5 select-none">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
                  <span className="font-bold text-xs text-slate-100 font-mono tracking-wide uppercase">
                    Tactical GIS Command View
                  </span>
                </div>

                {/* 4 Clean Scenario Switcher Pills */}
                <div className="flex items-center bg-slate-900 p-0.5 rounded-xl text-xs font-medium border border-slate-800">
                  {scenarioTabs.map((tab) => {
                    const isSelected = activeScenario === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => handleScenarioChange(tab.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-900/30'
                            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[15px]">{tab.icon}</span>
                        <span className="hidden sm:inline font-mono">{tab.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Real-time Map Container */}
              <div className="relative">
                <CrowdMap
                  scenario={scenarioData}
                  alerts={scenarioData.alerts}
                  selectedZone={selectedZone}
                  onSelectZone={(z) => setSelectedZone(z)}
                  onResetView={handleResetView}
                  showFlow={showFlow}
                  showGates={showGates}
                  is2D={is2D}
                  className="h-[580px] xl:h-[620px]"
                />
              </div>

              {/* Map Layer Controls Toolbar */}
              <div className="px-3.5 py-2.5 bg-[#070b14] border-t border-slate-800 flex flex-wrap items-center justify-between gap-2.5 text-xs font-mono">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mr-1">
                    LAYERS:
                  </span>
                  <button
                    onClick={() => setShowFlow(!showFlow)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      showFlow
                        ? 'bg-blue-950/80 text-blue-300 border-blue-700/80'
                        : 'bg-slate-900 border-slate-800 text-slate-500'
                    }`}
                  >
                    Flow Corridors {showFlow ? '✓' : '✗'}
                  </button>
                  <button
                    onClick={() => setShowGates(!showGates)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      showGates
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80'
                        : 'bg-slate-900 border-slate-800 text-slate-500'
                    }`}
                  >
                    Entry / Exit Gates {showGates ? '✓' : '✗'}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {/* 2D / 3D Perspective Toggle */}
                  <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[11px]">
                    <button
                      onClick={() => setIs2D(false)}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                        !is2D ? 'bg-cyan-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      3D Pitch
                    </button>
                    <button
                      onClick={() => setIs2D(true)}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                        is2D ? 'bg-cyan-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      2D Overhead
                    </button>
                  </div>

                  {/* Simulation Stream Controls */}
                  <button
                    onClick={() => setIsSimulating(!isSimulating)}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                      isSimulating
                        ? 'bg-emerald-950/70 border-emerald-800 text-emerald-300'
                        : 'bg-amber-950/70 border-amber-800 text-amber-300'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]">
                      {isSimulating ? 'pause' : 'play_arrow'}
                    </span>
                    <span>{isSimulating ? 'Stream Live' : 'Paused'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* XGBoost Crowd Density Predictive Forecast (Directly Below Map) */}
            {selectedZone && (
              <XGBoostForecastCard
                locationName={scenarioData.realLocationName}
                zoneName={selectedZone.name}
                occupancy={selectedZone.occupancy}
                capacity={selectedZone.capacity}
                inflowRate={selectedZone.inflowRate}
                outflowRate={selectedZone.outflowRate}
                trend={selectedZone.trend}
                venueTotalPresent={scenarioData.totalPresent}
                venueCapacityTotal={scenarioData.capacityTotal}
                venueNetFlowRate={scenarioData.netFlowRate}
                allZones={scenarioData.zones}
                onSelectZone={(z) => setSelectedZone(z)}
              />
            )}
          </div>

          {/* Zone Inspector Panel (4 cols) */}
          <div className="lg:col-span-4 space-y-3.5">
            <ZoneInspector
              zone={selectedZone}
              allZones={scenarioData.zones}
              onSelectZone={(z) => setSelectedZone(z)}
            />
          </div>
        </section>

          {/* 3. NEW: REAL-TIME CROWD FLOW & HISTORICAL ANALYTICS */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
            {/* Left: Entering vs Leaving Traffic Comparison (6 cols) */}
            <div className="lg:col-span-6 bg-[#0b1222]/90 rounded-2xl border border-slate-800 shadow-xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-cyan-400 text-[18px]">compare_arrows</span>
                  <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono">
                    Crowd-Flow Circulation: Entering vs Leaving
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-cyan-400 font-semibold bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60">
                  Per-Zone Traffic (p/min)
                </span>
              </div>

              <div className="h-60 w-full pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={flowDynamicsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#070b14',
                        borderColor: '#334155',
                        borderRadius: '0.75rem',
                        fontSize: '11px',
                        color: '#f8fafc',
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                      formatter={(val) => <span className="text-slate-300 font-mono">{val}</span>}
                    />
                    <Bar dataKey="entering" name="Entering (+Inflow)" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="leaving" name="Leaving (-Outflow)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Right: Historical Crowd-Density Chart with Selectable Ranges (6 cols) */}
            <div className="lg:col-span-6 bg-[#0b1222]/90 rounded-2xl border border-slate-800 shadow-xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between pb-2 border-b border-slate-800 gap-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-cyan-400 text-[18px]">show_chart</span>
                  <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono">
                    Historical Crowd Density (p/m²)
                  </h3>
                </div>

                {/* Range Selector */}
                <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[10.5px] font-mono">
                  {(['live', '15m', '1h', '4h'] as const).map((rng) => (
                    <button
                      key={rng}
                      onClick={() => setAnalyticsTimeRange(rng)}
                      className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                        analyticsTimeRange === rng
                          ? 'bg-blue-600 text-white font-semibold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {rng === 'live' ? 'Live' : rng}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chart or Honest Empty State */}
              {analyticsTimeRange === '4h' ? (
                <div className="h-60 w-full flex flex-col items-center justify-center text-center p-6 bg-slate-950/60 rounded-xl border border-slate-800/80">
                  <span className="material-symbols-outlined text-3xl text-slate-600 mb-2">database</span>
                  <div className="text-xs font-semibold text-slate-300 font-mono">No 4-Hour Archived Log</div>
                  <p className="text-[11px] text-slate-500 max-w-sm mt-1">
                    Telemetry buffer is currently logging real-time stream. Older historical windows will populate as session data accumulates.
                  </p>
                  <button
                    onClick={() => setAnalyticsTimeRange('live')}
                    className="mt-3 px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer"
                  >
                    Switch to Live Window
                  </button>
                </div>
              ) : (
                <div className="h-60 w-full pt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={historicalDensityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                      <YAxis stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#070b14',
                          borderColor: '#334155',
                          borderRadius: '0.75rem',
                          fontSize: '11px',
                          color: '#f8fafc',
                        }}
                      />
                      <ReferenceLine y={4.0} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: 'Critical Limit', fill: '#f43f5e', fontSize: 10 }} />
                      {scenarioData.zones.slice(0, 3).map((z, i) => (
                        <Area
                          key={z.id}
                          type="monotone"
                          dataKey={z.name.split(':')[0]}
                          stroke={zoneColors[i]}
                          fill={zoneColors[i]}
                          fillOpacity={0.15}
                        />
                      ))}
                      <Legend
                        wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                        formatter={(val) => <span className="text-slate-300 font-mono">{val}</span>}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </section>

          {/* 4. ACTIVE EMERGENCY & SAFETY ALERTS MANAGEMENT */}
          <section className="bg-[#0b1222]/90 rounded-2xl border border-slate-800 shadow-xl overflow-hidden transition-colors">
            <div className="p-3.5 border-b border-slate-800 bg-[#070b14] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-rose-500 text-[18px]">crisis_alert</span>
                <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono">
                  Active Emergency &amp; Safety Alerts ({scenarioData.name})
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-slate-400">
                  {scenarioData.alerts.filter((a) => a.status !== 'resolved').length} Unresolved
                </span>
                <Link
                  href="/alerts"
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors"
                >
                  Full Alert Log →
                </Link>
              </div>
            </div>

            <div className="divide-y divide-slate-800">
              {scenarioData.alerts.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 font-mono">
                  No alerts logged for this area.
                </div>
              ) : (
                scenarioData.alerts.map((alert) => {
                  const isResolved = alert.status === 'resolved';
                  const isInvestigating = alert.status === 'investigating';
                  return (
                    <div
                      key={alert.id}
                      className={`p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs transition-colors ${
                        isResolved ? 'opacity-60 bg-slate-950/40' : 'hover:bg-slate-900/60'
                      }`}
                    >
                      <div className="space-y-1 max-w-xl">
                        <div className="flex items-center gap-2 font-mono text-[10px]">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold uppercase border ${
                              alert.severity === 'critical'
                                ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                                : alert.severity === 'warning'
                                ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                                : 'bg-blue-950/80 text-cyan-300 border-blue-800'
                            }`}
                          >
                            {alert.severity}
                          </span>
                          <span className="text-slate-400">{alert.id}</span>
                          <span className="text-slate-600">•</span>
                          <span className="text-slate-400">{alert.timestamp}</span>
                          <span className="text-slate-600">•</span>
                          <span className="text-cyan-400">{alert.zoneName}</span>
                        </div>
                        <div className="font-semibold text-slate-100">{alert.title}</div>
                        <div className="text-[11px] text-slate-400">
                          Trigger: <span className="font-mono text-slate-200">{alert.triggerValue}</span>
                        </div>
                        <div className="text-[11px] text-cyan-300/90 font-mono">
                          Recommended Protocol: {alert.recommendedAction}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 font-mono text-xs shrink-0">
                        <button
                          onClick={() => setInspectingAlert(alert)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                        >
                          Details
                        </button>

                        {!isResolved && !isInvestigating && (
                          <button
                            onClick={() => handleAcknowledgeAlert(alert.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-800 transition-colors cursor-pointer"
                          >
                            Acknowledge
                          </button>
                        )}

                        {!isResolved && (
                          <button
                            onClick={() => handleResolveAlert(alert.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 transition-colors cursor-pointer"
                          >
                            Resolve
                          </button>
                        )}

                        {isResolved && (
                          <span className="text-emerald-400 font-semibold flex items-center gap-1">
                            <span className="material-symbols-outlined text-[15px]">check_circle</span>
                            Resolved
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* 5. HIGH-TRAFFIC BOTTLENECKS TABLE */}
          <section className="bg-[#0b1222]/90 rounded-2xl border border-slate-800 shadow-xl overflow-hidden transition-colors">
            <div className="p-3.5 border-b border-slate-800 bg-[#070b14] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-cyan-400 text-[18px]">alt_route</span>
                <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono">
                  Congestion Chokepoints in {scenarioData.name}
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-400 font-medium">
                {scenarioData.bottlenecks.length} Monitored Corridors
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-[#070b14] text-slate-400 font-semibold text-[10px] uppercase tracking-wider border-b border-slate-800 font-mono">
                  <tr>
                    <th className="py-2.5 px-3.5">ID</th>
                    <th className="py-2.5 px-3.5">Pathway Name</th>
                    <th className="py-2.5 px-3.5">Severity</th>
                    <th className="py-2.5 px-3.5">Restriction Level</th>
                    <th className="py-2.5 px-3.5">Throughput Rate</th>
                    <th className="py-2.5 px-3.5">Flow State</th>
                    <th className="py-2.5 px-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
                  {scenarioData.bottlenecks.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-900/60 transition-colors">
                      <td className="py-2.5 px-3.5 font-bold text-slate-200">{b.id}</td>
                      <td className="py-2.5 px-3.5 font-sans font-semibold text-slate-100">{b.name}</td>
                      <td className="py-2.5 px-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-sans text-[10px] font-semibold uppercase border ${
                            b.severity === 'critical'
                              ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                              : 'bg-amber-950/80 text-amber-300 border-amber-800'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              b.severity === 'critical' ? 'bg-rose-500' : 'bg-amber-500'
                            }`}
                          />
                          {b.severity}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 font-semibold text-slate-200">{b.chokeRatio}% Restricted</td>
                      <td className="py-2.5 px-3.5 text-slate-300">{b.inflowRate} p/min</td>
                      <td className="py-2.5 px-3.5 font-sans text-slate-400">{b.flowStatus}</td>
                      <td className="py-2.5 px-3.5 text-right font-sans">
                        <button
                          onClick={() => {
                            const match = scenarioData.zones.find((z) =>
                              z.name.toLowerCase().includes(b.name.toLowerCase().slice(0, 4))
                            ) || scenarioData.zones[0];
                            setSelectedZone(match);
                          }}
                          className="px-3 py-1 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 font-semibold text-[11px] border border-cyan-800 transition-colors cursor-pointer"
                        >
                          Focus on Map
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 6. RECENT SAFETY ACTIVITY AUDIT LOG */}
          <section className="bg-[#0b1222]/90 rounded-2xl border border-slate-800 shadow-xl p-4 space-y-3 transition-colors">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-cyan-400 text-[18px]">history</span>
                <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono">
                  Live Dispatch &amp; Operator Interventions
                </h3>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 font-semibold bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800">
                Verified Log
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 font-sans">
              {scenarioData.operatorActions.slice(0, 3).map((act) => (
                <div
                  key={act.id}
                  className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between font-mono text-[10px] text-slate-400">
                    <span className="text-cyan-400 font-bold">{act.id}</span>
                    <span>{act.time}</span>
                  </div>
                  <div className="font-semibold text-slate-100">{act.action}</div>
                  <div className="text-[11px] text-slate-400 font-mono">Sector: {act.targetZone}</div>
                  <div className="text-[10px] text-emerald-400 font-semibold font-mono flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    {act.status}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>

      {/* DEDICATED ALERT DETAILS MODAL */}
      {inspectingAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#070b14] border border-slate-700 rounded-2xl shadow-2xl max-w-lg w-full p-5 space-y-4 text-slate-100 font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 font-mono">
                <span
                  className={`px-2 py-0.5 rounded font-bold text-xs uppercase border ${
                    inspectingAlert.severity === 'critical'
                      ? 'bg-rose-950 text-rose-300 border-rose-800'
                      : 'bg-amber-950 text-amber-300 border-amber-800'
                  }`}
                >
                  {inspectingAlert.severity} ALERT
                </span>
                <span className="text-xs text-slate-400">{inspectingAlert.id}</span>
              </div>
              <button
                onClick={() => setInspectingAlert(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="font-bold text-base text-white">{inspectingAlert.title}</h4>
                <div className="text-xs text-cyan-400 font-mono mt-0.5">
                  Zone: {inspectingAlert.zoneName} ({inspectingAlert.zoneId})
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Trigger Parameter:</span>
                  <span className="text-rose-400 font-bold">{inspectingAlert.triggerValue}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Timestamp:</span>
                  <span className="text-slate-200">{inspectingAlert.timestamp}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status:</span>
                  <span
                    className={`font-bold uppercase ${
                      inspectingAlert.status === 'resolved'
                        ? 'text-emerald-400'
                        : inspectingAlert.status === 'investigating'
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {inspectingAlert.status}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-800/60 space-y-1">
                <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Recommended Action Plan:
                </div>
                <p className="text-xs leading-relaxed text-slate-200">
                  {inspectingAlert.recommendedAction}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-2 font-mono text-xs">
              {inspectingAlert.status !== 'resolved' && inspectingAlert.status !== 'investigating' && (
                <button
                  onClick={() => handleAcknowledgeAlert(inspectingAlert.id)}
                  className="px-3 py-1.5 rounded-xl bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-800 transition-colors"
                >
                  Acknowledge
                </button>
              )}
              {inspectingAlert.status !== 'resolved' && (
                <button
                  onClick={() => handleResolveAlert(inspectingAlert.id)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-md transition-colors"
                >
                  Mark as Resolved
                </button>
              )}
              <button
                onClick={() => setInspectingAlert(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}