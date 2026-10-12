-- AlterEnum
BEGIN;
CREATE TYPE "QuizKind_new" AS ENUM ('email_inspection', 'popup', 'oauth_consent', 'sms_inspection', 'chat_inspection', 'web_inspection', 'qr_inspection', 'file_inspection', 'app_consent');
ALTER TABLE "QuizQuestion" ALTER COLUMN "kind" TYPE "QuizKind_new" USING ("kind"::text::"QuizKind_new");
ALTER TYPE "QuizKind" RENAME TO "QuizKind_old";
ALTER TYPE "QuizKind_new" RENAME TO "QuizKind";
DROP TYPE "public"."QuizKind_old";
COMMIT;

