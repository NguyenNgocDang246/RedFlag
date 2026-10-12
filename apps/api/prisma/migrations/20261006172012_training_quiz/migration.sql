-- CreateEnum
CREATE TYPE "QuizKind" AS ENUM ('url_inspection', 'email_inspection', 'popup', 'oauth_consent');

-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "QuizQuestion" (
    "id" TEXT NOT NULL,
    "kind" "QuizKind" NOT NULL,
    "isScam" BOOLEAN NOT NULL,
    "difficultyLevel" INTEGER NOT NULL DEFAULT 1,
    "categoryId" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizQuestionTranslation" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "prompt" TEXT NOT NULL,
    "scenario" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,

    CONSTRAINT "QuizQuestionTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizQuestionSignal" (
    "questionId" TEXT NOT NULL,
    "signalId" TEXT NOT NULL,

    CONSTRAINT "QuizQuestionSignal_pkey" PRIMARY KEY ("questionId","signalId")
);

-- CreateTable
CREATE TABLE "QuizAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answeredScam" BOOLEAN NOT NULL,
    "classifyCorrect" BOOLEAN NOT NULL,
    "selectedSignals" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuizQuestion_categoryId_idx" ON "QuizQuestion"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "QuizQuestionTranslation_questionId_locale_key" ON "QuizQuestionTranslation"("questionId", "locale");

-- CreateIndex
CREATE INDEX "QuizQuestionSignal_signalId_idx" ON "QuizQuestionSignal"("signalId");

-- CreateIndex
CREATE INDEX "QuizAttempt_userId_idx" ON "QuizAttempt"("userId");

-- CreateIndex
CREATE INDEX "QuizAttempt_questionId_idx" ON "QuizAttempt"("questionId");

-- AddForeignKey
ALTER TABLE "QuizQuestion" ADD CONSTRAINT "QuizQuestion_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizQuestionTranslation" ADD CONSTRAINT "QuizQuestionTranslation_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "QuizQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizQuestionSignal" ADD CONSTRAINT "QuizQuestionSignal_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "QuizQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizQuestionSignal" ADD CONSTRAINT "QuizQuestionSignal_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "Signal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "QuizQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
