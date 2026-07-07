/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * ═══════════════════════════════════════════════════════════════════
 * Inixa API Key Manager
 * ═══════════════════════════════════════════════════════════════════
 * Handles API key generation, hashing, validation, and storage
 * using Upstash Redis as the backend store.
 * 
 * Key format: inx_<32 hex chars>
 * Storage: Only SHA-256 hash is stored, raw key shown once.
 * ═══════════════════════════════════════════════════════════════════
 */

import { Redis } from '@upstash/redis';
import crypto from 'crypto';

// ─── Redis Client ────────────────────────────────────────────────
// Will use UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from env
let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    // Vercel auto-deployment fallback as requested
    const url = process.env.UPSTASH_REDIS_REST_URL || 'https://mature-fly-79170.upstash.io';
    const token = process.env.UPSTASH_REDIS_REST_TOKEN || 'gQAAAAAAATVCAAIgcDIzMDYyM2ZhYzBiMjE0Y2FhYmQyNzAwNmVkNjk2MjdkNw';
    
    if (!url || !token) {
      throw new Error(
        'Upstash Redis not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.'
      );
    }
    
    redis = new Redis({ url, token });
  }
  return redis;
}

// ─── Types ───────────────────────────────────────────────────────

export interface InixaApiKeyRecord {
  keyHash: string;       // SHA-256 hash of the full key
  keyPrefix: string;     // First 12 chars for display (e.g., "inx_a8f3k2m9")
  name: string;          // User-given name
  createdAt: number;     // Unix timestamp
  status: 'active' | 'revoked';
  fingerprint: string;   // Browser fingerprint or session ID for ownership
  lastUsedAt?: number;
  totalRequests?: number;
}

export interface GenerateKeyResult {
  rawKey: string;        // Full key — shown ONCE to user
  record: InixaApiKeyRecord;
}

export interface ValidateKeyResult {
  valid: boolean;
  record?: InixaApiKeyRecord;
  error?: string;
}

// ─── Constants ───────────────────────────────────────────────────

const KEY_PREFIX = 'inx_';
const KEY_BYTES = 32; // 32 bytes = 64 hex chars
const REDIS_KEY_PREFIX = 'inixa:apikey:';        // Hash lookup: hash -> record
const REDIS_USER_KEYS_PREFIX = 'inixa:userkeys:'; // Set of key hashes per fingerprint
const REDIS_RATE_LIMIT_PREFIX = 'inixa:ratelimit:'; // Rate limit counter

// ─── Key Generation ──────────────────────────────────────────────

/**
 * Generate a cryptographically secure API key.
 * The raw key is returned only once — we store only the hash.
 */
export async function generateApiKey(
  name: string,
  fingerprint: string
): Promise<GenerateKeyResult> {
  const db = getRedis();

  // Generate secure random key
  const randomBytes = crypto.randomBytes(KEY_BYTES);
  const rawKey = `${KEY_PREFIX}${randomBytes.toString('hex')}`;

  // Hash the key for storage
  const keyHash = hashKey(rawKey);
  const keyPrefix = rawKey.substring(0, 12);

  const record: InixaApiKeyRecord = {
    keyHash,
    keyPrefix,
    name,
    createdAt: Date.now(),
    status: 'active',
    fingerprint,
    lastUsedAt: undefined,
    totalRequests: 0,
  };

  // Store in Redis
  // 1. Store the key record (hash -> record)
  await db.set(`${REDIS_KEY_PREFIX}${keyHash}`, JSON.stringify(record));

  // 2. Add to user's key set (fingerprint -> set of hashes)
  await db.sadd(`${REDIS_USER_KEYS_PREFIX}${fingerprint}`, keyHash);

  return { rawKey, record };
}

// ─── Key Validation ──────────────────────────────────────────────

/**
 * Validate an API key from an incoming request.
 * Extracts key from Authorization header, hashes it, and looks up in Redis.
 */
export async function validateApiKey(rawKey: string): Promise<ValidateKeyResult> {
  if (!rawKey || !rawKey.startsWith(KEY_PREFIX)) {
    return { valid: false, error: 'Invalid API key format. Keys must start with "inx_".' };
  }

  const db = getRedis();
  const keyHash = hashKey(rawKey);

  try {
    const data = await db.get(`${REDIS_KEY_PREFIX}${keyHash}`);
    if (!data) {
      return { valid: false, error: 'API key not found. Please generate a new key from the Inixa dashboard.' };
    }

    const record: InixaApiKeyRecord = typeof data === 'string' ? JSON.parse(data) : data;

    if (record.status === 'revoked') {
      return { valid: false, error: 'This API key has been revoked.' };
    }

    // Update last used timestamp and request count
    record.lastUsedAt = Date.now();
    record.totalRequests = (record.totalRequests || 0) + 1;
    await db.set(`${REDIS_KEY_PREFIX}${keyHash}`, JSON.stringify(record));

    return { valid: true, record };
  } catch (error: any) {
    console.error('[ApiKeyManager] Validation error:', error.message);
    return { valid: false, error: 'Failed to validate API key. Please try again.' };
  }
}

