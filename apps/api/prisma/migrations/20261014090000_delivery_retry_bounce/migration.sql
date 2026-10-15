-- Phase 4 wrap-up: bounded send retries, and tests switched off by a bounce or spam complaint

-- CreateEnum
CREATE TYPE "TestStopReason" AS ENUM ('bounced', 'complained');

-- AlterTable
ALTER TABLE "UserTestOptin" ADD COLUMN "stoppedReason" "TestStopReason";

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN "sendAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "retryAt" TIMESTAMP(3);
