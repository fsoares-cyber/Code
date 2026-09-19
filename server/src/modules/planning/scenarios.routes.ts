import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../lib/asyncHandler";
import { calculateScenario, generatePeriods } from "./calculationEngine";
import { round2 } from "./rounding";
import { scenarioQuotationsRouter } from "./quotations.routes";

export const scenariosRouter = Router();
scenariosRouter.use("/:id/quotations", scenarioQuotationsRouter);

const scenarioSchema = z.object({
  name: z.string().min(1),
  horizon: z.enum(["TRIMESTRAL", "SEMESTRAL", "ANUAL"]),
  startDate: z.coerce.date(),
  exchangeRateUsdBrl: z.coerce.number().positive(),
});

scenariosRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const scenarios = await prisma.scenario.findMany({ orderBy: { createdAt: "desc" } });
    res.json(scenarios);
  }),
);

scenariosRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const scenario = await prisma.scenario.findUnique({
      where: { id: req.params.id },
      include: { periods: { orderBy: { sequence: "asc" } } },
    });
    if (!scenario) return res.status(404).json({ error: "Cenário não encontrado" });
    res.json(scenario);
  }),
);

scenariosRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = scenarioSchema.parse(req.body);
    const scenario = await prisma.scenario.create({ data });
    await generatePeriods(scenario.id, data.startDate, data.horizon);
    const full = await prisma.scenario.findUnique({
      where: { id: scenario.id },
      include: { periods: { orderBy: { sequence: "asc" } } },
    });
    res.status(201).json(full);
  }),
);

// duplicar cenário, para simular variações sem refazer o lançamento
scenariosRouter.post(
  "/:id/duplicate",
  asyncHandler(async (req, res) => {
    const source = await prisma.scenario.findUnique({
      where: { id: req.params.id },
      include: { periods: { orderBy: { sequence: "asc" } }, productionLines: true },
    });
    if (!source) return res.status(404).json({ error: "Cenário não encontrado" });

    const name = (req.body?.name as string) || `${source.name} (cópia)`;
    const clone = await prisma.$transaction(async (tx) => {
      const newScenario = await tx.scenario.create({
        data: {
          name,
          horizon: source.horizon,
          startDate: source.startDate,
          exchangeRateUsdBrl: source.exchangeRateUsdBrl,
        },
      });
      const periodIdMap = new Map<string, string>();
      for (const p of source.periods) {
        const newPeriod = await tx.period.create({
          data: {
            scenarioId: newScenario.id,
            label: p.label,
            startDate: p.startDate,
            endDate: p.endDate,
            sequence: p.sequence,
          },
        });
        periodIdMap.set(p.id, newPeriod.id);
      }
      for (const line of source.productionLines) {
        await tx.productionLine.create({
          data: {
            scenarioId: newScenario.id,
            bomId: line.bomId,
            bomRevisionId: line.bomRevisionId,
            periodId: periodIdMap.get(line.periodId)!,
            quantity: line.quantity,
            notes: line.notes,
          },
        });
      }
      return newScenario;
    });
    res.status(201).json(clone);
  }),
);

// aprovar: congela preços, fornecedor escolhido e revisão de cada LMC dentro do cenário.
// Reajuste posterior no cadastro não reescreve plano aprovado — os itens do plano já
// guardam unitCost/currency/costBRL calculados no momento da aprovação.
scenariosRouter.post(
  "/:id/approve",
  asyncHandler(async (req, res) => {
    const scenario = await prisma.scenario.findUnique({ where: { id: req.params.id } });
    if (!scenario) return res.status(404).json({ error: "Cenário não encontrado" });
    if (scenario.status !== "RASCUNHO") {
      return res.status(400).json({ error: "Só é possível aprovar um cenário em rascunho" });
    }

    await calculateScenario(scenario.id);
    const updated = await prisma.$transaction(async (tx) => {
      const items = await tx.purchasePlanItem.findMany({ where: { scenarioId: scenario.id } });
      await Promise.all(
        items.map((i) => tx.purchasePlanItem.update({ where: { id: i.id }, data: { plannedCost: i.costBRL } })),
      );
      return tx.scenario.update({
        where: { id: scenario.id },
        data: { status: "APROVADO", approvedAt: new Date() },
      });
    });
    res.json(updated);
  }),
);

// --- Linhas de fabricação ---------------------------------------------------

const productionLineSchema = z.object({
  bomId: z.string().min(1),
  periodId: z.string().min(1),
  quantity: z.coerce.number().positive(),
  notes: z.string().optional().nullable(),
});

scenariosRouter.get(
  "/:id/lines",
  asyncHandler(async (req, res) => {
    const lines = await prisma.productionLine.findMany({
      where: { scenarioId: req.params.id },
      include: { bom: true, period: true },
      orderBy: [{ period: { sequence: "asc" } }, { createdAt: "asc" }],
    });
    res.json(lines);
  }),
);

