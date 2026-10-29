/**
 * TimeOrbit Token Bucket Rate Limiting Engine
 *
 * Provides O(1) time complexity rate limiting with mathematical token replenishment
 * and configurable burst capacity.
 *
 * Principles:
 * 1. Tokens replenish continuously at (limitPerMinute / 60) tokens per second.
 * 2. Requests consume `cost` tokens (default 1).
 * 3. Allows bursts up to bucket capacity (defaults to limitPerMinute or burstMultiplier * limitPerMinute).
 * 4. Sub-millisecond calculation in memory with automatic stale key eviction.
 */

import mongoose from 'mongoose';
import { ApiKey } from '@/models/ApiKey';

export interface TokenBucketState {
  tokens: number;
  lastRefill: number; // Unix timestamp in ms
  capacity: number;
  refillRatePerSec: number;
}

export interface TokenBucketResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetInSeconds: number;
  tokensAvailable: number;
  cost: number;
}

export interface TokenBucketOptions {
  capacity?: number;
  refillRatePerSec?: number;
  cost?: number;
  burstMultiplier?: number;
  syncToDatabase?: boolean;
}

export class TokenBucketLimiter {
  private buckets = new Map<string, TokenBucketState>();
  private lastCleanup = Date.now();
  private readonly cleanupIntervalMs = 5 * 60 * 1000; // 5 minutes
  private readonly staleTtlMs = 15 * 60 * 1000; // 15 minutes

  /**
   * Consume tokens from the bucket for a given key identifier.
   */
  public consume(
    keyId: string,
    limitPerMinute: number = 60,
    options: TokenBucketOptions = {}
  ): TokenBucketResult {
    this.maybeCleanup();

    const now = Date.now();
    const cost = Math.max(1, options.cost ?? 1);
    const burstMultiplier = Math.max(1.0, options.burstMultiplier ?? 1.0);
    const capacity = options.capacity ?? Math.round(limitPerMinute * burstMultiplier);
    const refillRatePerSec = options.refillRatePerSec ?? (limitPerMinute / 60);

    let bucket = this.buckets.get(keyId);

    if (!bucket) {
      // First invocation: create bucket at full capacity
      bucket = {
        tokens: capacity,
        lastRefill: now,
        capacity,
        refillRatePerSec,
      };
    } else {
      // If administrative limit was changed dynamically, adjust capacity & rate
      if (bucket.capacity !== capacity || bucket.refillRatePerSec !== refillRatePerSec) {
        bucket.capacity = capacity;
        bucket.refillRatePerSec = refillRatePerSec;
      }

      // Replenish tokens based on elapsed wall-clock time
      const elapsedMs = Math.max(0, now - bucket.lastRefill);
      const tokensToAdd = (elapsedMs / 1000) * refillRatePerSec;
      bucket.tokens = Math.min(capacity, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;
    }

    let allowed = false;
    if (bucket.tokens >= cost) {
      bucket.tokens -= cost;
      allowed = true;
    }

    // Calculate time until bucket recovers or has enough for another request
    let resetInSeconds = 0;
    if (allowed) {
      // Time until bucket reaches full capacity
      resetInSeconds = Math.max(1, Math.ceil((capacity - bucket.tokens) / refillRatePerSec));
    } else {
      // Time until at least `cost` tokens are replenished
      const needed = cost - bucket.tokens;
      resetInSeconds = Math.max(1, Math.ceil(needed / refillRatePerSec));
    }

    this.buckets.set(keyId, bucket);

    return {
      allowed,
      remaining: Math.max(0, Math.floor(bucket.tokens)),
      limit: capacity,
      resetInSeconds,
      tokensAvailable: Math.round(bucket.tokens * 100) / 100,
      cost,
    };
  }

  /**
   * Peek at available tokens without consuming them.
   */
  public peek(
    keyId: string,
    limitPerMinute: number = 60,
    burstMultiplier: number = 1.0
  ): TokenBucketResult {
    const now = Date.now();
    const capacity = Math.round(limitPerMinute * burstMultiplier);
    const refillRatePerSec = limitPerMinute / 60;
    const bucket = this.buckets.get(keyId);

    if (!bucket) {
      return {
        allowed: true,
        remaining: capacity,
        limit: capacity,
        resetInSeconds: 0,
        tokensAvailable: capacity,
        cost: 0,
      };
    }

    const elapsedMs = Math.max(0, now - bucket.lastRefill);
    const tokensToAdd = (elapsedMs / 1000) * refillRatePerSec;
    const currentTokens = Math.min(capacity, bucket.tokens + tokensToAdd);

    return {
      allowed: currentTokens >= 1,
      remaining: Math.max(0, Math.floor(currentTokens)),
      limit: capacity,
      resetInSeconds:
        currentTokens >= 1
          ? 0
          : Math.max(1, Math.ceil((1 - currentTokens) / refillRatePerSec)),
      tokensAvailable: Math.round(currentTokens * 100) / 100,
      cost: 0,
    };
  }

  /**
   * Reset a specific key or clear all buckets.
   */
  public reset(keyId?: string): void {
    if (keyId) {
      this.buckets.delete(keyId);
    } else {
      this.buckets.clear();
    }
  }

  /**
   * Set explicit state (for testing, seeding, or hydration).
   */
  public setState(keyId: string, state: TokenBucketState): void {
    this.buckets.set(keyId, { ...state });
  }

  /**
   * Retrieve raw state of a bucket.
   */
  public getState(keyId: string): TokenBucketState | undefined {
    return this.buckets.get(keyId);
  }

  /**
   * Evict stale buckets that have not been accessed within threshold.
   */
  public cleanup(staleThresholdMs: number = this.staleTtlMs): number {
    const now = Date.now();
    let evicted = 0;
    for (const [key, state] of this.buckets.entries()) {
      if (now - state.lastRefill > staleThresholdMs) {
        this.buckets.delete(key);
        evicted++;
      }
    }
    this.lastCleanup = now;
    return evicted;
  }

  private maybeCleanup(): void {
    if (Date.now() - this.lastCleanup > this.cleanupIntervalMs) {
      this.cleanup();
    }
  }
}

// Global Singleton Instance
export const tokenBucketLimiter = new TokenBucketLimiter();

/**
 * High-level Token Bucket rate limiting helper compatible with RateLimitResult interface.
 */
export async function checkTokenBucketRateLimit(
  keyId: string | mongoose.Types.ObjectId,
  limitPerMinute: number = 60,
  options: TokenBucketOptions = {}
): Promise<{
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
  limit: number;
  tokensAvailable: number;
}> {
  const keyStr = String(keyId);
  const result = tokenBucketLimiter.consume(keyStr, limitPerMinute, options);

  // Optional: Asynchronously sync snapshot to database if requested
  if (options.syncToDatabase && mongoose.Types.ObjectId.isValid(keyStr)) {
    ApiKey.updateOne(
      { _id: new mongoose.Types.ObjectId(keyStr) },
      {
        $set: {
          bucketTokens: result.tokensAvailable,
          bucketLastRefill: new Date(),
        },
      }
    ).catch((err) => console.error('Failed to sync token bucket to MongoDB:', err));
  }

  return {
    allowed: result.allowed,
    remaining: result.remaining,
    resetInSeconds: result.resetInSeconds,
    limit: result.limit,
    tokensAvailable: result.tokensAvailable,
  };
}
