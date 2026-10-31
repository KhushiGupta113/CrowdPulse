export type ScenarioType = 'open-ground' | 'urban-intersection' | 'university-campus' | 'transport-hub';

export interface ZoneData {
  id: string;
  name: string;
  pos: [number, number, number]; // [x, y, z] fallback
  coordinates: [number, number]; // [longitude, latitude] in GeoJSON standard
  radiusMeters: number;
  radius: number; // visual scale factor
  height: number;
  status: 'safe' | 'warning' | 'critical';
  occupancy: number;
  capacity: number;
  density: number; // persons / m²
  inflowRate: number; // persons / min
  outflowRate: number; // persons / min
  warningThreshold: number; // percentage (e.g. 70)
  criticalThreshold: number; // percentage (e.g. 85)
  trend: number[]; // historical readings
  lastUpdated: string;
}

export interface CrowdAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  zoneId: string;
  zoneName: string;
  triggerValue: string;
  timestamp: string;
  status: 'active' | 'investigating' | 'resolved';
  recommendedAction: string;
}

export interface Bottleneck {
  id: string;
  name: string;
  severity: 'critical' | 'warning' | 'moderate';
  chokeRatio: number; // percentage
  inflowRate: number; // persons/min
  flowStatus: string;
  coordinates: [number, number]; // [longitude, latitude]
}

export interface OperatorAction {
  id: string;
  time: string;
  action: string;
  targetZone: string;
  status: 'In Progress' | 'Completed';
}

export interface FlowRoute {
  id: string;
  name: string;
  path: [number, number][]; // Array of [longitude, latitude]
  flowRate: number;
  status: string;
}

export interface ScenarioConfig {
  id: ScenarioType;
  name: string;
  subtitle: string;
  sectorTag: string;
  venueType: string;
  realLocationName: string;
  center: [number, number]; // [longitude, latitude]
  zoom: number;
  pitch: number;
  bearing: number;
  totalPresent: number;
  capacityTotal: number;
  netFlowRate: number;
  influxRatePercent: number;
  activeAlertsCount: number;
  cameraInitPos: [number, number, number];
  cameraLookAt: [number, number, number];
  zones: ZoneData[];
  alerts: CrowdAlert[];
  bottlenecks: Bottleneck[];
  flowRoutes: FlowRoute[];
  operatorActions: OperatorAction[];
}

