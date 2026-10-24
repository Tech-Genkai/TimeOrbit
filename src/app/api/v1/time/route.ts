import { NextResponse } from 'next/server';
import { validateApiKey, checkRateLimit } from '@/lib/apiKey';
import { findCity, findNearestCity } from '@/lib/cities';
import { getCityTime } from '@/lib/timeEngine';
import { ApiLog } from '@/models/ApiLog';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const startTime = Date.now();
  const authHeader = req.headers.get('x-api-key') || req.headers.get('authorization');

  const authResult = await validateApiKey(authHeader);
  if (!authResult.valid) {
    return NextResponse.json(
      { success: false, error: authResult.reason },
      { status: authResult.statusCode || 401, headers: { 'Access-Control-Allow-Origin': '*' } }
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
  const latParam = searchParams.get('lat');
  const lngParam = searchParams.get('lng');
  const location = searchParams.get('location') || searchParams.get('city') || searchParams.get('q') || '';
  let city = null;

  if (latParam && lngParam) {
    const lat = parseFloat(latParam);
    const lng = parseFloat(lngParam);
    if (!isNaN(lat) && !isNaN(lng)) {
      city = findNearestCity(lat, lng);
    }
  }

  if (!city) {
    const query = location || 'London';
    city = findCity(query);
  }

  if (!city) {
    const responseTimeMs = Date.now() - startTime;
    if (authResult.apiKeyDoc) {
      ApiLog.create({
        apiKeyId: authResult.apiKeyDoc._id,
        userId: authResult.apiKeyDoc.userId?._id || authResult.apiKeyDoc.userId,
        endpoint: '/api/v1/time',
        method: 'GET',
        statusCode: 404,
        responseTimeMs,
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
      }).catch((e) => console.error('Failed to log API request:', e));
    }

    return NextResponse.json(
      { success: false, error: `Location '${location}' not found.` },
      { status: 404, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }

  const timeData = getCityTime(city);
  const responseTimeMs = Date.now() - startTime;

  if (authResult.apiKeyDoc) {
    ApiLog.create({
      apiKeyId: authResult.apiKeyDoc._id,
      userId: authResult.apiKeyDoc.userId?._id || authResult.apiKeyDoc.userId,
      endpoint: '/api/v1/time',
      method: 'GET',
      statusCode: 200,
      responseTimeMs,
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
    }).catch((e) => console.error('Failed to log API request:', e));
  }

  return NextResponse.json(
    {
      success: true,
      query: location,
      responseTimeMs,
      data: timeData,
    },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'X-RateLimit-Limit': String(rateLimitLimit),
        'X-RateLimit-Remaining': String(rateLimitRemaining),
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
