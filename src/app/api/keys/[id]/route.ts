import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { requireAuth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ApiKey } from '@/models/ApiKey';

export const dynamic = 'force-dynamic';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid API key ID format' }, { status: 400 });
    }

    await connectToDatabase();

    const key = await ApiKey.findById(id);
    if (!key) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    // Only owner or admin can delete
    if (key.userId.toString() !== user._id.toString() && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await ApiKey.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: 'API key deleted' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: message || 'Failed to delete key' }, { status: 500 });
  }
}
