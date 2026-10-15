-- Brand handbook: the fields nobody thinks to look up.
-- These are what makes a level-3 quiz possible — the obvious check (domain) comes back
-- clean, so the flaw has to sit in a field the learner is not prompted to open.
-- See docs/simulation-design.md §1.

-- AlterTable
ALTER TABLE "Brand" ADD COLUMN "paymentAccounts" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Brand" ADD COLUMN "legalNames" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Brand" ADD COLUMN "taxCodes" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Brand" ADD COLUMN "addresses" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Brand" ADD COLUMN "shortCodes" TEXT[] DEFAULT ARRAY[]::TEXT[];
