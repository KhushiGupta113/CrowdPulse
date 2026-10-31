import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import { get3dDb } from '@/lib/3d/db';

async function logPredictionToDb(data: any) {
  try {
    const { isConnected, db } = await get3dDb();
    if (isConnected && db) {
      await db.collection('occupancyReadings').insertOne({
        zoneName: data.zone_name,
        locationName: data.location_name,
        occupancy: data.current_occupancy,
        capacity: data.capacity,
        netFlow: data.net_flow,
        inflowRate: data.inflow_rate,
        outflowRate: data.outflow_rate,
        forecast: data.forecast,
        overcrowdingWarning: data.overcrowding_warning,
        warningLevel: data.warning_level,
        modelMetrics: data.model_metrics,
        timestamp: new Date(),
        type: 'prediction',
        isSimulated: true,
      });
    }
  } catch (err) {
    // Non-blocking log failure
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      occupancy = 1000,
      capacity = 2000,
      inflowRate = 50,
      outflowRate = 40,
      trend = [],
      zoneName = 'Zone',
      locationName = 'Map Location',
    } = body;

    const scriptPath = path.join(process.cwd(), 'ml', 'xgboost_model.py');
    const inputArg = JSON.stringify({
      occupancy: Number(occupancy),
      capacity: Number(capacity),
      inflowRate: Number(inflowRate),
      outflowRate: Number(outflowRate),
      trend: Array.isArray(trend) ? trend : [],
      zoneName: String(zoneName),
      locationName: String(locationName),
    });

    return new Promise<NextResponse>((resolve) => {
      let resolved = false;

      // Spawn python with stdin to prevent Windows quote escaping issues
      const pythonProcess = spawn('python', [scriptPath, '--predict']);

      let outputData = '';
      let errorData = '';

      pythonProcess.stdout.on('data', (data) => {
        outputData += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        errorData += data.toString();
      });

      const handleFallback = () => {
        if (resolved) return;
        resolved = true;
        try { pythonProcess.kill(); } catch (e) {}

        const netFlow = Number(inflowRate) - Number(outflowRate);
        const h5 = Math.max(10, Math.round(Number(occupancy) + netFlow * 5 * 0.85));
        const h10 = Math.max(10, Math.round(Number(occupancy) + netFlow * 10 * 0.85));
        const h15 = Math.max(10, Math.round(Number(occupancy) + netFlow * 15 * 0.85));

        const p5_pct = Math.round((h5 / Math.max(Number(capacity), 1)) * 1000) / 10;
        const p10_pct = Math.round((h10 / Math.max(Number(capacity), 1)) * 1000) / 10;
        const p15_pct = Math.round((h15 / Math.max(Number(capacity), 1)) * 1000) / 10;

        const max_pct = Math.max(p5_pct, p10_pct, p15_pct);
        const hasWarning = max_pct >= 75.0;
        const hasCritical = max_pct >= 90.0;

        const fallbackPayload = {
          zone_name: zoneName,
          location_name: locationName,
          current_occupancy: Number(occupancy),
          capacity: Number(capacity),
          current_capacity_pct: Math.round((Number(occupancy) / Math.max(Number(capacity), 1)) * 1000) / 10,
          net_flow: Math.round(netFlow * 10) / 10,
          inflow_rate: Number(inflowRate),
          outflow_rate: Number(outflowRate),
          forecast: [
            { horizon_minutes: 5, predicted_occupancy: h5, predicted_capacity_pct: p5_pct, status: p5_pct >= 90 ? 'critical' : p5_pct >= 75 ? 'warning' : 'safe' },
            { horizon_minutes: 10, predicted_occupancy: h10, predicted_capacity_pct: p10_pct, status: p10_pct >= 90 ? 'critical' : p10_pct >= 75 ? 'warning' : 'safe' },
            { horizon_minutes: 15, predicted_occupancy: h15, predicted_capacity_pct: p15_pct, status: p15_pct >= 90 ? 'critical' : p15_pct >= 75 ? 'warning' : 'safe' },
          ],
          overcrowding_warning: hasWarning || hasCritical,
          warning_level: hasCritical ? 'CRITICAL' : hasWarning ? 'WARNING' : 'NOMINAL',
          model_metrics: { mae: 55.16, rmse: 75.89 },
          is_simulation_based: true,
        };

        logPredictionToDb(fallbackPayload);

        resolve(
          NextResponse.json({
            success: true,
            fallback: true,
            data: fallbackPayload,
          })
        );
      };

      // Set timeout fallback of 8500ms for Python process execution
      const timeout = setTimeout(handleFallback, 8500);

      pythonProcess.on('close', (code) => {
        clearTimeout(timeout);
        if (resolved) return;

        if (code === 0 && outputData.trim()) {
          try {
            const lines = outputData.trim().split('\n');
            const jsonLine = lines[lines.length - 1];
            const parsed = JSON.parse(jsonLine);
            resolved = true;
            logPredictionToDb(parsed);
            resolve(NextResponse.json({ success: true, data: parsed }));
            return;
          } catch (err) {
            console.error('Error parsing python prediction output:', err, outputData);
          }
        }

        handleFallback();
      });

      // Write input to stdin and close stdin
      pythonProcess.stdin.write(inputArg);
      pythonProcess.stdin.end();
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

