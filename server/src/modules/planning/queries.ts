import { prisma } from "../../lib/prisma";
import { getTotalUsageUnitNeedByComponent } from "./calculationEngine";
import { round2, round6, roundToLotAndMultiple } from "./rounding";

export function getPurchasePlanItems(scenarioId: string) {
  return prisma.purchasePlanItem.findMany({
    where: { scenarioId },
    include: {
      component: true,
      componentSupplier: { include: { supplier: true } },
      period: true,
    },
    orderBy: { deadlineDate: "asc" },
  });
}

// resumo em quatro cortes: por período, por LMC, por fornecedor, total geral
export async function computeScenarioSummary(scenarioId: string) {
  const scenario = await prisma.scenario.findUniqueOrThrow({ where: { id: scenarioId } });
  const items = await getPurchasePlanItems(scenarioId);

  const byPeriod = new Map<string, { periodId: string; label: string; sequence: number; totalBRL: number }>();
  const byLmc = new Map<string, { lmcCode: string; totalBRL: number }>();
  const bySupplier = new Map<string, { supplierId: string; name: string; totalBRL: number }>();
  let totalBRL = 0;
  let exposureUSD = 0;

  for (const item of items) {
    totalBRL = round2(totalBRL + Number(item.costBRL));
    if (item.currency === "USD") {
      exposureUSD = round2(exposureUSD + Number(item.quantitySalesUnit) * Number(item.unitCost));
    }

    const p = byPeriod.get(item.periodId) ?? {
      periodId: item.periodId,
      label: item.period.label,
      sequence: item.period.sequence,
      totalBRL: 0,
    };
    p.totalBRL = round2(p.totalBRL + Number(item.costBRL));
    byPeriod.set(item.periodId, p);

    for (const lmcCode of item.sourceLmcCodes) {
      const l = byLmc.get(lmcCode) ?? { lmcCode, totalBRL: 0 };
      l.totalBRL = round2(l.totalBRL + Number(item.costBRL));
      byLmc.set(lmcCode, l);
    }

    const supplierId = item.componentSupplier.supplierId;
    const s = bySupplier.get(supplierId) ?? {
      supplierId,
      name: item.componentSupplier.supplier.razaoSocial,
      totalBRL: 0,
    };
    s.totalBRL = round2(s.totalBRL + Number(item.costBRL));
    bySupplier.set(supplierId, s);
  }

  return {
    byPeriod: [...byPeriod.values()].sort((a, b) => a.sequence - b.sequence),
    byLmc: [...byLmc.values()].sort((a, b) => a.lmcCode.localeCompare(b.lmcCode)),
    bySupplier: [...bySupplier.values()].sort((a, b) => b.totalBRL - a.totalBRL),
    totalBRL,
    exposureUSD,
    exchangeRateUsdBrl: Number(scenario.exchangeRateUsdBrl),
  };
}

// B6 comparativo: mesmo componente cotado com vários fornecedores, lado a
// lado — preço, prazo, lote mínimo e custo total (recalculado com o lote
// mínimo/múltiplo de cada fornecedor alternativo, não só o escolhido no plano).
export async function computeQuotationComparison(scenarioId: string) {
  const scenario = await prisma.scenario.findUniqueOrThrow({ where: { id: scenarioId } });
  const respondedItems = await prisma.quotationItem.findMany({
    where: { quotation: { scenarioId }, respondedPrice: { not: null } },
    include: {
      component: true,
      componentSupplier: true,
      quotation: { include: { supplier: true } },
    },
  });

  // um preço por (componente, fornecedor) — descarta duplicatas entre períodos
  const uniqueByKey = new Map<string, (typeof respondedItems)[number]>();
  for (const item of respondedItems) {
    uniqueByKey.set(`${item.componentId}:${item.componentSupplierId}`, item);
  }

  const totalNeedByComponent = await getTotalUsageUnitNeedByComponent(scenarioId);

  const byComponent = new Map<
    string,
    { componentId: string; componentCode: string; description: string; options: any[] }
  >();

  for (const item of uniqueByKey.values()) {
    const totalNeed = totalNeedByComponent.get(item.componentId) ?? 0;
    const conversionFactor = Number(item.componentSupplier.conversionFactorToUsageUnit);
    const neededSalesUnit = round6(totalNeed / conversionFactor);
    const minLot = Number(item.respondedMinLotSize ?? item.componentSupplier.minLotSize);
    const quantity = roundToLotAndMultiple(neededSalesUnit, minLot, Number(item.componentSupplier.purchaseMultiple));
    const unitPrice = Number(item.respondedPrice);
    const fx = item.componentSupplier.currency === "USD" ? Number(scenario.exchangeRateUsdBrl) : 1;
    const totalCostBRL = round2(quantity * unitPrice * fx);
    const leadTimeDays = item.respondedLeadTimeDays ?? item.componentSupplier.leadTimeDays;

    const entry = byComponent.get(item.componentId) ?? {
      componentId: item.componentId,
      componentCode: item.component.internalCode,
      description: item.component.description,
      options: [],
    };
    entry.options.push({
      supplierId: item.quotation.supplierId,
      supplierName: item.quotation.supplier.razaoSocial,
      unitPrice,
      currency: item.componentSupplier.currency,
      leadTimeDays,
      minLotSize: minLot,
      quantity,
      totalCostBRL,
    });
    byComponent.set(item.componentId, entry);
  }

  return [...byComponent.values()].map((entry) => {
    const cheapestUnit = Math.min(...entry.options.map((o) => o.unitPrice));
    const cheapestTotal = Math.min(...entry.options.map((o) => o.totalCostBRL));
    return {
      ...entry,
      options: entry.options
        .map((o) => ({
          ...o,
          isCheapestUnit: o.unitPrice === cheapestUnit,
          isCheapestTotal: o.totalCostBRL === cheapestTotal,
        }))
        .sort((a, b) => a.totalCostBRL - b.totalCostBRL),
    };
  });
}
