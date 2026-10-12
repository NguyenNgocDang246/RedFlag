import { Logger, Module } from '@nestjs/common';
import { ThrottlerModule, type ThrottlerStorage } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import Redis from 'ioredis';
import { ResilientThrottlerStorage } from './resilient-storage';

/** Per caller: enough for normal use, low enough to make guessing passwords pointless. */
export const IP_THROTTLER = 'ip';
/** Per target mailbox: how many "send me a link" mails one address can trigger in an hour. */
export const MAIL_THROTTLER = 'mail';

const IP_LIMIT = { ttl: 60_000, limit: 20 };
const MAIL_LIMIT = { ttl: 60 * 60_000, limit: 3 };

function storage(): ThrottlerStorage | undefined {
  const logger = new Logger('ThrottleModule');
  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    // In-memory counters: fine for one dev process, useless across several instances.
    if (process.env.NODE_ENV === 'production') {
      logger.warn('REDIS_URL is not set — rate limits are per process only');
    }
    return undefined;
  }
  const redis = new Redis(url, {
    // Fail fast instead of queueing: a slow Redis must not hold up a sign-in.
    maxRetriesPerRequest: 2,
    enableOfflineQueue: false,
    // The worker boots the same AppModule and never serves HTTP, so don't connect until used.
    lazyConnect: true,
  });
  redis.on('error', () => {
    /* handled by ResilientThrottlerStorage; ioredis would otherwise throw on an unhandled event */
  });
  logger.log('Rate limits are shared through Redis');
  return new ResilientThrottlerStorage(new ThrottlerStorageRedisService(redis));
}

/**
 * Rate limiting for the auth routes (applied per route in AuthController, never globally — a shared
 * office IP would otherwise get throttled just for browsing).
 */
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      useFactory: () => ({
        throttlers: [
          { name: IP_THROTTLER, ...IP_LIMIT },
          { name: MAIL_THROTTLER, ...MAIL_LIMIT },
        ],
        storage: storage(),
        errorMessage:
          'Bạn thử lại sau một lát nhé / Too many requests, please try again in a moment',
      }),
    }),
  ],
  exports: [ThrottlerModule],
})
export class ThrottleModule {}
