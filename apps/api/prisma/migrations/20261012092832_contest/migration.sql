-- CreateEnum
CREATE TYPE "ContestStatus" AS ENUM ('active', 'finished');

-- CreateEnum
CREATE TYPE "ContestOutcome" AS ENUM ('answered', 'forfeited', 'timeout');

-- CreateTable
CREATE TABLE "ContestSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "status" "ContestStatus" NOT NULL DEFAULT 'active',
    "itemSeconds" INTEGER NOT NULL,
    "currentIndex" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER NOT NULL DEFAULT 0,
    "maxScore" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "ContestSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestItem" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "questionId" TEXT NOT NULL,
    "servedAt" TIMESTAMP(3),
    "answeredAt" TIMESTAMP(3),
    "outcome" "ContestOutcome",
    "answeredScam" BOOLEAN,
    "selectedSignals" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "classifyCorrect" BOOLEAN,
    "points" INTEGER NOT NULL DEFAULT 0,
    "maxPoints" INTEGER NOT NULL,

    CONSTRAINT "ContestItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContestSession_userId_status_idx" ON "ContestSession"("userId", "status");

-- CreateIndex
CREATE INDEX "ContestItem_questionId_idx" ON "ContestItem"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "ContestItem_sessionId_position_key" ON "ContestItem"("sessionId", "position");

-- AddForeignKey
ALTER TABLE "ContestSession" ADD CONSTRAINT "ContestSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestItem" ADD CONSTRAINT "ContestItem_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ContestSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestItem" ADD CONSTRAINT "ContestItem_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "QuizQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
