import { neon, NeonQueryFunction } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

let cachedSql: NeonQueryFunction<false, false> | null = null;

export function getNeonDatabaseUrl(): string | null {
  return (
    process.env.DATABASE_URL ||
    process.env.NEON_DATABASE_URL ||
    process.env.POSTGRES_URL ||
    null
  );
}

export function isNeonConfigured(): boolean {
  const url = getNeonDatabaseUrl();
  return Boolean(url && (url.startsWith('postgres://') || url.startsWith('postgresql://')));
}

export function getNeonSql(): NeonQueryFunction<false, false> {
  const url = getNeonDatabaseUrl();
  if (!url) {
    throw new Error(
      'Neon PostgreSQL connection string is missing. Please set DATABASE_URL or NEON_DATABASE_URL in .env.local'
    );
  }
  if (!cachedSql) {
    cachedSql = neon(url);
  }
  return cachedSql;
}

// ============================================================================
// DDL: Automatic Schema & Table Initializer
// ============================================================================
export async function initNeonTables(): Promise<void> {
  if (!isNeonConfigured()) return;
  const sql = getNeonSql();

  // 1. Users Table
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL DEFAULT 'Developer',
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'user',
      date_of_birth TIMESTAMPTZ,
      is_age_verified BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);`;

  // 2. API Keys Table
  await sql`
    CREATE TABLE IF NOT EXISTS api_keys (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      use_case TEXT DEFAULT '',
      key_prefix VARCHAR(32) NOT NULL,
      key_hash VARCHAR(255) UNIQUE NOT NULL,
      last_four VARCHAR(8) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      rate_limit INTEGER NOT NULL DEFAULT 60,
      burst_capacity INTEGER DEFAULT 90,
      bucket_tokens DOUBLE PRECISION DEFAULT 60,
      bucket_last_refill TIMESTAMPTZ DEFAULT NOW(),
      rejection_reason TEXT,
      approved_at TIMESTAMPTZ,
      approved_by INTEGER REFERENCES users(id),
      last_used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_api_keys_status ON api_keys(status);`;

  // 3. API Request Logs Table (for edge logging & high-speed telemetry)
  await sql`
    CREATE TABLE IF NOT EXISTS api_logs (
      id SERIAL PRIMARY KEY,
      api_key_id INTEGER REFERENCES api_keys(id) ON DELETE SET NULL,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      endpoint VARCHAR(255) NOT NULL,
      method VARCHAR(16) NOT NULL,
      status_code INTEGER NOT NULL,
      response_time_ms DOUBLE PRECISION NOT NULL,
      ip_address VARCHAR(128),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_api_logs_key_id ON api_logs(api_key_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON api_logs(created_at DESC);`;

  // Auto-seed admin user into Neon if environment variables are configured
  try {
    await seedNeonAdminUser();
  } catch (err) {
    console.error('Failed to auto-seed admin user in Neon:', err);
  }
}

export async function seedNeonAdminUser(): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword || !isNeonConfigured()) return;

  const sql = getNeonSql();
  const normalizedEmail = adminEmail.toLowerCase().trim();
  const existing = await sql`SELECT id FROM users WHERE email = ${normalizedEmail} LIMIT 1;`;
  if (existing.length === 0) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await sql`
      INSERT INTO users (name, email, password_hash, role, is_age_verified, created_at, updated_at)
      VALUES (
        'Super Admin',
        ${normalizedEmail},
        ${passwordHash},
        'admin',
        true,
        NOW(),
        NOW()
      );
    `;
    console.log(`[Neon] Provisioned default super admin user: ${normalizedEmail}`);
  }
}

// ============================================================================
// TypeScript Models for Neon PostgreSQL
// ============================================================================
export interface NeonUser {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: 'user' | 'admin';
  date_of_birth?: string | null;
  is_age_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface NeonApiKey {
  id: number;
  user_id: number;
  name: string;
  use_case?: string | null;
  key_prefix: string;
  key_hash: string;
  last_four: string;
  status: 'pending' | 'active' | 'rejected' | 'revoked';
  rate_limit: number;
  burst_capacity?: number;
  bucket_tokens?: number;
  bucket_last_refill?: string;
  rejection_reason?: string | null;
  approved_at?: string | null;
  approved_by?: number | null;
  last_used_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface NeonApiLog {
  id: number;
  api_key_id?: number | null;
  user_id?: number | null;
  endpoint: string;
  method: string;
  status_code: number;
  response_time_ms: number;
  ip_address?: string | null;
  created_at: string;
}

// ============================================================================
// Helper Queries: Users
// ============================================================================
export async function neonFindUserByEmail(email: string): Promise<NeonUser | null> {
  const sql = getNeonSql();
  const rows = await sql`
    SELECT * FROM users WHERE email = ${email.toLowerCase().trim()} LIMIT 1;
  `;
  return (rows[0] as NeonUser) || null;
}

export async function neonFindUserById(id: number): Promise<NeonUser | null> {
  const sql = getNeonSql();
  const rows = await sql`
    SELECT * FROM users WHERE id = ${id} LIMIT 1;
  `;
  return (rows[0] as NeonUser) || null;
}

export async function neonCreateUser(params: {
  name: string;
  email: string;
  passwordHash: string;
  role?: 'user' | 'admin';
  isAgeVerified?: boolean;
}): Promise<NeonUser> {
  const sql = getNeonSql();
  const rows = await sql`
    INSERT INTO users (name, email, password_hash, role, is_age_verified, created_at, updated_at)
    VALUES (
      ${params.name},
      ${params.email.toLowerCase().trim()},
      ${params.passwordHash},
      ${params.role || 'user'},
      ${params.isAgeVerified ?? false},
      NOW(),
      NOW()
    )
    RETURNING *;
  `;
  return rows[0] as NeonUser;
}

// ============================================================================
// Helper Queries: API Keys
// ============================================================================
export async function neonFindApiKeyByHash(keyHash: string): Promise<{ apiKey: NeonApiKey; user: NeonUser } | null> {
  const sql = getNeonSql();
  const rows = await sql`
    SELECT 
      k.*,
      u.name as user_name,
      u.email as user_email,
      u.role as user_role
    FROM api_keys k
    JOIN users u ON k.user_id = u.id
    WHERE k.key_hash = ${keyHash}
    LIMIT 1;
  `;

  if (rows.length === 0) return null;

  const row = rows[0] as NeonApiKey & { user_name: string; user_email: string; user_role: 'user' | 'admin' };
  const user: NeonUser = {
    id: row.user_id,
    name: row.user_name,
    email: row.user_email,
    password_hash: '',
    role: row.user_role,
    is_age_verified: true,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };

  return { apiKey: row, user };
}

export async function neonUpdateKeyLastUsed(id: number): Promise<void> {
  const sql = getNeonSql();
  await sql`
    UPDATE api_keys
    SET last_used_at = NOW(), updated_at = NOW()
    WHERE id = ${id};
  `;
}

export async function neonInsertLog(log: {
  apiKeyId?: number | null;
  userId?: number | null;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTimeMs: number;
  ipAddress?: string | null;
}): Promise<void> {
  const sql = getNeonSql();
  await sql`
    INSERT INTO api_logs (api_key_id, user_id, endpoint, method, status_code, response_time_ms, ip_address, created_at)
    VALUES (
      ${log.apiKeyId || null},
      ${log.userId || null},
      ${log.endpoint},
      ${log.method},
      ${log.statusCode},
      ${log.responseTimeMs},
      ${log.ipAddress || null},
      NOW()
    );
  `;
}
