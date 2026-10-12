-- DropForeignKey
ALTER TABLE "Lesson" DROP CONSTRAINT "Lesson_signalId_fkey";

-- DropForeignKey
ALTER TABLE "LessonTranslation" DROP CONSTRAINT "LessonTranslation_lessonId_fkey";

-- DropTable
DROP TABLE "Lesson";

-- DropTable
DROP TABLE "LessonTranslation";

