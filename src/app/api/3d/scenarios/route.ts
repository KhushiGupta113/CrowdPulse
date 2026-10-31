import { NextResponse } from 'next/server';
import { getAllScenariosSummary } from '@/lib/3d/db';

export async function GET() {
  try {
    const scenarios = await getAllScenariosSummary();
    return NextResponse.json({ success: true, scenarios });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
