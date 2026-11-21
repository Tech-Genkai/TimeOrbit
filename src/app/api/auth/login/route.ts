import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';
import { signJwtToken, AUTH_COOKIE_NAME } from '@/lib/auth';
import { isNeonConfigured, neonFindUserByEmail } from '@/lib/neon';

export const dynamic = 'force-dynamic';

// In-memory rate limiting map for login attempts: 5 failed attempts per 15 minutes per IP
interface LoginAttemptTracker {
  count: number;
  firstAttempt: number;
}
const loginAttempts = new Map<string, LoginAttemptTracker>();

function checkLoginRateLimit(ip: string): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 10;

  const record = loginAttempts.get(ip);
  if (!record) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now });
    return { allowed: true };
  }

  if (now - record.firstAttempt > windowMs) {
    // Reset window
    loginAttempts.set(ip, { count: 1, firstAttempt: now });
    return { allowed: true };
  }

  if (record.count >= maxAttempts) {
    const remainingMs = windowMs - (now - record.firstAttempt);
    return { allowed: false, retryAfterSec: Math.ceil(remainingMs / 1000) };
  }

  record.count += 1;
  return { allowed: true };
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rateCheck = checkLoginRateLimit(ip);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Too many login attempts. Please try again in ${rateCheck.retryAfterSec} seconds.` },
        { 
          status: 429,
          headers: {
            'Retry-After': String(rateCheck.retryAfterSec || 60),
          }
        }
      );
    }

    const { email, password } = await req.json();

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    if (password.length > 128) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Dual-Database Check: If Neon Serverless Postgres is configured, authenticate via Neon pooler first
    if (isNeonConfigured()) {
      try {
        const neonUser = await neonFindUserByEmail(normalizedEmail);
        if (neonUser) {
          const isMatch = await bcrypt.compare(password, neonUser.password_hash);
          if (isMatch) {
            loginAttempts.delete(ip);
            const token = signJwtToken({
              userId: String(neonUser.id),
              email: neonUser.email,
              role: neonUser.role,
              name: neonUser.name,
            });

            const response = NextResponse.json({
              success: true,
              user: {
                id: neonUser.id,
                name: neonUser.name,
                email: neonUser.email,
                role: neonUser.role,
                createdAt: neonUser.created_at,
              },
            });

            response.cookies.set(AUTH_COOKIE_NAME, token, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              path: '/',
              maxAge: 7 * 24 * 60 * 60,
            });

            return response;
          }
        }
      } catch (err) {
        console.warn('Neon auth check fallback to MongoDB:', err);
      }
    }

    // 2. Primary / Fallback: Authenticate via MongoDB Atlas
    await connectToDatabase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Reset login attempts on successful authentication
    loginAttempts.delete(ip);

    const token = signJwtToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });

    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error: unknown) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Login service encountered an unexpected error.' }, { status: 500 });
  }
}
