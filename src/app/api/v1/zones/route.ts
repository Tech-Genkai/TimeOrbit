import { NextResponse } from 'next/server';
import { searchCities, CITIES } from '@/lib/cities';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawQ = searchParams.get('q');
  // Sanitize and limit query length to prevent excessive regex processing
  const q = rawQ ? rawQ.trim().slice(0, 100) : null;

  const results = q ? searchCities(q) : CITIES;

  return NextResponse.json(
    {
      success: true,
      count: results.length,
      cities: results,
    },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
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