// ─── Key Listing ─────────────────────────────────────────────────

/**
 * Get all API keys for a given fingerprint/session.
 * Returns records WITHOUT the raw key (only prefix shown).
 */
export async function getKeysByFingerprint(fingerprint: string): Promise<InixaApiKeyRecord[]> {
  const db = getRedis();

  try {
    const keyHashes = await db.smembers(`${REDIS_USER_KEYS_PREFIX}${fingerprint}`);
    if (!keyHashes || keyHashes.length === 0) return [];

    const records: InixaApiKeyRecord[] = [];
    for (const hash of keyHashes) {
      const data = await db.get(`${REDIS_KEY_PREFIX}${hash}`);
      if (data) {
        const record: InixaApiKeyRecord = typeof data === 'string' ? JSON.parse(data) : data;
        records.push(record);
      }
    }

    // Sort by creation date (newest first)
    return records.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error: any) {
    console.error('[ApiKeyManager] List error:', error.message);
    return [];
  }
}

// ─── Key Revocation ──────────────────────────────────────────────

/**
 * Revoke an API key by its hash.
 * The key remains in the database but is marked as revoked.
 */
export async function revokeApiKeyByHash(
  keyHash: string,
  fingerprint: string
): Promise<boolean> {
  const db = getRedis();

  try {
    // Verify ownership
    const isMember = await db.sismember(`${REDIS_USER_KEYS_PREFIX}${fingerprint}`, keyHash);
    if (!isMember) return false;

    const data = await db.get(`${REDIS_KEY_PREFIX}${keyHash}`);
    if (!data) return false;

    const record: InixaApiKeyRecord = typeof data === 'string' ? JSON.parse(data) : data;
    record.status = 'revoked';
    await db.set(`${REDIS_KEY_PREFIX}${keyHash}`, JSON.stringify(record));

    return true;
  } catch (error: any) {
    console.error('[ApiKeyManager] Revoke error:', error.message);
    return false;
  }
}

/**
 * Permanently delete an API key.
 */
export async function deleteApiKeyByHash(
  keyHash: string,
  fingerprint: string
): Promise<boolean> {
  const db = getRedis();

  try {
    // Verify ownership
    const isMember = await db.sismember(`${REDIS_USER_KEYS_PREFIX}${fingerprint}`, keyHash);
    if (!isMember) return false;

    // Remove from Redis
    await db.del(`${REDIS_KEY_PREFIX}${keyHash}`);
    await db.srem(`${REDIS_USER_KEYS_PREFIX}${fingerprint}`, keyHash);

    // Also clean up rate limit key
    await db.del(`${REDIS_RATE_LIMIT_PREFIX}${keyHash}`);

    return true;
  } catch (error: any) {
    console.error('[ApiKeyManager] Delete error:', error.message);
    return false;
  }
}

// ─── Rate Limiting ───────────────────────────────────────────────

const DAILY_LIMIT = 500; // 500 requests per day per key
const RATE_LIMIT_WINDOW = 24 * 60 * 60; // 24 hours in seconds

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: number; // Unix timestamp (seconds)
}

/**
 * Check and increment rate limit for a given API key hash.
 * Uses Redis INCR with TTL for automatic daily reset.
 */
export async function checkRateLimit(keyHash: string): Promise<RateLimitResult> {
  const db = getRedis();
  const redisKey = `${REDIS_RATE_LIMIT_PREFIX}${keyHash}`;

  try {
    // Increment counter
    const count = await db.incr(redisKey);

    // Set TTL only on first request (when count is 1)
    if (count === 1) {
      await db.expire(redisKey, RATE_LIMIT_WINDOW);
    }

    // Get TTL for reset time
    const ttl = await db.ttl(redisKey);
    const resetAt = Math.floor(Date.now() / 1000) + (ttl > 0 ? ttl : RATE_LIMIT_WINDOW);

    if (count > DAILY_LIMIT) {
      return {
        allowed: false,
        remaining: 0,
        limit: DAILY_LIMIT,
        resetAt,
      };
    }

    return {
      allowed: true,
      remaining: DAILY_LIMIT - count,
      limit: DAILY_LIMIT,
      resetAt,
    };
  } catch (error: any) {
    console.error('[RateLimit] Error:', error.message);
    // If Redis fails, allow the request (fail open)
    return {
      allowed: true,
      remaining: DAILY_LIMIT,
      limit: DAILY_LIMIT,
      resetAt: Math.floor(Date.now() / 1000) + RATE_LIMIT_WINDOW,
    };
  }
}

// ─── Utilities ───────────────────────────────────────────────────

/**
 * Hash a raw API key using SHA-256.
 */
function hashKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

/**
 * Extract API key from Authorization header.
 * Supports: "Bearer inx_..." format.
 */
export function extractApiKeyFromHeader(authHeader: string | null): string | null {
  if (!authHeader) return null;
  if (authHeader.startsWith('Bearer ')) {
    const key = authHeader.substring(7).trim();
    if (key.startsWith(KEY_PREFIX)) return key;
  }
  return null;
}
