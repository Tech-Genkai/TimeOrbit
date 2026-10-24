import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { connectToDatabase } from './mongodb';
import { User, IUserDocument } from '@/models/User';
import { UserRole } from '@/types';

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

    await connectToDatabase();
    const user = await User.findById(payload.userId);
    return user;
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
