import fs from 'node:fs';
import path from 'node:path';
import { neon } from '@neondatabase/serverless';

// Load .env.local
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL is missing in .env.local');
  process.exit(1);
}

console.log('Connecting to Neon Serverless Postgres via pooled connection...');
const sql = neon(dbUrl);

async function main() {
  const versionRes = await sql`SELECT version();`;
  console.log('Connected successfully!');
  console.log('PostgreSQL Version:', versionRes[0].version);

  console.log('Initializing TimeOrbit database schema...');
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

  // 3. API Logs Table
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

  const tables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `;
  console.log('Initialized tables in Neon database:', tables.map((t) => t.table_name));

  // Seed Admin User
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    const bcrypt = await import('bcryptjs');
    const existing = await sql`SELECT id FROM users WHERE email = ${adminEmail.toLowerCase().trim()} LIMIT 1;`;
    if (existing.length === 0) {
      const passwordHash = await bcrypt.default.hash(adminPassword, 12);
      await sql`
        INSERT INTO users (name, email, password_hash, role, is_age_verified, created_at, updated_at)
        VALUES ('Super Admin', ${adminEmail.toLowerCase().trim()}, ${passwordHash}, 'admin', true, NOW(), NOW());
      `;
      console.log(`[Neon] Successfully seeded admin user: ${adminEmail}`);
    } else {
      console.log(`[Neon] Admin user already exists: ${adminEmail}`);
    }
  }

  console.log('All tables, indexes, and admin credentials ready!');
}

main().catch((err) => {
  console.error('Initialization failed:', err);
  process.exit(1);
});
