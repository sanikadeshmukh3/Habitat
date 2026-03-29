-- CreateEnum
CREATE TYPE "HabitFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "HabitCategory" AS ENUM ('FITNESS', 'NUTRITION', 'PRODUCTIVITY', 'WELLNESS', 'SLEEP', 'OTHER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "timezone" TEXT,
    "creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationCode" TEXT,
    "codeExpires" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Habit" (
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Habit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HabitCheckIn" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "habit_id" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL,
    "difficultyRating" INTEGER,
    "notes" TEXT,

    CONSTRAINT "HabitCheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Habit" ADD CONSTRAINT "Habit_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitCheckIn" ADD CONSTRAINT "HabitCheckIn_habit_id_fkey" FOREIGN KEY ("habit_id") REFERENCES "Habit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
