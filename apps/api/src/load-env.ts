import { resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';

/**
 * Nạp biến môi trường cho cả API lẫn Worker.
 * Monorepo dùng chung một file `.env` ở gốc repo; cwd khi chạy thường là apps/api.
 * __dirname = apps/api/{src|dist} → lên 3 cấp là gốc repo (đúng cho cả ts-node và build).
 */
export function loadEnv(): void {
  loadDotenv({ path: resolve(__dirname, '../../../.env') });
  loadDotenv(); // .env cục bộ (nếu có), không ghi đè biến đã nạp
}
