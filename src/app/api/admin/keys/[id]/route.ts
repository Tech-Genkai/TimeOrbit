import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ApiKey } from '@/models/ApiKey';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const { action, rateLimit, rejectionReason } = body;

    await connectToDatabase();

    const key = await ApiKey.findById(id).populate('userId', 'name email');
    if (!key) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    if (action === 'approve') {
      key.status = 'approved';
      key.approvedAt = new Date();
      key.approvedBy = adminUser._id as unknown as typeof key.approvedBy;
      if (rateLimit && typeof rateLimit === 'number' && rateLimit > 0) {
        key.rateLimit = rateLimit;
      }
      key.rejectionReason = undefined;
    } else if (action === 'reject') {
      key.status = 'rejected';
      key.rejectionReason = rejectionReason?.trim() || 'Request was declined by TimeOrbit administrator.';
    } else if (action === 'revoke') {
      key.status = 'revoked';
    } else if (action === 'update_limit') {
      if (!rateLimit || rateLimit <= 0) {
        return NextResponse.json({ error: 'Valid positive rate limit is required' }, { status: 400 });
      }
      key.rateLimit = rateLimit;
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    await key.save();

    return NextResponse.json({
      success: true,
      message: `API key ${action}d successfully`,
      key,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('Forbidden')) {
      return NextResponse.json({ error: 'Access denied: Admin role required' }, { status: 403 });
    }
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Admin update key error:', error);
    return NextResponse.json({ error: message || 'Failed to update key' }, { status: 500 });
  }
}
