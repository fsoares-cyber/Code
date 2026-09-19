-- CreateEnum
CREATE TYPE "SupplierOrigin" AS ENUM ('NACIONAL', 'IMPORTADO');

-- CreateEnum
CREATE TYPE "SupplierStatus" AS ENUM ('ATIVO', 'INATIVO', 'BLOQUEADO');

-- CreateEnum
CREATE TYPE "QualificationStatus" AS ENUM ('QUALIFICADO', 'EM_QUALIFICACAO', 'REPROVADO');

-- CreateEnum
CREATE TYPE "Incoterm" AS ENUM ('EXW', 'FCA', 'FOB', 'CFR', 'CIF', 'DAP', 'DDP');

-- CreateEnum
CREATE TYPE "PaymentTerm" AS ENUM ('ANTECIPADO', 'DIAS_30', 'DIAS_30_60', 'DIAS_30_60_90');

-- CreateEnum
CREATE TYPE "ScenarioHorizon" AS ENUM ('TRIMESTRAL', 'SEMESTRAL', 'ANUAL');

-- CreateEnum
CREATE TYPE "ScenarioStatus" AS ENUM ('RASCUNHO', 'APROVADO', 'COTADO', 'REVISADO');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('FORA_DO_HORIZONTE', 'SUGESTAO_CONSOLIDACAO', 'PRECO_DESATUALIZADO', 'FORNECEDOR_IRREGULAR');

