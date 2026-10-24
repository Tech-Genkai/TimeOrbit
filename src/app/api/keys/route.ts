import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ApiKey } from '@/models/ApiKey';
import { generateApiKey } from '@/lib/apiKey';

export const dynamic = 'force-dynamic';

// GET /api/keys - List user's keys with approval status
export async function GET() {
  try {
    const user = await requireAuth();
    await connectToDatabase();

    const keys = await ApiKey.find({ userId: user._id })
      .select('-keyHash')
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, keys });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: 'Please log in to view API keys' }, { status: 401 });
    }
    console.error('Fetch keys error:', error);
    return NextResponse.json({ error: message || 'Failed to fetch keys' }, { status: 500 });
  }
}

// POST /api/keys - Request a new API key (created with status 'pending' for admin review)
export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const { name, useCase } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Please provide a name for this API key' }, { status: 400 });
    }

    await connectToDatabase();

    // Check how many pending or total keys the user has (limit max 5 active/pending keys per free user)
    const existingCount = await ApiKey.countDocuments({
      userId: user._id,
      status: { $in: ['pending', 'approved'] },
    });

    if (existingCount >= 5 && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'You have reached the maximum limit of 5 active/pending API keys.' },
        { status: 400 }
      );
    }

    // Generate cryptographic key
    const { rawKey, keyPrefix, keyHash, lastFour } = generateApiKey();

    // If user is admin, auto-approve; otherwise, set to 'pending'
    const initialStatus = user.role === 'admin' ? 'approved' : 'pending';

    const newKey = await ApiKey.create({
      userId: user._id,
      name: name.trim(),
      useCase: useCase?.trim() || '',
      keyPrefix,
      keyHash,
      lastFour,
      status: initialStatus,
      rateLimit: 60,
      approvedAt: user.role === 'admin' ? new Date() : undefined,
    });

    return NextResponse.json(
      {
        success: true,
        message:
          user.role === 'admin'
            ? 'API key created and active'
            : 'API key requested successfully! It is now pending approval by TimeOrbit Admin.',
        rawKey, // Returned ONLY on initial creation
        key: {
          _id: newKey._id,
          name: newKey.name,
          useCase: newKey.useCase,
          keyPrefix: newKey.keyPrefix,
          lastFour: newKey.lastFour,
          status: newKey.status,
          rateLimit: newKey.rateLimit,
          createdAt: newKey.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Please log in to request an API key' }, { status: 401 });
    }
    console.error('Create key error:', error);
    return NextResponse.json({ error: message || 'Failed to create key' }, { status: 500 });
  }
}
