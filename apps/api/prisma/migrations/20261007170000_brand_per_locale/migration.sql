-- Mỗi locale một bộ thương hiệu: thêm locale + description, bỏ bảng dịch.
-- Thương hiệu hiện có là thương hiệu Việt (Sao Mai Bank, ChợXanh…) → locale 'vi', lấy mô tả tiếng Việt.

-- AlterTable
ALTER TABLE "Brand" ADD COLUMN "locale" "Locale" NOT NULL DEFAULT 'vi',
ADD COLUMN "description" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Brand" ALTER COLUMN "locale" DROP DEFAULT;

UPDATE "Brand" b SET "description" = t."description"
FROM "BrandTranslation" t
WHERE t."brandId" = b."id" AND t."locale" = 'vi';

-- DropTable
DROP TABLE "BrandTranslation";

-- DropIndex
DROP INDEX "Brand_code_key";

-- CreateIndex
CREATE UNIQUE INDEX "Brand_code_locale_key" ON "Brand"("code", "locale");

-- CreateIndex
CREATE INDEX "Brand_locale_idx" ON "Brand"("locale");
