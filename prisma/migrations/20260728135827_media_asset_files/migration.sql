-- CreateTable
CREATE TABLE "MediaAssetFile" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "thumbnailUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaAssetFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MediaAssetFile_assetId_order_idx" ON "MediaAssetFile"("assetId", "order");

-- AddForeignKey
ALTER TABLE "MediaAssetFile" ADD CONSTRAINT "MediaAssetFile_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

