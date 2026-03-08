'use server';

import {
  globalLimits,
  rateLimits,
  isUserAgentSuspicious,
  generateKey,
  getRateLimitConfig,
  MAX_ENTRIES,
} from '@/actions/messaging/providers/rate-limit-store';
import { FEATURES } from '@/lib/config/features';

/**
 * O(n) eviction: first by age threshold, then by Map insertion order.
 */
function evictStaleEntries(now: number): void {
  const entriesToRemove = Math.floor(MAX_ENTRIES * 0.1);
  let removed = 0;
  const threshold = now - 60_000;

  for (const [entryKey, entryInfo] of rateLimits) {
    if (removed >= entriesToRemove) {
      break;
    }
    if (entryInfo.lastUsed < threshold) {
      rateLimits.delete(entryKey);
      removed++;
    }
  }

  // Fallback: evict oldest by Map insertion order
  if (removed < entriesToRemove) {
    for (const entryKey of rateLimits.keys()) {
      if (removed >= entriesToRemove) {
        break;
      }
      rateLimits.delete(entryKey);
      removed++;
    }
  }
}

export async function rateLimit(
  ip: string,
  path: string,
  userAgent = 'unknown',
  ipCountry?: string
): Promise<{ success: boolean; remaining: number; resetAt: number }> {
  // In development mode, completely bypass rate limiting for SSE
  if (FEATURES.isDevMode && path === '/api/sse') {
    return { success: true, remaining: 1000, resetAt: Date.now() + 60_000 };
  }

  // In development mode, use more lenient limits
  if (FEATURES.isDevMode) {
    return { success: true, remaining: 1000, resetAt: Date.now() + 60_000 };
  }

  const now = Date.now();

  // Get rate limit config for this route
  const config = await getRateLimitConfig(path);

  // Check global limits
  const currentMinute = Math.floor(now / 60_000);
  const currentHour = Math.floor(now / 3_600_000);

  const minuteCount = (globalLimits.lastMinute.get(currentMinute) || 0) + 1;
  const hourCount = (globalLimits.lastHour.get(currentHour) || 0) + 1;

  // Adjust limits if under attack
  const adjustedMinuteLimit = globalLimits.isUnderAttack
    ? globalLimits.maxPerMinute * globalLimits.adjustmentFactor
    : globalLimits.maxPerMinute;

  const adjustedHourLimit = globalLimits.isUnderAttack
    ? globalLimits.maxPerHour * globalLimits.adjustmentFactor
    : globalLimits.maxPerHour;

  if (minuteCount > adjustedMinuteLimit || hourCount > adjustedHourLimit) {
    return { success: false, remaining: 0, resetAt: (currentMinute + 1) * 60_000 };
  }

  globalLimits.lastMinute.set(currentMinute, minuteCount);
  globalLimits.lastHour.set(currentHour, hourCount);

  // Generate key based on IP, path and user agent
  const key = await generateKey(ip, path, userAgent);

  // Get or create rate limit info
  let info = rateLimits.get(key);

  if (!info) {
    info = {
      count: 0,
      resetAt: now + config.window,
      lastUsed: now,
      userAgent,
      consecutiveFailures: 0,
      ipCountry,
      routePattern: path,
    };
  }

  // Check if blocked
  if (info.blockedUntil && now < info.blockedUntil) {
    return {
      success: false,
      remaining: 0,
      resetAt: info.blockedUntil,
    };
  }

  // Reset if window has passed
  if (now > info.resetAt) {
    info.count = 0;
    info.resetAt = now + config.window;
    info.consecutiveFailures = 0;
    info.blockedUntil = undefined;
  }

  // Apply stricter limits for suspicious user agents
  const isSuspicious = await isUserAgentSuspicious(userAgent);
  const adjustedLimit = isSuspicious ? Math.floor(config.limit / 2) : config.limit;

  // Update last used time
  info.lastUsed = now;

  // Check if under limit
  if (info.count < adjustedLimit) {
    info.count++;

    if (rateLimits.size >= MAX_ENTRIES) {
      evictStaleEntries(now);
    }

    rateLimits.set(key, info);

    return {
      success: true,
      remaining: adjustedLimit - info.count,
      resetAt: info.resetAt,
    };
  }

  // Increment consecutive failures
  info.consecutiveFailures++;

  // Block if too many consecutive failures
  if (info.consecutiveFailures >= config.maxConsecutiveFailures) {
    info.blockedUntil = now + config.blockDuration;
  }

  rateLimits.set(key, info);

  return {
    success: false,
    remaining: 0,
    resetAt: info.resetAt,
  };
}

// Usage example:
// Const { success, remaining, resetAt } = await rateLimit('user_123', 10, 60000);
// If (!success) throw new Error('Rate limit exceeded');
