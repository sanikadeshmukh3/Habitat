-- CreateEnum
CREATE TYPE "HabitFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "HabitCategory" AS ENUM ('FITNESS', 'NUTRITION', 'PRODUCTIVITY', 'WELLNESS', 'SLEEP', 'OTHER');

-- CreateEnum
CREATE TYPE "HabitTier" AS ENUM ('TIER_1', 'TIER_2', 'TIER_3');

-- CreateEnum
CREATE TYPE "StackingEnrollmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'OPTED_OUT');

-- CreateEnum
CREATE TYPE "StackingEntryStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT,
    "timezone" TEXT,
    "creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settings" JSONB NOT NULL DEFAULT '{"the guy": {"last name": "guy", "first name": "might"}}',
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verification_code" TEXT,
    "code_expires" TIMESTAMP(3),

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "habit" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "habit_category" "HabitCategory" NOT NULL,
    "visibility" BOOLEAN NOT NULL DEFAULT true,
    "current_streak" INTEGER NOT NULL DEFAULT 0,
    "priority_rank" INTEGER,
    "frequency" "HabitFrequency" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "tier" "HabitTier",
    "consistency_score" DOUBLE PRECISION,
    "consistency_updated_at" TIMESTAMP(3),
    "grace_period_start" TIMESTAMP(3),
    "observation_window_end" TIMESTAMP(3) NOT NULL,
    "gentle_nudge_sent_at" TIMESTAMP(3),
    "nudge_consistency_score" DOUBLE PRECISION,

    CONSTRAINT "habit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "habit_check_in" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "habit_id" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL,
    "difficulty_rating" INTEGER,
    "notes" TEXT,

    CONSTRAINT "habit_check_in_pkey" PRIMARY KEY ("id")
);

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
CREATE TABLE "_UserFriends" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_UserFriends_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "_UserFriends_B_index" ON "_UserFriends"("B");

-- AddForeignKey
ALTER TABLE "habit" ADD CONSTRAINT "habit_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "habit_check_in" ADD CONSTRAINT "habit_check_in_habit_id_fkey" FOREIGN KEY ("habit_id") REFERENCES "habit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stacking_enrollment" ADD CONSTRAINT "stacking_enrollment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stacking_schedule_entry" ADD CONSTRAINT "stacking_schedule_entry_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "stacking_enrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stacking_schedule_entry" ADD CONSTRAINT "stacking_schedule_entry_habit_id_fkey" FOREIGN KEY ("habit_id") REFERENCES "habit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserFriends" ADD CONSTRAINT "_UserFriends_A_fkey" FOREIGN KEY ("A") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserFriends" ADD CONSTRAINT "_UserFriends_B_fkey" FOREIGN KEY ("B") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
