'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { ScenarioType, ScenarioConfig, ZoneData, CrowdAlert, SCENARIO_CONFIGS } from '@/lib/3d/scenarios';

interface CrowdMapProps {
  scenario: any;
  alerts?: CrowdAlert[];
  selectedZone?: ZoneData | null;
  selectedZoneId?: string | null;
  onSelectZone?: (zone: ZoneData) => void;
  onZoneSelect?: (zone: ZoneData) => void;
  showFlow?: boolean;
  showGates?: boolean;
  is2D?: boolean;
  onResetView?: () => void;
  className?: string;
}

// Access points (Entrances and Exits) per scenario for emergency intelligence
const SCENARIO_GATES: Record<string, Array<{ id: string; name: string; type: 'entry' | 'exit'; coordinates: [number, number]; capacity: string }>> = {
  'open-ground': [
    { id: 'GT-01', name: 'Gate 1: 81st St North Portal', type: 'entry', coordinates: [-73.9642, 40.7830], capacity: '180 p/min' },
    { id: 'GT-02', name: 'Gate 2: East 79th Perimeter Ingress', type: 'entry', coordinates: [-73.9635, 40.7812], capacity: '120 p/min' },
    { id: 'EX-01', name: 'Exit A: 79th St Transverse Underpass', type: 'exit', coordinates: [-73.9680, 40.7790], capacity: '250 p/min' },
    { id: 'EX-02', name: 'Exit B: West Drive Egress Path', type: 'exit', coordinates: [-73.9692, 40.7816], capacity: '160 p/min' },
  ],
  'urban-intersection': [
    { id: 'GT-UI1', name: 'Ingress N: 47th St & 7th Ave', type: 'entry', coordinates: [-73.9846, 40.7596], capacity: '220 p/min' },
    { id: 'GT-UI2', name: 'Subway Portal: 46th St Concourse', type: 'entry', coordinates: [-73.9858, 40.7588], capacity: '180 p/min' },
    { id: 'EX-UI1', name: 'Egress S: 42nd St & Broadway', type: 'exit', coordinates: [-73.9868, 40.7562], capacity: '300 p/min' },
    { id: 'EX-UI2', name: 'Egress W: 45th St Safety Corridor', type: 'exit', coordinates: [-73.9875, 40.7578], capacity: '190 p/min' },
  ],
  'university-campus': [
    { id: 'GT-UC1', name: 'Main Security Gate: Broadway 116th', type: 'entry', coordinates: [-73.9640, 40.8080], capacity: '140 p/min' },
    { id: 'EX-UC1', name: 'Amsterdam Ave Perimeter Egress', type: 'exit', coordinates: [-73.9608, 40.8062], capacity: '150 p/min' },
  ],
  'transport-hub': [
    { id: 'GT-TH1', name: '42nd St North Main Concourse Influx', type: 'entry', coordinates: [-73.9772, 40.7532], capacity: '320 p/min' },
    { id: 'EX-TH1', name: 'Lexington Ave Subway Egress Tunnel', type: 'exit', coordinates: [-73.9782, 40.7522], capacity: '280 p/min' },
  ],
};

// 100% Free basemap providers with zero API key watermarks
const BASEMAP_STYLES = {
  osm: {
    id: 'osm',
    name: 'Street GIS',
    icon: 'map',
    spec: {
      version: 8,
      sources: {
        'osm-tiles': {
          type: 'raster',
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '© OpenStreetMap contributors',
        },
      },
      layers: [
        {
          id: 'osm-layer',
          type: 'raster',
          source: 'osm-tiles',
          minzoom: 0,
          maxzoom: 19,
        },
      ],
    },
  },
  satellite: {
    id: 'satellite',
    name: 'Satellite',
    icon: 'satellite_alt',
    spec: {
      version: 8,
      sources: {
        'satellite-tiles': {
          type: 'raster',
          tiles: [
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          ],
          tileSize: 256,
          attribution: '© Esri, Maxar, Earthstar Geographics',
        },
      },
      layers: [
        {
          id: 'satellite-layer',
          type: 'raster',
          source: 'satellite-tiles',
          minzoom: 0,
          maxzoom: 19,
        },
      ],
    },
  },
};

