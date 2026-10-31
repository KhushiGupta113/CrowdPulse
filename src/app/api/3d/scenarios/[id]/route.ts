import { NextRequest, NextResponse } from 'next/server';
import { getScenarioConfig, simulateTelemetryTick } from '@/lib/3d/db';
import { ScenarioType } from '@/lib/3d/scenarios';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const scenarioId = params.id as ScenarioType;
    const { searchParams } = new URL(req.url);
    const tick = searchParams.get('tick') === 'true';

    let config: any;

    if (tick) {
      config = await simulateTelemetryTick(scenarioId);
    } else {
      config = await getScenarioConfig(scenarioId);
    }

    return NextResponse.json({ success: true, data: config });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
