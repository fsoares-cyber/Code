import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../lib/asyncHandler";
import { isSupplierRegular } from "../suppliers/certificationStatus";
import { getTotalUsageUnitNeedByComponent } from "./calculationEngine";
import { round2, round6, roundToLotAndMultiple } from "./rounding";

const DEFAULT_QUOTATION_DUE_DAYS = 7;

// --- rotas aninhadas em /api/scenarios/:id/... -----------------------------

export const scenarioQuotationsRouter = Router({ mergeParams: true });

function effectiveStatus(status: string, dueAt: Date | null, now = new Date()) {
  if (status === "ENVIADA" && dueAt && dueAt < now) return "VENCIDA";
  return status;
}

async function nextQuotationNumber(scenarioId: string) {
  const count = await prisma.quotation.count({ where: { scenarioId } });
  return `COT-${scenarioId.slice(-6).toUpperCase()}-${String(count + 1).padStart(3, "0")}`;
}

// B6: cenário aprovado libera o botão de gerar cotações. Agrupa os itens do
// plano de compras por fornecedor e cria uma cotação por fornecedor — nunca
// uma por item. Fornecedor irregular (não qualificado ou certificado vencido)
// é bloqueado de fato: não entra em cotação, e o bloqueio aparece explícito
// na resposta (nunca em silêncio).
scenarioQuotationsRouter.post(
  "/generate",
  asyncHandler(async (req, res) => {
    const scenario = await prisma.scenario.findUnique({ where: { id: req.params.id } });
    if (!scenario) return res.status(404).json({ error: "Cenário não encontrado" });
    if (scenario.status === "RASCUNHO") {
      return res.status(400).json({ error: "Aprove o cenário antes de gerar cotações" });
    }

    const items = await prisma.purchasePlanItem.findMany({
      where: { scenarioId: scenario.id },
      include: {
        component: true,
        componentSupplier: {
          include: { supplier: { include: { certifications: { where: { isCurrent: true } } } } },
        },
      },
    });

    const bySupplier = new Map<string, typeof items>();
    for (const item of items) {
      const supplierId = item.componentSupplier.supplierId;
      const group = bySupplier.get(supplierId) ?? [];
      group.push(item);
      bySupplier.set(supplierId, group);
    }

    const existingQuotations = await prisma.quotation.findMany({ where: { scenarioId: scenario.id } });
    const suppliersWithQuotation = new Set(existingQuotations.map((q) => q.supplierId));

    const created: string[] = [];
    const skipped: { supplierId: string; razaoSocial: string; reason: string }[] = [];

    for (const [supplierId, group] of bySupplier) {
      if (suppliersWithQuotation.has(supplierId)) {
        skipped.push({ supplierId, razaoSocial: group[0].componentSupplier.supplier.razaoSocial, reason: "Já existe cotação para este fornecedor neste cenário" });
        continue;
      }
      const supplier = group[0].componentSupplier.supplier;
      if (!isSupplierRegular(supplier.certifications, supplier.qualificationStatus)) {
        skipped.push({
          supplierId,
          razaoSocial: supplier.razaoSocial,
          reason:
            supplier.qualificationStatus !== "QUALIFICADO"
              ? "Fornecedor não qualificado"
              : "Fornecedor com certificado vencido",
        });
        continue;
      }

      const number = await nextQuotationNumber(scenario.id);
      const now = new Date();
      const dueAt = new Date(now);
      dueAt.setUTCDate(dueAt.getUTCDate() + DEFAULT_QUOTATION_DUE_DAYS);

      const quotation = await prisma.quotation.create({
        data: {
          scenarioId: scenario.id,
          supplierId,
          number,
          status: "ENVIADA",
          sentAt: now,
          dueAt,
          items: {
            create: group.map((item) => ({
              componentId: item.componentId,
              componentSupplierId: item.componentSupplierId,
              supplierPartNumber: item.componentSupplier.supplierPartNumber,
              description: item.component.description,
              quantitySalesUnit: item.quantitySalesUnit,
              deadlineDate: item.deadlineDate,
            })),
          },
        },
      });
      created.push(quotation.id);
    }

    if (created.length > 0 && scenario.status === "APROVADO") {
      await prisma.scenario.update({ where: { id: scenario.id }, data: { status: "COTADO" } });
    }

    const createdQuotations = await prisma.quotation.findMany({
      where: { id: { in: created } },
      include: { supplier: true, items: true },
    });
    res.status(201).json({ created: createdQuotations, skipped });
  }),
);

scenarioQuotationsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const quotations = await prisma.quotation.findMany({
      where: { scenarioId: req.params.id },
      include: { supplier: true, items: true },
      orderBy: { number: "asc" },
    });
    res.json(
      quotations.map((q) => ({
        ...q,
        status: effectiveStatus(q.status, q.dueAt),
        itemsCount: q.items.length,
        respondedCount: q.items.filter((i) => i.respondedAt).length,
      })),
    );
  }),
);

// B6 comparativo: mesmo componente cotado com vários fornecedores, lado a
// lado — preço, prazo, lote mínimo e custo total (recalculado com o lote
// mínimo/múltiplo de cada fornecedor alternativo, não só o escolhido no plano).
scenarioQuotationsRouter.get(
  "/comparison",
  asyncHandler(async (req, res) => {
    const scenario = await prisma.scenario.findUniqueOrThrow({ where: { id: req.params.id } });
    const respondedItems = await prisma.quotationItem.findMany({
      where: { quotation: { scenarioId: req.params.id }, respondedPrice: { not: null } },
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

    const totalNeedByComponent = await getTotalUsageUnitNeedByComponent(req.params.id);

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

    const result = [...byComponent.values()].map((entry) => {
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

    res.json(result);
  }),
);

// --- rotas de nível superior em /api/quotations/:id -------------------------

export const quotationsRouter = Router();

quotationsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const quotation = await prisma.quotation.findUnique({
      where: { id: req.params.id },
      include: {
        supplier: { include: { contacts: { where: { receivesQuotation: true } } } },
        items: { include: { component: true } },
      },
    });
    if (!quotation) return res.status(404).json({ error: "Cotação não encontrada" });
    res.json({ ...quotation, status: effectiveStatus(quotation.status, quotation.dueAt) });
  }),
);

const quotationUpdateSchema = z.object({
  status: z.enum(["ENVIADA", "RESPONDIDA", "VENCIDA"]).optional(),
  dueAt: z.coerce.date().optional(),
});

quotationsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = quotationUpdateSchema.parse(req.body);
    const quotation = await prisma.quotation.update({ where: { id: req.params.id }, data });
    res.json(quotation);
  }),
);

const itemResponseSchema = z.object({
  respondedPrice: z.coerce.number().positive(),
  respondedLeadTimeDays: z.coerce.number().int().nonnegative().optional(),
  respondedMinLotSize: z.coerce.number().positive().optional(),
});

// retorno: tela simples para digitar os preços recebidos, vinculados ao
// número da cotação. Propaga o preço para o plano de compras (para o
// fechamento B7) sem tocar no cadastro — o preço cotado fica só no cenário.
quotationsRouter.patch(
  "/:id/items/:itemId",
  asyncHandler(async (req, res) => {
    const data = itemResponseSchema.parse(req.body);
    const item = await prisma.quotationItem.findUnique({
      where: { id: req.params.itemId },
      include: { quotation: true, componentSupplier: true },
    });
    if (!item || item.quotationId !== req.params.id) {
      return res.status(404).json({ error: "Item de cotação não encontrado" });
    }

    const scenario = await prisma.scenario.findUniqueOrThrow({ where: { id: item.quotation.scenarioId } });
    const fx = item.componentSupplier.currency === "USD" ? Number(scenario.exchangeRateUsdBrl) : 1;

    const updatedItem = await prisma.$transaction(async (tx) => {
      const saved = await tx.quotationItem.update({
        where: { id: item.id },
        data: { ...data, respondedAt: new Date() },
      });

      const planItems = await tx.purchasePlanItem.findMany({
        where: {
          scenarioId: item.quotation.scenarioId,
          componentId: item.componentId,
          componentSupplierId: item.componentSupplierId,
        },
      });
      await Promise.all(
        planItems.map((p) =>
          tx.purchasePlanItem.update({
            where: { id: p.id },
            data: {
              quotedUnitPrice: data.respondedPrice,
              quotedCost: round2(Number(p.quantitySalesUnit) * data.respondedPrice * fx),
            },
          }),
        ),
      );

      const allItems = await tx.quotationItem.findMany({ where: { quotationId: item.quotationId } });
      const allResponded = allItems.every((i) => i.id === saved.id || i.respondedAt);
      if (allResponded && item.quotation.status !== "RESPONDIDA") {
        await tx.quotation.update({ where: { id: item.quotationId }, data: { status: "RESPONDIDA" } });
      }

      return saved;
    });

    res.json(updatedItem);
  }),
);