scenariosRouter.post(
  "/:id/lines",
  asyncHandler(async (req, res) => {
    const scenario = await prisma.scenario.findUnique({ where: { id: req.params.id } });
    if (!scenario) return res.status(404).json({ error: "Cenário não encontrado" });
    if (scenario.status !== "RASCUNHO") {
      return res.status(400).json({ error: "Cenário aprovado não pode receber novas linhas" });
    }

    const data = productionLineSchema.parse(req.body);
    const currentRevision = await prisma.bomRevision.findFirst({
      where: { bomId: data.bomId, isCurrent: true },
    });
    if (!currentRevision) return res.status(400).json({ error: "LMC sem revisão atual" });

    const line = await prisma.productionLine.create({
      data: {
        scenarioId: req.params.id,
        bomId: data.bomId,
        bomRevisionId: currentRevision.id,
        periodId: data.periodId,
        quantity: data.quantity,
        notes: data.notes,
      },
    });
    res.status(201).json(line);
  }),
);

scenariosRouter.delete(
  "/:id/lines/:lineId",
  asyncHandler(async (req, res) => {
    await prisma.productionLine.delete({ where: { id: req.params.lineId } });
    res.status(204).send();
  }),
);

// escolha de fornecedor por componente (default: preferencial)
scenariosRouter.put(
  "/:id/supplier-choice",
  asyncHandler(async (req, res) => {
    const data = z.object({ componentId: z.string().min(1), supplierId: z.string().min(1) }).parse(req.body);
    const choice = await prisma.scenarioSupplierChoice.upsert({
      where: { scenarioId_componentId: { scenarioId: req.params.id, componentId: data.componentId } },
      create: { scenarioId: req.params.id, componentId: data.componentId, supplierId: data.supplierId },
      update: { supplierId: data.supplierId },
    });
    res.json(choice);
  }),
);

// --- Cálculo e saídas --------------------------------------------------------

scenariosRouter.post(
  "/:id/calculate",
  asyncHandler(async (req, res) => {
    const scenario = await prisma.scenario.findUnique({ where: { id: req.params.id } });
    if (!scenario) return res.status(404).json({ error: "Cenário não encontrado" });
    if (scenario.status !== "RASCUNHO") {
      return res.status(400).json({
        error: "Cenário já aprovado: o plano está congelado. Recalcular apagaria o plano e as cotações já geradas.",
      });
    }
    const result = await calculateScenario(req.params.id);
    res.json(result);
  }),
);

scenariosRouter.get(
  "/:id/alerts",
  asyncHandler(async (req, res) => {
    const alerts = await prisma.alert.findMany({
      where: { scenarioId: req.params.id },
      include: { component: true },
      orderBy: { type: "asc" },
    });
    res.json(alerts);
  }),
);

// plano de compras — uma linha por componente por período, ordenado por data limite
scenariosRouter.get(
  "/:id/purchase-plan",
  asyncHandler(async (req, res) => {
    const items = await prisma.purchasePlanItem.findMany({
      where: { scenarioId: req.params.id },
      include: {
        component: true,
        componentSupplier: { include: { supplier: true } },
        period: true,
      },
      orderBy: { deadlineDate: "asc" },
    });
    res.json(items);
  }),
);

// resumo em quatro cortes: por período, por LMC, por fornecedor, total geral
scenariosRouter.get(
  "/:id/summary",
  asyncHandler(async (req, res) => {
    const scenario = await prisma.scenario.findUniqueOrThrow({ where: { id: req.params.id } });
    const items = await prisma.purchasePlanItem.findMany({
      where: { scenarioId: req.params.id },
      include: {
        component: true,
        componentSupplier: { include: { supplier: true } },
        period: true,
      },
    });

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

    res.json({
      byPeriod: [...byPeriod.values()].sort((a, b) => a.sequence - b.sequence),
      byLmc: [...byLmc.values()].sort((a, b) => a.lmcCode.localeCompare(b.lmcCode)),
      bySupplier: [...bySupplier.values()].sort((a, b) => b.totalBRL - a.totalBRL),
      totalBRL,
      exposureUSD,
      exchangeRateUsdBrl: Number(scenario.exchangeRateUsdBrl),
    });
  }),
);

// fechamento do ciclo (B7): planejado × cotado, com desvio por item e total
scenariosRouter.get(
  "/:id/closure",
  asyncHandler(async (req, res) => {
    const items = await prisma.purchasePlanItem.findMany({
      where: { scenarioId: req.params.id, quotedCost: { not: null } },
      include: { component: true, componentSupplier: { include: { supplier: true } } },
    });
    const rows = items.map((i) => ({
      componentId: i.componentId,
      componentCode: i.component.internalCode,
      supplier: i.componentSupplier.supplier.razaoSocial,
      planned: Number(i.plannedCost ?? i.costBRL),
      quoted: Number(i.quotedCost),
      deviation: round2(Number(i.quotedCost) - Number(i.plannedCost ?? i.costBRL)),
    }));
    const totalPlanned = round2(rows.reduce((s, r) => s + r.planned, 0));
    const totalQuoted = round2(rows.reduce((s, r) => s + r.quoted, 0));
    res.json({ rows, totalPlanned, totalQuoted, totalDeviation: round2(totalQuoted - totalPlanned) });
  }),
);
