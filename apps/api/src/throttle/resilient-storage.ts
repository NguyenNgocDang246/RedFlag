import { Logger } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import type { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';

/**
 * Wraps another storage so a Redis outage cannot lock people out (R8: fail-safe).
 *
 * Rate limiting is a guard rail, not a gate: if the counter store is unreachable, the request is
 * allowed through with a warning rather than failing sign-in for everyone.
 */
export class ResilientThrottlerStorage implements ThrottlerStorage {
  private readonly logger = new Logger(ResilientThrottlerStorage.name);
  private warnedAt = 0;

  constructor(private readonly inner: ThrottlerStorage) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    try {
      return await this.inner.increment(key, ttl, limit, blockDuration, throttlerName);
    } catch (err) {
      // One line a minute at most — a dead Redis would otherwise flood the log.
      if (Date.now() - this.warnedAt > 60_000) {
        this.warnedAt = Date.now();
        this.logger.warn(`Rate-limit store unavailable, letting requests through: ${String(err)}`);
      }
      return { totalHits: 0, timeToExpire: ttl, isBlocked: false, timeToBlockExpire: 0 };
    }
  }
}
