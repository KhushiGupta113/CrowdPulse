'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Header3D from '@/components/Header3D';
import Sidebar3D from '@/components/Sidebar3D';
import { ScenarioType, ScenarioConfig, ZoneData, SCENARIO_CONFIGS } from '@/lib/3d/scenarios';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  ReferenceLine,
} from 'recharts';

export default function ZoneTelemetryPage() {
  const [activeScenarioId, setActiveScenarioId] = useState<ScenarioType>('open-ground');
  const [scenarioData, setScenarioData] = useState<ScenarioConfig>(SCENARIO_CONFIGS['open-ground']);
  const [selectedZone, setSelectedZone] = useState<ZoneData>(SCENARIO_CONFIGS['open-ground'].zones[0]);
  const [gateEngaged, setGateEngaged] = useState(false);
  const [paEngaged, setPaEngaged] = useState(false);
  const [pingStatus, setPingStatus] = useState<string | null>(null);

  useEffect(() => {
    async function loadScenario() {
      try {
        const res = await fetch(`/api/3d/scenarios/${activeScenarioId}?tick=true`);
        const json = await res.json();
        if (json.success && json.data) {
          setScenarioData(json.data);
          const current = json.data.zones.find((z: ZoneData) => z.id === selectedZone?.id) || json.data.zones[0];
          setSelectedZone(current);
        }
      } catch (e) {
        setScenarioData(SCENARIO_CONFIGS[activeScenarioId]);
      }
    }
    loadScenario();
  }, [activeScenarioId]);

  // Live simulation tick
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/3d/scenarios/${activeScenarioId}?tick=true`);
        const json = await res.json();
        if (json.success && json.data) {
          setScenarioData(json.data);
          const current = json.data.zones.find((z: ZoneData) => z.id === selectedZone?.id);
          if (current) setSelectedZone(current);
        }
      } catch (e) {}
    }, 3500);

    return () => clearInterval(interval);
  }, [activeScenarioId, selectedZone?.id]);

  const occupancyRatio = Math.round((selectedZone.occupancy / selectedZone.capacity) * 100);
  const bufferLeft = Math.max(0, selectedZone.capacity - Math.round(selectedZone.occupancy));
  const zoneAlerts = (scenarioData.alerts || []).filter((a) => a.zoneId === selectedZone.id);

  const trendData = selectedZone.trend.map((val, idx) => ({
    time: `-${(selectedZone.trend.length - 1 - idx) * 5}m`,
    occupancy: val,
    warning: Math.round(selectedZone.capacity * (selectedZone.warningThreshold / 100)),
    critical: Math.round(selectedZone.capacity * (selectedZone.criticalThreshold / 100)),
  }));

  const flowComparisonData = [
    { time: '-20m', influx: Math.max(10, selectedZone.inflowRate - 30), outflow: Math.max(10, selectedZone.outflowRate - 20) },
    { time: '-15m', influx: Math.max(10, selectedZone.inflowRate - 15), outflow: Math.max(10, selectedZone.outflowRate - 10) },
    { time: '-10m', influx: selectedZone.inflowRate + 10, outflow: selectedZone.outflowRate },
    { time: '-5m', influx: selectedZone.inflowRate + 25, outflow: selectedZone.outflowRate + 5 },
    { time: 'Now', influx: selectedZone.inflowRate, outflow: selectedZone.outflowRate },
  ];

  const sensorNodes = [
    { id: 'SN-01A', type: 'Camera Counter', coverage: `${selectedZone.name} Entrance`, status: 'Online', latency: '24ms', loss: '0%' },
    { id: 'SN-02B', type: 'LiDAR Sensor', coverage: `${selectedZone.name} Center`, status: 'Online', latency: '18ms', loss: '0%' },
    { id: 'SN-03C', type: 'Wi-Fi Density Beacon', coverage: `${selectedZone.name} Pathway`, status: 'Online', latency: '42ms', loss: '0%' },
    { id: 'SN-04D', type: 'Floor Pressure Pad', coverage: `${selectedZone.name} Exit Gate`, status: selectedZone.status === 'critical' ? 'Heavy Traffic' : 'Online', latency: '12ms', loss: '0%' },
  ];

  const handlePing = (nodeId: string) => {
    setPingStatus(`Ping sent to ${nodeId}: Response 18ms, Online.`);
    setTimeout(() => setPingStatus(null), 3000);
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
          {/* Top Header & Scenario Tabs */}
          <div className="bg-white dark:bg-slate-900/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-cyan-400 flex items-center justify-center border border-blue-200 dark:border-blue-800/60 shadow-xs">
                  <span className="material-symbols-outlined text-[18px]">view_in_ar</span>
                </div>
                <div>
                  <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
                    Zone Details &amp; Statistics
                  </h1>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Live headcount charts, inflow versus outflow rates, and sensor health.
                  </p>
                </div>
              </div>

              {/* Scenario Selector */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Location:</span>
                <select
                  value={activeScenarioId}
                  onChange={(e) => setActiveScenarioId(e.target.value as ScenarioType)}
                  className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200"
                >
                  <option value="open-ground">Central Park Festival</option>
                  <option value="urban-intersection">Times Square</option>
                  <option value="university-campus">Columbia University</option>
                  <option value="transport-hub">Grand Central Terminal</option>
                </select>
              </div>
            </div>

            {/* Zone Selector Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mr-1">Select Zone:</span>
              {scenarioData.zones.map((z) => {
                const isSelected = selectedZone?.id === z.id;
                return (
                  <button
                    key={z.id}
                    onClick={() => setSelectedZone(z)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {z.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4 SUMMARY CARDS FOR SELECTED ZONE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-slate-900/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <span className="text-slate-500 dark:text-slate-400 text-[11px] font-semibold uppercase">People Present</span>
              <div className="my-1 flex items-baseline gap-2 font-mono">
                <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {Math.round(selectedZone.occupancy).toLocaleString()}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-sans">/ {selectedZone.capacity}</span>
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                {occupancyRatio}% of capacity used
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <span className="text-slate-500 dark:text-slate-400 text-[11px] font-semibold uppercase">Crowd Density</span>
              <div className="my-1 flex items-baseline gap-2 font-mono">
                <span className="text-2xl font-bold text-blue-600 dark:text-cyan-400">{selectedZone.density}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-sans">people/m²</span>
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                {selectedZone.density >= 4 ? 'Dense Crowd' : 'Normal Space'}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <span className="text-slate-500 dark:text-slate-400 text-[11px] font-semibold uppercase">Entering vs Leaving</span>
              <div className="my-1 flex items-baseline gap-2 font-mono">
                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">+{selectedZone.inflowRate}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-sans">/ -{selectedZone.outflowRate} p/min</span>
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                Net: {selectedZone.inflowRate - selectedZone.outflowRate > 0 ? '+' : ''}{selectedZone.inflowRate - selectedZone.outflowRate} people/min
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <span className="text-slate-500 dark:text-slate-400 text-[11px] font-semibold uppercase">Remaining Space</span>
              <div className="my-1 flex items-baseline gap-2 font-mono">
                <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{bufferLeft}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-sans">spots left</span>
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                Warning at: {selectedZone.warningThreshold}%
              </div>
            </div>
          </div>

          {/* DUAL CHARTS: HEADCOUNT TREND + INFLOW/OUTFLOW */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
            {/* Chart 1: Trend Over Time */}
            <div className="lg:col-span-6 bg-white dark:bg-slate-900/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">Headcount Trend Over Time</h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Recorded attendance against warning levels</p>
                </div>
                <div className="flex items-center gap-2 font-mono text-[10px]">
                  <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold">
                    <span className="w-2 h-0.5 bg-rose-500"></span> Limit ({selectedZone.criticalThreshold}%)
                  </span>
                </div>
              </div>

              <div className="h-56 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.4} />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} domain={[0, selectedZone.capacity * 1.1]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#070b14',
                        color: '#f8fafc',
                        borderColor: '#334155',
                        fontSize: '11px',
                        borderRadius: '0.75rem',
                      }}
                    />
                    <ReferenceLine y={Math.round(selectedZone.capacity * (selectedZone.criticalThreshold / 100))} stroke="#ef4444" strokeDasharray="4 4" />
                    <ReferenceLine y={Math.round(selectedZone.capacity * (selectedZone.warningThreshold / 100))} stroke="#f59e0b" strokeDasharray="4 4" />
                    <Line
                      type="monotone"
                      dataKey="occupancy"
                      stroke="#2563eb"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#2563eb' }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Inflow vs Outflow */}
            <div className="lg:col-span-6 bg-white dark:bg-slate-900/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">Entering vs. Leaving Rates</h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">People entering and leaving per minute</p>
                </div>
                <div className="flex items-center gap-3 font-mono text-[10px]">
                  <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span> Entering
                  </span>
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-600"></span> Leaving
                  </span>
                </div>
              </div>

              <div className="h-56 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={flowComparisonData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.4} />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#070b14',
                        color: '#f8fafc',
                        borderColor: '#334155',
                        fontSize: '11px',
                        borderRadius: '0.75rem',
                      }}
                    />
                    <Bar dataKey="influx" fill="#2563eb" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="outflow" fill="#059669" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* ZONE SAFETY ALERTS TABLE */}
          <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-rose-600 dark:text-rose-400 text-[18px]">warning</span>
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Active Alerts for {selectedZone.name} ({selectedZone.id})
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/dashboard?scenario=${activeScenarioId}&zone=${selectedZone.id}`}
                  className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-cyan-300 font-semibold text-[11px] border border-blue-200 dark:border-blue-800 flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[13px]">map</span>
                  <span>View Zone on Map</span>
                </Link>
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
                  {zoneAlerts.length} Alert{zoneAlerts.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 font-semibold text-[10px] uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3.5">Alert ID</th>
                    <th className="py-2.5 px-3.5">Priority</th>
                    <th className="py-2.5 px-3.5">Status</th>
                    <th className="py-2.5 px-3.5">Reported Issue</th>
                    <th className="py-2.5 px-3.5">Trigger Condition</th>
                    <th className="py-2.5 px-3.5">Recommended Action</th>
                    <th className="py-2.5 px-3.5">Time</th>
                    <th className="py-2.5 px-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-mono text-[11px]">
                  {zoneAlerts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-slate-400 dark:text-slate-500 font-sans text-xs">
                        No active safety alerts reported for this specific zone. Safety conditions nominal.
                      </td>
                    </tr>
                  ) : (
                    zoneAlerts.map((alert) => (
                      <tr key={alert.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3.5 font-bold text-slate-900 dark:text-slate-100">{alert.id}</td>
                        <td className="py-2.5 px-3.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-sans text-[10px] font-semibold uppercase ${
                              alert.severity === 'critical'
                                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                alert.severity === 'critical' ? 'bg-rose-500' : 'bg-amber-500'
                              }`}
                            />
                            {alert.severity}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full font-sans text-[10px] font-semibold capitalize ${
                              alert.status === 'resolved'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : alert.status === 'investigating'
                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                            }`}
                          >
                            {alert.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 font-sans font-semibold text-slate-800 dark:text-slate-200">
                          {alert.title}
                        </td>
                        <td className="py-2.5 px-3.5 text-slate-600 dark:text-slate-400">
                          {alert.triggerValue}
                        </td>
                        <td className="py-2.5 px-3.5 font-sans text-slate-600 dark:text-slate-400 text-[11px] max-w-xs">
                          {alert.recommendedAction}
                        </td>
                        <td className="py-2.5 px-3.5 text-slate-500 dark:text-slate-400">
                          {alert.timestamp}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-sans">
                          <Link
                            href="/alerts"
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold transition-colors"
                          >
                            Manage
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SENSOR NODES TABLE */}
          <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600 dark:text-cyan-400 text-[18px]">sensors</span>
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Connected Sensor Devices ({selectedZone.name})
                </h3>
              </div>
              {pingStatus ? (
                <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
                  {pingStatus}
                </span>
              ) : (
                <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  4 / 4 Sensors Online
                </span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 font-semibold text-[10px] uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3.5">Device ID</th>
                    <th className="py-2.5 px-3.5">Sensor Type</th>
                    <th className="py-2.5 px-3.5">Coverage Area</th>
                    <th className="py-2.5 px-3.5">Status</th>
                    <th className="py-2.5 px-3.5">Ping Latency</th>
                    <th className="py-2.5 px-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-mono text-[11px]">
                  {sensorNodes.map((node) => (
                    <tr key={node.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3.5 font-bold text-slate-900 dark:text-slate-100">{node.id}</td>
                      <td className="py-2.5 px-3.5 font-sans text-slate-800 dark:text-slate-200">{node.type}</td>
                      <td className="py-2.5 px-3.5 font-sans text-slate-600 dark:text-slate-400">{node.coverage}</td>
                      <td className="py-2.5 px-3.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-sans text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          {node.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-600 dark:text-slate-400">{node.latency}</td>
                      <td className="py-2.5 px-3.5 text-right">
                        <button
                          onClick={() => handlePing(node.id)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-sans font-medium transition-colors cursor-pointer"
                        >
                          Ping Test
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
