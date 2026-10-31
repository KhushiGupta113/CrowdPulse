import { NextRequest, NextResponse } from 'next/server';
import { updateAlertStatus, getAllAlerts, createManualAlert } from '@/lib/3d/db';
import { ScenarioType, CrowdAlert } from '@/lib/3d/scenarios';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const scenarioId = searchParams.get('scenarioId');

    const alerts = await getAllAlerts(scenarioId || undefined);
    return NextResponse.json({ success: true, data: alerts });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { scenarioId, alertId, status } = body;

    if (!alertId || !status) {
      return NextResponse.json({ success: false, message: 'Missing parameters: alertId and status required' }, { status: 400 });
    }

    const updated = await updateAlertStatus(
      (scenarioId || 'open-ground') as ScenarioType,
      alertId,
      status as CrowdAlert['status']
    );
    if (!updated) {
      return NextResponse.json({ success: false, message: 'Alert not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: `Alert updated to ${status}`, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { scenarioId, zoneName, zoneId, severity, title, triggerValue, recommendedAction } = body;

    if (!scenarioId || !zoneName) {
      return NextResponse.json({ success: false, message: 'Missing required incident fields' }, { status: 400 });
    }

    const newAlert = await createManualAlert({
      scenarioId: scenarioId as ScenarioType,
      zoneName,
      zoneId,
      severity: severity || 'warning',
      title: title || 'Manual Safety Incident Logged',
      triggerValue: triggerValue || 'Manual Operator Trigger',
      recommendedAction: recommendedAction || 'Guide crowd flow and verify safety.',
    });

    return NextResponse.json({ success: true, message: 'Manual incident logged', data: newAlert });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

