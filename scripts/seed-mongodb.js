/**
 * Standalone MongoDB Seed & Verification Script for CrowdPulse
 * 
 * Safely seeds the `crowdpulse` database in MongoDB Atlas / local MongoDB:
 * - `areas`: Venue scenarios, coordinates, flow routes, bottlenecks
 * - `monitoringZones`: Monitoring zones with thresholds, capacities, baseline occupancies
 * - `crowdAlerts`: Baseline alerts (preserves existing modified/resolved user alerts)
 * - `occupancyReadings`: Time-series crowd occupancy readings (clearly labeled isSimulated: true)
 * 
 * Usage:
 *   node scripts/seed-mongodb.js
 */

const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/crowdpulse';
const dbName = process.env.MONGODB_DB_NAME || 'crowdpulse';

// SCENARIO DEFINITIONS
const SCENARIOS = [
  {
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
    bottlenecks: [
      { id: 'BN-01', name: 'West Lawn Perimeter Choke', severity: 'critical', chokeRatio: 88, inflowRate: 185, flowStatus: 'Restricted Egress', coordinates: [-73.9682, 40.7825] },
      { id: 'BN-02', name: 'East Ingress Funnel (79th St)', severity: 'warning', chokeRatio: 72, inflowRate: 140, flowStatus: 'Heavy Compaction', coordinates: [-73.9642, 40.7801] },
      { id: 'BN-03', name: 'Belvedere Castle Access Steps', severity: 'moderate', chokeRatio: 54, inflowRate: 92, flowStatus: 'Slow Marching', coordinates: [-73.9690, 40.7795] },
    ],
    flowRoutes: [
      { id: 'FR-01', name: 'Primary Ingress Boulevard', path: [[-73.9635, 40.7805], [-73.9655, 40.7812], [-73.9665, 40.7818]], flowRate: 145, status: 'Active Inflow' },
      { id: 'FR-02', name: 'West Boundary Evac Route', path: [[-73.9670, 40.7820], [-73.9685, 40.7828], [-73.9698, 40.7835]], flowRate: 98, status: 'Clear Corridor' },
      { id: 'FR-03', name: 'Mid-Lawn Cross-Circulation', path: [[-73.9650, 40.7825], [-73.9665, 40.7812], [-73.9680, 40.7800]], flowRate: 112, status: 'Bidirectional' },
    ],
    operatorActions: [
      { id: 'ACT-01', time: '14:32', action: 'Deployed Surge Deflector Screen at West Egress', targetZone: 'West Lawn Evac Corridor', status: 'Completed' },
      { id: 'ACT-02', time: '14:28', action: 'Initiated 3-Phase Gate Metering at 79th Transverse', targetZone: 'Main South Entrance Gate', status: 'In Progress' },
    ],
  },
  {
    id: 'urban-intersection',
    name: 'Urban Intersection / Transit Plaza',
    subtitle: 'Times Square & Duffy Square Pedestrian Plazas',
    sectorTag: '#SECTOR-02 BRAVO',
    venueType: 'High-Density Pedestrian Plaza',
    realLocationName: 'Times Square, Manhattan, NY',
    center: [-73.9855, 40.7580],
    zoom: 17.2,
    pitch: 52,
    bearing: 28,
    totalPresent: 18450,
    capacityTotal: 22000,
    netFlowRate: 465,
    influxRatePercent: 12.1,
    bottlenecks: [
      { id: 'BN-UI1', name: 'Subway Exit 42nd St Stairs', severity: 'critical', chokeRatio: 92, inflowRate: 230, flowStatus: 'Platform Queuing Hazard', coordinates: [-73.9862, 40.7558] },
      { id: 'BN-UI2', name: 'Red Steps Viewing Deck Ingress', severity: 'warning', chokeRatio: 78, inflowRate: 160, flowStatus: 'Static Congestion', coordinates: [-73.9851, 40.7592] },
    ],
    flowRoutes: [
      { id: 'FR-UI1', name: 'Broadway Pedestrian Spine', path: [[-73.9870, 40.7550], [-73.9858, 40.7575], [-73.9845, 40.7600]], flowRate: 210, status: 'High Volume Pedestrian Flow' },
      { id: 'FR-UI2', name: '7th Avenue Spillover Corridor', path: [[-73.9860, 40.7555], [-73.9850, 40.7580], [-73.9840, 40.7605]], flowRate: 185, status: 'Steady Northward Drift' },
    ],
    operatorActions: [
      { id: 'ACT-UI1', time: '15:10', action: 'Activated Dynamic Variable Message Signs at 43rd St', targetZone: 'Broadway Spine', status: 'Completed' },
    ],
  },
  {
    id: 'university-campus',
    name: 'University Campus Quad',
    subtitle: 'Columbia University Morningside Campus & Low Plaza',
    sectorTag: '#SECTOR-03 CHARLIE',
    venueType: 'Academic Campus & Quadrangle',
    realLocationName: 'Morningside Heights, Columbia University, NY',
    center: [-73.9626, 40.8075],
    zoom: 17.0,
    pitch: 42,
    bearing: -15,
    totalPresent: 8200,
    capacityTotal: 12000,
    netFlowRate: 145,
    influxRatePercent: 4.8,
    bottlenecks: [
      { id: 'BN-UC1', name: 'College Walk Central Gates', severity: 'warning', chokeRatio: 68, inflowRate: 110, flowStatus: 'Turnstile Queue Compaction', coordinates: [-73.9632, 40.8068] },
    ],
    flowRoutes: [
      { id: 'FR-UC1', name: 'Alma Mater Plaza Ingress', path: [[-73.9638, 40.8065], [-73.9626, 40.8075], [-73.9615, 40.8085]], flowRate: 85, status: 'Class Transition Wave' },
    ],
    operatorActions: [],
  },
  {
    id: 'transport-hub',
    name: 'Transport Hub Terminal',
    subtitle: 'Grand Central Terminal Vanderbilt Concourse & Grand Central Plaza',
    sectorTag: '#SECTOR-04 DELTA',
    venueType: 'Multimodal Transit Terminal',
    realLocationName: 'Grand Central Terminal, 89 E 42nd St, NY',
    center: [-73.9772, 40.7527],
    zoom: 17.5,
    pitch: 48,
    bearing: 35,
    totalPresent: 23600,
    capacityTotal: 28000,
    netFlowRate: 620,
    influxRatePercent: 14.5,
    bottlenecks: [
      { id: 'BN-TH1', name: 'Main Concourse East Escalator Bank', severity: 'critical', chokeRatio: 94, inflowRate: 290, flowStatus: 'Subway Transfer Surge', coordinates: [-73.9768, 40.7529] },
    ],
    flowRoutes: [
      { id: 'FR-TH1', name: 'Lexington Passage Commuter Influx', path: [[-73.9758, 40.7522], [-73.9768, 40.7526], [-73.9775, 40.7530]], flowRate: 310, status: 'Peak Commuter Surge' },
    ],
    operatorActions: [],
  },
];

