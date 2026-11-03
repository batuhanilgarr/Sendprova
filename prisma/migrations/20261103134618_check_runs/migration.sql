-- CreateTable
CREATE TABLE "CheckRun" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CheckRun_versionId_createdAt_idx" ON "CheckRun"("versionId", "createdAt");

-- AddForeignKey
ALTER TABLE "CheckRun" ADD CONSTRAINT "CheckRun_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "Version"("id") ON DELETE CASCADE ON UPDATE CASCADE;
