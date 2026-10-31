'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Header3D from '@/components/Header3D';
import Sidebar3D from '@/components/Sidebar3D';
import { CrowdAlert, ScenarioType } from '@/lib/3d/scenarios';

interface ExtendedAlert extends CrowdAlert {
  scenarioId?: string;
  scenarioTitle?: string;
  resolvedAt?: string;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<ExtendedAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'critical' | 'warning' | 'info' | 'resolved'>('all');
  const [selectedScenario, setSelectedScenario] = useState<string>('all');
  const [isLoggingModalOpen, setIsLoggingModalOpen] = useState(false);

  // Dedicated Detailed Alert View Modal State
  const [detailedAlert, setDetailedAlert] = useState<ExtendedAlert | null>(null);

  // Resolution Modal State
  const [alertToResolve, setAlertToResolve] = useState<ExtendedAlert | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [resolveFeedback, setResolveFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Manual issue report form state
  const [newZone, setNewZone] = useState('Zone A: Main Festival Stage Pit');
  const [newZoneId, setNewZoneId] = useState('OG-Z1');
  const [newScenario, setNewScenario] = useState<ScenarioType>('open-ground');
  const [newSeverity, setNewSeverity] = useState<'critical' | 'warning'>('warning');
  const [newTitle, setNewTitle] = useState('');
  const [newTriggerValue, setNewTriggerValue] = useState('Operator Report: High Density');
  const [newAction, setNewAction] = useState('Guide people toward open side exits');

  const fetchAlerts = async () => {
    try {
      const url = selectedScenario === 'all' ? '/api/3d/alerts' : `/api/3d/alerts?scenarioId=${selectedScenario}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success && json.data) {
        setAlerts(json.data);
      }
    } catch (e) {
      console.error('Failed to load alerts from backend:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5000);
    return () => clearInterval(interval);
  }, [selectedScenario]);

  // Open confirmation modal for resolution
  const handleInitiateResolve = (alert: ExtendedAlert) => {
    if (alert.status === 'resolved') return;
    setAlertToResolve(alert);
    setResolveFeedback(null);
  };

  // Confirm and persist alert resolution to MongoDB Atlas backend
  const handleConfirmResolve = async () => {
    if (!alertToResolve) return;

    setIsResolving(true);
    setResolveFeedback(null);

    const scId = alertToResolve.scenarioId || 'open-ground';
    try {
      const res = await fetch('/api/3d/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId: scId,
          alertId: alertToResolve.id,
          status: 'resolved',
        }),
      });

      const json = await res.json();

      if (res.ok && json.success) {
        setAlerts((prev) =>
          prev.map((a) =>
            a.id === alertToResolve.id
              ? { ...a, status: 'resolved', resolvedAt: new Date().toLocaleTimeString() }
              : a
          )
        );
        if (detailedAlert?.id === alertToResolve.id) {
          setDetailedAlert((prev) => (prev ? { ...prev, status: 'resolved' } : null));
        }
        setResolveFeedback({
          type: 'success',
          message: `Alert ${alertToResolve.id} marked as RESOLVED and saved to database.`,
        });
        setAlertToResolve(null);
      } else {
        setResolveFeedback({
          type: 'error',
          message: json.message || 'Server failed to update alert in database. Please try again.',
        });
      }
    } catch (err: any) {
      setResolveFeedback({
        type: 'error',
        message: `Network error: ${err.message || 'Could not connect to backend server.'}`,
      });
    } finally {
      setIsResolving(false);
    }
  };

  // Handle Review / Investigating status transition
  const handleInvestigate = async (alert: ExtendedAlert) => {
    const scId = alert.scenarioId || 'open-ground';
    try {
      const res = await fetch('/api/3d/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId: scId,
          alertId: alert.id,
          status: 'investigating',
        }),
      });
      const json = await res.json();
      if (json.success) {
        setAlerts((prev) =>
          prev.map((a) => (a.id === alert.id ? { ...a, status: 'investigating' } : a))
        );
        if (detailedAlert?.id === alert.id) {
          setDetailedAlert((prev) => (prev ? { ...prev, status: 'investigating' } : null));
        }
      }
    } catch (e) {
      console.error('Failed to update alert to investigating', e);
    }
  };

  const handleCreateManualAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const res = await fetch('/api/3d/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId: newScenario,
          zoneName: newZone,
          zoneId: newZoneId,
          severity: newSeverity,
          title: newTitle,
          triggerValue: newTriggerValue,
          recommendedAction: newAction,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsLoggingModalOpen(false);
        setNewTitle('');
        fetchAlerts();
      }
    } catch (e) {
      console.error('Failed to create alert', e);
    }
  };

  // Consistent calculations based on genuine database records
  const activeAlerts = alerts.filter((a) => a.status === 'active' || a.status === 'investigating');
  const criticalCount = activeAlerts.filter((a) => a.severity === 'critical').length;
  const warningCount = activeAlerts.filter((a) => a.severity === 'warning').length;
  const infoCount = alerts.filter((a) => a.severity === 'info' && a.status !== 'resolved').length;
  const resolvedCount = alerts.filter((a) => a.status === 'resolved').length;

  const filteredAlerts = alerts.filter((a) => {
    if (filterSeverity === 'all') return a.status !== 'resolved';
    if (filterSeverity === 'resolved') return a.status === 'resolved';
    return a.severity === filterSeverity && a.status !== 'resolved';
  });

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans transition-colors duration-150 select-none">
      <Header3D
        scenarioName="Alerts &amp; Emergency Hub"
        sectorTag="Safety Ops"
        activeAlertsCount={activeAlerts.length}
      />

      <div className="flex flex-1">
        <Sidebar3D
          sectorName="Emergency Hub"
          alertsCount={activeAlerts.length}
        />

        <main className="ml-60 mt-14 p-4 space-y-4 flex-1 overflow-x-hidden min-w-0">
          {/* Header Action Bar */}
          <div className="bg-[#0b1222]/90 p-4 rounded-2xl border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-950/80 text-rose-400 flex items-center justify-center border border-rose-800/60 shadow-xs">
                <span className="material-symbols-outlined text-[18px]">emergency</span>
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-100 leading-tight font-mono uppercase tracking-wide">
                  Emergency &amp; Safety Incident Response
                </h1>
                <p className="text-[11px] text-slate-400">
                  Real-time threat assessment, threshold transgressions, and operator dispatch logs.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsLoggingModalOpen(true)}
                className="h-8 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-md shadow-cyan-950/50 transition-colors cursor-pointer font-mono"
              >
                <span className="material-symbols-outlined text-[15px]">add_alert</span>
                <span>Log Incident Report</span>
              </button>
            </div>
          </div>

          {/* User Feedback Toast */}
          {resolveFeedback && (
            <div
              className={`p-3 rounded-xl border text-xs font-mono flex items-center justify-between shadow-xl transition-all ${
                resolveFeedback.type === 'success'
                  ? 'bg-emerald-950/90 border-emerald-800 text-emerald-300'
                  : 'bg-rose-950/90 border-rose-800 text-rose-300'
              }`}
            >
              <div className="flex items-center gap-2 font-medium">
                <span className="material-symbols-outlined text-[18px]">
                  {resolveFeedback.type === 'success' ? 'check_circle' : 'error'}
                </span>
                <span>{resolveFeedback.message}</span>
              </div>
              <button
                onClick={() => setResolveFeedback(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* 4 TOP SUMMARY CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* KPI 1: Active Alerts */}
            <div className="bg-[#0b1222]/90 p-4 rounded-2xl border border-slate-800 shadow-xl flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-[10.5px] font-semibold uppercase font-mono">
                <span>Active Alerts</span>
                <span className="px-2 py-0.5 rounded-full bg-rose-950/80 text-rose-300 border border-rose-800 font-mono text-[9px] font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                  Live
                </span>
              </div>
              <div className="my-1 flex items-baseline gap-2 font-mono">
                <span className="text-3xl font-bold text-rose-400">{activeAlerts.length}</span>
                <span className="text-xs text-slate-400">Unresolved</span>
              </div>
              <div className="mt-1 pt-2 border-t border-slate-800 flex gap-2 text-[10px] font-mono text-slate-400">
                <span className="text-rose-400 font-bold">{criticalCount} Critical</span>
                <span>•</span>
                <span className="text-amber-400 font-semibold">{warningCount} Warning</span>
                <span>•</span>
                <span className="text-cyan-400 font-semibold">{infoCount} Info</span>
              </div>
            </div>

            {/* KPI 2: Response Time */}
            <div className="bg-[#0b1222]/90 p-4 rounded-2xl border border-slate-800 shadow-xl flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-[10.5px] font-semibold uppercase font-mono">
                <span>Target Acknowledge Latency</span>
                <span className="px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 font-mono text-[9px] font-bold border border-cyan-800/80">
                  Optimal
                </span>
              </div>
              <div className="my-1 flex items-baseline gap-2 font-mono">
                <span className="text-3xl font-bold text-slate-100">38s</span>
                <span className="text-xs text-slate-400 font-sans">Mean Acknowledge</span>
              </div>
              <div className="mt-1 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>SLA Target: &lt; 60s</span>
                <span className="text-emerald-400 font-semibold">99.2% Met</span>
              </div>
            </div>

            {/* KPI 3: Monitored Locations */}
            <div className="bg-[#0b1222]/90 p-4 rounded-2xl border border-slate-800 shadow-xl flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-[10.5px] font-semibold uppercase font-mono">
                <span>Coverage Grid</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 font-mono text-[9px] font-bold border border-emerald-800/80">
                  Online
                </span>
              </div>
              <div className="my-1 flex items-baseline gap-2 font-mono">
                <span className="text-3xl font-bold text-slate-100">16 Zones</span>
                <span className="text-xs text-slate-400 font-sans">4 Scenarios</span>
              </div>
              <div className="mt-1 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>Database Sync</span>
                <span className="text-emerald-400 font-semibold">MongoDB Atlas</span>
              </div>
            </div>

            {/* KPI 4: Resolved Alerts */}
            <div className="bg-[#0b1222]/90 p-4 rounded-2xl border border-slate-800 shadow-xl flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-[10.5px] font-semibold uppercase font-mono">
                <span>Archived Resolutions</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 font-mono text-[9px] font-bold border border-emerald-800/80">
                  Persisted
                </span>
              </div>
              <div className="my-1 flex items-baseline gap-2 font-mono">
                <span className="text-3xl font-bold text-emerald-400">{resolvedCount}</span>
                <span className="text-xs text-slate-400 font-sans">Total Closed</span>
              </div>
              <div className="mt-1 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>Audit Stored</span>
                <span className="text-emerald-400 font-semibold">Verified</span>
              </div>
            </div>
          </div>

          {/* Incident Table Filter & Feed */}
          <div className="bg-[#0b1222]/90 rounded-2xl border border-slate-800 shadow-xl overflow-hidden transition-colors">
            {/* Table Control Header */}
            <div className="p-3 border-b border-slate-800 bg-[#070b14] flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">Filter:</span>
                <button
                  onClick={() => setFilterSeverity('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    filterSeverity === 'all'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  All Active ({activeAlerts.length})
                </button>
                <button
                  onClick={() => setFilterSeverity('critical')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    filterSeverity === 'critical'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Critical ({criticalCount})
                </button>
                <button
                  onClick={() => setFilterSeverity('warning')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    filterSeverity === 'warning'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Warning ({warningCount})
                </button>
                <button
                  onClick={() => setFilterSeverity('info')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    filterSeverity === 'info'
                      ? 'bg-cyan-600 text-white shadow-xs'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Info ({infoCount})
                </button>
                <button
                  onClick={() => setFilterSeverity('resolved')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    filterSeverity === 'resolved'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Resolved ({resolvedCount})
                </button>
              </div>

              {/* Scenario Filter */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 font-medium">Location:</span>
                <select
                  value={selectedScenario}
                  onChange={(e) => setSelectedScenario(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-mono font-medium text-slate-200 cursor-pointer"
                >
                  <option value="all">All Locations</option>
                  <option value="open-ground">Central Park Festival</option>
                  <option value="urban-intersection">Times Square</option>
                  <option value="university-campus">Columbia University</option>
                  <option value="transport-hub">Grand Central Terminal</option>
                </select>
              </div>
            </div>

            {/* Incidents Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-[#070b14] text-slate-400 font-semibold text-[10px] uppercase tracking-wider border-b border-slate-800 font-mono">
                  <tr>
                    <th className="py-2.5 px-3">Alert ID</th>
                    <th className="py-2.5 px-3">Priority</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Monitored Zone</th>
                    <th className="py-2.5 px-3">Reported Condition</th>
                    <th className="py-2.5 px-3">Recommended Protocol</th>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 font-mono text-xs">
                        <span className="inline-flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                          Synchronizing with MongoDB backend...
                        </span>
                      </td>
                    </tr>
                  ) : filteredAlerts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 font-mono text-xs">
                        No alerts matching current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredAlerts.map((alert) => (
                      <tr key={alert.id} className="hover:bg-slate-900/60 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-100">{alert.id}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase border ${
                              alert.severity === 'critical'
                                ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                                : alert.severity === 'warning'
                                ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                                : 'bg-cyan-950/80 text-cyan-300 border-cyan-800'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                alert.severity === 'critical'
                                  ? 'bg-rose-500'
                                  : alert.severity === 'warning'
                                  ? 'bg-amber-500'
                                  : 'bg-cyan-400'
                              }`}
                            />
                            {alert.severity}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[10px] font-semibold capitalize border ${
                              alert.status === 'resolved'
                                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                                : alert.status === 'investigating'
                                ? 'bg-blue-950/80 text-blue-300 border-blue-800'
                                : 'bg-rose-950/80 text-rose-300 border-rose-800'
                            }`}
                          >
                            {alert.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-100 flex items-center gap-1">
                            <span>{alert.zoneName}</span>
                            <span className="font-mono text-[9px] px-1 py-0.2 bg-slate-800 rounded text-cyan-400">
                              {alert.zoneId}
                            </span>
                          </div>
                          {alert.scenarioTitle && (
                            <div className="text-[10px] text-slate-400 font-mono truncate">{alert.scenarioTitle}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-200 font-medium max-w-xs">
                          <div className="font-semibold text-slate-100">{alert.title}</div>
                          <div className="text-[10px] text-cyan-400 font-mono">{alert.triggerValue}</div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 text-[11px] max-w-xs">
                          {alert.recommendedAction}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">
                          <div>{alert.timestamp}</div>
                          {alert.resolvedAt && (
                            <div className="text-[9px] text-emerald-400">
                              Resolved: {alert.resolvedAt.slice(-8)}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5 font-mono text-xs">
                            {/* Inspect Details Button */}
                            <button
                              onClick={() => setDetailedAlert(alert)}
                              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] border border-slate-700 transition-colors cursor-pointer"
                            >
                              Details
                            </button>

                            {/* View on Map Button */}
                            <Link
                              href={`/dashboard?scenario=${alert.scenarioId || 'open-ground'}&zone=${alert.zoneId}`}
                              className="px-2 py-1 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 text-[11px] font-semibold border border-cyan-800/80 flex items-center gap-1 transition-colors"
                              title="Focus this zone on the GIS Map"
                            >
                              <span className="material-symbols-outlined text-[13px]">map</span>
                              <span>Map</span>
                            </Link>

                            {/* Acknowledge Action */}
                            {alert.status === 'active' && (
                              <button
                                onClick={() => handleInvestigate(alert)}
                                className="px-2.5 py-1 rounded-lg bg-amber-950/80 hover:bg-amber-900 text-amber-300 text-[11px] font-semibold border border-amber-800 transition-colors cursor-pointer"
                                title="Acknowledge incident and transition to Investigating status"
                              >
                                Acknowledge
                              </button>
                            )}

                            {/* Resolve Action */}
                            {alert.status !== 'resolved' ? (
                              <button
                                onClick={() => handleInitiateResolve(alert)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold shadow-xs transition-colors cursor-pointer"
                              >
                                Resolve
                              </button>
                            ) : (
                              <span className="text-emerald-400 font-mono text-[11px] font-bold flex items-center gap-1 justify-end pl-1">
                                <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                Closed
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* DEDICATED ALERT DETAILS MODAL */}
      {detailedAlert && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#070b14] rounded-2xl border border-slate-700 shadow-2xl max-w-lg w-full p-5 space-y-4 text-slate-100 font-sans">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 font-mono">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-xs font-bold uppercase border ${
                    detailedAlert.severity === 'critical'
                      ? 'bg-rose-950 text-rose-300 border-rose-800'
                      : detailedAlert.severity === 'warning'
                      ? 'bg-amber-950 text-amber-300 border-amber-800'
                      : 'bg-cyan-950 text-cyan-300 border-cyan-800'
                  }`}
                >
                  {detailedAlert.severity} PRIORITY
                </span>
                <span className="text-slate-400">{detailedAlert.id}</span>
              </div>
              <button
                onClick={() => setDetailedAlert(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <h4 className="text-base font-bold text-white">{detailedAlert.title}</h4>
                <div className="text-cyan-400 font-mono mt-0.5">
                  Sector: {detailedAlert.scenarioTitle || detailedAlert.scenarioId} • Zone: {detailedAlert.zoneName}
                </div>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 font-mono space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Trigger Threshold:</span>
                  <span className="text-rose-400 font-bold">{detailedAlert.triggerValue}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Report Time:</span>
                  <span className="text-slate-200">{detailedAlert.timestamp}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Current Incident Status:</span>
                  <span
                    className={`font-bold uppercase ${
                      detailedAlert.status === 'resolved'
                        ? 'text-emerald-400'
                        : detailedAlert.status === 'investigating'
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {detailedAlert.status}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-cyan-950/40 rounded-xl border border-cyan-800/60 space-y-1">
                <div className="text-[10px] font-mono uppercase font-bold text-cyan-400">
                  Standard Safety Action Protocol:
                </div>
                <p className="text-xs leading-relaxed text-slate-200">
                  {detailedAlert.recommendedAction}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800 font-mono text-xs">
              {detailedAlert.status !== 'resolved' && (
                <button
                  type="button"
                  onClick={() => {
                    handleInitiateResolve(detailedAlert);
                    setDetailedAlert(null);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors"
                >
                  Resolve Incident
                </button>
              )}
              <button
                type="button"
                onClick={() => setDetailedAlert(null)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESOLUTION CONFIRMATION DIALOG MODAL */}
      {alertToResolve && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#070b14] rounded-2xl border border-slate-700 shadow-2xl max-w-md w-full p-5 space-y-4 text-slate-100 font-sans">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 font-mono">
              <h3 className="text-sm font-bold flex items-center gap-2 text-slate-100">
                <span className="material-symbols-outlined text-emerald-400 text-[20px]">check_circle</span>
                Confirm Alert Resolution
              </h3>
              <button
                onClick={() => setAlertToResolve(null)}
                disabled={isResolving}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-slate-300">
                Confirm closing this incident and storing the resolution timestamp in MongoDB Atlas:
              </p>

              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1.5 font-sans">
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="font-bold text-slate-100">{alertToResolve.id}</span>
                  <span
                    className={`px-2 py-0.5 rounded font-bold uppercase text-[9px] ${
                      alertToResolve.severity === 'critical'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}
                  >
                    {alertToResolve.severity}
                  </span>
                </div>
                <div className="font-semibold text-slate-200">{alertToResolve.title}</div>
                <div className="text-[11px] text-slate-400">
                  Zone: {alertToResolve.zoneName} ({alertToResolve.zoneId})
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  Trigger: {alertToResolve.triggerValue}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800 font-mono text-xs">
              <button
                type="button"
                onClick={() => setAlertToResolve(null)}
                disabled={isResolving}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmResolve}
                disabled={isResolving}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
              >
                {isResolving ? (
                  <>
                    <span className="material-symbols-outlined text-[15px] animate-spin">sync</span>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[15px]">check</span>
                    <span>Confirm Resolution</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Issue Reporting Modal */}
      {isLoggingModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#070b14] rounded-2xl border border-slate-700 shadow-2xl max-w-md w-full p-5 space-y-4 text-slate-100 font-sans">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 font-mono">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-rose-500 text-[18px]">add_alert</span>
                Log Manual Safety Incident
              </h3>
              <button
                onClick={() => setIsLoggingModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateManualAlert} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1 font-mono">Location Sector</label>
                <select
                  value={newScenario}
                  onChange={(e) => {
                    const sc = e.target.value as ScenarioType;
                    setNewScenario(sc);
                    if (sc === 'open-ground') { setNewZone('Zone A: Main Festival Stage Pit'); setNewZoneId('OG-Z1'); }
                    else if (sc === 'urban-intersection') { setNewZone('Zone A: Father Duffy Square & TKTS'); setNewZoneId('UI-Z1'); }
                    else if (sc === 'university-campus') { setNewZone('Zone A: Low Memorial Library Rotunda'); setNewZoneId('UC-Z1'); }
                    else { setNewZone('Zone A: Main Concourse Center'); setNewZoneId('TH-Z1'); }
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-slate-100 font-mono"
                >
                  <option value="open-ground">Central Park Festival</option>
                  <option value="urban-intersection">Times Square Commercial</option>
                  <option value="university-campus">Columbia University Quad</option>
                  <option value="transport-hub">Grand Central Terminal</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1 font-mono">Target Monitoring Zone</label>
                <input
                  type="text"
                  value={newZone}
                  onChange={(e) => setNewZone(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-slate-100"
                  placeholder="e.g. Zone A: Main Festival Stage Pit"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1 font-mono">Severity Priority</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer font-mono">
                    <input
                      type="radio"
                      name="severity"
                      checked={newSeverity === 'warning'}
                      onChange={() => setNewSeverity('warning')}
                    />
                    <span className="text-amber-400 font-semibold">Warning (Amber)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer font-mono">
                    <input
                      type="radio"
                      name="severity"
                      checked={newSeverity === 'critical'}
                      onChange={() => setNewSeverity('critical')}
                    />
                    <span className="text-rose-400 font-semibold">Critical (Rose)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1 font-mono">Issue Description</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-slate-100"
                  placeholder="e.g. Pedestrian crush risk at barrier funnel"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1 font-mono">Trigger Condition / Telemetry</label>
                <input
                  type="text"
                  value={newTriggerValue}
                  onChange={(e) => setNewTriggerValue(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-slate-100 font-mono"
                  placeholder="e.g. Over 92% capacity • 4.5 p/m²"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1 font-mono">Recommended Safety Protocol</label>
                <input
                  type="text"
                  value={newAction}
                  onChange={(e) => setNewAction(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-slate-100"
                  placeholder="e.g. Open auxiliary bypass gate 02 and dispatch marshals"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800 font-mono">
                <button
                  type="button"
                  onClick={() => setIsLoggingModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold shadow-md cursor-pointer"
                >
                  Submit Incident
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}