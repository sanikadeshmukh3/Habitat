/*
  Warnings:

  - You are about to drop the column `consistency_score` on the `habit` table. All the data in the column will be lost.
  - You are about to drop the column `consistency_updated_at` on the `habit` table. All the data in the column will be lost.
  - You are about to drop the column `gentle_nudge_sent_at` on the `habit` table. All the data in the column will be lost.
  - You are about to drop the column `grace_period_start` on the `habit` table. All the data in the column will be lost.
  - You are about to drop the column `nudge_consistency_score` on the `habit` table. All the data in the column will be lost.
  - You are about to drop the column `observation_window_end` on the `habit` table. All the data in the column will be lost.
  - You are about to drop the column `tier` on the `habit` table. All the data in the column will be lost.
  - You are about to drop the column `username` on the `user` table. All the data in the column will be lost.
  - You are about to drop the `FriendRequest` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `stacking_enrollment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `stacking_schedule_entry` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "FriendRequest" DROP CONSTRAINT "FriendRequest_receiverId_fkey";

-- DropForeignKey
ALTER TABLE "FriendRequest" DROP CONSTRAINT "FriendRequest_senderId_fkey";

-- DropForeignKey
ALTER TABLE "stacking_enrollment" DROP CONSTRAINT "stacking_enrollment_user_id_fkey";

-- DropForeignKey
ALTER TABLE "stacking_schedule_entry" DROP CONSTRAINT "stacking_schedule_entry_enrollment_id_fkey";

-- DropForeignKey
ALTER TABLE "stacking_schedule_entry" DROP CONSTRAINT "stacking_schedule_entry_habit_id_fkey";

-- DropIndex
DROP INDEX "user_username_key";

-- AlterTable
ALTER TABLE "habit" DROP COLUMN "consistency_score",
DROP COLUMN "consistency_updated_at",
DROP COLUMN "gentle_nudge_sent_at",
DROP COLUMN "grace_period_start",
DROP COLUMN "nudge_consistency_score",
DROP COLUMN "observation_window_end",
DROP COLUMN "tier";

-- AlterTable
ALTER TABLE "user" DROP COLUMN "username";

-- DropTable
DROP TABLE "FriendRequest";

-- DropTable
DROP TABLE "stacking_enrollment";

-- DropTable
DROP TABLE "stacking_schedule_entry";

-- DropEnum
DROP TYPE "HabitTier";

-- DropEnum
DROP TYPE "StackingEnrollmentStatus";

-- DropEnum
DROP TYPE "StackingEntryStatus";
