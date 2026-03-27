/*
  Warnings:

  - You are about to drop the column `currentStreak` on the `Habit` table. All the data in the column will be lost.
  - You are about to drop the column `habitCategory` on the `Habit` table. All the data in the column will be lost.
  - You are about to drop the column `priorityRank` on the `Habit` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Habit` table. All the data in the column will be lost.
  - You are about to drop the column `habitId` on the `HabitCheckIn` table. All the data in the column will be lost.
  - Added the required column `habit_category` to the `Habit` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `Habit` table without a default value. This is not possible if the table is not empty.
  - Added the required column `habit_id` to the `HabitCheckIn` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Habit" DROP CONSTRAINT "Habit_userId_fkey";

-- DropForeignKey
ALTER TABLE "HabitCheckIn" DROP CONSTRAINT "HabitCheckIn_habitId_fkey";

-- AlterTable
ALTER TABLE "Habit" DROP COLUMN "currentStreak",
DROP COLUMN "habitCategory",
DROP COLUMN "priorityRank",
DROP COLUMN "userId",
ADD COLUMN     "current_streak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "habit_category" "HabitCategory" NOT NULL,
ADD COLUMN     "priority_rank" INTEGER,
ADD COLUMN     "user_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "HabitCheckIn" DROP COLUMN "habitId",
ADD COLUMN     "habit_id" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Habit" ADD CONSTRAINT "Habit_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitCheckIn" ADD CONSTRAINT "HabitCheckIn_habit_id_fkey" FOREIGN KEY ("habit_id") REFERENCES "Habit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
