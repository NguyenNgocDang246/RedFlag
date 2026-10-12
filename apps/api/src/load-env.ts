import { resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';

/**
 * Loads env vars for both API and Worker from the shared repo-root `.env`.
 * __dirname = apps/api/{src|dist} → 3 levels up is the repo root (works for ts-node and build).
 */
export function loadEnv(): void {
  loadDotenv({ path: resolve(__dirname, '../../../.env') });
  loadDotenv(); // local .env (if any); doesn't override already-loaded vars
}
