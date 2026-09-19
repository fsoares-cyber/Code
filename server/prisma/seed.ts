import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

async function main() {
  console.log("Limpando dados existentes...");
  await prisma.$transaction([
    prisma.quotationItem.deleteMany(),
    prisma.quotation.deleteMany(),
    prisma.alert.deleteMany(),
    prisma.componentBalance.deleteMany(),
    prisma.purchasePlanItem.deleteMany(),
    prisma.scenarioSupplierChoice.deleteMany(),
    prisma.productionLine.deleteMany(),
    prisma.period.deleteMany(),
    prisma.scenario.deleteMany(),
    prisma.bomItem.deleteMany(),
    prisma.bomRevision.deleteMany(),
    prisma.bom.deleteMany(),
    prisma.componentSupplierPriceHistory.deleteMany(),
    prisma.componentSupplier.deleteMany(),
    prisma.component.deleteMany(),
    prisma.certification.deleteMany(),
    prisma.supplierContact.deleteMany(),
    prisma.supplier.deleteMany(),
  ]);

  console.log("Criando fornecedores...");
  const fornecedorA = await prisma.supplier.create({
    data: {
      razaoSocial: "Conectores e Cabos Nacional Ltda",
      nomeFantasia: "ConectaBR",
      taxId: "12.345.678/0001-90",
      origin: "NACIONAL",
      country: "Brasil",
      address: "Rua das Indústrias, 500 - São Paulo/SP",
      status: "ATIVO",
      currency: "BRL",
      paymentTerm: "DIAS_30_60",
      incoterm: "CIF",
      avgLeadTimeDays: 12,
      qualificationStatus: "QUALIFICADO",
      qualificationLastReview: daysFromNow(-90),
      qualificationNextReview: daysFromNow(275),
      contacts: {
        create: [
          { name: "Marcos Silva", role: "Comercial", email: "marcos@conectabr.com.br", phone: "11 4000-1000", receivesQuotation: false },
          { name: "Compras ConectaBR", role: "Cotações", email: "cotacao@conectabr.com.br", receivesQuotation: true },
        ],
      },
      certifications: {
        create: [
          {
            type: "ISO 9001",
            number: "ISO9001-2023-4471",
            issuer: "Bureau Veritas",
            issueDate: daysFromNow(-300),
            expiryDate: daysFromNow(20), // vence em breve
          },
        ],
      },
    },
  });

  const fornecedorB = await prisma.supplier.create({
    data: {
      razaoSocial: "Precision Electronics Import Inc.",
      nomeFantasia: "Precision Import",
      taxId: "US-EIN-98-7654321",
      origin: "IMPORTADO",
      country: "Estados Unidos",
      address: "1200 Circuit Ave, Austin, TX",
      status: "ATIVO",
      currency: "USD",
      paymentTerm: "ANTECIPADO",
      incoterm: "FOB",
      avgLeadTimeDays: 60,
      qualificationStatus: "QUALIFICADO",
      qualificationLastReview: daysFromNow(-200),
      qualificationNextReview: daysFromNow(165),
      contacts: {
        create: [
          { name: "Sarah Connor", role: "Sales", email: "sarah@precisionimport.com", receivesQuotation: true },
        ],
      },
      certifications: {
        create: [
          {
            type: "RoHS",
            number: "ROHS-2022-118",
            issuer: "TUV Rheinland",
            issueDate: daysFromNow(-400),
            expiryDate: daysFromNow(-10), // vencido -> fornecedor irregular
          },
        ],
      },
    },
  });

  console.log("Criando componentes...");
  const conector = await prisma.component.create({
    data: {
      internalCode: "CN-001",
      description: "Conector 4 vias",
      category: "Conectores",
      technicalSpec: "IP67, 4 pinos",
      usageUnit: "unidade",
      critical: true,
    },
  });

  const cabo = await prisma.component.create({
    data: {
      internalCode: "CB-002",
      description: "Cabo flexível 2,5mm",
      category: "Cabos",
      technicalSpec: "NBR 13249",
      usageUnit: "metro",
      critical: false,
    },
  });

  const placa = await prisma.component.create({
    data: {
      internalCode: "PL-003",
      description: "Placa driver importada",
      category: "Eletrônica",
      technicalSpec: "Rev C",
      usageUnit: "unidade",
      ncm: "8534.00.00",
      critical: true,
    },
  });

  console.log("Criando relação componente × fornecedor...");
  await prisma.componentSupplier.create({
    data: {
      componentId: conector.id,
      supplierId: fornecedorA.id,
      supplierPartNumber: "CB-CONN-4W",
      unitPrice: 2.5,
      currency: "BRL",
      salesUnit: "caixa com 100 un",
      conversionFactorToUsageUnit: 100,
      minLotSize: 5,
      purchaseMultiple: 1,
      leadTimeDays: 15,
      priceDate: daysFromNow(-30),
      priceValidUntil: daysFromNow(60),
      preferred: true,
    },
  });

  await prisma.componentSupplier.create({
    data: {
      componentId: cabo.id,
      supplierId: fornecedorA.id,
      supplierPartNumber: "CB-FLEX-25",
      unitPrice: 0.8,
      currency: "BRL",
      salesUnit: "metro",
      conversionFactorToUsageUnit: 1,
      minLotSize: 1000,
      purchaseMultiple: 250,
      leadTimeDays: 10,
      priceDate: daysFromNow(-30),
      priceValidUntil: daysFromNow(60),
      preferred: true,
    },
  });

  await prisma.componentSupplier.create({
    data: {
      componentId: placa.id,
      supplierId: fornecedorB.id,
      supplierPartNumber: "PX-DRV-C",
      unitPrice: 12,
      currency: "USD",
      salesUnit: "unidade",
      conversionFactorToUsageUnit: 1,
      minLotSize: 50,
      purchaseMultiple: 10,
      leadTimeDays: 60,
      priceDate: daysFromNow(-200),
      priceValidUntil: daysFromNow(-5), // preço desatualizado
      preferred: true,
    },
  });

  console.log("Criando LMC (BOM)...");
  const bom = await prisma.bom.create({
    data: {
      productCode: "PROD-100",
      description: "Produto X",
      revisions: {
        create: {
          revisionNumber: 1,
          effectiveDate: daysFromNow(-60),
          isCurrent: true,
          items: {
            create: [
              { componentId: conector.id, qtyPerUnit: 2, lossPercent: 0.02 },
              { componentId: cabo.id, qtyPerUnit: 5, lossPercent: 0.05 },
              { componentId: placa.id, qtyPerUnit: 1, lossPercent: 0 },
            ],
          },
        },
      },
    },
    include: { revisions: { include: { items: true } } },
  });
  const revision = bom.revisions[0];

  console.log("Criando cenário e linhas de fabricação...");
  const scenarioStart = new Date(Date.UTC(2027, 0, 1));
  const scenario = await prisma.scenario.create({
    data: {
      name: "Plano 2027 - T1 a T3",
      horizon: "TRIMESTRAL",
      startDate: scenarioStart,
      exchangeRateUsdBrl: 5.2,
    },
  });

  const periods = [];
  for (let i = 0; i < 3; i++) {
    const start = new Date(Date.UTC(2027, i, 1));
    const end = new Date(Date.UTC(2027, i + 1, 0));
    periods.push(
      await prisma.period.create({
        data: {
          scenarioId: scenario.id,
          label: `2027-${String(i + 1).padStart(2, "0")}`,
          startDate: start,
          endDate: end,
          sequence: i,
        },
      }),
    );
  }

  await prisma.productionLine.create({
    data: {
      scenarioId: scenario.id,
      bomId: bom.id,
      bomRevisionId: revision.id,
      periodId: periods[0].id,
      quantity: 100,
      notes: "Lote inicial",
    },
  });
  await prisma.productionLine.create({
    data: {
      scenarioId: scenario.id,
      bomId: bom.id,
      bomRevisionId: revision.id,
      periodId: periods[1].id,
      quantity: 150,
      notes: "Reforço de produção",
    },
  });

  console.log("Seed concluído.");
  console.log(`Cenário: ${scenario.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
