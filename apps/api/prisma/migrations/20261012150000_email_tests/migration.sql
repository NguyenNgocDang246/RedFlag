-- Phase 4: email tests (templates/variants as authored content, campaign bookkeeping, local sending window)

-- AlterEnum
ALTER TYPE "CampaignStatus" ADD VALUE 'cancelled';

-- AlterTable
ALTER TABLE "UserTestOptin" ADD COLUMN "timezone" TEXT;

-- AlterTable
ALTER TABLE "Template" ADD COLUMN "status" "ContentStatus" NOT NULL DEFAULT 'draft',
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable: the old patterns were never used; the subject line becomes the admin-facing title
ALTER TABLE "TemplateTranslation" RENAME COLUMN "subjectPattern" TO "title";
ALTER TABLE "TemplateTranslation" DROP COLUMN "bodyPattern";

-- AlterTable: keep existing content, just rename
ALTER TABLE "VariantTranslation" RENAME COLUMN "renderedSubject" TO "subject";
ALTER TABLE "VariantTranslation" RENAME COLUMN "renderedBody" TO "body";
ALTER TABLE "VariantTranslation" ADD COLUMN "senderName" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN "locale" "Locale" NOT NULL DEFAULT 'en',
ADD COLUMN "isTest" BOOLEAN NOT NULL DEFAULT false;

-- Indexes: the scheduler looks campaigns up by (status, scheduledAt) and (userId, status)
DROP INDEX "Campaign_userId_idx";
DROP INDEX "Campaign_scheduledAt_idx";
CREATE INDEX "Campaign_userId_status_idx" ON "Campaign"("userId", "status");
CREATE INDEX "Campaign_status_scheduledAt_idx" ON "Campaign"("status", "scheduledAt");
