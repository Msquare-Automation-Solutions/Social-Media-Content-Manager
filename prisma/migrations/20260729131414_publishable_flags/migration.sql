-- AlterTable
ALTER TABLE "MediaAsset" ADD COLUMN     "publishable" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "TaskStage" ADD COLUMN     "publishable" BOOLEAN NOT NULL DEFAULT true;

