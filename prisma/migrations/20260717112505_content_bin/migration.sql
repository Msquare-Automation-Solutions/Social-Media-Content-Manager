-- CreateTable
CREATE TABLE "ContentBinItem" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "links" TEXT NOT NULL DEFAULT '[]',
    "title" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "personId" TEXT,
    "category" TEXT,
    "channelIds" TEXT NOT NULL DEFAULT '[]',
    "accountIds" TEXT NOT NULL DEFAULT '[]',
    "screenshots" TEXT NOT NULL DEFAULT '[]',
    "promotedAssetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ContentBinItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentBinItem_workspaceId_status_createdAt_idx" ON "ContentBinItem"("workspaceId", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "ContentBinItem" ADD CONSTRAINT "ContentBinItem_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

