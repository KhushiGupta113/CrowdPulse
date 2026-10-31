'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Header3D from '@/components/Header3D';
import Sidebar3D from '@/components/Sidebar3D';
import ZoneInspector from '@/components/3d/ZoneInspector';
import { ScenarioType, ScenarioConfig, ZoneData, SCENARIO_CONFIGS } from '@/lib/3d/scenarios';

const CrowdMap = dynamic(() => import('@/components/3d/CrowdMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[520px] bg-slate-100 dark:bg-slate-950 rounded-2xl flex items-center justify-center border border-slate-200 dark:border-slate-800">
      <div className="flex flex-col items-center gap-2 text-blue-600 dark:text-cyan-400">
        <span className="material-symbols-outlined text-3xl animate-spin">sync</span>
        <span className="text-xs font-mono font-semibold">LOADING MAP...</span>
      </div>
    </div>
  ),
});

export default function AreaExplorerPage() {
  const [selectedScenarioId, setSelectedScenarioId] = useState<ScenarioType>('open-ground');
  const [scenarioData, setScenarioData] = useState<ScenarioConfig>(SCENARIO_CONFIGS['open-ground']);
  const [selectedZone, setSelectedZone] = useState<ZoneData>(SCENARIO_CONFIGS['open-ground'].zones[0]);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'open' | 'commercial' | 'transit' | 'campus'>('all');

  // Map layer controls
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showFlow, setShowFlow] = useState(true);
  const [showFootprints, setShowFootprints] = useState(true);
  const [is2D, setIs2D] = useState(false);

  useEffect(() => {
    async function fetchScenario() {
      try {
        const res = await fetch(`/api/3d/scenarios/${selectedScenarioId}`);
        const json = await res.json();
        if (json.success && json.data) {
          setScenarioData(json.data);
          setSelectedZone(json.data.zones[0]);
        }
      } catch (e) {
        setScenarioData(SCENARIO_CONFIGS[selectedScenarioId]);
        setSelectedZone(SCENARIO_CONFIGS[selectedScenarioId].zones[0]);
      }
    }
    fetchScenario();
  }, [selectedScenarioId]);

  const scenariosList = [
    {
      id: 'open-ground' as ScenarioType,
      category: 'open',
      title: 'Central Park Festival Grounds',
      sector: 'Open Grounds',
      badge: 'Moderate Crowd',
      badgeColor: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      description: 'Concert lawns, stage areas, and pedestrian pathways.',
      currentOccupancy: 8420,
      capacityTotal: 12000,
      activeAlerts: 4,
      status: 'warning',
    },
    {
      id: 'urban-intersection' as ScenarioType,
      category: 'commercial',
      title: 'Times Square Commercial Scramble',
      sector: 'Commercial Plaza',
      badge: 'High Crowd',
      badgeColor: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
      description: 'Broadway pedestrian plazas and high-density tourist intersections.',
      currentOccupancy: 11200,
      capacityTotal: 14000,
      activeAlerts: 6,
      status: 'critical',
    },
    {
      id: 'university-campus' as ScenarioType,
      category: 'campus',
      title: 'Columbia University Quad',
      sector: 'Campus',
      badge: 'Normal Crowd',
      badgeColor: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      description: 'Central campus library plaza, dorm gateways, and dining halls.',
      currentOccupancy: 4650,
      capacityTotal: 7500,
      activeAlerts: 1,
      status: 'safe',
    },
    {
      id: 'transport-hub' as ScenarioType,
      category: 'transit',
      title: 'Grand Central Terminal',
      sector: 'Transit Hub',
      badge: 'High Rush',
      badgeColor: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
      description: 'Main concourse train gates, subway corridors, and street ramps.',
      currentOccupancy: 13350,
      capacityTotal: 15500,
      activeAlerts: 5,
      status: 'critical',
    },
  ];

  const filteredScenarios = scenariosList.filter((sc) => {
    if (categoryFilter === 'all') return true;
    return sc.category === categoryFilter;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070b14] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-150">
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

        <main className="ml-60 mt-14 p-4 space-y-4 flex-1 overflow-x-hidden">
          {/* Top Title & Navigation */}
          <div className="bg-white dark:bg-slate-900/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-cyan-400 flex items-center justify-center border border-blue-200 dark:border-blue-800/60 shadow-xs">
                <span className="material-symbols-outlined text-[18px]">map</span>
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
                  Area Map &amp; Locations
                </h1>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Switch between all 4 monitored locations and view live crowd density.
                </p>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <button
                onClick={() => setCategoryFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  categoryFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All (4)
              </button>
              <button
                onClick={() => setCategoryFilter('open')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  categoryFilter === 'open'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Open Grounds
              </button>
              <button
                onClick={() => setCategoryFilter('commercial')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  categoryFilter === 'commercial'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Commercial
              </button>
              <button
                onClick={() => setCategoryFilter('transit')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  categoryFilter === 'transit'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Transit
              </button>
              <button
                onClick={() => setCategoryFilter('campus')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  categoryFilter === 'campus'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Campus
              </button>
            </div>
          </div>

          {/* Dual Column Layout: Location Catalog on Left + Map & Inspector on Right */}
          <div className="grid grid-cols-12 gap-3 items-start">
            {/* Left 4 Cols: Location Cards */}
            <div className="col-span-12 xl:col-span-4 space-y-2.5">
              {filteredScenarios.map((sc) => {
                const isSelected = sc.id === selectedScenarioId;
                const occPercent = Math.round((sc.currentOccupancy / sc.capacityTotal) * 100);

                return (
                  <div
                    key={sc.id}
                    onClick={() => setSelectedScenarioId(sc.id)}
                    className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-600 shadow-sm ring-1 ring-blue-600'
                        : 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            sc.status === 'critical'
                              ? 'bg-rose-500 animate-ping'
                              : sc.status === 'warning'
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                        />
                        <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100">{sc.title}</h3>
                      </div>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-semibold ${sc.badgeColor}`}
                      >
                        {sc.badge}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">{sc.description}</p>

                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs font-mono mb-2">
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-sans">PEOPLE PRESENT</span>
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {sc.currentOccupancy.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-sans">CAPACITY USED</span>
                        <span
                          className={`text-sm font-bold ${
                            occPercent >= 85
                              ? 'text-rose-600 dark:text-rose-400'
                              : occPercent >= 75
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-emerald-700 dark:text-emerald-400'
                          }`}
                        >
                          {occPercent}%
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-sans">
                      <span>{sc.sector}</span>
                      <span className="font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">warning</span>
                        {sc.activeAlerts} alerts
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right 8 Cols: 3D Map Viewport & Zone Breakdown */}
            <div className="col-span-12 xl:col-span-8 space-y-3">
              {/* Map Container */}
              <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col transition-colors">
                {/* Header Strip with Controls */}
                <div className="p-3 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 dark:bg-cyan-400 animate-pulse"></span>
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100">{scenarioData.name}</span>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">{scenarioData.realLocationName}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs">
                    <button
                      onClick={() => setShowFlow(!showFlow)}
                      className={`px-2.5 py-1 rounded-lg border font-semibold text-[11px] transition-colors ${
                        showFlow
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-400'
                      }`}
                    >
                      Flow
                    </button>
                    <button
                      onClick={() => setIs2D(!is2D)}
                      className={`px-2.5 py-1 rounded-lg border font-semibold text-[11px] transition-colors ${
                        is2D
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-400'
                      }`}
                    >
                      {is2D ? '2D View' : '3D View'}
                    </button>
                  </div>
                </div>

                {/* Map Component */}
                <div className="relative">
                  <CrowdMap
                    scenario={selectedScenarioId}
                    selectedZone={selectedZone}
                    onSelectZone={(zone) => setSelectedZone(zone)}
                    showFlow={showFlow}
                    is2D={is2D}
                  />
                </div>
              </div>

              {/* Sub-Zones Breakdown Grid */}
              <div className="bg-white dark:bg-slate-900/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5 transition-colors">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    Monitored Zones in {scenarioData.name}
                  </h3>
                  <Link
                    href={`/zone-telemetry`}
                    className="text-xs text-blue-600 dark:text-cyan-400 hover:underline font-semibold flex items-center gap-1"
                  >
                    View Details <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  {scenarioData.zones.map((zone) => {
                    const ratio = Math.round((zone.occupancy / zone.capacity) * 100);
                    const isZoneSelected = selectedZone?.id === zone.id;

                    return (
                      <div
                        key={zone.id}
                        onClick={() => setSelectedZone(zone)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          isZoneSelected
                            ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">
                            {zone.name}
                          </span>
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase ${
                              zone.status === 'critical'
                                ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                                : zone.status === 'warning'
                                ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                                : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                            }`}
                          >
                            {zone.status}
                          </span>
                        </div>

                        <div className="flex items-baseline justify-between text-xs font-mono my-1">
                          <span className="text-slate-800 dark:text-slate-200 font-bold">{Math.round(zone.occupancy)}</span>
                          <span className="text-[10px] text-slate-400">/ {zone.capacity}</span>
                        </div>

                        <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              zone.status === 'critical'
                                ? 'bg-rose-600'
                                : zone.status === 'warning'
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, ratio)}%` }}
                          />
                        </div>

                        <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                          <span>{zone.density} p/m²</span>
                          <span>{ratio}% Full</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
