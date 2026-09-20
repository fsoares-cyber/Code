import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { prisma } from "../../lib/prisma";
import { calculateScenario, generatePeriods } from "./calculationEngine";

// Integração: recria o cenário de cabo flexível já validado manualmente
// (ver histórico de testes via curl) — lote mínimo 1.000, múltiplo 250,
// perda 5%, duas linhas de fabricação em períodos consecutivos. Cobre
// necessidade -> conversão -> arredondamento -> saldo carregado -> alerta
// de fora do horizonte -> sugestão de consolidação, tudo em conjunto.

let supplierId: string;
let componentId: string;
let bomId: string;
let scenarioId: string;

before(async () => {
  const supplier = await prisma.supplier.create({
    data: {
      razaoSocial: "TESTE Fornecedor Cabos",
      taxId: "TEST-TAXID-CALC-ENGINE",
      origin: "NACIONAL",
      country: "Brasil",
      qualificationStatus: "QUALIFICADO",
    },
  });
  supplierId = supplier.id;

  const component = await prisma.component.create({
    data: {
      internalCode: "TEST-CB-CALC-ENGINE",
      description: "Cabo de teste",
      usageUnit: "metro",
    },
  });
  componentId = component.id;

  const farFuture = new Date();
  farFuture.setUTCFullYear(farFuture.getUTCFullYear() + 1);
  await prisma.componentSupplier.create({
    data: {
      componentId,
      supplierId,
      supplierPartNumber: "TEST-PN-001",
      unitPrice: 0.8,
      currency: "BRL",
      salesUnit: "metro",
      conversionFactorToUsageUnit: 1,
      minLotSize: 1000,
      purchaseMultiple: 250,
      leadTimeDays: 10,
      priceDate: new Date(),
      priceValidUntil: farFuture,
      preferred: true,
    },
  });

  const bom = await prisma.bom.create({
    data: {
      productCode: "TEST-PROD-CALC-ENGINE",
      description: "Produto de teste",
      revisions: {
        create: {
          revisionNumber: 1,
          effectiveDate: new Date(),
          isCurrent: true,
          items: { create: [{ componentId, qtyPerUnit: 5, lossPercent: 0.05 }] },
        },
      },
    },
    include: { revisions: true },
  });
  bomId = bom.id;
  const revisionId = bom.revisions[0].id;

  const scenarioStart = new Date(Date.UTC(2027, 0, 1));
  const scenario = await prisma.scenario.create({
    data: {
      name: "TESTE cenário motor de cálculo",
      horizon: "TRIMESTRAL",
      startDate: scenarioStart,
      exchangeRateUsdBrl: 5,
    },
  });
  scenarioId = scenario.id;
  const periods = await generatePeriods(scenarioId, scenarioStart, "TRIMESTRAL");

  await prisma.productionLine.create({
    data: { scenarioId, bomId, bomRevisionId: revisionId, periodId: periods[0].id, quantity: 100 },
  });
  await prisma.productionLine.create({
    data: { scenarioId, bomId, bomRevisionId: revisionId, periodId: periods[1].id, quantity: 150 },
  });
});

after(async () => {
  await prisma.scenario.delete({ where: { id: scenarioId } }).catch(() => {});
  await prisma.bom.delete({ where: { id: bomId } }).catch(() => {});
  await prisma.component.delete({ where: { id: componentId } }).catch(() => {});
  await prisma.supplier.delete({ where: { id: supplierId } }).catch(() => {});
});

test("calculateScenario: necessidade, arredondamento por lote mínimo/múltiplo e saldo carregado", async () => {
  await calculateScenario(scenarioId);

  const items = await prisma.purchasePlanItem.findMany({
    where: { scenarioId },
    orderBy: { deadlineDate: "asc" },
  });

  assert.equal(items.length, 2, "duas compras: uma por período, o componente se repete");

  const [first, second] = items;

  // período 1: necessidade 100*5*1.05=525, abaixo do lote mínimo -> compra 1.000
  assert.equal(Number(first.rawNeedUsageUnit), 525);
  assert.equal(Number(first.quantitySalesUnit), 1000);
  assert.equal(Number(first.carriedOverQty), 0);
  assert.equal(Number(first.surplusToNextPeriod), 475);
  assert.equal(Number(first.costBRL), 800);
  assert.equal(first.outOfHorizon, true, "lead time de 10 dias empurra a data limite para antes do início do cenário");

  // período 2: necessidade 150*5*1.05=787.5, saldo de 475 abate -> falta 312.5 -> compra 1.000
  assert.equal(Number(second.rawNeedUsageUnit), 787.5);
  assert.equal(Number(second.carriedOverQty), 475);
  assert.equal(Number(second.quantitySalesUnit), 1000);
  assert.equal(Number(second.surplusToNextPeriod), 687.5);
  assert.equal(Number(second.costBRL), 800);
  assert.equal(second.outOfHorizon, false);
});

test("calculateScenario: alerta de fora do horizonte e de sugestão de consolidação", async () => {
  await calculateScenario(scenarioId);

  const alerts = await prisma.alert.findMany({ where: { scenarioId } });
  const outOfHorizon = alerts.find((a) => a.type === "FORA_DO_HORIZONTE");
  const consolidation = alerts.find((a) => a.type === "SUGESTAO_CONSOLIDACAO");

  assert.ok(outOfHorizon, "deveria alertar que a primeira compra vence antes do início do plano");
  assert.ok(consolidation, "comprar 1.000+1.000 em dois períodos desperdiça lote mínimo vs. uma compra consolidada");

  const details = consolidation!.details as { splitQty: number; consolidatedQty: number; economyBRL: number };
  assert.equal(details.splitQty, 2000);
  assert.equal(details.consolidatedQty, 1500);
  assert.equal(details.economyBRL, 400);
});

test("calculateScenario: idempotente — recalcular não duplica itens", async () => {
  await calculateScenario(scenarioId);
  await calculateScenario(scenarioId);
  const items = await prisma.purchasePlanItem.findMany({ where: { scenarioId } });
  assert.equal(items.length, 2);
});
