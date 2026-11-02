import { MongoClient, Db } from 'mongodb';
import { SCENARIO_CONFIGS, ScenarioType, ScenarioConfig, ZoneData, CrowdAlert } from './scenarios';

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/crowdpulse';
const dbName = process.env.MONGODB_DB_NAME || 'crowdpulse';

let client: MongoClient | null = null;
let db: Db | null = null;

// In-Memory Reactive State for the 4 Scenarios (Zero-crash fallback when offline or MongoDB Atlas not reachable)
let memoryScenarios: Record<ScenarioType, ScenarioConfig> = JSON.parse(JSON.stringify(SCENARIO_CONFIGS));

/**
 * Ensures MongoDB connection and retrieves the Db instance.
 */
export async function get3dDb(): Promise<{ isConnected: boolean; dbName: string; db: Db | null }> {
  try {
    if (!client) {
      client = new MongoClient(uri, {
        connectTimeoutMS: 5000,
        serverSelectionTimeoutMS: 5000,
      });
      await client.connect();
      db = client.db(dbName);
    }
    return { isConnected: true, dbName: db?.databaseName || dbName, db };
  } catch (error) {
    console.warn('MongoDB connection failed, using in-memory store:', error);
    return { isConnected: false, dbName: 'InMemoryReactiveStore', db: null };
  }
}

/**
 * Retrieves scenario configuration, populated directly from MongoDB when connected.
 */
export async function getScenarioConfig(type: ScenarioType): Promise<ScenarioConfig> {
  const { isConnected, db } = await get3dDb();
  if (isConnected && db) {
    try {
      const area = await db.collection('areas').findOne({ id: type });
      const zones = await db.collection<ZoneData>('monitoringZones').find({ areaId: type }).toArray();
      const alerts = await db.collection<CrowdAlert>('crowdAlerts').find({ areaId: type }).toArray();

      if (zones.length > 0) {
        const cleanZones = zones.map((z: any) => {
          const { _id, areaId, ...rest } = z;
          return rest as ZoneData;
        });

        const cleanAlerts = alerts.map((a: any) => {
          const { _id, areaId, ...rest } = a;
          return rest as CrowdAlert;
        });

        const activeCount = cleanAlerts.filter(
          (a) => a.status === 'active' || a.status === 'investigating'
        ).length;

        return {
          ...SCENARIO_CONFIGS[type],
          name: area?.name || SCENARIO_CONFIGS[type].name,
          subtitle: area?.subtitle || SCENARIO_CONFIGS[type].subtitle,
          sectorTag: area?.sectorTag || SCENARIO_CONFIGS[type].sectorTag,
          venueType: area?.venueType || SCENARIO_CONFIGS[type].venueType,
          realLocationName: area?.realLocationName || SCENARIO_CONFIGS[type].realLocationName,
          center: area?.center || SCENARIO_CONFIGS[type].center,
          zoom: area?.zoom || SCENARIO_CONFIGS[type].zoom,
          pitch: area?.pitch || SCENARIO_CONFIGS[type].pitch,
          bearing: area?.bearing || SCENARIO_CONFIGS[type].bearing,
          totalPresent: area?.totalPresent ?? SCENARIO_CONFIGS[type].totalPresent,
          capacityTotal: area?.capacityTotal ?? SCENARIO_CONFIGS[type].capacityTotal,
          netFlowRate: area?.netFlowRate ?? SCENARIO_CONFIGS[type].netFlowRate,
          influxRatePercent: area?.influxRatePercent ?? SCENARIO_CONFIGS[type].influxRatePercent,
          bottlenecks: area?.bottlenecks || SCENARIO_CONFIGS[type].bottlenecks,
          flowRoutes: area?.flowRoutes || SCENARIO_CONFIGS[type].flowRoutes,
          operatorActions: area?.operatorActions || SCENARIO_CONFIGS[type].operatorActions,
          zones: cleanZones,
          alerts: cleanAlerts,
          activeAlertsCount: activeCount,
        };
      }
    } catch (e) {
      console.warn('MongoDB read error, fallback to memory:', e);
    }
  }

  return memoryScenarios[type] || memoryScenarios['open-ground'];
}

/**
 * Retrieves summary list of all scenarios directly from MongoDB.
 */
