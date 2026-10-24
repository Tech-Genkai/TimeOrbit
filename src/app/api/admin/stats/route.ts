import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';
import { ApiKey } from '@/models/ApiKey';
import { ApiLog } from '@/models/ApiLog';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdmin();
    await connectToDatabase();

    const [totalUsers, totalKeys, pendingKeys, approvedKeys, rejectedKeys, totalRequests] =
      await Promise.all([
        User.countDocuments(),
        ApiKey.countDocuments(),
        ApiKey.countDocuments({ status: 'pending' }),
        ApiKey.countDocuments({ status: 'approved' }),
        ApiKey.countDocuments({ status: 'rejected' }),
        ApiLog.countDocuments(),
      ]);

    // Recent activity logs
    const recentLogs = await ApiLog.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(10);

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers,
        totalKeys,
        pendingKeys,
        approvedKeys,
        rejectedKeys,
        totalRequests,
      },
      recentLogs,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('Forbidden')) {
      return NextResponse.json({ error: 'Access denied: Admin role required' }, { status: 403 });
    }
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: message || 'Failed to fetch admin stats' }, { status: 500 });
  }
}
