-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "allowedDomains" TEXT[],
ADD COLUMN     "colors" TEXT[],
ADD COLUMN     "fonts" TEXT[],
ADD COLUMN     "footerText" TEXT,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "physicalAddress" TEXT,
ADD COLUMN     "unsubscribeToken" TEXT,
ADD COLUMN     "utmTemplate" TEXT;