export async function getAllScenariosSummary(): Promise<Array<{
  id: string;
  name: string;
  subtitle: string;
  sectorTag: string;
  totalPresent: number;
  capacityTotal: number;
  activeAlertsCount: number;
  zonesCount: number;
}>> {
  const { isConnected, db } = await get3dDb();
  if (isConnected && db) {
    try {
      const areas = await db.collection('areas').find().toArray();
      const zones = await db.collection('monitoringZones').find().toArray();
      const alerts = await db.collection('crowdAlerts').find({ status: { $in: ['active', 'investigating'] } }).toArray();

      if (areas.length > 0) {
        return areas.map((area: any) => {
          const areaZones = zones.filter((z: any) => z.areaId === area.id);
          const areaAlerts = alerts.filter((a: any) => a.areaId === area.id);
          const totalPresent = areaZones.reduce((sum: number, z: any) => sum + (z.occupancy || 0), 0);

          return {
            id: area.id,
            name: area.name,
            subtitle: area.subtitle,
            sectorTag: area.sectorTag,
            totalPresent: totalPresent || area.totalPresent || 0,
            capacityTotal: area.capacityTotal || 0,
            activeAlertsCount: areaAlerts.length,
            zonesCount: areaZones.length,
          };
        });
      }
    } catch (e) {
      console.warn('MongoDB getAllScenariosSummary error:', e);
    }
  }

  return Object.values(memoryScenarios).map((s) => ({
    id: s.id,
    name: s.name,
    subtitle: s.subtitle,
    sectorTag: s.sectorTag,
    totalPresent: s.totalPresent,
    capacityTotal: s.capacityTotal,
    activeAlertsCount: s.activeAlertsCount,
    zonesCount: s.zones.length,
  }));
}

/**
 * Retrieves all alerts across all scenarios or filtered by scenario.
 * Returns genuine records from MongoDB.
 */
export async function getAllAlerts(scenarioId?: string): Promise<Array<CrowdAlert & { scenarioId: string; scenarioTitle: string }>> {
  const { isConnected, db } = await get3dDb();
  if (isConnected && db) {
    try {
      const query: any = {};
      if (scenarioId && scenarioId !== 'all') {
        query.areaId = scenarioId;
      }

      const alerts = await db.collection('crowdAlerts').find(query).sort({ timestamp: -1, createdAt: -1 }).toArray();
      const areas = await db.collection('areas').find().toArray();
      const areaMap = new Map<string, string>();
      areas.forEach((a: any) => {
        areaMap.set(a.id, a.name || a.subtitle || a.id);
      });

      return alerts.map((a: any) => ({
        id: a.id,
        severity: a.severity,
        title: a.title,
        zoneId: a.zoneId,
        zoneName: a.zoneName,
        triggerValue: a.triggerValue,
        timestamp: a.timestamp,
        status: a.status,
        recommendedAction: a.recommendedAction,
        scenarioId: a.areaId,
        scenarioTitle: areaMap.get(a.areaId) || a.areaId,
        resolvedAt: a.resolvedAt,
        createdAt: a.createdAt,
      }));
    } catch (e) {
      console.warn('MongoDB getAllAlerts error, falling back to memory:', e);
    }
  }

  // In-memory fallback
  const allAlerts: Array<CrowdAlert & { scenarioId: string; scenarioTitle: string }> = [];
  const scenarios: ScenarioType[] = ['open-ground', 'urban-intersection', 'university-campus', 'transport-hub'];

  for (const scId of scenarios) {
    if (scenarioId && scenarioId !== 'all' && scenarioId !== scId) continue;
    const config = memoryScenarios[scId];
    if (config) {
      config.alerts.forEach((alert) => {
        allAlerts.push({
          ...alert,
          scenarioId: scId,
          scenarioTitle: config.name,
        });
      });
    }
  }

  return allAlerts;
}

/**
 * Updates a zone's thresholds in MongoDB and in-memory.
 */
export async function updateZoneThresholds(
  scenarioId: ScenarioType,
  zoneId: string,
  warningThreshold: number,
  criticalThreshold: number,
  capacity?: number
): Promise<ZoneData | null> {
  const { isConnected, db } = await get3dDb();
  let updatedZone: ZoneData | null = null;

  if (isConnected && db) {
    try {
      const existingZone = await db.collection('monitoringZones').findOne({ id: zoneId });
      const currentCap = capacity || existingZone?.capacity || 2000;
      const currentOcc = existingZone?.occupancy || 1000;
      const ratio = (currentOcc / currentCap) * 100;
      const newStatus = ratio >= criticalThreshold ? 'critical' : ratio >= warningThreshold ? 'warning' : 'safe';

      const updatePayload: any = {
        warningThreshold,
        criticalThreshold,
        status: newStatus,
        updatedAt: new Date(),
      };
      if (capacity) updatePayload.capacity = capacity;

      const res = await db.collection('monitoringZones').findOneAndUpdate(
        { id: zoneId },
        { $set: updatePayload },
        { returnDocument: 'after' }
      );

      if (res) {
        const { _id, areaId, ...rest } = res as any;
        updatedZone = rest as ZoneData;
      }
    } catch (e) {
      console.warn('DB zone update error:', e);
    }
  }

  // Update in-memory copy as well
  const scenario = memoryScenarios[scenarioId];
  if (scenario) {
    const zone = scenario.zones.find((z) => z.id === zoneId);
    if (zone) {
      zone.warningThreshold = warningThreshold;
      zone.criticalThreshold = criticalThreshold;
      if (capacity) zone.capacity = capacity;
      const ratio = (zone.occupancy / zone.capacity) * 100;
      zone.status = ratio >= criticalThreshold ? 'critical' : ratio >= warningThreshold ? 'warning' : 'safe';
      if (!updatedZone) updatedZone = zone;
    }
  }

  return updatedZone;
}

