-- AlterTable
ALTER TABLE "Delivery" ADD COLUMN     "label" TEXT,
ADD COLUMN     "openClient" TEXT,
ADD COLUMN     "openCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "openUserAgent" TEXT,
ADD COLUMN     "openedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Recipient" ADD COLUMN     "label" TEXT;
