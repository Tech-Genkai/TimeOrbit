import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';
import { signJwtToken, AUTH_COOKIE_NAME } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Rate limiting map for registration attempts: max 5 registrations per 15 minutes per IP
const registrationAttempts = new Map<string, { count: number; firstAttempt: number }>();

function checkRegisterRateLimit(ip: string): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const maxAttempts = 5;

  const record = registrationAttempts.get(ip);
  if (!record) {
    registrationAttempts.set(ip, { count: 1, firstAttempt: now });
    return { allowed: true };
  }

  if (now - record.firstAttempt > windowMs) {
    registrationAttempts.set(ip, { count: 1, firstAttempt: now });
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
    const rateCheck = checkRegisterRateLimit(ip);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Registration limit reached. Please try again in ${rateCheck.retryAfterSec} seconds.` },
        { 
          status: 429,
          headers: {
            'Retry-After': String(rateCheck.retryAfterSec || 60),
          }
        }
      );
    }

    const { name, email, password, dateOfBirth } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    if (!dateOfBirth) {
      return NextResponse.json({ error: 'Date of birth is required for age verification (must be 18+)' }, { status: 400 });
    }

    const dob = new Date(dateOfBirth);
    if (isNaN(dob.getTime())) {
      return NextResponse.json({ error: 'Invalid date of birth format' }, { status: 400 });
    }

    // Strict 18+ age calculation
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }

    if (age < 18) {
      return NextResponse.json(
        { error: 'Age verification failed: You must be at least 18 years old to create an account.' },
        { status: 403 }
      );
    }

    if (typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: 'Invalid input types' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Invalid email address format' }, { status: 400 });
    }

    if (password.length < 6 || password.length > 128) {
      return NextResponse.json(
        { error: 'Password must be between 6 and 128 characters' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const sanitizedName = name && typeof name === 'string' && name.trim()
      ? name.trim().slice(0, 80)
      : normalizedEmail.split('@')[0];

    const user = await User.create({
      name: sanitizedName,
      email: normalizedEmail,
      passwordHash,
      role: 'user',
      dateOfBirth: dob,
      isAgeVerified: true,
    });

    const token = signJwtToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name,
    });

    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
        },
      },
      { status: 201 }
    );

    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error: unknown) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Registration service encountered an unexpected error.' }, { status: 500 });
  }
}
