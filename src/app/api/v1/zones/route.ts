import { NextResponse } from 'next/server';
import { searchCities, CITIES } from '@/lib/cities';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');

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
      },
    }
  );
}
