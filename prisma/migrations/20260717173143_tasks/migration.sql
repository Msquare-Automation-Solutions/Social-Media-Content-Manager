-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "brief" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL DEFAULT '',
    "remarks" TEXT NOT NULL DEFAULT '',
    "contentType" TEXT NOT NULL,
    "channelId" TEXT,
    "accountId" TEXT,
    "weekLabel" TEXT NOT NULL DEFAULT '',
    "plannedDate" TIMESTAMP(3),
    "currentStage" TEXT NOT NULL DEFAULT 'CONTENT',
    "publishStatus" TEXT NOT NULL DEFAULT 'NOT_PUBLISHED',
    "publishedDate" TIMESTAMP(3),
    "contentLink" TEXT,
    "metricClicks" INTEGER,
    "metricLeads" INTEGER,
    "metricEng" INTEGER,
    "metricsNote" TEXT,
    "binItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskStage" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "assigneeId" TEXT,
    "targetDate" TIMESTAMP(3),
    "workStatus" TEXT NOT NULL DEFAULT 'YTI',
    "reviewStatus" TEXT NOT NULL DEFAULT 'NOT_SUBMITTED',
    "submittedAt" TIMESTAMP(3),
    "completedDate" TIMESTAMP(3),
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "remarks" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "TaskStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskAsset" (
    "taskId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,

    CONSTRAINT "TaskAsset_pkey" PRIMARY KEY ("taskId","assetId")
);

-- CreateIndex
CREATE INDEX "Task_workspaceId_currentStage_deletedAt_idx" ON "Task"("workspaceId", "currentStage", "deletedAt");

-- CreateIndex
CREATE INDEX "TaskStage_taskId_idx" ON "TaskStage"("taskId");

-- CreateIndex
CREATE INDEX "TaskStage_assigneeId_reviewStatus_idx" ON "TaskStage"("assigneeId", "reviewStatus");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskStage" ADD CONSTRAINT "TaskStage_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAsset" ADD CONSTRAINT "TaskAsset_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAsset" ADD CONSTRAINT "TaskAsset_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

