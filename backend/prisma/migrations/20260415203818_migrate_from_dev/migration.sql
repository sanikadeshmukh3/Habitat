/*
  Warnings:

  - A unique constraint covering the columns `[username]` on the table `user` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `observation_window_end` to the `habit` table without a default value. This is not possible if the table is not empty.
  - Added the required column `username` to the `user` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "HabitTier" AS ENUM ('TIER_1', 'TIER_2', 'TIER_3');

-- CreateEnum
CREATE TYPE "StackingEnrollmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'OPTED_OUT');

-- CreateEnum
CREATE TYPE "StackingEntryStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED');

-- AlterTable
ALTER TABLE "habit" ADD COLUMN     "consistency_score" DOUBLE PRECISION,
ADD COLUMN     "consistency_updated_at" TIMESTAMP(3),
ADD COLUMN     "gentle_nudge_sent_at" TIMESTAMP(3),
ADD COLUMN     "grace_period_start" TIMESTAMP(3),
ADD COLUMN     "nudge_consistency_score" DOUBLE PRECISION,
ADD COLUMN     "observation_window_end" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "tier" "HabitTier";

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "username" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "stacking_enrollment" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "StackingEnrollmentStatus" NOT NULL,
    "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stacking_enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stacking_schedule_entry" (
    "id" TEXT NOT NULL,
    "enrollment_id" TEXT NOT NULL,
    "habit_id" TEXT NOT NULL,
    "priority_rank" INTEGER NOT NULL,
    "status" "StackingEntryStatus" NOT NULL,
    "proving_window_start" TIMESTAMP(3),
    "proving_window_target" TIMESTAMP(3),
    "last_snooze_at" TIMESTAMP(3),
    "snooze_count" INTEGER NOT NULL DEFAULT 0,
    "activated_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "stacking_schedule_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FriendRequest" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FriendRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_username_key" ON "user"("username");

-- AddForeignKey
ALTER TABLE "stacking_enrollment" ADD CONSTRAINT "stacking_enrollment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stacking_schedule_entry" ADD CONSTRAINT "stacking_schedule_entry_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "stacking_enrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stacking_schedule_entry" ADD CONSTRAINT "stacking_schedule_entry_habit_id_fkey" FOREIGN KEY ("habit_id") REFERENCES "habit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendRequest" ADD CONSTRAINT "FriendRequest_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendRequest" ADD CONSTRAINT "FriendRequest_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
