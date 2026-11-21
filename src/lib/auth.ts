import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import mongoose from 'mongoose';
import { connectToDatabase } from './mongodb';
import { User, IUserDocument } from '@/models/User';
import { UserRole } from '@/types';
import { isNeonConfigured, neonFindUserById } from './neon';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_change_me_in_production';
const COOKIE_NAME = 'timeorbit_token';

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  name: string;
}

export function signJwtToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyJwtToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<IUserDocument | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = verifyJwtToken(token);
    if (!payload?.userId) return null;

    // 1. Dual-Database Resolution: If userId is an integer (Neon ID)
    const numericId = parseInt(payload.userId, 10);
    if (!isNaN(numericId) && String(numericId) === String(payload.userId) && isNeonConfigured()) {
      const neonUser = await neonFindUserById(numericId);
      if (neonUser) {
        return {
          _id: String(neonUser.id) as unknown as mongoose.Types.ObjectId,
          name: neonUser.name,
          email: neonUser.email,
          role: neonUser.role,
          isAgeVerified: neonUser.is_age_verified,
          createdAt: new Date(neonUser.created_at),
          updatedAt: new Date(neonUser.updated_at),
        } as unknown as IUserDocument;
      }
    }

    // 2. Fallback: Query MongoDB if userId is an ObjectId
    if (mongoose.Types.ObjectId.isValid(payload.userId)) {
      await connectToDatabase();
      const user = await User.findById(payload.userId);
      return user;
    }

    return null;
  } catch (error) {
    console.error('getSessionUser error:', error);
    return null;
  }
}

export async function requireAuth(): Promise<IUserDocument> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

export async function requireAdmin(): Promise<IUserDocument> {
  const user = await requireAuth();
  if (user.role !== 'admin') {
    throw new Error('Forbidden: Admin access required');
  }
  return user;
}

export const AUTH_COOKIE_NAME = COOKIE_NAME;
