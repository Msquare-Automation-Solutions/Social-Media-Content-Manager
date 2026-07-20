-- CreateTable
CREATE TABLE "TaskType" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TaskType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskType_workspaceId_deletedAt_idx" ON "TaskType"("workspaceId", "deletedAt");

-- AddForeignKey
ALTER TABLE "TaskType" ADD CONSTRAINT "TaskType_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

