import { NextResponse } from 'next/server';
import { validateApiKey, checkRateLimit } from '@/lib/apiKey';
import { findCity } from '@/lib/cities';
import { compareCities } from '@/lib/timeEngine';
import { ApiLog } from '@/models/ApiLog';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const startTime = Date.now();
  const authHeader = req.headers.get('x-api-key') || req.headers.get('authorization');

  // Validate API key
  const authResult = await validateApiKey(authHeader);
  if (!authResult.valid) {
    return NextResponse.json(
      {
        success: false,
        error: authResult.reason,
      },
      {
        status: authResult.statusCode || 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }

  let rateLimitLimit = 60;
  let rateLimitRemaining = 60;
  if (authResult.apiKeyDoc) {
    rateLimitLimit = authResult.apiKeyDoc.rateLimit || 60;
    const rateCheck = await checkRateLimit(authResult.apiKeyDoc._id, rateLimitLimit);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Maximum requests per minute reached.' },
        {
          status: 429,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Retry-After': String(rateCheck.resetInSeconds),
            'X-RateLimit-Limit': String(rateLimitLimit),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }
    rateLimitRemaining = rateCheck.remaining;
  }

  const { searchParams } = new URL(req.url);
  const fromQuery = searchParams.get('from') || 'Tokyo';
  const toQuery = searchParams.get('to') || 'New_York';

  const fromCity = findCity(fromQuery);
  const toCity = findCity(toQuery);

  if (!fromCity) {
    const responseTimeMs = Date.now() - startTime;
    if (authResult.apiKeyDoc) {
      ApiLog.create({
        apiKeyId: authResult.apiKeyDoc._id,
        userId: authResult.apiKeyDoc.userId?._id || authResult.apiKeyDoc.userId,
        endpoint: '/api/v1/compare',
        method: 'GET',
        statusCode: 404,
        responseTimeMs,
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
      }).catch((e) => console.error('Failed to log API request:', e));
    }

    return NextResponse.json(
      { success: false, error: `City '${fromQuery}' not found in TimeOrbit directory.` },
      { status: 404, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }

  if (!toCity) {
    const responseTimeMs = Date.now() - startTime;
    if (authResult.apiKeyDoc) {
      ApiLog.create({
        apiKeyId: authResult.apiKeyDoc._id,
        userId: authResult.apiKeyDoc.userId?._id || authResult.apiKeyDoc.userId,
        endpoint: '/api/v1/compare',
        method: 'GET',
        statusCode: 404,
        responseTimeMs,
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
      }).catch((e) => console.error('Failed to log API request:', e));
    }

    return NextResponse.json(
      { success: false, error: `City '${toQuery}' not found in TimeOrbit directory.` },
      { status: 404, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }

  // Pure in-house calculation
  const comparison = compareCities(fromCity, toCity);
  const responseTimeMs = Date.now() - startTime;

  // Log API request asynchronously
  if (authResult.apiKeyDoc) {
    ApiLog.create({
      apiKeyId: authResult.apiKeyDoc._id,
      userId: authResult.apiKeyDoc.userId?._id || authResult.apiKeyDoc.userId,
      endpoint: '/api/v1/compare',
      method: 'GET',
      statusCode: 200,
      responseTimeMs,
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
    }).catch((e) => console.error('Failed to log API request:', e));
  }

  return NextResponse.json(
    {
      success: true,
      query: { from: fromQuery, to: toQuery },
      responseTimeMs,
      engine: 'TimeOrbit In-House Local Engine (v1.0)',
      data: comparison,
    },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'X-RateLimit-Limit': String(rateLimitLimit),
        'X-RateLimit-Remaining': String(rateLimitRemaining),
        'X-Powered-By': 'TimeOrbit API',
      },
    }
  );
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
