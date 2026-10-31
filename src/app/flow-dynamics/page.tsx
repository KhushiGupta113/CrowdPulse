'use client';

import React, { useState, useEffect } from 'react';
import Header3D from '@/components/Header3D';
import Sidebar3D from '@/components/Sidebar3D';
import { ScenarioType, ScenarioConfig, SCENARIO_CONFIGS } from '@/lib/3d/scenarios';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function FlowDynamicsPage() {
  const [activeScenarioId, setActiveScenarioId] = useState<ScenarioType>('open-ground');
  const [scenarioData, setScenarioData] = useState<ScenarioConfig>(SCENARIO_CONFIGS['open-ground']);
  const [timeWindow, setTimeWindow] = useState<'live' | '15m' | '1h'>('live');
  const [diversionActive, setDiversionActive] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function fetchScenario() {
      try {
        const res = await fetch(`/api/3d/scenarios/${activeScenarioId}?tick=true`);
        const json = await res.json();
        if (json.success && json.data) {
          setScenarioData(json.data);
        }
      } catch (e) {
        setScenarioData(SCENARIO_CONFIGS[activeScenarioId]);
      }
    }
    fetchScenario();
  }, [activeScenarioId]);

  const toggleDiversion = (bottleneckId: string) => {
    setDiversionActive((prev) => ({
      ...prev,
      [bottleneckId]: !prev[bottleneckId],
    }));
  };

  // Movement trend data
  const flowTimeSeries = [
    { time: '11:00', smooth: 420, congested: 65, total: 485 },
    { time: '11:05', smooth: 460, congested: 80, total: 540 },
    { time: '11:10', smooth: 510, congested: 110, total: 620 },
    { time: '11:15', smooth: 490, congested: 140, total: 630 },
    { time: '11:20', smooth: 540, congested: 195, total: 735 },
    { time: '11:25', smooth: 580, congested: 230, total: 810 },
    { time: '11:30', smooth: 610, congested: 210, total: 820 },
  ];

  const corridorWidths = [
    { corridor: 'Gate A Entry', width: 4.2, flux: 1.82, status: 'High Rush' },
    { corridor: 'North Main Walkway', width: 12.0, flux: 1.15, status: 'Moderate Flow' },
    { corridor: 'Central Plaza Pathway', width: 6.5, flux: 1.48, status: 'Crowded' },
    { corridor: 'South Exit Corridor', width: 14.5, flux: 0.65, status: 'Clear Flow' },
  ];

  const handleExportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,ID,Corridor,Severity,CongestionRatio,InflowRate,Status\n' +
      scenarioData.bottlenecks
        .map(
          (b) =>
            `"${b.id}","${b.name}","${b.severity}",${b.chokeRatio},${b.inflowRate},"${b.flowStatus}"`
        )
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `crowdpulse_flow_data_${activeScenarioId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
          {/* Header & Controls */}
          <div className="bg-white dark:bg-slate-900/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-cyan-400 flex items-center justify-center border border-blue-200 dark:border-blue-800/60 shadow-xs">
                <span className="material-symbols-outlined text-[18px]">stacked_line_chart</span>
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
                  Crowd Flow &amp; Movement Rates
                </h1>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Track movement speed, crowded pathways, and exit clearance metrics.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-800 text-xs font-mono">
                <button
                  onClick={() => setTimeWindow('live')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    timeWindow === 'live'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Live
                </button>
                <button
                  onClick={() => setTimeWindow('15m')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    timeWindow === '15m'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  15 min
                </button>
                <button
                  onClick={() => setTimeWindow('1h')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    timeWindow === '1h'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  1 hour
                </button>
              </div>

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

              <button
                onClick={handleExportCSV}
                className="h-8 px-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">file_download</span>
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* 4 SUMMARY METRICS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Metric 1 */}
            <div className="bg-white dark:bg-slate-900/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] font-semibold uppercase">
                <span>Inflow Rate</span>
                <span className="px-1.5 py-0.2 rounded font-mono text-[10px] bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold">
                  +{scenarioData.influxRatePercent}%
                </span>
              </div>
              <div className="my-1.5 flex items-baseline justify-between font-mono">
                <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">+{Math.round(scenarioData.totalPresent * 0.02)}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-sans">people/min</span>
              </div>
              <div className="mt-1 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                <span>Fastest Gateway:</span>
                <span className="font-mono font-semibold text-blue-600 dark:text-cyan-400">Main Gateway</span>
              </div>
            </div>

            {/* Metric 2 */}
            <div className="bg-white dark:bg-slate-900/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] font-semibold uppercase">
                <span>Bottleneck Level</span>
                <span className="material-symbols-outlined text-rose-600 dark:text-rose-400 text-[16px]">compress</span>
              </div>
              <div className="my-1.5 flex items-baseline justify-between font-mono">
                <span className="text-2xl font-bold text-rose-600 dark:text-rose-400">84%</span>
                <span className="text-xs text-rose-600 dark:text-rose-400 font-sans font-medium">Busy</span>
              </div>
              <div className="mt-1 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                <span>High-Traffic Areas:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{scenarioData.bottlenecks.length} corridors</span>
              </div>
            </div>

            {/* Metric 3 */}
            <div className="bg-white dark:bg-slate-900/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] font-semibold uppercase">
                <span>Smooth Movement</span>
                <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-[16px]">waves</span>
              </div>
              <div className="my-1.5 flex items-baseline justify-between font-mono">
                <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">76%</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-sans">Normal flow</span>
              </div>
              <div className="mt-1 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                <span>Crowd Resistance:</span>
                <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">Low</span>
              </div>
            </div>

            {/* Metric 4 */}
            <div className="bg-white dark:bg-slate-900/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] font-semibold uppercase">
                <span>Estimated Exit Time</span>
                <span className="material-symbols-outlined text-purple-600 dark:text-purple-400 text-[16px]">hourglass_empty</span>
              </div>
              <div className="my-1.5 flex items-baseline justify-between font-mono">
                <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">8 min</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-sans">Full Clearance</span>
              </div>
              <div className="mt-1 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                <span>Exit Gates:</span>
                <span className="font-mono text-emerald-700 dark:text-emerald-400 font-semibold">Open &amp; Clear</span>
              </div>
            </div>
          </div>

          {/* DUAL SECTION: CHART + CORRIDOR CAPACITIES */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            {/* Chart (7 Cols) */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">Smooth vs. Congested Movement</h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Comparing free-flowing crowd movement against bottlenecks
                  </p>
                </div>
                <div className="flex items-center gap-3 font-mono text-[10px]">
                  <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span> Smooth Flow
                  </span>
                  <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span> Congested
                  </span>
                </div>
              </div>

              <div className="h-60 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={flowTimeSeries} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
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
                    <Area type="monotone" dataKey="smooth" stackId="1" stroke="#2563eb" fill="#bfdbfe" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="congested" stackId="1" stroke="#dc2626" fill="#fecaca" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Corridor Capacities (5 Cols) */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">Pathway Width &amp; Flow</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Movement rate based on pathway width</p>
              </div>

              <div className="space-y-2 pt-1">
                {corridorWidths.map((c, i) => (
                  <div key={i} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{c.corridor}</span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                          c.status === 'High Rush'
                            ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                            : c.status === 'Crowded'
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                            : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      <span>Width: {c.width} meters</span>
                      <span>Flow: {c.flux} people/m/s</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CROWDED PATHWAYS TABLE */}
          <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600 dark:text-cyan-400 text-[18px]">alt_route</span>
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Crowded Pathways in {scenarioData.name}
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                Real-Time Corridor Volume
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 font-semibold text-[10px] uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3.5">ID</th>
                    <th className="py-2.5 px-3.5">Pathway Name</th>
                    <th className="py-2.5 px-3.5">Severity</th>
                    <th className="py-2.5 px-3.5">Congestion</th>
                    <th className="py-2.5 px-3.5">Speed</th>
                    <th className="py-2.5 px-3.5">Status</th>
                    <th className="py-2.5 px-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-mono text-[11px]">
                  {scenarioData.bottlenecks.map((b) => {
                    const isDiverted = diversionActive[b.id];
                    return (
                      <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-3.5 font-bold text-slate-900 dark:text-slate-100">{b.id}</td>
                        <td className="py-2.5 px-3.5 font-sans font-semibold text-slate-900 dark:text-slate-100">{b.name}</td>
                        <td className="py-2.5 px-3.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-sans text-[10px] font-bold uppercase ${
                              b.severity === 'critical'
                                ? 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                : 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            }`}
                          >
                            {b.severity}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 text-slate-700 dark:text-slate-300">{b.chokeRatio}% Full</td>
                        <td className="py-2.5 px-3.5 text-slate-700 dark:text-slate-300">{b.inflowRate} p/min</td>
                        <td className="py-2.5 px-3.5 font-sans font-medium text-slate-600 dark:text-slate-400">
                          {b.flowStatus}
                        </td>
                        <td className="py-2.5 px-3.5 text-right">
                          <button
                            onClick={() => toggleDiversion(b.id)}
                            className={`px-3 py-1 rounded-lg text-xs font-sans font-semibold transition-colors border cursor-pointer ${
                              isDiverted
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                            }`}
                          >
                            {isDiverted ? 'Reroute Active' : 'Reroute Flow'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
