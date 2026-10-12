-- AlterTable
ALTER TABLE "ContestItem" ADD COLUMN     "selectedSpots" TEXT[] DEFAULT ARRAY[]::TEXT[];