-- CreateEnum
CREATE TYPE "QuotationStatus" AS ENUM ('ENVIADA', 'RESPONDIDA', 'VENCIDA');

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "nomeFantasia" TEXT,
    "taxId" TEXT NOT NULL,
    "origin" "SupplierOrigin" NOT NULL,
    "country" TEXT NOT NULL,
    "address" TEXT,
    "status" "SupplierStatus" NOT NULL DEFAULT 'ATIVO',
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "paymentTerm" "PaymentTerm" NOT NULL DEFAULT 'DIAS_30',
    "incoterm" "Incoterm",
    "avgLeadTimeDays" INTEGER,
    "qualificationStatus" "QualificationStatus" NOT NULL DEFAULT 'EM_QUALIFICACAO',
    "qualificationLastReview" TIMESTAMP(3),
    "qualificationNextReview" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierContact" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "receivesQuotation" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certification" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "fileUrl" TEXT,
    "previousVersionId" TEXT,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Certification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Component" (
    "id" TEXT NOT NULL,
    "internalCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "technicalSpec" TEXT,
    "usageUnit" TEXT NOT NULL,
    "ncm" TEXT,
    "critical" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Component_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComponentSupplier" (
    "id" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "supplierPartNumber" TEXT NOT NULL,
    "unitPrice" DECIMAL(14,4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "salesUnit" TEXT NOT NULL,
    "conversionFactorToUsageUnit" DECIMAL(14,6) NOT NULL,
    "minLotSize" DECIMAL(14,4) NOT NULL,
    "purchaseMultiple" DECIMAL(14,4) NOT NULL DEFAULT 1,
    "leadTimeDays" INTEGER NOT NULL,
    "priceDate" TIMESTAMP(3) NOT NULL,
    "priceValidUntil" TIMESTAMP(3) NOT NULL,
    "preferred" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComponentSupplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComponentSupplierPriceHistory" (
    "id" TEXT NOT NULL,
    "componentSupplierId" TEXT NOT NULL,
    "unitPrice" DECIMAL(14,4) NOT NULL,
    "currency" TEXT NOT NULL,
    "priceDate" TIMESTAMP(3) NOT NULL,
    "priceValidUntil" TIMESTAMP(3) NOT NULL,
    "replacedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComponentSupplierPriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bom" (
    "id" TEXT NOT NULL,
    "productCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BomRevision" (
    "id" TEXT NOT NULL,
    "bomId" TEXT NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BomRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BomItem" (
    "id" TEXT NOT NULL,
    "bomRevisionId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "qtyPerUnit" DECIMAL(14,6) NOT NULL,
    "lossPercent" DECIMAL(6,4) NOT NULL DEFAULT 0,

    CONSTRAINT "BomItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scenario" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "horizon" "ScenarioHorizon" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "exchangeRateUsdBrl" DECIMAL(10,4) NOT NULL,
    "status" "ScenarioStatus" NOT NULL DEFAULT 'RASCUNHO',
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Period" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "sequence" INTEGER NOT NULL,

    CONSTRAINT "Period_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionLine" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "bomId" TEXT NOT NULL,
    "bomRevisionId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "quantity" DECIMAL(14,4) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScenarioSupplierChoice" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScenarioSupplierChoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchasePlanItem" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "componentSupplierId" TEXT NOT NULL,
    "quantitySalesUnit" DECIMAL(14,4) NOT NULL,
    "rawNeedUsageUnit" DECIMAL(14,4) NOT NULL,
    "carriedOverQty" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "surplusToNextPeriod" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "unitCost" DECIMAL(14,4) NOT NULL,
    "currency" TEXT NOT NULL,
    "costBRL" DECIMAL(14,2) NOT NULL,
    "deadlineDate" TIMESTAMP(3) NOT NULL,
    "outOfHorizon" BOOLEAN NOT NULL DEFAULT false,
    "plannedCost" DECIMAL(14,2),
    "quotedUnitPrice" DECIMAL(14,4),
    "quotedCost" DECIMAL(14,2),
    "sourceLmcCodes" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchasePlanItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComponentBalance" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "balanceQty" DECIMAL(14,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComponentBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "componentId" TEXT,
    "periodId" TEXT,
    "message" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quotation" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" "QuotationStatus" NOT NULL DEFAULT 'ENVIADA',
    "sentAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotationItem" (
    "id" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "componentSupplierId" TEXT NOT NULL,
    "supplierPartNumber" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantitySalesUnit" DECIMAL(14,4) NOT NULL,
    "deadlineDate" TIMESTAMP(3) NOT NULL,
    "respondedPrice" DECIMAL(14,4),
    "respondedLeadTimeDays" INTEGER,
    "respondedMinLotSize" DECIMAL(14,4),
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "QuotationItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_taxId_key" ON "Supplier"("taxId");

-- CreateIndex
CREATE INDEX "Supplier_status_idx" ON "Supplier"("status");

-- CreateIndex
CREATE INDEX "Supplier_origin_idx" ON "Supplier"("origin");

-- CreateIndex
CREATE INDEX "SupplierContact_supplierId_idx" ON "SupplierContact"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "Certification_previousVersionId_key" ON "Certification"("previousVersionId");

-- CreateIndex
CREATE INDEX "Certification_supplierId_idx" ON "Certification"("supplierId");

-- CreateIndex
CREATE INDEX "Certification_expiryDate_idx" ON "Certification"("expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "Component_internalCode_key" ON "Component"("internalCode");

-- CreateIndex
CREATE INDEX "Component_category_idx" ON "Component"("category");

-- CreateIndex
CREATE INDEX "Component_critical_idx" ON "Component"("critical");

-- CreateIndex
CREATE INDEX "ComponentSupplier_supplierId_idx" ON "ComponentSupplier"("supplierId");

-- CreateIndex
CREATE INDEX "ComponentSupplier_componentId_idx" ON "ComponentSupplier"("componentId");

-- CreateIndex
CREATE UNIQUE INDEX "ComponentSupplier_componentId_supplierId_key" ON "ComponentSupplier"("componentId", "supplierId");

-- CreateIndex
CREATE INDEX "ComponentSupplierPriceHistory_componentSupplierId_idx" ON "ComponentSupplierPriceHistory"("componentSupplierId");

-- CreateIndex
CREATE UNIQUE INDEX "Bom_productCode_key" ON "Bom"("productCode");

-- CreateIndex
CREATE UNIQUE INDEX "BomRevision_bomId_revisionNumber_key" ON "BomRevision"("bomId", "revisionNumber");

-- CreateIndex
CREATE INDEX "BomItem_bomRevisionId_idx" ON "BomItem"("bomRevisionId");

-- CreateIndex
CREATE INDEX "BomItem_componentId_idx" ON "BomItem"("componentId");

-- CreateIndex
CREATE INDEX "Period_scenarioId_idx" ON "Period"("scenarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Period_scenarioId_sequence_key" ON "Period"("scenarioId", "sequence");

-- CreateIndex
CREATE INDEX "ProductionLine_scenarioId_idx" ON "ProductionLine"("scenarioId");

-- CreateIndex
CREATE INDEX "ProductionLine_periodId_idx" ON "ProductionLine"("periodId");

-- CreateIndex
CREATE INDEX "ProductionLine_bomId_idx" ON "ProductionLine"("bomId");

-- CreateIndex
CREATE UNIQUE INDEX "ScenarioSupplierChoice_scenarioId_componentId_key" ON "ScenarioSupplierChoice"("scenarioId", "componentId");

-- CreateIndex
CREATE INDEX "PurchasePlanItem_scenarioId_idx" ON "PurchasePlanItem"("scenarioId");

-- CreateIndex
CREATE INDEX "PurchasePlanItem_periodId_idx" ON "PurchasePlanItem"("periodId");

-- CreateIndex
CREATE INDEX "PurchasePlanItem_componentId_idx" ON "PurchasePlanItem"("componentId");

-- CreateIndex
CREATE INDEX "PurchasePlanItem_deadlineDate_idx" ON "PurchasePlanItem"("deadlineDate");

-- CreateIndex
CREATE UNIQUE INDEX "ComponentBalance_scenarioId_componentId_periodId_key" ON "ComponentBalance"("scenarioId", "componentId", "periodId");

-- CreateIndex
CREATE INDEX "Alert_scenarioId_idx" ON "Alert"("scenarioId");

-- CreateIndex
CREATE INDEX "Alert_type_idx" ON "Alert"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Quotation_number_key" ON "Quotation"("number");

-- CreateIndex
CREATE INDEX "Quotation_scenarioId_idx" ON "Quotation"("scenarioId");

-- CreateIndex
CREATE INDEX "Quotation_supplierId_idx" ON "Quotation"("supplierId");

-- CreateIndex
CREATE INDEX "QuotationItem_quotationId_idx" ON "QuotationItem"("quotationId");

-- CreateIndex
CREATE INDEX "QuotationItem_componentId_idx" ON "QuotationItem"("componentId");

-- AddForeignKey
ALTER TABLE "SupplierContact" ADD CONSTRAINT "SupplierContact_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certification" ADD CONSTRAINT "Certification_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certification" ADD CONSTRAINT "Certification_previousVersionId_fkey" FOREIGN KEY ("previousVersionId") REFERENCES "Certification"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComponentSupplier" ADD CONSTRAINT "ComponentSupplier_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComponentSupplier" ADD CONSTRAINT "ComponentSupplier_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComponentSupplierPriceHistory" ADD CONSTRAINT "ComponentSupplierPriceHistory_componentSupplierId_fkey" FOREIGN KEY ("componentSupplierId") REFERENCES "ComponentSupplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BomRevision" ADD CONSTRAINT "BomRevision_bomId_fkey" FOREIGN KEY ("bomId") REFERENCES "Bom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BomItem" ADD CONSTRAINT "BomItem_bomRevisionId_fkey" FOREIGN KEY ("bomRevisionId") REFERENCES "BomRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BomItem" ADD CONSTRAINT "BomItem_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Period" ADD CONSTRAINT "Period_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionLine" ADD CONSTRAINT "ProductionLine_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionLine" ADD CONSTRAINT "ProductionLine_bomId_fkey" FOREIGN KEY ("bomId") REFERENCES "Bom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionLine" ADD CONSTRAINT "ProductionLine_bomRevisionId_fkey" FOREIGN KEY ("bomRevisionId") REFERENCES "BomRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionLine" ADD CONSTRAINT "ProductionLine_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchasePlanItem" ADD CONSTRAINT "PurchasePlanItem_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchasePlanItem" ADD CONSTRAINT "PurchasePlanItem_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchasePlanItem" ADD CONSTRAINT "PurchasePlanItem_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchasePlanItem" ADD CONSTRAINT "PurchasePlanItem_componentSupplierId_fkey" FOREIGN KEY ("componentSupplierId") REFERENCES "ComponentSupplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComponentBalance" ADD CONSTRAINT "ComponentBalance_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComponentBalance" ADD CONSTRAINT "ComponentBalance_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationItem" ADD CONSTRAINT "QuotationItem_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationItem" ADD CONSTRAINT "QuotationItem_componentSupplierId_fkey" FOREIGN KEY ("componentSupplierId") REFERENCES "ComponentSupplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
