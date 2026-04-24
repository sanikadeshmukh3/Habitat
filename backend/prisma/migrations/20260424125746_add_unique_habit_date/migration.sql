/*
  Warnings:

  - A unique constraint covering the columns `[habit_id,date]` on the table `habit_check_in` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "habit_check_in_habit_id_date_key" ON "habit_check_in"("habit_id", "date");
