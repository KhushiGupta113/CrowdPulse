import { NextRequest, NextResponse } from 'next/server';
import { getHistoricalReadings, get3dDb } from '@/lib/3d/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const areaId = searchParams.get('areaId') || undefined;
    const zoneId = searchParams.get('zoneId') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const readings = await getHistoricalReadings(areaId, zoneId, limit);
    return NextResponse.json({ success: true, count: readings.length, data: readings });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { areaId, zoneId, zoneName, occupancy, capacity, density, inflowRate, outflowRate, status, isSimulated } = body;

    if (!areaId || !zoneId || occupancy === undefined) {
      return NextResponse.json({ success: false, message: 'Missing required reading fields' }, { status: 400 });
    }

    const { isConnected, db } = await get3dDb();
    if (!isConnected || !db) {
      return NextResponse.json({ success: false, message: 'Database disconnected' }, { status: 503 });
    }

    const readingDoc = {
      areaId,
      zoneId,
      zoneName: zoneName || zoneId,
      occupancy: Number(occupancy),
      capacity: Number(capacity) || 2000,
      density: Number(density) || 1.5,
      inflowRate: Number(inflowRate) || 0,
      outflowRate: Number(outflowRate) || 0,
      status: status || 'safe',
      timestamp: new Date(),
      isSimulated: isSimulated !== undefined ? Boolean(isSimulated) : false,
    };

    await db.collection('occupancyReadings').insertOne(readingDoc);

    // Update the corresponding monitoring zone
    await db.collection('monitoringZones').updateOne(
      { id: zoneId },
      {
        $set: {
          occupancy: readingDoc.occupancy,
          density: readingDoc.density,
          inflowRate: readingDoc.inflowRate,
          outflowRate: readingDoc.outflowRate,
          status: readingDoc.status,
          lastUpdated: 'Just now',
          updatedAt: new Date(),
        },
        $push: {
          trend: {
            $each: [readingDoc.occupancy],
            $slice: -10,
          },
        } as any,
      }
    );

    return NextResponse.json({ success: true, message: 'Reading saved', data: readingDoc });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

