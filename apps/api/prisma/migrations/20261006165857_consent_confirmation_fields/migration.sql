-- AlterTable
ALTER TABLE "Consent" ADD COLUMN     "confirmationText" TEXT,
ADD COLUMN     "locale" "Locale",
ADD COLUMN     "textVersion" TEXT;
