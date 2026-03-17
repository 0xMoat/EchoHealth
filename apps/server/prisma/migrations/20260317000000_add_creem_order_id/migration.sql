-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "creemOrderId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Order_creemOrderId_key" ON "Order"("creemOrderId");
