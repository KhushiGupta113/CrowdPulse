'use client';

import React from 'react';
import Link from 'next/link';
import { ZoneData } from '@/lib/3d/scenarios';

interface ZoneInspectorProps {
  zone: ZoneData | null;
  allZones: ZoneData[];
  onSelectZone: (zone: ZoneData) => void;
}

export default function ZoneInspector({
  zone,
  allZones,
  onSelectZone,
}: ZoneInspectorProps) {
  if (!zone) {
    return (
      <div className="bg-[#070b14]/90 rounded-2xl border border-slate-800 p-8 text-center text-slate-400 font-sans text-xs shadow-xl">
        <span className="material-symbols-outlined text-3xl text-cyan-400 block mb-2 animate-bounce">
          touch_app
        </span>
        Select any monitoring zone on the GIS map to inspect live headcount, flow rates, and sensor diagnostics.
      </div>
    );
  }

  const occupancyRatio = Math.round((zone.occupancy / zone.capacity) * 100);
  const netMovement = zone.inflowRate - zone.outflowRate;
  const isNetFilling = netMovement > 0;
  const spaceLeft = Math.max(0, zone.capacity - Math.round(zone.occupancy));

  const statusConfig = {
    critical: {
      badge: 'CRITICAL SURGE',
      badgeClass: 'bg-rose-950/80 text-rose-300 border-rose-700/80 shadow-rose-950/50',
      dotClass: 'bg-rose-500 animate-ping',
      barColor: 'bg-rose-500',
      recommendation: {
        title: 'CRITICAL OVERCROWDING PROTOCOL',
        action: 'Halt entry influx at sector gates immediately. Open secondary egress corridors and dispatch safety wardens to perimeter barriers.',
        severityColor: 'text-rose-400 border-rose-900/60 bg-rose-950/40',
      },
    },
    warning: {
      badge: 'ELEVATED DENSITY',
      badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-700/80 shadow-amber-950/50',
      dotClass: 'bg-amber-500',
      barColor: 'bg-amber-500',
      recommendation: {
        title: 'CONGESTION WARNING PROTOCOL',
        action: 'Pedestrian density approaching threshold. Slow gate intake speed, broadcast crowd advisory, and monitor pathway choke funnels.',
        severityColor: 'text-amber-400 border-amber-900/60 bg-amber-950/40',
      },
    },
    safe: {
      badge: 'NOMINAL FLOW',
      badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80 shadow-emerald-950/50',
      dotClass: 'bg-emerald-400',
      barColor: 'bg-emerald-500',
      recommendation: {
        title: 'STANDARD MONITORING PROTOCOL',
        action: 'All safety indices nominal. Flow dynamics and sensor telemetry indicate balanced bidirectional circulation.',
        severityColor: 'text-emerald-400 border-emerald-900/60 bg-emerald-950/40',
      },
    },
  }[zone.status];

  // Sensor node health simulation (tied to actual zone)
  const sensorStatus = {
    latency: '18ms',
    packetLoss: '0.0%',
    hardwareState: zone.status === 'critical' ? 'Surge Load' : 'Nominal',
    healthPercent: zone.status === 'critical' ? 98.6 : 99.9,
  };

  // Sparkline coordinates for trend chart
  const trendPoints = zone.trend || [zone.occupancy];
  const minVal = Math.min(...trendPoints) * 0.95;
  const maxVal = Math.max(...trendPoints, zone.capacity * 0.95) * 1.05;
  const range = maxVal - minVal || 1;
  const chartHeight = 56;
  const chartWidth = 240;

  const polylineCoords = trendPoints
    .map((val, idx) => {
      const x = (idx / (trendPoints.length - 1 || 1)) * chartWidth;
      const y = chartHeight - ((val - minVal) / range) * chartHeight;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="bg-[#070b14]/95 rounded-2xl border border-slate-800 shadow-2xl p-4 space-y-3.5 font-sans text-slate-100 transition-colors select-none">
      {/* 1. Zone Header & Independent Dropdown Selector */}
      <div className="space-y-2 pb-3 border-b border-slate-800">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-400 uppercase tracking-wider">
            <span className="material-symbols-outlined text-[14px] text-cyan-400">view_in_ar</span>
            <span>ZONE TELEMETRY</span>
          </div>

          {/* Clean Zone Selector Dropdown */}
          <select
            value={zone.id}
            onChange={(e) => {
              const found = allZones.find((z) => z.id === e.target.value);
              if (found) onSelectZone(found);
            }}
            aria-label="Select monitoring zone"
            className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1 text-xs font-mono font-semibold text-slate-200 focus:border-cyan-500 focus:outline-none cursor-pointer max-w-[170px] truncate"
          >
            {allZones.map((z) => (
              <option key={z.id} value={z.id} className="bg-slate-900 text-slate-100">
                {z.name.split(':')[0]}: {z.name.split(':')[1]?.trim() || z.name}
              </option>
            ))}
          </select>
        </div>

        {/* Title and Severity Badge */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div>
            <h3 className="font-bold text-sm text-slate-100 tracking-tight leading-snug">
              {zone.name}
            </h3>
            <span className="text-[10px] font-mono text-cyan-400/90 font-semibold">
              ID: {zone.id} • Latency {sensorStatus.latency}
            </span>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase border shadow-sm ${statusConfig.badgeClass}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotClass}`}></span>
            {statusConfig.badge}
          </span>
        </div>
      </div>

      {/* 2. Main Occupancy & Capacity Gauge */}
      <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800/90 space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
            PEOPLE / CAPACITY
          </span>
          <span className="text-2xl font-bold font-mono text-slate-100 tracking-tight">
            {zone.occupancy.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-400 font-mono">/ {zone.capacity.toLocaleString()}</span>
          </span>
        </div>

        {/* Dynamic Progress Bar with Threshold Markers */}
        <div className="relative w-full bg-slate-950 h-3 rounded-full overflow-hidden p-0.5 border border-slate-800">
          <div
            className={`${statusConfig.barColor} h-full transition-all duration-700 rounded-full`}
            style={{ width: `${Math.min(100, occupancyRatio)}%` }}
          />
          {/* Warning marker at 75% */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-amber-400/60"
            style={{ left: `${zone.warningThreshold}%` }}
            title={`Warning Threshold: ${zone.warningThreshold}%`}
          />
          {/* Critical marker at 90% */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-rose-500/80"
            style={{ left: `${zone.criticalThreshold}%` }}
            title={`Critical Threshold: ${zone.criticalThreshold}%`}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono text-slate-300 pt-0.5 font-medium">
          <span className="font-semibold text-slate-100">{occupancyRatio}% Occupied</span>
          <span className="text-slate-400">Space left: {spaceLeft.toLocaleString()} persons</span>
        </div>
      </div>

      {/* 3. 4-Cell Telemetry Stats Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs font-sans">
        {/* Crowd Density */}
        <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-mono block">
            Crowd Density
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-lg font-bold font-mono text-cyan-400">{zone.density}</span>
            <span className="text-[11px] font-medium text-slate-400 font-mono">p/m²</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            {zone.density >= 4.0 ? '🚨 Critical Surge' : zone.density >= 2.5 ? '⚠️ High Density' : '🟢 Safe Density'}
          </span>
        </div>

        {/* Net Movement */}
        <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-mono block">
            Net Movement
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span
              className={`text-lg font-bold font-mono ${
                isNetFilling ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {netMovement > 0 ? `+${netMovement}` : netMovement}
            </span>
            <span className="text-[11px] font-medium text-slate-400 font-mono">p/min</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            {isNetFilling ? 'Surging (Filling)' : 'Egressing (Clearing)'}
          </span>
        </div>

        {/* Entering */}
        <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-mono block">
            Incoming People
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-base font-bold font-mono text-cyan-400">+{zone.inflowRate}</span>
            <span className="text-[11px] font-medium text-slate-400 font-mono">p/min</span>
          </div>
          <span className="text-[9.5px] font-mono text-emerald-400/90">Entry Sensor Active</span>
        </div>

        {/* Leaving */}
        <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-mono block">
            Outgoing People
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-base font-bold font-mono text-slate-200">-{zone.outflowRate}</span>
            <span className="text-[11px] font-medium text-slate-400 font-mono">p/min</span>
          </div>
          <span className="text-[9.5px] font-mono text-cyan-400/80">Egress Gate Verified</span>
        </div>
      </div>

      {/* 4. Sensor Health Telemetry */}
      <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[10.5px] font-mono space-y-1">
        <div className="flex items-center justify-between text-slate-400 uppercase tracking-wider text-[9.5px] font-semibold">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            SENSOR ARRAY HEALTH
          </span>
          <span className="text-emerald-400 font-bold">{sensorStatus.healthPercent}%</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>LiDAR Node &amp; Camera:</span>
          <span className="text-cyan-400 font-semibold">{sensorStatus.hardwareState}</span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Telemetry Stream:</span>
          <span>Loss {sensorStatus.packetLoss} • {zone.lastUpdated}</span>
        </div>
      </div>

      {/* 5. Crowd-Density Trend Chart with Axes and Time Labels */}
      <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
        <div className="flex justify-between text-[10px] font-mono text-slate-400">
          <span className="font-semibold uppercase text-slate-300">Crowd Trend Progression</span>
          <span className="text-cyan-400 font-mono">Last 5 Readings</span>
        </div>

        {/* SVG Sparkline with Gradient and Points */}
        <div className="relative w-full h-14 bg-slate-950/80 rounded-lg p-1.5 border border-slate-800/80 overflow-hidden">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            {/* Area fill */}
            <polygon
              points={`0,${chartHeight} ${polylineCoords} ${chartWidth},${chartHeight}`}
              fill="url(#trendGradient)"
            />
            {/* Line stroke */}
            <polyline
              fill="none"
              stroke="#22d3ee"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={polylineCoords}
            />
            {/* Plot points */}
            {trendPoints.map((val, idx) => {
              const cx = (idx / (trendPoints.length - 1 || 1)) * chartWidth;
              const cy = chartHeight - ((val - minVal) / range) * chartHeight;
              return (
                <circle
                  key={idx}
                  cx={cx}
                  cy={cy}
                  r="3"
                  className="fill-cyan-400 stroke-slate-900 stroke-2"
                />
              );
            })}
          </svg>
        </div>

        <div className="flex justify-between text-[9px] font-mono text-slate-400">
          <span>-20m</span>
          <span>-15m</span>
          <span>-10m</span>
          <span>-5m</span>
          <span className="text-cyan-400 font-bold">Now: {zone.occupancy}</span>
        </div>
      </div>

      {/* 6. Actionable Emergency & Safety Recommendations */}
      <div className={`p-2.5 rounded-xl border ${statusConfig.recommendation.severityColor} space-y-1`}>
        <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider">
          <span className="material-symbols-outlined text-[14px]">shield</span>
          <span>{statusConfig.recommendation.title}</span>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-200">
          {statusConfig.recommendation.action}
        </p>
      </div>

      {/* 7. Action Navigation Buttons */}
      <div className="pt-1 flex gap-2 font-mono">
        <Link
          href="/thresholds"
          className="flex-1 py-2 px-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-cyan-950/50"
        >
          <span className="material-symbols-outlined text-[15px]">tune</span>
          <span>Configure Limits</span>
        </Link>
        <Link
          href="/zone-telemetry"
          className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition-colors"
          title="Deep Sensor Graphs"
        >
          <span className="material-symbols-outlined text-[15px]">analytics</span>
          <span>Analytics</span>
        </Link>
      </div>
    </div>
  );
}