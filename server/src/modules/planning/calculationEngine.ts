import { prisma } from "../../lib/prisma";
import { certificationStatus } from "../suppliers/certificationStatus";
import { round2, round6, roundToLotAndMultiple } from "./rounding";

const HORIZON_MONTHS: Record<string, number> = {
  TRIMESTRAL: 3,
  SEMESTRAL: 6,
  ANUAL: 12,
};

/** Gera os períodos (blocos mensais fechados) de um cenário a partir do horizonte. */
export async function generatePeriods(scenarioId: string, startDate: Date, horizon: string) {
  const months = HORIZON_MONTHS[horizon] ?? 3;
  const periods = [];
  for (let i = 0; i < months; i++) {
    const periodStart = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + i, 1));
    const periodEnd = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + i + 1, 0));
    const label = `${periodStart.getUTCFullYear()}-${String(periodStart.getUTCMonth() + 1).padStart(2, "0")}`;
    periods.push(
      prisma.period.create({
        data: {
          scenarioId,
          label,
          startDate: periodStart,
          endDate: periodEnd,
          sequence: i,
        },
      }),
    );
  }
  return Promise.all(periods);
}

interface ComponentNeed {
  componentId: string;
  needUsageUnit: number;
  sourceLmcCodes: Set<string>;
}

/**
 * Motor de cálculo do plano de compras (B3).
 * Idempotente: limpa e recalcula os itens do cenário a cada chamada.
 */
