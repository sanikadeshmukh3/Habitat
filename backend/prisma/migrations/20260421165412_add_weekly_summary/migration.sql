-- CreateTable
CREATE TABLE "weekly_summary" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "week_key" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "source_hash" TEXT,
    "refresh_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weekly_summary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "weekly_summary_user_id_week_key_key" ON "weekly_summary"("user_id", "week_key");

-- AddForeignKey
ALTER TABLE "weekly_summary" ADD CONSTRAINT "weekly_summary_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
