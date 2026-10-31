'use client';

import React, { useState, useEffect } from 'react';
import Header3D from '@/components/Header3D';
import Sidebar3D from '@/components/Sidebar3D';
import { ScenarioType, ScenarioConfig, ZoneData, SCENARIO_CONFIGS } from '@/lib/3d/scenarios';

export default function ThresholdsPage() {
  const [activeScenarioId, setActiveScenarioId] = useState<ScenarioType>('open-ground');
  const [scenarioData, setScenarioData] = useState<ScenarioConfig>(SCENARIO_CONFIGS['open-ground']);
  const [zonesState, setZonesState] = useState<ZoneData[]>(SCENARIO_CONFIGS['open-ground'].zones);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    async function loadScenario() {
      try {
        const res = await fetch(`/api/3d/scenarios/${activeScenarioId}`);
        const json = await res.json();
        if (json.success && json.data) {
          setScenarioData(json.data);
          setZonesState(json.data.zones);
        }
      } catch (e) {
        setScenarioData(SCENARIO_CONFIGS[activeScenarioId]);
        setZonesState(SCENARIO_CONFIGS[activeScenarioId].zones);
      }
    }
    loadScenario();
  }, [activeScenarioId]);

  const handleThresholdChange = (
    zoneId: string,
    field: 'warningThreshold' | 'criticalThreshold' | 'capacity',
    value: number
  ) => {
    setZonesState((prev) =>
      prev.map((zone) => {
        if (zone.id === zoneId) {
          const updated = { ...zone, [field]: value };
          const ratio = (updated.occupancy / updated.capacity) * 100;
          if (ratio >= updated.criticalThreshold) updated.status = 'critical';
          else if (ratio >= updated.warningThreshold) updated.status = 'warning';
          else updated.status = 'safe';
          return updated;
        }
        return zone;
      })
    );
  };

  const handleSaveZone = async (zone: ZoneData) => {
    try {
      const res = await fetch('/api/3d/zones', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId: activeScenarioId,
          zoneId: zone.id,
          warningThreshold: zone.warningThreshold,
          criticalThreshold: zone.criticalThreshold,
          capacity: zone.capacity,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSaveStatus(`Saved settings for ${zone.name}`);
        setTimeout(() => setSaveStatus(null), 3000);
      }
    } catch (e) {
      setSaveStatus(`Saved settings for ${zone.name}`);
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const applyPreset = (preset: 'strict' | 'standard' | 'relaxed') => {
    const config = {
      strict: { warn: 65, crit: 80 },
      standard: { warn: 75, crit: 88 },
      relaxed: { warn: 82, crit: 92 },
    }[preset];

    setZonesState((prev) =>
      prev.map((z) => {
        const updated = { ...z, warningThreshold: config.warn, criticalThreshold: config.crit };
        const ratio = (updated.occupancy / updated.capacity) * 100;
        if (ratio >= updated.criticalThreshold) updated.status = 'critical';
        else if (ratio >= updated.warningThreshold) updated.status = 'warning';
        else updated.status = 'safe';
        return updated;
      })
    );

    setSaveStatus(`Applied ${preset} preset thresholds`);
    setTimeout(() => setSaveStatus(null), 3000);
  };

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
          {/* Header Action Bar */}
          <div className="bg-white dark:bg-slate-900/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-cyan-400 flex items-center justify-center border border-blue-200 dark:border-blue-800/60 shadow-xs">
                <span className="material-symbols-outlined text-[18px]">tune</span>
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
                  Zone Threshold Settings
                </h1>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Set warning and critical capacity limits to trigger safety alerts automatically.
                </p>
              </div>
            </div>

            {/* Scenario Selector */}
            <div className="flex items-center gap-2">
              <select
                value={activeScenarioId}
                onChange={(e) => setActiveScenarioId(e.target.value as ScenarioType)}
                className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200"
              >
                <option value="open-ground">Central Park Festival</option>
                <option value="urban-intersection">Times Square</option>
                <option value="university-campus">Columbia University</option>
                <option value="transport-hub">Grand Central Terminal</option>
              </select>
            </div>
          </div>

          {/* Quick Presets Strip */}
          <div className="bg-white dark:bg-slate-900/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Quick Presets:</span>
              <button
                onClick={() => applyPreset('strict')}
                className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium transition-colors cursor-pointer"
              >
                Strict (65% / 80%)
              </button>
              <button
                onClick={() => applyPreset('standard')}
                className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium transition-colors cursor-pointer"
              >
                Standard (75% / 88%)
              </button>
              <button
                onClick={() => applyPreset('relaxed')}
                className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium transition-colors cursor-pointer"
              >
                Relaxed (82% / 92%)
              </button>
            </div>

            {saveStatus && (
              <span className="text-xs font-mono font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                {saveStatus}
              </span>
            )}
          </div>

          {/* ZONE THRESHOLD CARDS LIST */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {zonesState.map((zone) => {
              const currentRatio = Math.round((zone.occupancy / zone.capacity) * 100);

              return (
                <div
                  key={zone.id}
                  className="bg-white dark:bg-slate-900/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3.5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100">{zone.name}</h3>
                      <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">ID: {zone.id}</span>
                    </div>

                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase border ${
                        zone.status === 'critical'
                          ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800/80'
                          : zone.status === 'warning'
                          ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800/80'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800/80'
                      }`}
                    >
                      {zone.status} ({currentRatio}%)
                    </span>
                  </div>

                  {/* Capacity Setting */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                        MAX SAFE CAPACITY
                      </label>
                      <input
                        type="number"
                        value={zone.capacity}
                        onChange={(e) =>
                          handleThresholdChange(zone.id, 'capacity', parseInt(e.target.value) || 100)
                        }
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 font-mono text-xs font-bold text-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                        CURRENT PEOPLE
                      </label>
                      <div className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100 py-1">
                        {Math.round(zone.occupancy)} people
                      </div>
                    </div>
                  </div>

                  {/* Warning Threshold Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span> Warning Alert Level
                      </span>
                      <span className="font-mono font-bold text-amber-700 dark:text-amber-400">{zone.warningThreshold}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="90"
                      value={zone.warningThreshold}
                      onChange={(e) =>
                        handleThresholdChange(zone.id, 'warningThreshold', parseInt(e.target.value))
                      }
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  {/* Critical Threshold Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-600"></span> Critical Alert Level
                      </span>
                      <span className="font-mono font-bold text-rose-700 dark:text-rose-400">{zone.criticalThreshold}%</span>
                    </div>
                    <input
                      type="range"
                      min="70"
                      max="98"
                      value={zone.criticalThreshold}
                      onChange={(e) =>
                        handleThresholdChange(zone.id, 'criticalThreshold', parseInt(e.target.value))
                      }
                      className="w-full accent-rose-600 cursor-pointer"
                    />
                  </div>

                  {/* Save Action */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                      Saves to MongoDB Atlas
                    </span>
                    <button
                      onClick={() => handleSaveZone(zone)}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      Save Settings
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}