const ZONES = [
  // Open Ground
  { id: 'OG-Z1', name: 'Zone A: Main Festival Stage Pit', areaId: 'open-ground', pos: [0, 0, -10], coordinates: [-73.9658, 40.7818], radiusMeters: 65, radius: 6.5, height: 4.8, status: 'critical', occupancy: 4120, capacity: 4500, density: 4.2, inflowRate: 142, outflowRate: 28, warningThreshold: 75, criticalThreshold: 90, trend: [3200, 3450, 3780, 3950, 4120], lastUpdated: 'Just now' },
  { id: 'OG-Z2', name: 'Zone B: Mid-Lawn Food & Beverage Row', areaId: 'open-ground', pos: [15, 0, 10], coordinates: [-73.9672, 40.7810], radiusMeters: 80, radius: 8.0, height: 2.4, status: 'warning', occupancy: 3250, capacity: 4000, density: 2.1, inflowRate: 88, outflowRate: 65, warningThreshold: 70, criticalThreshold: 85, trend: [2800, 2950, 3100, 3180, 3250], lastUpdated: 'Just now' },
  { id: 'OG-Z3', name: 'Zone C: East Perimeter Grass Outfield', areaId: 'open-ground', pos: [-20, 0, 5], coordinates: [-73.9648, 40.7826], radiusMeters: 90, radius: 9.0, height: 1.6, status: 'safe', occupancy: 2840, capacity: 4500, density: 1.4, inflowRate: 52, outflowRate: 48, warningThreshold: 75, criticalThreshold: 90, trend: [2600, 2710, 2780, 2810, 2840], lastUpdated: 'Just now' },
  { id: 'OG-Z4', name: 'Zone D: West Lawn Evac Corridor & Egress', areaId: 'open-ground', pos: [5, 0, -25], coordinates: [-73.9680, 40.7802], radiusMeters: 55, radius: 5.5, height: 3.2, status: 'warning', occupancy: 2410, capacity: 2500, density: 2.8, inflowRate: 95, outflowRate: 32, warningThreshold: 70, criticalThreshold: 85, trend: [1800, 1950, 2100, 2280, 2410], lastUpdated: 'Just now' },
  { id: 'OG-Z5', name: 'Zone E: North Tree Perimeter Buffer', areaId: 'open-ground', pos: [-10, 0, 20], coordinates: [-73.9652, 40.7800], radiusMeters: 70, radius: 7.0, height: 1.2, status: 'safe', occupancy: 1900, capacity: 2000, density: 1.1, inflowRate: 35, outflowRate: 41, warningThreshold: 75, criticalThreshold: 90, trend: [1950, 1940, 1920, 1910, 1900], lastUpdated: 'Just now' },

  // Urban Intersection
  { id: 'UI-Z1', name: 'Zone A: Father Duffy Square & TKTS Red Steps', areaId: 'urban-intersection', pos: [0, 0, -8], coordinates: [-73.9851, 40.7590], radiusMeters: 45, radius: 4.5, height: 5.2, status: 'critical', occupancy: 3950, capacity: 3500, density: 4.8, inflowRate: 154, outflowRate: 42, warningThreshold: 75, criticalThreshold: 90, trend: [3100, 3350, 3600, 3810, 3950], lastUpdated: 'Just now' },
  { id: 'UI-Z2', name: 'Zone B: Broadway Central Pedestrian Mall', areaId: 'urban-intersection', pos: [0, 0, 10], coordinates: [-73.9858, 40.7575], radiusMeters: 60, radius: 6.0, height: 3.8, status: 'warning', occupancy: 4620, capacity: 5500, density: 3.2, inflowRate: 120, outflowRate: 98, warningThreshold: 70, criticalThreshold: 85, trend: [4100, 4250, 4400, 4510, 4620], lastUpdated: 'Just now' },
  { id: 'UI-Z3', name: 'Zone C: 7th Ave & 47th St Traffic Crossing', areaId: 'urban-intersection', pos: [12, 0, -15], coordinates: [-73.9845, 40.7598], radiusMeters: 40, radius: 4.0, height: 2.9, status: 'safe', occupancy: 2150, capacity: 3000, density: 1.9, inflowRate: 64, outflowRate: 70, warningThreshold: 75, criticalThreshold: 90, trend: [2300, 2250, 2210, 2180, 2150], lastUpdated: 'Just now' },
  { id: 'UI-Z4', name: 'Zone D: 42nd St Subway Concourse Entrance', areaId: 'urban-intersection', pos: [-5, 0, 25], coordinates: [-73.9865, 40.7558], radiusMeters: 50, radius: 5.0, height: 4.9, status: 'critical', occupancy: 4880, capacity: 5000, density: 4.5, inflowRate: 168, outflowRate: 51, warningThreshold: 75, criticalThreshold: 90, trend: [3800, 4100, 4390, 4650, 4880], lastUpdated: 'Just now' },
  { id: 'UI-Z5', name: 'Zone E: 45th St Cross-Corridor', areaId: 'urban-intersection', pos: [-15, 0, 5], coordinates: [-73.9868, 40.7582], radiusMeters: 35, radius: 3.5, height: 2.1, status: 'safe', occupancy: 2850, capacity: 5000, density: 2.1, inflowRate: 48, outflowRate: 55, warningThreshold: 75, criticalThreshold: 90, trend: [2950, 2910, 2890, 2870, 2850], lastUpdated: 'Just now' },

  // University Campus
  { id: 'UC-Z1', name: 'Zone A: Alma Mater / Low Library Steps', areaId: 'university-campus', pos: [0, 0, -10], coordinates: [-73.9626, 40.8075], radiusMeters: 50, radius: 5.0, height: 4.0, status: 'warning', occupancy: 2650, capacity: 3000, density: 2.8, inflowRate: 78, outflowRate: 45, warningThreshold: 70, criticalThreshold: 85, trend: [2100, 2250, 2400, 2520, 2650], lastUpdated: 'Just now' },
  { id: 'UC-Z2', name: 'Zone B: South Lawn Commencement Seating', areaId: 'university-campus', pos: [0, 0, 15], coordinates: [-73.9626, 40.8062], radiusMeters: 65, radius: 6.5, height: 2.5, status: 'safe', occupancy: 2400, capacity: 4000, density: 1.6, inflowRate: 42, outflowRate: 50, warningThreshold: 75, criticalThreshold: 90, trend: [2550, 2500, 2460, 2430, 2400], lastUpdated: 'Just now' },
  { id: 'UC-Z3', name: 'Zone C: Butler Library Ingress Plaza', areaId: 'university-campus', pos: [0, 0, 30], coordinates: [-73.9626, 40.8052], radiusMeters: 45, radius: 4.5, height: 2.8, status: 'safe', occupancy: 1850, capacity: 2500, density: 1.8, inflowRate: 35, outflowRate: 38, warningThreshold: 75, criticalThreshold: 90, trend: [1900, 1890, 1870, 1860, 1850], lastUpdated: 'Just now' },
  { id: 'UC-Z4', name: 'Zone D: College Walk East-West Axis', areaId: 'university-campus', pos: [0, 0, 0], coordinates: [-73.9626, 40.8068], radiusMeters: 75, radius: 7.5, height: 1.8, status: 'safe', occupancy: 1300, capacity: 2500, density: 1.2, inflowRate: 55, outflowRate: 58, warningThreshold: 75, criticalThreshold: 90, trend: [1350, 1340, 1320, 1310, 1300], lastUpdated: 'Just now' },

  // Transport Hub
  { id: 'TH-Z1', name: 'Zone A: Grand Central Main Concourse Clock Area', areaId: 'transport-hub', pos: [0, 0, 0], coordinates: [-73.9772, 40.7527], radiusMeters: 55, radius: 5.5, height: 5.5, status: 'critical', occupancy: 6850, capacity: 7000, density: 4.6, inflowRate: 245, outflowRate: 85, warningThreshold: 75, criticalThreshold: 90, trend: [5200, 5600, 6100, 6500, 6850], lastUpdated: 'Just now' },
  { id: 'TH-Z2', name: 'Zone B: Lower Level Dining Concourse', areaId: 'transport-hub', pos: [-15, 0, 10], coordinates: [-73.9778, 40.7522], radiusMeters: 50, radius: 5.0, height: 3.2, status: 'warning', occupancy: 4200, capacity: 5500, density: 2.7, inflowRate: 110, outflowRate: 95, warningThreshold: 70, criticalThreshold: 85, trend: [3800, 3950, 4050, 4120, 4200], lastUpdated: 'Just now' },
  { id: 'TH-Z3', name: 'Zone C: 42nd St Vanderbilt Ingress Hall', areaId: 'transport-hub', pos: [20, 0, -5], coordinates: [-73.9782, 40.7532], radiusMeters: 40, radius: 4.0, height: 4.8, status: 'critical', occupancy: 4400, capacity: 4500, density: 4.4, inflowRate: 180, outflowRate: 55, warningThreshold: 75, criticalThreshold: 90, trend: [3400, 3700, 3980, 4210, 4400], lastUpdated: 'Just now' },
];

