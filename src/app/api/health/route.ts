import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();
  let dbStatus = 'disconnected';
  let dbLatencyMs: number | null = null;

  try {
    if (process.env.MONGODB_URI) {
      const dbStart = Date.now();
      await connectToDatabase();
      if (mongoose.connection.readyState === 1) {
        dbStatus = 'connected';
        dbLatencyMs = Date.now() - dbStart;
      }
    }
  } catch (err) {
    dbStatus = 'error';
    console.warn('[Health Check] DB check failed:', err instanceof Error ? err.message : err);
  }

  const memoryUsage = process.memoryUsage();

  return NextResponse.json(
    {
      status: 'healthy',
      service: 'TimeOrbit Planetary Observatory API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || 'production',
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
      system: {
        memoryHeapUsedMB: Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100,
        memoryRssMB: Math.round((memoryUsage.rss / 1024 / 1024) * 100) / 100,
        nodeVersion: process.version,
      },
      totalDurationMs: Date.now() - startTime,
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    }
  );
}
