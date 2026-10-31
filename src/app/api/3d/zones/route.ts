import { NextRequest, NextResponse } from 'next/server';
import { updateZoneThresholds } from '@/lib/3d/db';

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { scenarioId, zoneId, warningThreshold, criticalThreshold, capacity } = body;

    if (!scenarioId || !zoneId || warningThreshold === undefined || criticalThreshold === undefined) {
      return NextResponse.json({ success: false, message: 'Missing parameters' }, { status: 400 });
    }

    const updated = await updateZoneThresholds(
      scenarioId,
      zoneId,
      Number(warningThreshold),
      Number(criticalThreshold),
      capacity ? Number(capacity) : undefined
    );

    if (!updated) {
      return NextResponse.json({ success: false, message: 'Zone not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Zone thresholds updated', data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
