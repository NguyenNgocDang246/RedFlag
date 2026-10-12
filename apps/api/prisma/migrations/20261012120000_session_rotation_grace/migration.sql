-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "prevTokenHash" TEXT,
ADD COLUMN     "rotatedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Session_prevTokenHash_idx" ON "Session"("prevTokenHash");
