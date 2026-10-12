-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "QuizKind" ADD VALUE 'sms_inspection';
ALTER TYPE "QuizKind" ADD VALUE 'chat_inspection';
ALTER TYPE "QuizKind" ADD VALUE 'web_inspection';
ALTER TYPE "QuizKind" ADD VALUE 'qr_inspection';
ALTER TYPE "QuizKind" ADD VALUE 'file_inspection';
ALTER TYPE "QuizKind" ADD VALUE 'app_consent';

-- AlterTable
ALTER TABLE "QuizQuestionTranslation" ADD COLUMN     "scenarioData" JSONB;
