/*
  Warnings:

  - Added the required column `completed` to the `HabitCheckIn` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "HabitCheckIn" ADD COLUMN     "completed" BOOLEAN NOT NULL,
ADD COLUMN     "difficultyRating" INTEGER,
ADD COLUMN     "notes" TEXT;
