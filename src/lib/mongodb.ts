import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dns from 'node:dns';

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // ignore
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache || { conn: null, promise: null };

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

async function resolveSrvUri(uri: string): Promise<string> {
  if (!uri.startsWith('mongodb+srv://')) return uri;
  try {
    const raw = uri.slice('mongodb+srv://'.length);
    const atIdx = raw.indexOf('@');
    const authPart = atIdx !== -1 ? raw.slice(0, atIdx) : '';
    const rest = atIdx !== -1 ? raw.slice(atIdx + 1) : raw;
    const slashIdx = rest.indexOf('/');
    const host = slashIdx !== -1 ? rest.slice(0, slashIdx) : rest;
    const pathAndQuery = slashIdx !== -1 ? rest.slice(slashIdx) : '/';

    try {
      dns.setServers(['8.8.8.8', '1.1.1.1']);
    } catch {
      // ignore
    }

    const srvRecords = await dns.promises.resolveSrv(`_mongodb._tcp.${host}`);
    const hosts = srvRecords.map((r) => `${r.name}:${r.port}`).join(',');

    let extraParams = 'ssl=true';
    try {
      const txtRecords = await dns.promises.resolveTxt(host);
      if (txtRecords && txtRecords.length > 0) {
        const txt = txtRecords.flat().join('&');
        extraParams += `&${txt}`;
      }
    } catch {
      // ignore TXT lookup errors
    }

    const separator = pathAndQuery.includes('?') ? '&' : '?';
    const authString = authPart ? `${authPart}@` : '';
    return `mongodb://${authString}${hosts}${pathAndQuery}${separator}${extraParams}`;
  } catch (err) {
    console.warn('[MongoDB] Failed to resolve SRV URI fallback:', err);
    return uri;
  }
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = (async () => {
      let targetUri = MONGODB_URI;
      try {
        dns.setServers(['8.8.8.8', '1.1.1.1']);
      } catch {
        // ignore
      }

      let instance: typeof mongoose;
      try {
        instance = await mongoose.connect(targetUri, opts);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        if (targetUri.startsWith('mongodb+srv://') && (errorMessage.includes('querySrv') || errorMessage.includes('ECONNREFUSED'))) {
          console.warn('[MongoDB] SRV lookup refused by local DNS. Attempting automatic fallback resolution...');
          targetUri = await resolveSrvUri(targetUri);
          instance = await mongoose.connect(targetUri, opts);
        } else {
          throw err;
        }
      }

      // Auto-seed admin user if provided
      try {
        await seedAdminUser();
      } catch (err) {
        console.error('Failed to auto-seed admin user:', err);
      }

      return instance;
    })();
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

async function seedAdminUser() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    return;
  }

  // Import dynamically to avoid circular dependency
  const { User } = await import('@/models/User');

  const existingAdmin = await User.findOne({ email: adminEmail.toLowerCase() });
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    await User.create({
      name: 'Super Admin',
      email: adminEmail.toLowerCase(),
      passwordHash: hashedPassword,
      role: 'admin',
    });
    console.log(`[TimeOrbit] Super Admin seeded successfully: ${adminEmail}`);
  } else if (existingAdmin.role !== 'admin') {
    existingAdmin.role = 'admin';
    await existingAdmin.save();
    console.log(`[TimeOrbit] Promoted ${adminEmail} to admin`);
  }
}
