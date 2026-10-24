import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ApiKey } from '@/models/ApiKey';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await requireAdmin();
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    const filter: Record<string, unknown> = {};
    if (status && status !== 'all') {
      filter.status = status;
    }

    const keys = await ApiKey.find(filter)
      .populate('userId', 'name email createdAt')
      .populate('approvedBy', 'name email')
      .select('-keyHash')
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, keys });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('Forbidden')) {
      return NextResponse.json({ error: 'Access denied: Admin role required' }, { status: 403 });
    }
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Admin fetch keys error:', error);
    return NextResponse.json({ error: message || 'Failed to fetch keys' }, { status: 500 });
  }
}
