-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "portalToken" TEXT;

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "brandColor" TEXT,
ADD COLUMN     "brandLogoUrl" TEXT,
ADD COLUMN     "brandName" TEXT,
ADD COLUMN     "hidePoweredBy" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reviewDomain" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Client_portalToken_key" ON "Client"("portalToken");
