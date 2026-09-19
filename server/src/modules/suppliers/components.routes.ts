import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../lib/asyncHandler";

export const componentsRouter = Router();

const componentSchema = z.object({
  internalCode: z.string().min(1),
  description: z.string().min(1),
  category: z.string().optional().nullable(),
  technicalSpec: z.string().optional().nullable(),
  usageUnit: z.string().min(1),
  ncm: z.string().optional().nullable(),
  critical: z.boolean().optional(),
  active: z.boolean().optional(),
});

componentsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { q, critical, active } = req.query as Record<string, string | undefined>;
    const components = await prisma.component.findMany({
      where: {
        critical: critical !== undefined ? critical === "true" : undefined,
        active: active !== undefined ? active === "true" : undefined,
        OR: q
          ? [
              { internalCode: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ]
          : undefined,
      },
      include: { componentSuppliers: { include: { supplier: true } } },
      orderBy: { internalCode: "asc" },
    });
    res.json(components);
  }),
);

componentsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const component = await prisma.component.findUnique({
      where: { id: req.params.id },
      include: {
        componentSuppliers: {
          include: { supplier: true, priceHistory: { orderBy: { replacedAt: "desc" } } },
        },
      },
    });
    if (!component) return res.status(404).json({ error: "Componente não encontrado" });
    res.json(component);
  }),
);

componentsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = componentSchema.parse(req.body);
    const component = await prisma.component.create({ data });
    res.status(201).json(component);
  }),
);

componentsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = componentSchema.partial().parse(req.body);
    const component = await prisma.component.update({ where: { id: req.params.id }, data });
    res.json(component);
  }),
);

// --- Componente × Fornecedor ----------------------------------------------

const componentSupplierSchema = z.object({
  supplierId: z.string().min(1),
  supplierPartNumber: z.string().min(1),
  unitPrice: z.coerce.number().positive(),
  currency: z.string().min(1),
  salesUnit: z.string().min(1),
  conversionFactorToUsageUnit: z.coerce.number().positive(),
  minLotSize: z.coerce.number().positive(),
  purchaseMultiple: z.coerce.number().positive().optional(),
  leadTimeDays: z.coerce.number().int().nonnegative(),
  priceDate: z.coerce.date(),
  priceValidUntil: z.coerce.date(),
  preferred: z.boolean().optional(),
  notes: z.string().optional().nullable(),
});

componentsRouter.post(
  "/:id/suppliers",
  asyncHandler(async (req, res) => {
    const data = componentSupplierSchema.parse(req.body);
    const created = await prisma.$transaction(async (tx) => {
      if (data.preferred) {
        await tx.componentSupplier.updateMany({
          where: { componentId: req.params.id },
          data: { preferred: false },
        });
      }
      return tx.componentSupplier.create({
        data: { ...data, componentId: req.params.id },
      });
    });
    res.status(201).json(created);
  }),
);

// atualizar preço/condições: guarda o valor anterior no histórico antes de sobrescrever
componentsRouter.patch(
  "/:id/suppliers/:componentSupplierId",
  asyncHandler(async (req, res) => {
    const data = componentSupplierSchema.partial().parse(req.body);
    const existing = await prisma.componentSupplier.findUnique({
      where: { id: req.params.componentSupplierId },
    });
    if (!existing || existing.componentId !== req.params.id) {
      return res.status(404).json({ error: "Relação componente-fornecedor não encontrada" });
    }

    const priceChanged =
      data.unitPrice !== undefined && Number(existing.unitPrice) !== data.unitPrice;

    const updated = await prisma.$transaction(async (tx) => {
      if (priceChanged) {
        await tx.componentSupplierPriceHistory.create({
          data: {
            componentSupplierId: existing.id,
            unitPrice: existing.unitPrice,
            currency: existing.currency,
            priceDate: existing.priceDate,
            priceValidUntil: existing.priceValidUntil,
          },
        });
      }
      if (data.preferred) {
        await tx.componentSupplier.updateMany({
          where: { componentId: req.params.id, id: { not: existing.id } },
          data: { preferred: false },
        });
      }
      return tx.componentSupplier.update({
        where: { id: existing.id },
        data,
      });
    });
    res.json(updated);
  }),
);

componentsRouter.delete(
  "/:id/suppliers/:componentSupplierId",
  asyncHandler(async (req, res) => {
    await prisma.componentSupplier.delete({ where: { id: req.params.componentSupplierId } });
    res.status(204).send();
  }),
);

// itens com preço vencido — usado pelos alertas do Módulo B, mas também útil no cadastro
componentsRouter.get(
  "/alerts/stale-price",
  asyncHandler(async (req, res) => {
    const now = new Date();
    const stale = await prisma.componentSupplier.findMany({
      where: { priceValidUntil: { lt: now } },
      include: { component: true, supplier: true },
      orderBy: { priceValidUntil: "asc" },
    });
    res.json(stale);
  }),
);
