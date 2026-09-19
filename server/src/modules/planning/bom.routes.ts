import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../lib/asyncHandler";

// LMC (Lista de Materiais/Componentes) — pré-requisito de dados para o Módulo B.
// Cada revisão é imutável; o cenário aprovado congela a revisão usada.
export const bomRouter = Router();

const bomItemSchema = z.object({
  componentId: z.string().min(1),
  qtyPerUnit: z.coerce.number().positive(),
  lossPercent: z.coerce.number().min(0).max(1).optional(),
});

const bomSchema = z.object({
  productCode: z.string().min(1),
  description: z.string().min(1),
  items: z.array(bomItemSchema).min(1),
});

bomRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const boms = await prisma.bom.findMany({
      include: { revisions: { where: { isCurrent: true }, include: { items: true } } },
      orderBy: { productCode: "asc" },
    });
    res.json(boms);
  }),
);

bomRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const bom = await prisma.bom.findUnique({
      where: { id: req.params.id },
      include: {
        revisions: { orderBy: { revisionNumber: "desc" }, include: { items: { include: { component: true } } } },
      },
    });
    if (!bom) return res.status(404).json({ error: "LMC não encontrada" });
    res.json(bom);
  }),
);

bomRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = bomSchema.parse(req.body);
    const bom = await prisma.bom.create({
      data: {
        productCode: data.productCode,
        description: data.description,
        revisions: {
          create: {
            revisionNumber: 1,
            effectiveDate: new Date(),
            isCurrent: true,
            items: { create: data.items },
          },
        },
      },
      include: { revisions: { include: { items: true } } },
    });
    res.status(201).json(bom);
  }),
);

// nova revisão: imutável, vira a atual; a anterior deixa de ser isCurrent mas
// continua referenciada por linhas de fabricação/cenários já criados
bomRouter.post(
  "/:id/revisions",
  asyncHandler(async (req, res) => {
    const data = z.object({ items: z.array(bomItemSchema).min(1) }).parse(req.body);
    const last = await prisma.bomRevision.findFirst({
      where: { bomId: req.params.id },
      orderBy: { revisionNumber: "desc" },
    });
    const revision = await prisma.$transaction(async (tx) => {
      if (last) {
        await tx.bomRevision.update({ where: { id: last.id }, data: { isCurrent: false } });
      }
      return tx.bomRevision.create({
        data: {
          bomId: req.params.id,
          revisionNumber: (last?.revisionNumber ?? 0) + 1,
          effectiveDate: new Date(),
          isCurrent: true,
          items: { create: data.items },
        },
        include: { items: true },
      });
    });
    res.status(201).json(revision);
  }),
);
