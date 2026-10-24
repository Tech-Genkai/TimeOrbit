import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ApiKey } from '@/models/ApiKey';
import { ApiLog } from '@/models/ApiLog';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ user: null });
    }

    await connectToDatabase();

    // Compute key statistics for this user
    const [totalKeys, approvedKeys, pendingKeys, totalRequests] = await Promise.all([
      ApiKey.countDocuments({ userId: user._id }),
      ApiKey.countDocuments({ userId: user._id, status: 'approved' }),
      ApiKey.countDocuments({ userId: user._id, status: 'pending' }),
      ApiLog.countDocuments({ userId: user._id }),
    ]);

    return NextResponse.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      stats: {
        totalKeys,
        approvedKeys,
        pendingKeys,
        totalRequests,
      },
    });
  } catch (error: unknown) {
    console.error('me endpoint error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch user';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