export async function calculateScenario(scenarioId: string) {
  const scenario = await prisma.scenario.findUniqueOrThrow({
    where: { id: scenarioId },
    include: { periods: { orderBy: { sequence: "asc" } } },
  });

  const lines = await prisma.productionLine.findMany({
    where: { scenarioId },
    include: {
      bomRevision: { include: { items: true } },
      bom: true,
      period: true,
    },
  });

  const supplierChoices = await prisma.scenarioSupplierChoice.findMany({ where: { scenarioId } });
  const choiceByComponent = new Map(supplierChoices.map((c) => [c.componentId, c.supplierId]));

  // necessidade por período × componente, agregando linhas do mesmo período
  const needsByPeriod = new Map<string, Map<string, ComponentNeed>>();
  for (const period of scenario.periods) {
    needsByPeriod.set(period.id, new Map());
  }

  for (const line of lines) {
    const periodMap = needsByPeriod.get(line.periodId);
    if (!periodMap) continue;
    for (const item of line.bomRevision.items) {
      const needUsageUnit = round6(
        Number(line.quantity) * Number(item.qtyPerUnit) * (1 + Number(item.lossPercent)),
      );
      const existing = periodMap.get(item.componentId);
      if (existing) {
        existing.needUsageUnit = round6(existing.needUsageUnit + needUsageUnit);
        existing.sourceLmcCodes.add(line.bom.productCode);
      } else {
        periodMap.set(item.componentId, {
          componentId: item.componentId,
          needUsageUnit,
          sourceLmcCodes: new Set([line.bom.productCode]),
        });
      }
    }
  }

  const componentIds = new Set<string>();
  for (const periodMap of needsByPeriod.values()) {
    for (const id of periodMap.keys()) componentIds.add(id);
  }

  // fornecedor escolhido por componente: override do cenário, senão preferencial,
  // senão o de menor preço (fallback para não travar o cálculo)
  const componentSupplierInclude = {
    supplier: { include: { certifications: { where: { isCurrent: true as const } } } },
  } as const;
  type ComponentSupplierWithSupplier = Awaited<ReturnType<typeof prisma.componentSupplier.findFirstOrThrow<{ include: typeof componentSupplierInclude }>>>;

  const componentSuppliersByComponent = new Map<string, ComponentSupplierWithSupplier[]>();
  for (const componentId of componentIds) {
    const options = await prisma.componentSupplier.findMany({
      where: { componentId },
      include: componentSupplierInclude,
    });
    componentSuppliersByComponent.set(componentId, options);
  }

  function chooseSupplier(componentId: string) {
    const options = componentSuppliersByComponent.get(componentId) ?? [];
    if (options.length === 0) return null;
    const chosenId = choiceByComponent.get(componentId);
    if (chosenId) {
      const found = options.find((o) => o.supplierId === chosenId);
      if (found) return found;
    }
    const preferred = options.find((o) => o.preferred);
    if (preferred) return preferred;
    return [...options].sort((a, b) => Number(a.unitPrice) - Number(b.unitPrice))[0];
  }

  // limpa resultado anterior (recálculo idempotente)
  await prisma.$transaction([
    prisma.purchasePlanItem.deleteMany({ where: { scenarioId } }),
    prisma.componentBalance.deleteMany({ where: { scenarioId } }),
    prisma.alert.deleteMany({ where: { scenarioId } }),
  ]);

  const runningBalance = new Map<string, number>(); // componentId -> saldo em unidade de venda
  const planItemsToCreate: any[] = [];
  const balancesToCreate: any[] = [];
  const alertsToCreate: any[] = [];
  const staleAlertedSupplierIds = new Set<string>();
  const irregularAlertedSupplierIds = new Set<string>();
  const consolidationTotals = new Map<string, { splitQty: number; periods: number; supplier: any }>();

  for (const period of scenario.periods) {
    const periodMap = needsByPeriod.get(period.id)!;
    for (const [componentId, need] of periodMap) {
      const supplier = chooseSupplier(componentId);
      if (!supplier) continue; // sem fornecedor cadastrado para o componente

      const conversionFactor = Number(supplier.conversionFactorToUsageUnit);
      const grossNeedSalesUnit = round6(need.needUsageUnit / conversionFactor);
      const balance = runningBalance.get(componentId) ?? 0;
      const carriedOverQty = Math.min(balance, grossNeedSalesUnit);
      const netNeed = round6(grossNeedSalesUnit - balance);

      let quantityToBuy = 0;
      let surplusToNextPeriod = 0;
      let newBalance: number;

      if (netNeed <= 0) {
        newBalance = round6(balance - grossNeedSalesUnit);
      } else {
        quantityToBuy = roundToLotAndMultiple(netNeed, Number(supplier.minLotSize), Number(supplier.purchaseMultiple));
        surplusToNextPeriod = round6(quantityToBuy - netNeed);
        newBalance = surplusToNextPeriod;
      }
      runningBalance.set(componentId, newBalance);

      balancesToCreate.push({
        scenarioId,
        componentId,
        periodId: period.id,
        balanceQty: newBalance,
      });

      if (quantityToBuy > 0) {
        const unitPrice = Number(supplier.unitPrice);
        const fx = supplier.currency === "USD" ? Number(scenario.exchangeRateUsdBrl) : 1;
        const costBRL = round2(quantityToBuy * unitPrice * fx);
        const deadlineDate = new Date(period.startDate);
        deadlineDate.setUTCDate(deadlineDate.getUTCDate() - supplier.leadTimeDays);
        const outOfHorizon = deadlineDate < scenario.startDate;

        planItemsToCreate.push({
          scenarioId,
          periodId: period.id,
          componentId,
          componentSupplierId: supplier.id,
          quantitySalesUnit: quantityToBuy,
          rawNeedUsageUnit: need.needUsageUnit,
          carriedOverQty: round6(carriedOverQty),
          surplusToNextPeriod,
          unitCost: unitPrice,
          currency: supplier.currency,
          costBRL,
          deadlineDate,
          outOfHorizon,
          sourceLmcCodes: [...need.sourceLmcCodes],
        });

        if (outOfHorizon) {
          alertsToCreate.push({
            scenarioId,
            type: "FORA_DO_HORIZONTE",
            componentId,
            periodId: period.id,
            message: `Compra de ${supplier.supplierPartNumber} precisa ser feita em ${deadlineDate.toISOString().slice(0, 10)}, antes do início do horizonte do plano (${scenario.startDate.toISOString().slice(0, 10)}).`,
            details: { deadlineDate, horizonStart: scenario.startDate, costBRL },
          });
        }

        // preço desatualizado
        if (supplier.priceValidUntil < new Date() && !staleAlertedSupplierIds.has(supplier.id)) {
          staleAlertedSupplierIds.add(supplier.id);
          const ageDays = Math.floor((Date.now() - supplier.priceValidUntil.getTime()) / (1000 * 60 * 60 * 24));
          alertsToCreate.push({
            scenarioId,
            type: "PRECO_DESATUALIZADO",
            componentId,
            message: `Preço de ${supplier.supplierPartNumber} (${supplier.supplier.razaoSocial}) venceu há ${ageDays} dia(s).`,
            details: { priceValidUntil: supplier.priceValidUntil, ageDays },
          });
        }

        // fornecedor irregular
        const expiredCert = supplier.supplier.certifications?.find(
          (c: any) => certificationStatus(c.expiryDate) === "VENCIDO",
        );
        const irregular = supplier.supplier.qualificationStatus !== "QUALIFICADO" || !!expiredCert;
        if (irregular && !irregularAlertedSupplierIds.has(supplier.supplierId)) {
          irregularAlertedSupplierIds.add(supplier.supplierId);
          alertsToCreate.push({
            scenarioId,
            type: "FORNECEDOR_IRREGULAR",
            componentId,
            message: `${supplier.supplier.razaoSocial} está ${supplier.supplier.qualificationStatus !== "QUALIFICADO" ? "não qualificado" : "com certificado vencido"} e tem itens neste cenário.`,
            details: { supplierId: supplier.supplierId, qualificationStatus: supplier.supplier.qualificationStatus },
          });
        }

        const key = `${componentId}:${supplier.id}`;
        const agg = consolidationTotals.get(key) ?? {
          splitQty: 0,
          periods: 0,
          supplier,
        };
        agg.splitQty = round6(agg.splitQty + quantityToBuy);
        agg.periods += 1;
        consolidationTotals.set(key, agg);
      }
    }
  }

  // sugestão de consolidação: compara total comprado período a período (com
  // arredondamento repetido) contra uma única compra consolidada do horizonte inteiro
  for (const [key, agg] of consolidationTotals) {
    if (agg.periods < 2) continue;
    const [componentId] = key.split(":");
    const totalGrossNeed = [...needsByPeriod.values()].reduce(
      (sum, m) => sum + (m.get(componentId)?.needUsageUnit ?? 0),
      0,
    );
    const totalGrossSalesUnit = round6(totalGrossNeed / Number(agg.supplier.conversionFactorToUsageUnit));
    const consolidatedQty = roundToLotAndMultiple(
      totalGrossSalesUnit,
      Number(agg.supplier.minLotSize),
      Number(agg.supplier.purchaseMultiple),
    );
    if (agg.splitQty > consolidatedQty) {
      const unitPrice = Number(agg.supplier.unitPrice);
      const fx = agg.supplier.currency === "USD" ? Number(scenario.exchangeRateUsdBrl) : 1;
      const economyBRL = round2((agg.splitQty - consolidatedQty) * unitPrice * fx);
      const cashAdvanceBRL = round2(consolidatedQty * unitPrice * fx);
      alertsToCreate.push({
        scenarioId,
        type: "SUGESTAO_CONSOLIDACAO",
        componentId,
        message: `Comprar este componente período a período custa R$ ${economyBRL.toFixed(2)} a mais do que uma compra única consolidada, por causa do lote mínimo repetido.`,
        details: {
          splitQty: agg.splitQty,
          consolidatedQty,
          economyBRL,
          cashAdvanceBRL,
          supplierId: agg.supplier.supplierId,
        },
      });
    }
  }

  await prisma.$transaction([
    ...balancesToCreate.map((b) => prisma.componentBalance.create({ data: b })),
    ...planItemsToCreate.map((p) => prisma.purchasePlanItem.create({ data: p })),
    ...alertsToCreate.map((a) => prisma.alert.create({ data: a })),
  ]);

  return {
    purchasePlanItemsCount: planItemsToCreate.length,
    alertsCount: alertsToCreate.length,
  };
}