/**
 * Updates an alert's status (e.g. 'resolved') in MongoDB and in-memory.
 */
export async function updateAlertStatus(
  scenarioId: ScenarioType,
  alertId: string,
  newStatus: CrowdAlert['status']
): Promise<CrowdAlert | null> {
  const { isConnected, db } = await get3dDb();
  let updatedRecord: CrowdAlert | null = null;

  if (isConnected && db) {
    try {
      const updateDoc: any = {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      };
      if (newStatus === 'resolved') {
        updateDoc.resolvedAt = new Date().toISOString();
      }

      const res = await db.collection('crowdAlerts').findOneAndUpdate(
        { id: alertId },
        { $set: updateDoc },
        { returnDocument: 'after' }
      );

      if (res) {
        const { _id, areaId, ...rest } = res as any;
        updatedRecord = rest as CrowdAlert;

        // If an alert is marked as resolved, relieve the zone's occupancy back to safe capacity (<75%)
        if (newStatus === 'resolved' && updatedRecord.zoneId) {
          const targetZone = await db.collection('monitoringZones').findOne({ id: updatedRecord.zoneId });
          if (targetZone) {
            const relievedOccupancy = Math.round(targetZone.capacity * 0.72);
            const radius = targetZone.radius || 5.0;
            const relievedDensity = parseFloat((relievedOccupancy / (radius * radius * 3.14)).toFixed(1));
            const updatedTrend = Array.isArray(targetZone.trend) ? [...targetZone.trend] : [relievedOccupancy];
            updatedTrend.shift();
            updatedTrend.push(relievedOccupancy);

            await db.collection('monitoringZones').updateOne(
              { id: updatedRecord.zoneId },
              {
                $set: {
                  occupancy: relievedOccupancy,
                  density: relievedDensity,
                  status: 'safe',
                  trend: updatedTrend,
                  lastUpdated: 'Just now',
                  updatedAt: new Date(),
                },
              }
            );
          }
        }
      }
    } catch (e) {
      console.warn('DB alert update error:', e);
    }
  }

  // Keep in-memory store synchronized as fallback
  for (const sc of Object.values(memoryScenarios)) {
    const alert = sc.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.status = newStatus;
      if (newStatus === 'resolved') {
        (alert as any).resolvedAt = new Date().toISOString();
        const targetZone = sc.zones.find((z) => z.id === alert.zoneId);
        if (targetZone) {
          targetZone.occupancy = Math.round(targetZone.capacity * 0.72);
          targetZone.density = parseFloat((targetZone.occupancy / (targetZone.radius * targetZone.radius * 3.14)).toFixed(1));
          targetZone.status = 'safe';
          targetZone.trend.shift();
          targetZone.trend.push(targetZone.occupancy);
        }
      }
      sc.activeAlertsCount = sc.alerts.filter(
        (a) => a.status === 'active' || a.status === 'investigating'
      ).length;
      if (!updatedRecord) updatedRecord = alert;
    }
  }

  return updatedRecord;
}

/**
 * Creates a new alert and persists it in MongoDB.
 */
