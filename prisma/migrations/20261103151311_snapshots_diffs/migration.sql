-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "reviewDeadline" TIMESTAMP(3),
ADD COLUMN     "revisionLimit" INTEGER NOT NULL DEFAULT 2;

-- CreateTable
CREATE TABLE "Snapshot" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "device" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VersionDiff" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "baseVersionId" TEXT NOT NULL,
    "device" TEXT NOT NULL,
    "diffUrl" TEXT NOT NULL,
    "changedRatio" DOUBLE PRECISION NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VersionDiff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Snapshot_versionId_device_key" ON "Snapshot"("versionId", "device");

-- CreateIndex
CREATE UNIQUE INDEX "VersionDiff_versionId_baseVersionId_device_key" ON "VersionDiff"("versionId", "baseVersionId", "device");

-- AddForeignKey
ALTER TABLE "Snapshot" ADD CONSTRAINT "Snapshot_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "Version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VersionDiff" ADD CONSTRAINT "VersionDiff_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "Version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VersionDiff" ADD CONSTRAINT "VersionDiff_baseVersionId_fkey" FOREIGN KEY ("baseVersionId") REFERENCES "Version"("id") ON DELETE CASCADE ON UPDATE CASCADE;
