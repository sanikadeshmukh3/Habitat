/*
  Warnings:

  - The values [MONTHLY] on the enum `HabitFrequency` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "HabitFrequency_new" AS ENUM ('DAILY', 'WEEKLY');
ALTER TABLE "habit" ALTER COLUMN "frequency" TYPE "HabitFrequency_new" USING ("frequency"::text::"HabitFrequency_new");
ALTER TYPE "HabitFrequency" RENAME TO "HabitFrequency_old";
ALTER TYPE "HabitFrequency_new" RENAME TO "HabitFrequency";
DROP TYPE "public"."HabitFrequency_old";
COMMIT;