export default function CrowdMap({
  scenario,
  alerts,
  selectedZone,
  selectedZoneId,
  onSelectZone,
  onZoneSelect,
  showFlow = true,
  showGates = true,
  is2D = false,
  onResetView,
  className = 'h-[580px]',
}: CrowdMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const popupRef = useRef<maplibregl.Popup | null>(null);

  // Basemap style state: 'osm' (Street default) or 'satellite' (Satellite)
  const [activeStyle, setActiveStyle] = useState<'osm' | 'satellite'>('osm');

  // Search & Geocoding State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ name: string; country: string; center: [number, number] }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [customLocationName, setCustomLocationName] = useState<string | null>(null);
  const [isLegendOpen, setIsLegendOpen] = useState(true);

  const scenarioId: ScenarioType =
    typeof scenario === 'object' && scenario !== null && 'id' in scenario
      ? (scenario.id as ScenarioType)
      : (scenario as ScenarioType) || 'open-ground';

  const currentConfig: ScenarioConfig =
    typeof scenario === 'object' && scenario !== null && 'zones' in scenario
      ? (scenario as ScenarioConfig)
      : SCENARIO_CONFIGS[scenarioId] || SCENARIO_CONFIGS['open-ground'];

  const activeSelectedZoneId = selectedZone?.id || selectedZoneId || null;

  // Active alerts list prioritizing explicit alerts prop or scenario config alerts
  const currentAlerts: CrowdAlert[] = alerts || currentConfig.alerts || [];

  // Render or re-attach all CrowdPulse GeoJSON layers and HTML markers
  const renderLayers = useCallback(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    if (!map.isStyleLoaded()) return;

    // Clear previous markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // 1. DIRECTIONAL FLOW CORRIDORS LAYER
    if (currentConfig.flowRoutes && currentConfig.flowRoutes.length > 0) {
      const flowFeatures = currentConfig.flowRoutes.map((fr) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'LineString' as const,
          coordinates: fr.path,
        },
        properties: {
          name: fr.name,
          flowRate: fr.flowRate,
          status: fr.status,
        },
      }));

      const flowGeoJSON = {
        type: 'FeatureCollection' as const,
        features: flowFeatures,
      };

      if (map.getSource('cp-flow')) {
        (map.getSource('cp-flow') as maplibregl.GeoJSONSource).setData(flowGeoJSON);
      } else {
        map.addSource('cp-flow', {
          type: 'geojson',
          data: flowGeoJSON,
        });

        // Flow corridor casing glow
        map.addLayer({
          id: 'cp-flow-casing',
          type: 'line',
          source: 'cp-flow',
          paint: {
            'line-color': '#0284c7',
            'line-width': 7,
            'line-opacity': 0.45,
          },
        });

        // Flow dashed directional stroke
        map.addLayer({
          id: 'cp-flow-lines',
          type: 'line',
          source: 'cp-flow',
          paint: {
            'line-color': '#38bdf8',
            'line-width': 3.5,
            'line-dasharray': [2, 2],
          },
        });
      }

      if (map.getLayer('cp-flow-lines')) {
        map.setLayoutProperty('cp-flow-lines', 'visibility', showFlow ? 'visible' : 'none');
      }
      if (map.getLayer('cp-flow-casing')) {
        map.setLayoutProperty('cp-flow-casing', 'visibility', showFlow ? 'visible' : 'none');
      }

      // Add Directional Arrow Badges along Flow Routes
      if (showFlow) {
        currentConfig.flowRoutes.forEach((fr) => {
          if (!fr.path || fr.path.length < 2) return;
          for (let i = 0; i < fr.path.length - 1; i++) {
            const p1 = fr.path[i];
            const p2 = fr.path[i + 1];
            const midCoord: [number, number] = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];

            // Calculate bearing
            const dLng = p2[0] - p1[0];
            const dLat = p2[1] - p1[1];
            const angleDeg = (Math.atan2(dLat, dLng) * 180) / Math.PI;

            const arrowEl = document.createElement('div');
            arrowEl.className = 'pointer-events-none select-none';
            arrowEl.innerHTML = `
              <div class="flex items-center gap-1 bg-[#070b14]/95 text-cyan-300 border border-cyan-500/70 rounded-full px-2 py-0.5 text-[9px] font-mono shadow-xl backdrop-blur-md">
                <span class="inline-block transform font-bold" style="transform: rotate(${-angleDeg + 90}deg);">▲</span>
                <span class="font-bold">${fr.flowRate} p/m</span>
              </div>
            `;

            const arrowMarker = new maplibregl.Marker({ element: arrowEl, rotationAlignment: 'map' })
              .setLngLat(midCoord)
              .addTo(map);

            markersRef.current.push(arrowMarker);
          }
        });
      }
    }

    // 2. CLICKABLE ZONE BADGES AT ZONE CENTERS (Live reacting to Acknowledge / Resolve)
    currentConfig.zones.forEach((zone) => {
      const isSelected = activeSelectedZoneId === zone.id;

      // Determine real-time alert state for this zone
      const zoneAlerts = currentAlerts.filter((a) => a.zoneId === zone.id);
      const activeCritical = zoneAlerts.some((a) => a.severity === 'critical' && a.status === 'active');
      const activeWarning = zoneAlerts.some((a) => a.severity === 'warning' && a.status === 'active');
      const hasAcknowledged = zoneAlerts.some((a) => a.status === 'investigating');
      const isResolved = zoneAlerts.length > 0 && zoneAlerts.every((a) => a.status === 'resolved');

      let markerState: 'critical' | 'acknowledged' | 'resolved' | 'safe' = 'safe';
      if (activeCritical) {
        markerState = 'critical';
      } else if (hasAcknowledged) {
        markerState = 'acknowledged';
      } else if (activeWarning) {
        markerState = 'acknowledged';
      } else if (isResolved) {
        markerState = 'resolved';
      } else {
        markerState = zone.status === 'critical' ? 'critical' : zone.status === 'warning' ? 'acknowledged' : 'safe';
      }

      const el = document.createElement('div');
      el.className = 'cursor-pointer group select-none';

      // Visual styling for the 3 distinct states:
      // Critical (Red + Ping) | Acknowledged (Amber/Gold + Pulse) | Resolved/Safe (Green)
      let borderClasses = 'border-emerald-500 bg-[#070b14]/95 text-emerald-300 ring-1 ring-emerald-500/50';
      let pingHtml = '';
      let dotColor = 'bg-emerald-400';
      let stateBadge = '';

      if (markerState === 'critical') {
        borderClasses = 'border-rose-500 bg-[#070b14]/95 text-rose-300 ring-2 ring-rose-500/80 shadow-rose-950/80';
        pingHtml = '<span class="absolute w-8 h-8 rounded-full bg-rose-500/70 animate-ping"></span>';
        dotColor = 'bg-rose-500 animate-pulse';
        stateBadge = '<span class="text-[8.5px] font-bold text-rose-400 ml-0.5">• CRITICAL</span>';
      } else if (markerState === 'acknowledged') {
        borderClasses = 'border-amber-400 bg-[#070b14]/95 text-amber-300 ring-2 ring-amber-400/80 shadow-amber-950/80';
        pingHtml = '<span class="absolute w-8 h-8 rounded-full bg-amber-400/50 animate-pulse"></span>';
        dotColor = 'bg-amber-400';
        stateBadge = '<span class="text-[8.5px] font-bold text-amber-400 ml-0.5">• ACK</span>';
      } else if (markerState === 'resolved') {
        borderClasses = 'border-emerald-400 bg-emerald-950/90 text-emerald-200 ring-2 ring-emerald-400/80 shadow-emerald-950/80';
        dotColor = 'bg-emerald-400';
        stateBadge = '<span class="text-[8.5px] font-bold text-emerald-400 ml-0.5">✓ RESOLVED</span>';
      }

      el.innerHTML = `
        <div class="relative flex items-center justify-center">
          ${pingHtml}
          <div class="relative flex items-center gap-1.5 px-2.5 py-1 rounded-full border-2 ${borderClasses} shadow-2xl backdrop-blur-md transition-transform group-hover:scale-110 ${
        isSelected ? 'ring-2 ring-cyan-400 scale-105' : ''
      }">
            <span class="w-2 h-2 rounded-full ${dotColor}"></span>
            <span class="font-bold text-[10.5px] font-mono whitespace-nowrap text-white">${zone.name.split(':')[0]}</span>
            <span class="text-[9.5px] font-mono text-slate-300">${Math.round((zone.occupancy / zone.capacity) * 100)}%</span>
            ${stateBadge}
          </div>
        </div>
      `;

      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        if (onSelectZone) onSelectZone(zone);
        if (onZoneSelect) onZoneSelect(zone);
        if (mapRef.current) {
          mapRef.current.easeTo({
            center: zone.coordinates,
            duration: 1000,
          });
        }
      });

      const zoneMarker = new maplibregl.Marker({ element: el })
        .setLngLat(zone.coordinates)
        .addTo(map);

      markersRef.current.push(zoneMarker);
    });

    // 3. ENTRY AND EXIT ACCESS POINT MARKERS
    if (showGates) {
      const gates = SCENARIO_GATES[scenarioId] || [];
      gates.forEach((gate) => {
        const isEntry = gate.type === 'entry';
        const gateEl = document.createElement('div');
        gateEl.className = 'cursor-pointer group select-none relative';

        gateEl.innerHTML = `
          <div class="flex items-center gap-1.5 px-2 py-0.5 rounded-lg border shadow-xl backdrop-blur-md transition-transform group-hover:scale-110 ${
            isEntry
              ? 'bg-[#070b14]/95 border-emerald-500/90 text-emerald-300'
              : 'bg-[#070b14]/95 border-cyan-500/90 text-cyan-300'
          }">
            <span class="material-symbols-outlined text-[13px] ${isEntry ? 'text-emerald-400' : 'text-cyan-400'}">
              ${isEntry ? 'login' : 'logout'}
            </span>
            <span class="font-extrabold text-[9px] font-mono">${isEntry ? 'IN' : 'OUT'}</span>
            <span class="text-[9px] font-sans font-semibold hidden group-hover:inline ml-0.5 text-slate-200">${gate.name.split(':')[0]}</span>
          </div>
          <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col bg-[#070b14]/98 text-white text-[10px] px-2.5 py-1.5 rounded-lg shadow-2xl border border-slate-700 whitespace-nowrap z-50 font-sans">
            <span class="font-bold text-slate-100">${gate.name}</span>
            <span class="text-cyan-400 font-mono text-[9px]">Throughput Capacity: ${gate.capacity}</span>
            <span class="text-emerald-400 text-[9px] font-semibold">Sensor Nominal</span>
          </div>
        `;

        gateEl.addEventListener('click', (e) => {
          e.stopPropagation();
          if (!mapRef.current) return;
          if (popupRef.current) popupRef.current.remove();

          const popup = new maplibregl.Popup({ offset: 12, closeButton: true })
            .setLngLat(gate.coordinates)
            .setHTML(`
              <div class="p-2 space-y-1 font-sans text-xs bg-[#070b14] text-slate-100 rounded-lg border border-slate-700">
                <div class="font-bold ${isEntry ? 'text-emerald-400' : 'text-cyan-400'} flex items-center gap-1">
                  <span>${isEntry ? 'Entry Gate Influx' : 'Egress Exit Link'}</span>
                </div>
                <div class="font-semibold text-slate-200">${gate.name}</div>
                <div class="text-[10px] font-mono text-slate-400">Design Capacity: ${gate.capacity}</div>
                <div class="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Sensor Verified Nominal
                </div>
              </div>
            `)
            .addTo(mapRef.current);

          popupRef.current = popup;
        });

        const gateMarker = new maplibregl.Marker({ element: gateEl })
          .setLngLat(gate.coordinates)
          .addTo(map);

        markersRef.current.push(gateMarker);
      });
    }

    // 4. BOTTLENECK CHOKEPOINT MARKERS (Reacts immediately: Red -> Amber on Acknowledge -> Green on Resolve)
    if (currentConfig.bottlenecks) {
      currentConfig.bottlenecks.forEach((b) => {
        if (!b.coordinates) return;

        // Find alert associated with this bottleneck
        const correspondingAlert = currentAlerts.find(
          (a) =>
            a.zoneId === b.id ||
            b.id.includes(a.zoneId) ||
            a.title.toLowerCase().includes(b.name.toLowerCase().slice(0, 5)) ||
            b.name.toLowerCase().includes(a.zoneName.toLowerCase().slice(0, 5)) ||
            (b.id === 'BN-1' && a.id === 'ALT-102') ||
            (b.id === 'BN-2' && a.id === 'ALT-101') ||
            (b.id === 'BN-3' && a.id === 'ALT-103') ||
            (b.id === 'BN-4' && a.id === 'ALT-104')
        );

        const alertStatus = correspondingAlert?.status || (b.severity === 'critical' ? 'active' : 'safe');

        const el = document.createElement('div');
        el.className = 'group relative cursor-pointer select-none';

        if (alertStatus === 'resolved') {
          // RESOLVED STATE: Calm Green checkmark
          el.innerHTML = `
            <div class="relative flex items-center justify-center">
              <div class="relative flex items-center justify-center w-6 h-6 rounded-full bg-emerald-600 text-white shadow-xl border-2 border-[#070b14] text-[11px] font-extrabold">
                ✓
              </div>
            </div>
            <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col bg-[#070b14]/98 backdrop-blur-md text-white text-[10px] px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap z-50 font-sans border border-slate-700">
              <span class="font-bold text-slate-100">${b.name}</span>
              <span class="text-emerald-400 font-mono font-semibold">Incident Resolved • Flow Restored</span>
            </div>
          `;
        } else if (alertStatus === 'investigating') {
          // ACKNOWLEDGED STATE: Amber Alert
          el.innerHTML = `
            <div class="relative flex items-center justify-center">
              <span class="absolute w-7 h-7 rounded-full bg-amber-400/50 animate-pulse"></span>
              <div class="relative flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-slate-950 shadow-xl border-2 border-[#070b14] text-[9.5px] font-extrabold">
                ACK
              </div>
            </div>
            <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col bg-[#070b14]/98 backdrop-blur-md text-white text-[10px] px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap z-50 font-sans border border-slate-700">
              <span class="font-bold text-slate-100">${b.name}</span>
              <span class="text-amber-400 font-mono font-semibold">Acknowledged • Under Investigation</span>
            </div>
          `;
        } else {
          // ACTIVE CRITICAL STATE: Pulsing Red exclamation mark
          el.innerHTML = `
            <div class="relative flex items-center justify-center">
              <span class="absolute w-7 h-7 rounded-full ${
                b.severity === 'critical' ? 'bg-rose-500/70 animate-ping' : 'bg-amber-500/40'
              }"></span>
              <div class="relative flex items-center justify-center w-6 h-6 rounded-full ${
                b.severity === 'critical'
                  ? 'bg-gradient-to-tr from-rose-600 to-red-500'
                  : 'bg-gradient-to-tr from-amber-600 to-amber-400'
              } text-white shadow-md border-2 border-[#070b14] text-[11px] font-extrabold animate-pulse">
                !
              </div>
            </div>
            <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col bg-[#070b14]/98 backdrop-blur-md text-white text-[10px] px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap z-50 font-sans border border-slate-700">
              <span class="font-bold text-slate-100">${b.name}</span>
              <span class="text-rose-400 font-mono font-semibold">${b.chokeRatio}% restriction • ${b.inflowRate} p/min</span>
              <span class="text-slate-400 text-[9px]">${b.flowStatus}</span>
            </div>
          `;
        }

        el.addEventListener('click', () => {
          if (!mapRef.current) return;
          if (popupRef.current) popupRef.current.remove();

          const popup = new maplibregl.Popup({ offset: 14, closeButton: true })
            .setLngLat(b.coordinates)
            .setHTML(`
              <div class="p-2 space-y-1 font-sans text-xs bg-[#070b14] text-slate-100 rounded-lg border border-slate-700">
                <div class="font-extrabold text-slate-100">${b.name}</div>
                <div class="text-[10px] font-mono ${
                  alertStatus === 'resolved'
                    ? 'text-emerald-400'
                    : alertStatus === 'investigating'
                    ? 'text-amber-400'
                    : 'text-rose-400'
                } font-bold uppercase">
                  ${
                    alertStatus === 'resolved'
                      ? 'Resolved • Normal Traffic'
                      : alertStatus === 'investigating'
                      ? 'Acknowledged • Investigation Active'
                      : `${b.severity} severity (${b.chokeRatio}% Restriction)`
                  }
                </div>
                <div class="text-[11px] text-slate-300 font-medium">Throughput: ${b.inflowRate} persons/min</div>
                <div class="text-[10px] text-slate-400">Status: ${
                  alertStatus === 'resolved' ? 'Cleared' : alertStatus === 'investigating' ? 'Acknowledged' : b.flowStatus
                }</div>
              </div>
            `)
            .addTo(mapRef.current);

          popupRef.current = popup;
        });

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat(b.coordinates)
          .addTo(map);

        markersRef.current.push(marker);
      });
    }
  }, [
    currentConfig,
    currentAlerts,
    activeSelectedZoneId,
    showFlow,
    showGates,
    onSelectZone,
    onZoneSelect,
    scenarioId,
  ]);

  // Initialize MapLibre GL Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initialCenter = currentConfig.center || [-73.9665, 40.7812];
    const initialZoom = currentConfig.zoom || 16.3;
    const initialPitch = is2D ? 0 : currentConfig.pitch || 45;
    const initialBearing = is2D ? 0 : currentConfig.bearing || -24;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: BASEMAP_STYLES[activeStyle].spec as any,
      center: initialCenter,
      zoom: initialZoom,
      pitch: initialPitch,
      bearing: initialBearing,
      maxPitch: 75,
      attributionControl: false,
    });

    // Add navigation controls at bottom right
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');

    map.on('load', () => {
      setMapLoaded(true);
      map.resize();
    });

    // Auto-resize observer to handle screen resizing flawlessly
    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.resize();
      }
    });

    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    mapRef.current = map;

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Handle Basemap Style Switch
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;

    const handleStyleLoad = () => {
      renderLayers();
    };

    map.once('style.load', handleStyleLoad);
    map.setStyle(BASEMAP_STYLES[activeStyle].spec as any);
  }, [activeStyle, mapLoaded, renderLayers]);

  // Sync Camera View When Scenario Changes
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const targetPitch = is2D ? 0 : currentConfig.pitch || 50;
    const targetBearing = is2D ? 0 : currentConfig.bearing || -25;

    mapRef.current.flyTo({
      center: currentConfig.center,
      zoom: currentConfig.zoom || 16.5,
      pitch: targetPitch,
      bearing: targetBearing,
      duration: 1600,
      essential: true,
    });
  }, [scenarioId, mapLoaded]);

  // Handle 2D / 3D Pitch Toggle
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const targetPitch = is2D ? 0 : currentConfig.pitch || 55;
    const targetBearing = is2D ? 0 : currentConfig.bearing || -24;

    mapRef.current.easeTo({
      pitch: targetPitch,
      bearing: targetBearing,
      duration: 800,
    });
  }, [is2D, mapLoaded]);

  // Update layers whenever data, alerts, selection, or toggles change
  useEffect(() => {
    if (mapLoaded) {
      renderLayers();
    }
  }, [renderLayers, mapLoaded, scenario, alerts]);

  // Geocoding Search Handler
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(searchQuery)}&limit=5`
      );
      const data = await res.json();
      if (data && data.features && data.features.length > 0) {
        const results = data.features.map((f: any) => ({
          name: f.properties.name || f.properties.street || searchQuery,
          country: [f.properties.city, f.properties.state, f.properties.country]
            .filter(Boolean)
            .join(', '),
          center: f.geometry.coordinates as [number, number],
        }));
        setSearchResults(results);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.warn('Geocoding query error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (result: { name: string; country: string; center: [number, number] }) => {
    if (!mapRef.current) return;
    setCustomLocationName(`${result.name} (${result.country})`);
    setSearchResults([]);
    setSearchQuery('');

    mapRef.current.flyTo({
      center: result.center,
      zoom: 16.5,
      pitch: is2D ? 0 : 50,
      bearing: -20,
      duration: 2000,
      essential: true,
    });
  };

  const handleResetCamera = () => {
    if (!mapRef.current) return;
    setCustomLocationName(null);
    setSearchQuery('');
    setSearchResults([]);
    setActiveStyle('osm');

    if (onResetView) {
      onResetView();
    }

    mapRef.current.flyTo({
      center: currentConfig.center,
      zoom: currentConfig.zoom || 16.3,
      pitch: is2D ? 0 : currentConfig.pitch || 45,
      bearing: is2D ? 0 : currentConfig.bearing || -24,
      duration: 1200,
      essential: true,
    });
  };

  return (
    <div
      className={`relative w-full ${className} min-h-[520px] bg-[#070b14] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl select-none font-sans`}
    >
      {/* Map Viewport Canvas */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[520px] cursor-grab active:cursor-grabbing" />

      {/* TOP FLOATING OVERLAY: Location, Search & Street/Satellite Switcher */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-start justify-between gap-2 pointer-events-none">
        {/* Top Left: Geographic Location + Search Field */}
        <div className="flex flex-wrap items-center gap-2 pointer-events-auto max-w-full sm:max-w-xl">
          {/* Location Badge */}
          <div className="flex items-center gap-1.5 bg-[#070b14]/90 backdrop-blur-xl px-3 py-1.5 rounded-xl border border-slate-700/80 text-xs shadow-xl text-slate-100 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50"></span>
            <span className="material-symbols-outlined text-[15px] text-cyan-400">location_on</span>
            <span
              className="font-semibold text-xs truncate max-w-[150px] sm:max-w-[210px] text-slate-100"
              title={customLocationName || currentConfig.realLocationName}
            >
              {customLocationName || currentConfig.realLocationName}
            </span>
            <span className="text-[10px] font-mono text-slate-400 border-l border-slate-700/80 pl-2 hidden sm:inline">
              {currentConfig.center[1].toFixed(4)}°N, {Math.abs(currentConfig.center[0]).toFixed(4)}°W
            </span>
          </div>

          {/* Place Search Field */}
          <div className="relative">
            <form onSubmit={handleSearchSubmit} className="flex items-center">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search city, venue, coordinates..."
                  className="h-8 pl-7 pr-6 rounded-xl bg-[#070b14]/90 backdrop-blur-xl border border-slate-700/80 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-500 shadow-xl w-44 sm:w-56 focus:w-64 transition-all font-medium"
                />
                <span className="material-symbols-outlined absolute left-2 text-slate-400 text-[14px]">
                  search
                </span>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    className="absolute right-2 text-slate-400 hover:text-slate-200"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="ml-1.5 h-8 px-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
              >
                {isSearching ? '...' : 'Go'}
              </button>
            </form>

            {/* Search Dropdown Results */}
            {searchResults.length > 0 && (
              <div className="absolute top-9 left-0 right-0 bg-[#070b14]/98 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl max-h-56 overflow-y-auto z-50 divide-y divide-slate-800 text-xs">
                {searchResults.map((res, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelectSearchResult(res)}
                    className="w-full text-left px-3 py-2 hover:bg-slate-800 transition-colors flex flex-col cursor-pointer"
                  >
                    <span className="font-semibold text-slate-100">{res.name}</span>
                    <span className="text-[10px] text-slate-400 truncate">{res.country}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Top Right: Street (Default) / Satellite & Reset Camera */}
        <div className="flex items-center gap-1.5 bg-[#070b14]/90 backdrop-blur-xl p-1 rounded-xl border border-slate-700/80 shadow-xl text-xs pointer-events-auto shrink-0">
          <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-lg border border-slate-800 text-[11px] font-medium font-mono">
            <button
              onClick={() => setActiveStyle('osm')}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                activeStyle === 'osm'
                  ? 'bg-blue-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Street GIS (OpenStreetMap - Default)"
            >
              <span className="material-symbols-outlined text-[13px]">map</span>
              <span>Street</span>
            </button>
            <button
              onClick={() => setActiveStyle('satellite')}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                activeStyle === 'satellite'
                  ? 'bg-blue-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Satellite Imagery"
            >
              <span className="material-symbols-outlined text-[13px]">satellite_alt</span>
              <span>Satellite</span>
            </button>
          </div>

          <button
            onClick={handleResetCamera}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-medium flex items-center gap-1 transition-colors border border-slate-700 cursor-pointer font-mono"
            title="Reset Camera View"
          >
            <span className="material-symbols-outlined text-[13px]">restart_alt</span>
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* FLOATING FLOW & INFRASTRUCTURE LEGEND */}
      <div className="absolute bottom-11 left-3 z-20 pointer-events-auto">
        <div className="bg-[#070b14]/90 backdrop-blur-xl p-2.5 rounded-xl border border-slate-800 shadow-2xl text-[10.5px] font-mono text-slate-200 space-y-1.5 max-w-xs transition-all">
          <div className="flex items-center justify-between gap-3 font-bold text-[9.5px] text-slate-400 uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px] text-cyan-400">alt_route</span>
              FLOW &amp; SAFETY LEGEND
            </span>
            <button
              onClick={() => setIsLegendOpen(!isLegendOpen)}
              className="text-slate-400 hover:text-white"
            >
              {isLegendOpen ? '−' : '+'}
            </button>
          </div>

          {isLegendOpen && (
            <div className="space-y-1.5 pt-0.5">
              <div className="flex items-center justify-between text-[9.5px] text-slate-300">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-1 rounded bg-cyan-400"></span>
                  Flow Corridor
                </span>
                <span className="flex items-center gap-1 text-cyan-300">
                  <span>▲</span>
                  Direction Vector
                </span>
              </div>
              <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-[9px] text-slate-300">
                <span className="flex items-center gap-1">
                  <span className="px-1 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold text-[8px]">
                    IN
                  </span>
                  Entry Gate
                </span>
                <span className="flex items-center gap-1">
                  <span className="px-1 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-bold text-[8px]">
                    OUT
                  </span>
                  Exit Link
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3.5 h-3.5 rounded-full bg-rose-600 text-white text-[9px] flex items-center justify-center font-bold">
                    !
                  </span>
                  Active Alert
                </span>
              </div>
              <div className="flex items-center justify-between text-[9px] text-slate-400 pt-0.5">
                <span className="flex items-center gap-1">
                  <span className="w-3.5 h-3.5 rounded-full bg-amber-500 text-slate-950 text-[8px] flex items-center justify-center font-bold">
                    ACK
                  </span>
                  Acknowledged
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 text-white text-[8px] flex items-center justify-center font-bold">
                    ✓
                  </span>
                  Resolved
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM STATUS BAR: Engine & Basemap Attribution */}
      <div className="absolute bottom-3 left-3 right-16 z-10 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 bg-[#070b14]/90 backdrop-blur-xl px-2.5 py-1 rounded-lg border border-slate-800 text-[9.5px] font-mono text-slate-400 shadow-lg pointer-events-auto">
          <span className="flex items-center gap-1 font-bold text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            GIS ENGINE ONLINE
          </span>
          <span className="text-slate-700">•</span>
          <span className="truncate max-w-[200px] text-slate-300">{BASEMAP_STYLES[activeStyle].name}</span>
          <span className="text-slate-700">•</span>
          <span className="text-cyan-400 font-semibold hidden md:inline">Directional Corridors Active</span>
        </div>
      </div>
    </div>
  );
}