export async function createManualAlert(data: {
  scenarioId: ScenarioType;
  zoneName: string;
  zoneId?: string;
  severity: 'critical' | 'warning';
  title: string;
  triggerValue: string;
  recommendedAction: string;
}): Promise<CrowdAlert> {
  const { scenarioId, zoneName, zoneId, severity, title, triggerValue, recommendedAction } = data;

  const newAlert: CrowdAlert = {
    id: `ALT-${Date.now().toString().slice(-4)}`,
    severity,
    title,
    zoneId: zoneId || 'ZONE-CUSTOM',
    zoneName,
    triggerValue,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    status: 'active',
    recommendedAction,
  };

  const { isConnected, db } = await get3dDb();
  if (isConnected && db) {
    try {
      await db.collection('crowdAlerts').insertOne({
        ...newAlert,
        areaId: scenarioId,
        createdAt: new Date().toISOString(),
        isSimulated: false,
      });
    } catch (e) {
      console.warn('DB manual alert insert error:', e);
    }
  }

  // Also add to memory fallback
  const scenario = memoryScenarios[scenarioId];
  if (scenario) {
    scenario.alerts.unshift(newAlert);
    scenario.activeAlertsCount = scenario.alerts.filter(
      (a) => a.status === 'active' || a.status === 'investigating'
    ).length;
  }

  return newAlert;
}

/**
 * Real-time simulation tick:
 * - Updates occupant estimates with realistic physics/jitter.
 * - PERSISTS updated zone telemetry to MongoDB collection `monitoringZones`.
 * - PERSISTS new reading documents to MongoDB collection `occupancyReadings`.
 * - PERSISTS aggregate totals to MongoDB collection `areas`.
 * - Automatically detects critical over-capacity zones and inserts alerts to `crowdAlerts`.
 */
