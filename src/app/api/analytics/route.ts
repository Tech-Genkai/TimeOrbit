import { NextResponse } from 'next/server';
import mongoose, { FilterQuery } from 'mongoose';
import { validateApiKey } from '@/lib/apiKey';
import { getSessionUser } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ApiLog, IApiLogDocument } from '@/models/ApiLog';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('x-api-key') || req.headers.get('authorization');
    let authenticatedUser: { id: string | mongoose.Types.ObjectId; role: string } | null = null;

    if (authHeader) {
      const authResult = await validateApiKey(authHeader);
      if (!authResult.valid) {
        return NextResponse.json(
          { success: false, error: authResult.reason || 'Invalid API key.' },
          {
            status: authResult.statusCode || 401,
            headers: { 'Access-Control-Allow-Origin': '*' },
          }
        );
      }

      if (authResult.apiKeyDoc) {
        const userRef = authResult.apiKeyDoc.userId as unknown as {
          _id?: mongoose.Types.ObjectId | string;
          role?: string;
        } | mongoose.Types.ObjectId;

        const resolvedId =
          userRef && typeof userRef === 'object' && '_id' in userRef && userRef._id
            ? userRef._id
            : (userRef as mongoose.Types.ObjectId);

        const resolvedRole =
          userRef && typeof userRef === 'object' && 'role' in userRef && userRef.role
            ? userRef.role
            : 'user';

        authenticatedUser = {
          id: resolvedId,
          role: resolvedRole,
        };
      }
    } else {
      const sessionUser = await getSessionUser();
      if (sessionUser) {
        authenticatedUser = {
          id: sessionUser._id as mongoose.Types.ObjectId,
          role: sessionUser.role,
        };
      }
    }

    if (!authenticatedUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: Authentication required via API key or session cookie.',
        },
        {
          status: 401,
          headers: { 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    const { searchParams } = new URL(req.url);
    const scopeParam = searchParams.get('scope') || 'me';
    const isGlobal = scopeParam === 'global';

    if (isGlobal && authenticatedUser.role !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden: Admin access required for global analytics.',
        },
        {
          status: 403,
          headers: { 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    const rangeParam = searchParams.get('range') || searchParams.get('timeframe') || '7d';
    if (!['24h', '7d', '30d', 'all'].includes(rangeParam)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid range. Supported values: '24h', '7d', '30d', 'all'.",
        },
        {
          status: 400,
          headers: { 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    await connectToDatabase();

    const matchQuery: FilterQuery<IApiLogDocument> = {};

    if (!isGlobal) {
      matchQuery.userId = new mongoose.Types.ObjectId(String(authenticatedUser.id));
    }

    const now = new Date();
    let startDate: Date | null = null;
    if (rangeParam === '24h') {
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    } else if (rangeParam === '7d') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (rangeParam === '30d') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    if (startDate) {
      matchQuery.createdAt = { $gte: startDate };
    }

    const [summaryResult, requestsOverTimeRaw, endpointBreakdownRaw, statusDistributionRaw, recentLogsRaw] =
      await Promise.all([
        ApiLog.aggregate([
          { $match: matchQuery },
          {
            $group: {
              _id: null,
              totalRequests: { $sum: 1 },
              avgResponseTimeMs: { $avg: '$responseTimeMs' },
              minResponseTimeMs: { $min: '$responseTimeMs' },
              maxResponseTimeMs: { $max: '$responseTimeMs' },
              successCount: {
                $sum: {
                  $cond: [
                    { $and: [{ $gte: ['$statusCode', 200] }, { $lt: ['$statusCode', 400] }] },
                    1,
                    0,
                  ],
                },
              },
            },
          },
        ]),
        ApiLog.aggregate([
          { $match: matchQuery },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              count: { $sum: 1 },
              avgLatency: { $avg: '$responseTimeMs' },
            },
          },
          { $sort: { _id: 1 } },
        ]),
        ApiLog.aggregate([
          { $match: matchQuery },
          {
            $group: {
              _id: '$endpoint',
              count: { $sum: 1 },
              avgResponseTime: { $avg: '$responseTimeMs' },
            },
          },
          { $sort: { count: -1 } },
        ]),
        ApiLog.aggregate([
          { $match: matchQuery },
          {
            $group: {
              _id: '$statusCode',
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
        ApiLog.find(matchQuery)
          .sort({ createdAt: -1 })
          .limit(10)
          .lean(),
      ]);

    const summaryData = summaryResult?.[0];
    const totalRequests = summaryData?.totalRequests || 0;
    const avgResponseTimeMs =
      totalRequests > 0 ? Math.round((summaryData?.avgResponseTimeMs || 0) * 10) / 10 : 0;
    const minResponseTimeMs = totalRequests > 0 ? Math.round(summaryData?.minResponseTimeMs || 0) : 0;
    const maxResponseTimeMs = totalRequests > 0 ? Math.round(summaryData?.maxResponseTimeMs || 0) : 0;
    const successRate =
      totalRequests > 0
        ? Math.round(((summaryData?.successCount || 0) / totalRequests) * 1000) / 10
        : 0;

    const summary = {
      totalRequests,
      avgResponseTimeMs,
      minResponseTimeMs,
      maxResponseTimeMs,
      successRate,
    };

    const requestsOverTime = requestsOverTimeRaw.map((item) => ({
      date: item._id || 'unknown',
      count: item.count,
      avgLatency: Math.round((item.avgLatency || 0) * 10) / 10,
      avgResponseTime: Math.round((item.avgLatency || 0) * 10) / 10,
    }));

    const endpointBreakdown = endpointBreakdownRaw.map((item) => ({
      endpoint: item._id || 'unknown',
      count: item.count,
      percentage:
        totalRequests > 0 ? Math.round((item.count / totalRequests) * 1000) / 10 : 0,
      avgResponseTimeMs: Math.round(item.avgResponseTime || 0),
    }));

    const statusDistribution = statusDistributionRaw.map((item) => ({
      status: item._id,
      statusCode: item._id,
      count: item.count,
      percentage:
        totalRequests > 0 ? Math.round((item.count / totalRequests) * 1000) / 10 : 0,
    }));

    const recentLogs = recentLogsRaw.map((log) => ({
      id: String(log._id),
      _id: String(log._id),
      endpoint: log.endpoint,
      method: log.method,
      statusCode: log.statusCode,
      responseTimeMs: log.responseTimeMs,
      ipAddress: log.ipAddress || 'unknown',
      createdAt:
        log.createdAt instanceof Date ? log.createdAt.toISOString() : String(log.createdAt),
    }));

    return NextResponse.json(
      {
        success: true,
        scope: isGlobal ? 'global' : 'me',
        range: rangeParam,
        timeframe: rangeParam,
        summary,
        requestsOverTime,
        endpointBreakdown,
        statusDistribution,
        recentLogs,
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
        },
      }
    );
  } catch (error: unknown) {
    console.error('Analytics route error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
    },
  });
}
