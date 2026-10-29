import crypto from 'crypto';
import mongoose from 'mongoose';
import { connectToDatabase } from './mongodb';
import { ApiKey, IApiKeyDocument } from '@/models/ApiKey';
import { ApiLog } from '@/models/ApiLog';

export interface GeneratedKeyResult {
  rawKey: string;
  keyPrefix: string;
  keyHash: string;
  lastFour: string;
}

export function generateApiKey(): GeneratedKeyResult {
  // Generate 24 random bytes (48 hex chars)
  const randomBytes = crypto.randomBytes(24).toString('hex');
  const rawKey = `to_live_${randomBytes}`;
  const keyPrefix = `to_live_${randomBytes.substring(0, 6)}...`;
  const lastFour = randomBytes.slice(-4);
  const keyHash = hashApiKey(rawKey);

  return {
    rawKey,
    keyPrefix,
    keyHash,
    lastFour,
  };
}

export function hashApiKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey.trim()).digest('hex');
}

export interface ValidateKeyResult {
  valid: boolean;
  apiKeyDoc?: IApiKeyDocument;
  reason?: string;
  statusCode?: number;
}

export async function validateApiKey(rawKey: string | null | undefined): Promise<ValidateKeyResult> {
  if (!rawKey) {
    return {
      valid: false,
      reason: 'Missing API key. Please provide your key in x-api-key header or Authorization: Bearer <key>',
      statusCode: 401,
    };
  }

  const cleanKey = rawKey.startsWith('Bearer ') ? rawKey.replace('Bearer ', '').trim() : rawKey.trim();
  const keyHash = hashApiKey(cleanKey);

  await connectToDatabase();
  const apiKeyDoc = await ApiKey.findOne({ keyHash }).populate('userId', 'name email role');

  if (!apiKeyDoc) {
    return {
      valid: false,
      reason: 'Invalid API key. The key does not exist.',
      statusCode: 401,
    };
  }

  // Check approval status
  if (apiKeyDoc.status === 'pending') {
    return {
      valid: false,
      reason: 'API key is pending admin approval. You will receive access once approved by TimeOrbit Admin.',
      statusCode: 403,
    };
  }

  if (apiKeyDoc.status === 'rejected') {
    return {
      valid: false,
      reason: `API key was rejected by admin. ${apiKeyDoc.rejectionReason ? `Reason: ${apiKeyDoc.rejectionReason}` : ''}`,
      statusCode: 403,
    };
  }

  if (apiKeyDoc.status === 'revoked') {
    return {
      valid: false,
      reason: 'This API key has been revoked and can no longer be used.',
      statusCode: 403,
    };
  }

  // Update last used timestamp asynchronously
  apiKeyDoc.lastUsedAt = new Date();
  apiKeyDoc.save().catch((err) => console.error('Failed to update key lastUsedAt:', err));

  return {
    valid: true,
    apiKeyDoc,
  };
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
}

export {
  tokenBucketLimiter,
  checkTokenBucketRateLimit,
  TokenBucketLimiter,
} from './tokenBucket';

export async function checkSlidingWindowRateLimit(
  keyId: string | mongoose.Types.ObjectId,
  limitPerMinute: number = 60
): Promise<RateLimitResult> {
  await connectToDatabase();
  const windowStart = new Date(Date.now() - 60 * 1000);

  const safeKeyId =
    typeof keyId === 'string' && mongoose.Types.ObjectId.isValid(keyId)
      ? new mongoose.Types.ObjectId(keyId)
      : keyId;

  const requestCount = await ApiLog.countDocuments({
    apiKeyId: safeKeyId,
    createdAt: { $gte: windowStart },
  });

  const remaining = Math.max(0, limitPerMinute - requestCount);
  const allowed = requestCount < limitPerMinute;

  return {
    allowed,
    remaining,
    resetInSeconds: 60,
  };
}

export async function checkRateLimit(
  keyId: string | mongoose.Types.ObjectId,
  limitPerMinute: number = 60,
  options?: {
    algorithm?: 'token_bucket' | 'sliding_window';
    cost?: number;
    burstMultiplier?: number;
  }
): Promise<RateLimitResult> {
  const algo = options?.algorithm || process.env.RATE_LIMIT_ALGORITHM || 'sliding_window';
  if (algo === 'token_bucket') {
    const { checkTokenBucketRateLimit } = await import('./tokenBucket');
    return checkTokenBucketRateLimit(keyId, limitPerMinute, {
      cost: options?.cost,
      burstMultiplier: options?.burstMultiplier,
    });
  }

  return checkSlidingWindowRateLimit(keyId, limitPerMinute);
}