export async function simulateTelemetryTick(scenarioId: ScenarioType): Promise<ScenarioConfig> {
  const { isConnected, db } = await get3dDb();

  if (isConnected && db) {
    try {
      const area = await db.collection('areas').findOne({ id: scenarioId });
      const rawZones = await db.collection('monitoringZones').find({ areaId: scenarioId }).toArray();
      const rawAlerts = await db.collection('crowdAlerts').find({ areaId: scenarioId }).toArray();

      if (rawZones.length > 0) {
        let totalPresent = 0;
        let totalInflow = 0;
        let totalOutflow = 0;
        const now = new Date();
        const readingDocs: any[] = [];
        const zoneUpdates: Promise<any>[] = [];

        const updatedZones = rawZones.map((z: any) => {
          // Add realistic jitter (-15 to +20 persons)
          const jitter = Math.floor(Math.random() * 35) - 15;
          const newOccupancy = Math.max(100, Math.min(Math.round(z.capacity * 1.15), Math.round((z.occupancy || 1000) + jitter)));
          const radius = z.radius || 5.0;
          const newDensity = parseFloat((newOccupancy / (radius * radius * 3.14)).toFixed(1));
          const newInflow = Math.max(10, (z.inflowRate || 50) + Math.floor(Math.random() * 9) - 4);
          const newOutflow = Math.max(10, (z.outflowRate || 40) + Math.floor(Math.random() * 9) - 4);

          const ratio = (newOccupancy / z.capacity) * 100;
          const newStatus: 'safe' | 'warning' | 'critical' =
            ratio >= (z.criticalThreshold || 90) ? 'critical' : ratio >= (z.warningThreshold || 75) ? 'warning' : 'safe';

          const trend = Array.isArray(z.trend) ? [...z.trend] : [newOccupancy];
          trend.shift();
          trend.push(newOccupancy);

          totalPresent += newOccupancy;
          totalInflow += newInflow;
          totalOutflow += newOutflow;

          // Prepare reading document for occupancyReadings collection
          readingDocs.push({
            areaId: scenarioId,
            zoneId: z.id,
            zoneName: z.name,
            occupancy: newOccupancy,
            capacity: z.capacity,
            density: newDensity,
            inflowRate: newInflow,
            outflowRate: newOutflow,
            status: newStatus,
            timestamp: now,
            isSimulated: true,
          });

          // Prepare zone update for monitoringZones collection
          zoneUpdates.push(
            db.collection('monitoringZones').updateOne(
              { id: z.id },
              {
                $set: {
                  occupancy: newOccupancy,
                  density: newDensity,
                  inflowRate: newInflow,
                  outflowRate: newOutflow,
                  status: newStatus,
                  trend,
                  lastUpdated: 'Just now',
                  updatedAt: now,
                },
              }
            )
          );

          const { _id, areaId, ...zoneRest } = z;
          return {
            ...zoneRest,
            occupancy: newOccupancy,
            density: newDensity,
            inflowRate: newInflow,
            outflowRate: newOutflow,
            status: newStatus,
            trend,
            lastUpdated: 'Just now',
          } as ZoneData;
        });

        // Execute bulk updates in parallel
        await Promise.all([
          ...zoneUpdates,
          db.collection('occupancyReadings').insertMany(readingDocs),
          db.collection('areas').updateOne(
            { id: scenarioId },
            {
              $set: {
                totalPresent,
                netFlowRate: totalInflow - totalOutflow,
                lastUpdated: now,
              },
            }
          ),
        ]);

        // Auto-check for over-capacity zones to insert dynamic crowd alerts
        for (const zone of updatedZones) {
          const ratio = (zone.occupancy / zone.capacity) * 100;
          if (ratio >= (zone.criticalThreshold || 90)) {
            // Check if there is already ANY alert for this zone (whether active, investigating, or resolved) to prevent duplicate spam
            const hasExistingAlertForZone = rawAlerts.some((a: any) => a.zoneId === zone.id);
            if (!hasExistingAlertForZone) {
              const newAlertId = `ALT-AUTO-${Date.now().toString().slice(-4)}`;
              const alertDoc = {
                id: newAlertId,
                severity: 'critical',
                title: `Automated Overcapacity Alert: ${zone.name}`,
                zoneId: zone.id,
                zoneName: zone.name,
                triggerValue: `${ratio.toFixed(1)}% Capacity (${zone.density} p/m²)`,
                timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                status: 'active',
                recommendedAction: 'Engage surge barriers and redirect oncoming crowds.',
                areaId: scenarioId,
                createdAt: now.toISOString(),
                isSimulated: true,
              };
              await db.collection('crowdAlerts').insertOne(alertDoc);
              rawAlerts.unshift(alertDoc as any);
            }
          }
        }

        const cleanAlerts = rawAlerts.map((a: any) => {
          const { _id, areaId, ...rest } = a;
          return rest as CrowdAlert;
        });

        const activeAlertsCount = cleanAlerts.filter(
          (a) => a.status === 'active' || a.status === 'investigating'
        ).length;

        return {
          ...SCENARIO_CONFIGS[scenarioId],
          name: area?.name || SCENARIO_CONFIGS[scenarioId].name,
          subtitle: area?.subtitle || SCENARIO_CONFIGS[scenarioId].subtitle,
          sectorTag: area?.sectorTag || SCENARIO_CONFIGS[scenarioId].sectorTag,
          totalPresent,
          capacityTotal: area?.capacityTotal || SCENARIO_CONFIGS[scenarioId].capacityTotal,
          netFlowRate: totalInflow - totalOutflow,
          zones: updatedZones,
          alerts: cleanAlerts,
          activeAlertsCount,
        };
      }
    } catch (e) {
      console.warn('MongoDB simulateTelemetryTick error, fallback to memory:', e);
    }
  }

  // In-memory fallback
  const scenario = memoryScenarios[scenarioId];
  if (!scenario) return SCENARIO_CONFIGS['open-ground'];

  let totalPresent = 0;
  scenario.zones.forEach((z) => {
    const jitter = Math.floor(Math.random() * 35) - 15;
    z.occupancy = Math.max(100, Math.min(z.capacity * 1.15, z.occupancy + jitter));
    z.density = parseFloat((z.occupancy / (z.radius * z.radius * 3.14)).toFixed(1));
    z.inflowRate = Math.max(10, z.inflowRate + Math.floor(Math.random() * 9) - 4);
    z.outflowRate = Math.max(10, z.outflowRate + Math.floor(Math.random() * 9) - 4);

    const ratio = (z.occupancy / z.capacity) * 100;
    if (ratio >= z.criticalThreshold) z.status = 'critical';
    else if (ratio >= z.warningThreshold) z.status = 'warning';
    else z.status = 'safe';

    z.trend.shift();
    z.trend.push(Math.round(z.occupancy));
    totalPresent += Math.round(z.occupancy);
  });

  scenario.totalPresent = totalPresent;
  scenario.activeAlertsCount = scenario.alerts.filter(
    (a) => a.status === 'active' || a.status === 'investigating'
  ).length;

  return { ...scenario };
}

/**
 * Retrieves historical readings from MongoDB collection `occupancyReadings`.
 */
export async function getHistoricalReadings(
  areaId?: string,
  zoneId?: string,
  limit = 50
): Promise<any[]> {
  const { isConnected, db } = await get3dDb();
  if (isConnected && db) {
    try {
      const query: any = {};
      if (areaId && areaId !== 'all') query.areaId = areaId;
      if (zoneId) query.zoneId = zoneId;

      const readings = await db
        .collection('occupancyReadings')
        .find(query)
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();

      return readings.map((r: any) => {
        const { _id, ...rest } = r;
        return rest;
      });
    } catch (e) {
      console.warn('MongoDB getHistoricalReadings error:', e);
    }
  }
  return [];
}