const ALERTS = [
  { id: 'ALT-101', severity: 'critical', title: 'Front Stage Pit Barrier Compression Alert', zoneId: 'OG-Z1', zoneName: 'Zone A: Main Festival Stage Pit', triggerValue: '91.5% Capacity (4.2 p/m²)', timestamp: '14:28:10', status: 'resolved', recommendedAction: 'Halt crowd push; deploy secondary surge barrier.', areaId: 'open-ground', isSimulated: true },
  { id: 'ALT-102', severity: 'warning', title: 'Food Pavilion Perimeter Flow Deceleration', zoneId: 'OG-Z2', zoneName: 'Zone B: Mid-Lawn Food & Beverage Row', triggerValue: '81.2% Capacity (2.1 p/m²)', timestamp: '14:31:05', status: 'investigating', recommendedAction: 'Open auxiliary overflow aisle near East Tent.', areaId: 'open-ground', isSimulated: true },
  { id: 'ALT-103', severity: 'warning', title: 'Egress Funnel Compaction Hazard', zoneId: 'OG-Z4', zoneName: 'Zone D: West Lawn Evac Corridor & Egress', triggerValue: '96.4% Capacity (2.8 p/m²)', timestamp: '14:34:22', status: 'active', recommendedAction: 'Divert oncoming pedestrian streams toward North Portals.', areaId: 'open-ground', isSimulated: true },
  { id: 'ALT-201', severity: 'critical', title: 'Father Duffy Viewing Stand Crush Alert', zoneId: 'UI-Z1', zoneName: 'Zone A: Father Duffy Square & TKTS Red Steps', triggerValue: '112.9% Capacity (4.8 p/m²)', timestamp: '15:12:40', status: 'active', recommendedAction: 'Stagger access to red steps; engage police crowd marshals.', areaId: 'urban-intersection', isSimulated: true },
  { id: 'ALT-202', severity: 'critical', title: 'Subway Portal Rapid Ingress Choke', zoneId: 'UI-Z4', zoneName: 'Zone D: 42nd St Subway Concourse Entrance', triggerValue: '97.6% Capacity (4.5 p/m²)', timestamp: '15:15:18', status: 'active', recommendedAction: 'Coordinate with MTA transit control for escalator rate regulation.', areaId: 'urban-intersection', isSimulated: true },
  { id: 'ALT-301', severity: 'warning', title: 'Low Steps Convocation Bottleneck', zoneId: 'UC-Z1', zoneName: 'Zone A: Alma Mater / Low Library Steps', triggerValue: '88.3% Capacity (2.8 p/m²)', timestamp: '11:42:00', status: 'investigating', recommendedAction: 'Direct graduating students to east ramp walkway.', areaId: 'university-campus', isSimulated: true },
  { id: 'ALT-401', severity: 'critical', title: 'Main Concourse Center Clock Surge Risk', zoneId: 'TH-Z1', zoneName: 'Zone A: Grand Central Main Concourse Clock Area', triggerValue: '97.8% Capacity (4.6 p/m²)', timestamp: '17:45:10', status: 'active', recommendedAction: 'Open auxiliary track gates 101-105 early to drain concourse floor.', areaId: 'transport-hub', isSimulated: true },
  { id: 'ALT-402', severity: 'critical', title: 'Vanderbilt Ingress Rapid Surge Choke', zoneId: 'TH-Z3', zoneName: 'Zone C: 42nd St Vanderbilt Ingress Hall', triggerValue: '97.7% Capacity (4.4 p/m²)', timestamp: '17:48:32', status: 'active', recommendedAction: 'Activate one-way turnstiles and message signs.', areaId: 'transport-hub', isSimulated: true },
];

