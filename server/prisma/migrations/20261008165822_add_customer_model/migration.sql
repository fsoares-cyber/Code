-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('HOSPITAL', 'MEDICO', 'FORNECEDOR', 'REPARO', 'OUTROS');

-- CreateEnum
CREATE TYPE "PersonType" AS ENUM ('FISICA', 'JURIDICA');

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "customerType" "CustomerType" NOT NULL,
    "personType" "PersonType" NOT NULL,
    "document" TEXT NOT NULL,
    "crm" TEXT,
    "name" TEXT NOT NULL,
    "nickname" TEXT,
    "invoiceName" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_document_key" ON "Customer"("document");

-- CreateIndex
CREATE INDEX "Customer_customerType_idx" ON "Customer"("customerType");

-- CreateIndex
CREATE INDEX "Customer_personType_idx" ON "Customer"("personType");
