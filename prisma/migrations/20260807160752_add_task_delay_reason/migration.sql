-- Why a task missed its scheduled publish date, captured at publish time.
-- Additive and nullable: existing rows are unaffected.
ALTER TABLE "Task" ADD COLUMN "delayReason" TEXT;