async function seedDatabase() {
  console.log(`Connecting to MongoDB at: ${uri.replace(/\/\/.*@/, '//<credentials>@')}`);
  const client = new MongoClient(uri, {
    connectTimeoutMS: 8000,
    serverSelectionTimeoutMS: 8000,
  });

  try {
    await client.connect();
    const db = client.db(dbName);
    console.log(`Connected successfully to database: "${db.databaseName}"`);

    // Ensure Indexes (wrap in try-catch to tolerate existing index specs)
    console.log('Ensuring database indexes...');
    try { await db.collection('areas').createIndex({ id: 1 }); } catch (e) {}
    try { await db.collection('monitoringZones').createIndex({ id: 1 }); } catch (e) {}
    try { await db.collection('monitoringZones').createIndex({ areaId: 1 }); } catch (e) {}
    try { await db.collection('crowdAlerts').createIndex({ id: 1 }); } catch (e) {}
    try { await db.collection('crowdAlerts').createIndex({ areaId: 1, status: 1 }); } catch (e) {}
    try { await db.collection('crowdAlerts').createIndex({ zoneId: 1 }); } catch (e) {}
    try { await db.collection('occupancyReadings').createIndex({ zoneId: 1, timestamp: -1 }); } catch (e) {}
    try { await db.collection('occupancyReadings').createIndex({ areaId: 1, timestamp: -1 }); } catch (e) {}
    try { await db.collection('occupancyReadings').createIndex({ timestamp: -1 }); } catch (e) {}

    // 1. Seed / Upsert Areas
    console.log(`Upserting ${SCENARIOS.length} Areas...`);
    for (const sc of SCENARIOS) {
      await db.collection('areas').updateOne(
        { id: sc.id },
        {
          $set: {
            id: sc.id,
            name: sc.name,
            subtitle: sc.subtitle,
            sectorTag: sc.sectorTag,
            venueType: sc.venueType,
            realLocationName: sc.realLocationName,
            center: sc.center,
            zoom: sc.zoom,
            pitch: sc.pitch,
            bearing: sc.bearing,
            totalPresent: sc.totalPresent,
            capacityTotal: sc.capacityTotal,
            netFlowRate: sc.netFlowRate,
            influxRatePercent: sc.influxRatePercent,
            bottlenecks: sc.bottlenecks,
            flowRoutes: sc.flowRoutes,
            operatorActions: sc.operatorActions,
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      );
    }
    console.log(' - Areas seeded successfully.');

    // 2. Seed / Upsert Monitoring Zones
    console.log(`Upserting ${ZONES.length} Monitoring Zones...`);
    for (const z of ZONES) {
      // Check if zone already exists to avoid overwriting live telemetry if present
      const existing = await db.collection('monitoringZones').findOne({ id: z.id });
      if (!existing) {
        await db.collection('monitoringZones').insertOne({
          ...z,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } else {
        // Update configuration and geometry without resetting dynamic user edits
        await db.collection('monitoringZones').updateOne(
          { id: z.id },
          {
            $set: {
              name: z.name,
              areaId: z.areaId,
              pos: z.pos,
              coordinates: z.coordinates,
              radiusMeters: z.radiusMeters,
              radius: z.radius,
              height: z.height,
              capacity: existing.capacity || z.capacity,
              warningThreshold: existing.warningThreshold || z.warningThreshold,
              criticalThreshold: existing.criticalThreshold || z.criticalThreshold,
              updatedAt: new Date(),
            },
          }
        );
      }
    }
    console.log(' - Monitoring Zones seeded successfully.');

    // 3. Seed / Safe-Insert Crowd Alerts (Do not overwrite resolved/acknowledged status)
    console.log(`Checking ${ALERTS.length} Baseline Crowd Alerts...`);
    let insertedAlerts = 0;
    for (const a of ALERTS) {
      const existing = await db.collection('crowdAlerts').findOne({ id: a.id });
      if (!existing) {
        await db.collection('crowdAlerts').insertOne({
          ...a,
          createdAt: new Date().toISOString(),
          isSimulated: true,
        });
        insertedAlerts++;
      }
    }
    console.log(` - Crowd Alerts: ${insertedAlerts} new alerts inserted, existing user states preserved.`);

    // 4. Seed Initial Occupancy Readings (Historical readings)
    const existingReadingsCount = await db.collection('occupancyReadings').countDocuments();
    if (existingReadingsCount === 0) {
      console.log('Generating baseline historical occupancy readings for zones...');
      const initialReadings = [];
      const now = Date.now();

      for (const z of ZONES) {
        // Generate 5 historical readings corresponding to trend points
        const trend = z.trend || [Math.round(z.occupancy * 0.9), z.occupancy];
        trend.forEach((val, index) => {
          const timestamp = new Date(now - (trend.length - 1 - index) * 5 * 60 * 1000); // 5 min intervals
          const ratio = (val / z.capacity) * 100;
          const status = ratio >= z.criticalThreshold ? 'critical' : ratio >= z.warningThreshold ? 'warning' : 'safe';
          
          initialReadings.push({
            areaId: z.areaId,
            zoneId: z.id,
            zoneName: z.name,
            occupancy: val,
            capacity: z.capacity,
            density: parseFloat((val / (z.radius * z.radius * 3.14)).toFixed(1)),
            inflowRate: z.inflowRate,
            outflowRate: z.outflowRate,
            status,
            timestamp,
            isSimulated: true,
          });
        });
      }

      if (initialReadings.length > 0) {
        await db.collection('occupancyReadings').insertMany(initialReadings);
        console.log(` - Inserted ${initialReadings.length} initial historical readings into occupancyReadings.`);
      }
    } else {
      console.log(` - occupancyReadings already contains ${existingReadingsCount} records. No seed duplicates added.`);
    }

    // Verify Counts
    console.log('\n--- MONGODB CROWDPULSE VERIFICATION SUMMARY ---');
    const areasCount = await db.collection('areas').countDocuments();
    const zonesCount = await db.collection('monitoringZones').countDocuments();
    const alertsCount = await db.collection('crowdAlerts').countDocuments();
    const readingsCount = await db.collection('occupancyReadings').countDocuments();

    console.log(`Collection: areas            -> ${areasCount} documents`);
    console.log(`Collection: monitoringZones  -> ${zonesCount} documents`);
    console.log(`Collection: crowdAlerts      -> ${alertsCount} documents`);
    console.log(`Collection: occupancyReadings-> ${readingsCount} documents`);
    console.log('Database is fully ready and synced with CrowdPulse.\n');
  } catch (error) {
    console.error('Seed execution error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('MongoDB connection closed.');
  }
}

seedDatabase();