export const SCENARIO_CONFIGS: Record<ScenarioType, ScenarioConfig> = {
  'open-ground': {
    id: 'open-ground',
    name: 'Open Ground / Festival',
    subtitle: 'Central Park Great Lawn & SummerStage Arena',
    sectorTag: '#SECTOR-01 ALPHA',
    venueType: 'Festival & Open Parklands',
    realLocationName: 'Great Lawn, Central Park, New York, NY',
    center: [-73.9665, 40.7812],
    zoom: 16.3,
    pitch: 45,
    bearing: -24,
    totalPresent: 14520,
    capacityTotal: 17500,
    netFlowRate: 382,
    influxRatePercent: 8.4,
    activeAlertsCount: 4,
    cameraInitPos: [42, 48, 54],
    cameraLookAt: [0, 0, 0],
    zones: [
      {
        id: 'OG-Z1',
        name: 'Zone A: Main Festival Stage Pit',
        pos: [0, 0, -10],
        coordinates: [-73.9658, 40.7818],
        radiusMeters: 65,
        radius: 6.5,
        height: 4.8,
        status: 'critical',
        occupancy: 4120,
        capacity: 4500,
        density: 4.2,
        inflowRate: 142,
        outflowRate: 28,
        warningThreshold: 75,
        criticalThreshold: 90,
        trend: [3200, 3450, 3780, 3950, 4120],
        lastUpdated: '10s ago',
      },
      {
        id: 'OG-Z2',
        name: 'Zone B: Sound Booth & Central Meadow',
        pos: [-11, 0, 2],
        coordinates: [-73.9672, 40.7810],
        radiusMeters: 75,
        radius: 7,
        height: 2.8,
        status: 'warning',
        occupancy: 3280,
        capacity: 5000,
        density: 2.6,
        inflowRate: 98,
        outflowRate: 64,
        warningThreshold: 65,
        criticalThreshold: 80,
        trend: [2800, 2950, 3100, 3210, 3280],
        lastUpdated: '12s ago',
      },
      {
        id: 'OG-Z3',
        name: 'Zone C: Concessions & Belvedere Walk',
        pos: [12, 0, 4],
        coordinates: [-73.9688, 40.7802],
        radiusMeters: 55,
        radius: 6,
        height: 2.2,
        status: 'safe',
        occupancy: 2420,
        capacity: 3500,
        density: 1.8,
        inflowRate: 72,
        outflowRate: 85,
        warningThreshold: 70,
        criticalThreshold: 85,
        trend: [2300, 2350, 2400, 2410, 2420],
        lastUpdated: '15s ago',
      },
      {
        id: 'OG-Z4',
        name: 'Zone D: 81st St North Influx Gateway',
        pos: [-15, 0, -18],
        coordinates: [-73.9642, 40.7830],
        radiusMeters: 45,
        radius: 5.5,
        height: 3.5,
        status: 'critical',
        occupancy: 1960,
        capacity: 2000,
        density: 4.8,
        inflowRate: 182,
        outflowRate: 12,
        warningThreshold: 70,
        criticalThreshold: 85,
        trend: [1200, 1450, 1680, 1820, 1960],
        lastUpdated: '8s ago',
      },
      {
        id: 'OG-Z5',
        name: 'Zone E: 79th St Transverse Egress Link',
        pos: [10, 0, 16],
        coordinates: [-73.9680, 40.7790],
        radiusMeters: 65,
        radius: 7.5,
        height: 1.5,
        status: 'safe',
        occupancy: 1100,
        capacity: 4500,
        density: 0.9,
        inflowRate: 40,
        outflowRate: 78,
        warningThreshold: 60,
        criticalThreshold: 80,
        trend: [1250, 1200, 1180, 1140, 1100],
        lastUpdated: '20s ago',
      },
    ],
    alerts: [
      {
        id: 'ALT-101',
        severity: 'critical',
        title: 'Front Stage Pit Barrier Compression Alert',
        zoneId: 'OG-Z1',
        zoneName: 'Zone A: Main Festival Stage Pit',
        triggerValue: '91.5% Capacity (4.2 p/m²)',
        timestamp: '14:28:10',
        status: 'active',
        recommendedAction: 'Halt crowd push; deploy secondary surge barrier.',
      },
      {
        id: 'ALT-102',
        severity: 'critical',
        title: 'North Gate Bottleneck Exceeded Safe Influx',
        zoneId: 'OG-Z4',
        zoneName: 'Zone D: 81st St North Influx Gateway',
        triggerValue: '98.0% Capacity (182 p/min)',
        timestamp: '14:26:45',
        status: 'active',
        recommendedAction: 'Divert pedestrian influx to East 79th Gate turnstiles.',
      },
      {
        id: 'ALT-103',
        severity: 'warning',
        title: 'Central Meadow Density Approaching Warning Limit',
        zoneId: 'OG-Z2',
        zoneName: 'Zone B: Sound Booth & Central Meadow',
        triggerValue: '65.6% Capacity',
        timestamp: '14:24:00',
        status: 'investigating',
        recommendedAction: 'Monitor sound tower egress pathway.',
      },
      {
        id: 'ALT-104',
        severity: 'info',
        title: 'South Egress Link Clear and Flowing',
        zoneId: 'OG-Z5',
        zoneName: 'Zone E: 79th St Transverse Egress Link',
        triggerValue: '24.4% Capacity',
        timestamp: '14:20:15',
        status: 'resolved',
        recommendedAction: 'Maintain current perimeter exit configuration.',
      },
    ],
    bottlenecks: [
      { id: 'BN-1', name: '81st St Stone Archway Chokepoint', severity: 'critical', chokeRatio: 98, inflowRate: 182, flowStatus: 'Severe Congestion', coordinates: [-73.9645, 40.7828] },
      { id: 'BN-2', name: 'Stage Egress Funnel B', severity: 'critical', chokeRatio: 91, inflowRate: 142, flowStatus: 'Surge Warning', coordinates: [-73.9654, 40.7822] },
      { id: 'BN-3', name: 'Belvedere Castle Alleyway', severity: 'warning', chokeRatio: 65, inflowRate: 98, flowStatus: 'Elevated Flow', coordinates: [-73.9682, 40.7806] },
      { id: 'BN-4', name: '79th St Transverse Underpass', severity: 'moderate', chokeRatio: 42, inflowRate: 40, flowStatus: 'Nominal Fluid', coordinates: [-73.9678, 40.7794] },
    ],
    flowRoutes: [
      {
        id: 'FR-1',
        name: 'North Ingress to Main Lawn Stage',
        path: [
          [-73.9642, 40.7830],
          [-73.9650, 40.7824],
          [-73.9658, 40.7818],
        ],
        flowRate: 142,
        status: 'Heavy Flow',
      },
      {
        id: 'FR-2',
        name: 'Stage Pit to Central Meadow',
        path: [
          [-73.9658, 40.7818],
          [-73.9665, 40.7814],
          [-73.9672, 40.7810],
        ],
        flowRate: 85,
        status: 'Moderate Flow',
      },
      {
        id: 'FR-3',
        name: 'Central Meadow to 79th St Egress',
        path: [
          [-73.9672, 40.7810],
          [-73.9676, 40.7800],
          [-73.9680, 40.7790],
        ],
        flowRate: 64,
        status: 'Fluid Egress',
      },
    ],
    operatorActions: [
      { id: 'ACT-1', time: '14:27', action: 'Placed safety barriers', targetZone: 'Zone A: Main Festival Stage Pit', status: 'Completed' },
      { id: 'ACT-2', time: '14:25', action: 'Adjusted entry gate speed', targetZone: '81st St North Gateway', status: 'Completed' },
      { id: 'ACT-3', time: '14:18', action: 'Made crowd announcement', targetZone: 'Central Meadow', status: 'Completed' },
    ],
  },

  'urban-intersection': {
    id: 'urban-intersection',
    name: 'Urban Intersection',
    subtitle: 'Times Square & Broadway 45th–47th St Pedestrian Scramble',
    sectorTag: '#SECTOR-02 BETA',
    venueType: 'Commercial Broadway Plaza',
    realLocationName: 'Times Square, Manhattan, New York, NY',
    center: [-73.9855, 40.7580],
    zoom: 17.2,
    pitch: 55,
    bearing: -29,
    totalPresent: 12180,
    capacityTotal: 16000,
    netFlowRate: 340,
    influxRatePercent: 12.1,
    activeAlertsCount: 3,
    cameraInitPos: [38, 44, 50],
    cameraLookAt: [0, 0, 0],
    zones: [
      {
        id: 'UI-Z1',
        name: 'Zone A: Father Duffy Square & TKTS Bleachers',
        pos: [0, 0, -8],
        coordinates: [-73.9852, 40.7590],
        radiusMeters: 45,
        radius: 6,
        height: 5.5,
        status: 'critical',
        occupancy: 3450,
        capacity: 4000,
        density: 4.4,
        inflowRate: 154,
        outflowRate: 42,
        warningThreshold: 75,
        criticalThreshold: 85,
        trend: [2600, 2800, 3100, 3320, 3450],
        lastUpdated: '5s ago',
      },
      {
        id: 'UI-Z2',
        name: 'Zone B: Broadway & 45th St Pedestrian Scramble',
        pos: [-9, 0, 8],
        coordinates: [-73.9860, 40.7575],
        radiusMeters: 48,
        radius: 6.5,
        height: 4.2,
        status: 'critical',
        occupancy: 3950,
        capacity: 4500,
        density: 4.1,
        inflowRate: 188,
        outflowRate: 58,
        warningThreshold: 70,
        criticalThreshold: 85,
        trend: [3100, 3350, 3600, 3810, 3950],
        lastUpdated: '6s ago',
      },
      {
        id: 'UI-Z3',
        name: 'Zone C: 7th Ave & 46th St Transit Plaza',
        pos: [10, 0, -4],
        coordinates: [-73.9845, 40.7582],
        radiusMeters: 40,
        radius: 5.5,
        height: 2.4,
        status: 'warning',
        occupancy: 2180,
        capacity: 3500,
        density: 2.8,
        inflowRate: 88,
        outflowRate: 74,
        warningThreshold: 65,
        criticalThreshold: 80,
        trend: [1950, 2020, 2100, 2150, 2180],
        lastUpdated: '12s ago',
      },
      {
        id: 'UI-Z4',
        name: 'Zone D: W 46th St Restaurant Row Corridor',
        pos: [2, 0, 15],
        coordinates: [-73.9870, 40.7585],
        radiusMeters: 42,
        radius: 5.8,
        height: 2.0,
        status: 'safe',
        occupancy: 2600,
        capacity: 4000,
        density: 1.9,
        inflowRate: 64,
        outflowRate: 80,
        warningThreshold: 70,
        criticalThreshold: 85,
        trend: [2750, 2710, 2680, 2640, 2600],
        lastUpdated: '18s ago',
      },
    ],
    alerts: [
      {
        id: 'ALT-201',
        severity: 'critical',
        title: 'TKTS Red Steps Structural Capacity Exceeded',
        zoneId: 'UI-Z1',
        zoneName: 'Zone A: Father Duffy Square & TKTS Bleachers',
        triggerValue: '86.2% Capacity (4.4 p/m²)',
        timestamp: '14:29:10',
        status: 'active',
        recommendedAction: 'Close bleacher access stanchions; divert tourists south.',
      },
      {
        id: 'ALT-202',
        severity: 'critical',
        title: 'Broadway Scramble Counter-Flow Shockwave',
        zoneId: 'UI-Z2',
        zoneName: 'Zone B: Broadway & 45th St Pedestrian Scramble',
        triggerValue: '87.7% Capacity (188 p/min)',
        timestamp: '14:27:00',
        status: 'active',
        recommendedAction: 'Engage pedestrian signal hold on 7th Ave traffic.',
      },
      {
        id: 'ALT-203',
        severity: 'warning',
        title: 'Metro N/Q/R/W Entrance Influx Elevated',
        zoneId: 'UI-Z3',
        zoneName: 'Zone C: 7th Ave & 46th St Transit Plaza',
        triggerValue: '62.2% Capacity',
        timestamp: '14:22:15',
        status: 'investigating',
        recommendedAction: 'Direct on-site staff to manage turnstiles.',
      },
    ],
    bottlenecks: [
      { id: 'BN-21', name: 'TKTS Bleachers Base Pinch', severity: 'critical', chokeRatio: 94, inflowRate: 154, flowStatus: 'Near Gridlock', coordinates: [-73.9850, 40.7588] },
      { id: 'BN-22', name: '45th St Broadway Crosswalk Funnel', severity: 'critical', chokeRatio: 88, inflowRate: 188, flowStatus: 'Surge Turbulence', coordinates: [-73.9858, 40.7576] },
      { id: 'BN-23', name: 'Marriott Marquis Taxi Turnaround', severity: 'warning', chokeRatio: 68, inflowRate: 88, flowStatus: 'Constrained', coordinates: [-73.9862, 40.7584] },
    ],
    flowRoutes: [
      {
        id: 'FR-21',
        name: 'Broadway Southbound Tourist Stream',
        path: [
          [-73.9850, 40.7595],
          [-73.9855, 40.7580],
          [-73.9860, 40.7570],
        ],
        flowRate: 188,
        status: 'Heavy Flow',
      },
      {
        id: 'FR-22',
        name: '46th St Theater Corridor Cross-Flux',
        path: [
          [-73.9875, 40.7588],
          [-73.9855, 40.7580],
          [-73.9835, 40.7572],
        ],
        flowRate: 112,
        status: 'Moderate Flow',
      },
    ],
    operatorActions: [
      { id: 'ACT-21', time: '14:28', action: 'Extended pedestrian barricades', targetZone: 'Zone A: Father Duffy Square', status: 'Completed' },
      { id: 'ACT-22', time: '14:20', action: 'Increased crossing light duration', targetZone: 'Broadway & 45th St', status: 'Completed' },
    ],
  },

  'university-campus': {
    id: 'university-campus',
    name: 'University Campus',
    subtitle: 'Columbia University Quad Commons & College Walk',
    sectorTag: '#SECTOR-03 GAMMA',
    venueType: 'Collegiate Quad & Arena',
    realLocationName: 'Columbia University, Morningside Heights, New York, NY',
    center: [-73.9626, 40.8075],
    zoom: 16.8,
    pitch: 50,
    bearing: 25,
    totalPresent: 8740,
    capacityTotal: 11000,
    netFlowRate: 210,
    influxRatePercent: 14.1,
    activeAlertsCount: 2,
    cameraInitPos: [45, 40, 45],
    cameraLookAt: [0, 0, 0],
    zones: [
      {
        id: 'UC-Z1',
        name: 'Zone A: Low Memorial Library Rotunda Plaza',
        pos: [-8, 0, -8],
        coordinates: [-73.9618, 40.8082],
        radiusMeters: 45,
        radius: 6.2,
        height: 4.8,
        status: 'critical',
        occupancy: 3120,
        capacity: 3500,
        density: 3.9,
        inflowRate: 125,
        outflowRate: 35,
        warningThreshold: 75,
        criticalThreshold: 85,
        trend: [2200, 2450, 2700, 2980, 3120],
        lastUpdated: '10s ago',
      },
      {
        id: 'UC-Z2',
        name: 'Zone B: Butler Library South Lawn & Steps',
        pos: [-8, 0, 10],
        coordinates: [-73.9632, 40.8066],
        radiusMeters: 55,
        radius: 6.8,
        height: 3.2,
        status: 'warning',
        occupancy: 2850,
        capacity: 4000,
        density: 2.4,
        inflowRate: 85,
        outflowRate: 50,
        warningThreshold: 65,
        criticalThreshold: 80,
        trend: [2400, 2550, 2680, 2750, 2850],
        lastUpdated: '14s ago',
      },
      {
        id: 'UC-Z3',
        name: 'Zone C: Alfred Lerner Student Concourse',
        pos: [10, 0, -6],
        coordinates: [-73.9642, 40.8070],
        radiusMeters: 40,
        radius: 5.5,
        height: 2.1,
        status: 'safe',
        occupancy: 1780,
        capacity: 2500,
        density: 1.8,
        inflowRate: 48,
        outflowRate: 62,
        warningThreshold: 70,
        criticalThreshold: 85,
        trend: [1600, 1680, 1720, 1750, 1780],
        lastUpdated: '22s ago',
      },
      {
        id: 'UC-Z4',
        name: 'Zone D: 116th St & Broadway Main Gates',
        pos: [10, 0, 10],
        coordinates: [-73.9626, 40.8075],
        radiusMeters: 35,
        radius: 5,
        height: 3.8,
        status: 'critical',
        occupancy: 1920,
        capacity: 2000,
        density: 4.6,
        inflowRate: 160,
        outflowRate: 20,
        warningThreshold: 70,
        criticalThreshold: 85,
        trend: [1100, 1300, 1550, 1780, 1920],
        lastUpdated: '7s ago',
      },
    ],
    alerts: [
      {
        id: 'ALT-301',
        severity: 'critical',
        title: '116th St College Walk Influx Congestion',
        zoneId: 'UC-Z4',
        zoneName: 'Zone D: 116th St & Broadway Main Gates',
        triggerValue: '96.0% Capacity (4.6 p/m²)',
        timestamp: '14:26:30',
        status: 'active',
        recommendedAction: 'Open Amsterdam Ave secondary pedestrian gates.',
      },
      {
        id: 'ALT-302',
        severity: 'warning',
        title: 'Alma Mater Steps Gathering Surge',
        zoneId: 'UC-Z1',
        zoneName: 'Zone A: Low Memorial Library Rotunda Plaza',
        triggerValue: '89.1% Capacity',
        timestamp: '14:21:00',
        status: 'investigating',
        recommendedAction: 'Guide crowd flow toward South Lawn.',
      },
    ],
    bottlenecks: [
      { id: 'BN-31', name: 'Broadway Security Turnstile Gates', severity: 'critical', chokeRatio: 96, inflowRate: 160, flowStatus: 'Gate Throttle', coordinates: [-73.9635, 40.8076] },
      { id: 'BN-32', name: 'Low Plaza Central Staircase Funnel', severity: 'warning', chokeRatio: 74, inflowRate: 125, flowStatus: 'Crowded Egress', coordinates: [-73.9622, 40.8079] },
    ],
    flowRoutes: [
      {
        id: 'FR-31',
        name: 'Main Gate to Low Library Steps',
        path: [
          [-73.9635, 40.8076],
          [-73.9626, 40.8075],
          [-73.9618, 40.8082],
        ],
        flowRate: 125,
        status: 'Surge Flow',
      },
      {
        id: 'FR-32',
        name: 'College Walk to Butler South Lawn',
        path: [
          [-73.9626, 40.8075],
          [-73.9630, 40.8070],
          [-73.9632, 40.8066],
        ],
        flowRate: 75,
        status: 'Nominal Egress',
      },
    ],
    operatorActions: [
      { id: 'ACT-31', time: '14:27', action: 'Opened side gate for crowd exit', targetZone: 'Zone D: 116th St Gates', status: 'Completed' },
    ],
  },

  'transport-hub': {
    id: 'transport-hub',
    name: 'Transport Hub',
    subtitle: 'Grand Central Terminal & 42nd St Transit Concourse',
    sectorTag: '#SECTOR-04 DELTA',
    venueType: 'Multi-Modal Rail & Subway Terminal',
    realLocationName: 'Grand Central Terminal, 89 E 42nd St, New York, NY',
    center: [-73.9772, 40.7527],
    zoom: 17.0,
    pitch: 55,
    bearing: 18,
    totalPresent: 13350,
    capacityTotal: 15500,
    netFlowRate: 460,
    influxRatePercent: 11.8,
    activeAlertsCount: 3,
    cameraInitPos: [35, 48, 40],
    cameraLookAt: [0, 0, 0],
    zones: [
      {
        id: 'TH-Z1',
        name: 'Zone A: Main Concourse Four-Faced Clock Center',
        pos: [0, 0, 0],
        coordinates: [-73.9772, 40.7527],
        radiusMeters: 45,
        radius: 6.5,
        height: 6.2,
        status: 'critical',
        occupancy: 4620,
        capacity: 5000,
        density: 4.8,
        inflowRate: 210,
        outflowRate: 45,
        warningThreshold: 75,
        criticalThreshold: 88,
        trend: [3400, 3800, 4100, 4390, 4620],
        lastUpdated: '4s ago',
      },
      {
        id: 'TH-Z2',
        name: 'Zone B: One Vanderbilt Pedestrian Plaza',
        pos: [-10, 0, -8],
        coordinates: [-73.9785, 40.7532],
        radiusMeters: 40,
        radius: 6,
        height: 3.5,
        status: 'warning',
        occupancy: 3200,
        capacity: 4000,
        density: 3.2,
        inflowRate: 115,
        outflowRate: 70,
        warningThreshold: 65,
        criticalThreshold: 80,
        trend: [2600, 2750, 2900, 3050, 3200],
        lastUpdated: '9s ago',
      },
      {
        id: 'TH-Z3',
        name: 'Zone C: 4/5/6 & 7 Subway Shuttle Mezzanine',
        pos: [10, 0, -6],
        coordinates: [-73.9765, 40.7520],
        radiusMeters: 38,
        radius: 5.5,
        height: 4.2,
        status: 'critical',
        occupancy: 2950,
        capacity: 3500,
        density: 4.5,
        inflowRate: 175,
        outflowRate: 35,
        warningThreshold: 70,
        criticalThreshold: 85,
        trend: [2100, 2300, 2550, 2780, 2950],
        lastUpdated: '6s ago',
      },
      {
        id: 'TH-Z4',
        name: 'Zone D: 42nd St South Street Forecourt',
        pos: [0, 0, 12],
        coordinates: [-73.9778, 40.7518],
        radiusMeters: 42,
        radius: 5.8,
        height: 2.1,
        status: 'safe',
        occupancy: 2580,
        capacity: 3000,
        density: 2.1,
        inflowRate: 80,
        outflowRate: 95,
        warningThreshold: 75,
        criticalThreshold: 88,
        trend: [2700, 2680, 2640, 2610, 2580],
        lastUpdated: '16s ago',
      },
    ],
    alerts: [
      {
        id: 'ALT-401',
        severity: 'critical',
        title: 'Metro-North Lower Level Escalator Stagnation',
        zoneId: 'TH-Z1',
        zoneName: 'Zone A: Main Concourse Center',
        triggerValue: '92.4% Capacity (4.8 p/m²)',
        timestamp: '14:29:40',
        status: 'active',
        recommendedAction: 'Engage escalator pulse cycle; direct commuter flow to ramps.',
      },
      {
        id: 'ALT-402',
        severity: 'critical',
        title: 'Subway Turnstile Line-1 Queue Spillover',
        zoneId: 'TH-Z3',
        zoneName: 'Zone C: Subway Shuttle Mezzanine',
        triggerValue: '84.3% Capacity (175 p/min)',
        timestamp: '14:28:10',
        status: 'active',
        recommendedAction: 'Open OMNY emergency egress barriers for fare-free clearing.',
      },
      {
        id: 'ALT-403',
        severity: 'warning',
        title: 'Vanderbilt Ave Influx Surge Approaching Commuter Peak',
        zoneId: 'TH-Z2',
        zoneName: 'Zone B: One Vanderbilt Pedestrian Plaza',
        triggerValue: '80.0% Capacity',
        timestamp: '14:24:20',
        status: 'investigating',
        recommendedAction: 'Coordinate with MTA Police to stagger platform gates.',
      },
    ],
    bottlenecks: [
      { id: 'BN-41', name: 'Subway Transfer Corridor Stair 2B', severity: 'critical', chokeRatio: 96, inflowRate: 175, flowStatus: 'Platform Gridlock', coordinates: [-73.9768, 40.7522] },
      { id: 'BN-42', name: 'Main Concourse East Ramps', severity: 'critical', chokeRatio: 90, inflowRate: 210, flowStatus: 'Heavy Friction', coordinates: [-73.9770, 40.7529] },
      { id: 'BN-43', name: 'Lexington Ave Exit Passageway', severity: 'warning', chokeRatio: 72, inflowRate: 115, flowStatus: 'Elevated Queue', coordinates: [-73.9760, 40.7525] },
    ],
    flowRoutes: [
      {
        id: 'FR-41',
        name: '42nd St Influx to Main Concourse',
        path: [
          [-73.9778, 40.7518],
          [-73.9775, 40.7523],
          [-73.9772, 40.7527],
        ],
        flowRate: 210,
        status: 'Peak Rush',
      },
      {
        id: 'FR-42',
        name: 'Vanderbilt Plaza Commuter Stream',
        path: [
          [-73.9785, 40.7532],
          [-73.9778, 40.7530],
          [-73.9772, 40.7527],
        ],
        flowRate: 140,
        status: 'Steady Corridor',
      },
    ],
    operatorActions: [
      { id: 'ACT-41', time: '14:28', action: 'Set escalator direction to exit', targetZone: 'Main Concourse Center', status: 'Completed' },
      { id: 'ACT-42', time: '14:15', action: 'Announced exit route recommendations', targetZone: 'All Concourse Channels', status: 'Completed' },
    ],
  },
};
