import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { loadEnv } from './load-env';
import { AppModule } from './app.module';
import { DeliveryService } from './delivery/delivery.service';
import { SchedulerService } from './delivery/scheduler.service';

/**
 * Worker entrypoint — the background process behind the email tests (Phase 4).
 * Separate from the API so this work never affects request latency (R8).
 *
 * Each tick plans the tests that are due to be planned, then sends the ones that have come due.
 * Both passes are idempotent and claim their work in the database, so a crash mid-tick, a restart,
 * or a second worker can never produce a duplicate email.
 */
const TICK_MS = Math.max(5_000, Number(process.env.WORKER_TICK_MS ?? 60_000));

async function bootstrap() {
  loadEnv();

  const app = await NestFactory.createApplicationContext(AppModule);
  await app.init();

  const scheduler = app.get(SchedulerService);
  const delivery = app.get(DeliveryService);
  const logger = new Logger('Worker');
  let running = false;
  let stopping = false;

  const tick = async () => {
    // Skip rather than overlap if a pass is still going (a slow mail server, a big batch).
    if (running || stopping) return;
    running = true;
    try {
      await scheduler.planDue();
      await delivery.sendDue();
    } catch (e) {
      // Never let one bad tick kill the worker — the next one retries.
      logger.error(`Tick failed: ${String(e)}`);
    } finally {
      running = false;
    }
  };

  const timer = setInterval(() => void tick(), TICK_MS);
  void tick();
  logger.log(`RedFlag worker started (every ${Math.round(TICK_MS / 1000)}s)`);

  const shutdown = async (signal: string) => {
    stopping = true;
    clearInterval(timer);
    logger.log(`Received ${signal}, shutting down worker`);
    await app.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

void bootstrap();
