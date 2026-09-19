import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../lib/asyncHandler";
import { certificationStatus, isSupplierRegular } from "./certificationStatus";

export const suppliersRouter = Router();

const supplierSchema = z.object({
  razaoSocial: z.string().min(1),
  nomeFantasia: z.string().optional().nullable(),
  taxId: z.string().min(1),
  origin: z.enum(["NACIONAL", "IMPORTADO"]),
  country: z.string().min(1),
  address: z.string().optional().nullable(),
  status: z.enum(["ATIVO", "INATIVO", "BLOQUEADO"]).optional(),
  currency: z.string().optional(),
  paymentTerm: z.enum(["ANTECIPADO", "DIAS_30", "DIAS_30_60", "DIAS_30_60_90"]).optional(),
  incoterm: z.enum(["EXW", "FCA", "FOB", "CFR", "CIF", "DAP", "DDP"]).optional().nullable(),
  avgLeadTimeDays: z.number().int().optional().nullable(),
  qualificationStatus: z.enum(["QUALIFICADO", "EM_QUALIFICACAO", "REPROVADO"]).optional(),
  qualificationLastReview: z.coerce.date().optional().nullable(),
  qualificationNextReview: z.coerce.date().optional().nullable(),
});

function withComputedFields<T extends { certifications: { expiryDate: Date; isCurrent: boolean }[]; qualificationStatus: string }>(
  supplier: T,
) {
  const certifications = (supplier.certifications ?? []).map((c) => ({
    ...c,
    status: certificationStatus(c.expiryDate),
  }));
  return {
    ...supplier,
    certifications,
    isRegular: isSupplierRegular(supplier.certifications, supplier.qualificationStatus),
  };
}

suppliersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { origin, status, q } = req.query as Record<string, string | undefined>;
    const suppliers = await prisma.supplier.findMany({
      where: {
        origin: origin ? (origin as any) : undefined,
        status: status ? (status as any) : undefined,
        OR: q
          ? [
              { razaoSocial: { contains: q, mode: "insensitive" } },
              { nomeFantasia: { contains: q, mode: "insensitive" } },
              { taxId: { contains: q, mode: "insensitive" } },
            ]
          : undefined,
      },
      include: { contacts: true, certifications: true },
      orderBy: { razaoSocial: "asc" },
    });
    res.json(suppliers.map(withComputedFields));
  }),
);

suppliersRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const supplier = await prisma.supplier.findUnique({
      where: { id: req.params.id },
      include: {
        contacts: true,
        certifications: { orderBy: { issueDate: "desc" } },
        componentSuppliers: { include: { component: true } },
      },
    });
    if (!supplier) return res.status(404).json({ error: "Fornecedor não encontrado" });
    res.json(withComputedFields(supplier));
  }),
);

suppliersRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = supplierSchema.parse(req.body);
    const supplier = await prisma.supplier.create({ data });
    res.status(201).json(supplier);
  }),
);

suppliersRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = supplierSchema.partial().parse(req.body);
    const supplier = await prisma.supplier.update({ where: { id: req.params.id }, data });
    res.json(supplier);
  }),
);

// --- Contatos -------------------------------------------------------------

const contactSchema = z.object({
  name: z.string().min(1),
  role: z.string().optional().nullable(),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  receivesQuotation: z.boolean().optional(),
});

suppliersRouter.post(
  "/:id/contacts",
  asyncHandler(async (req, res) => {
    const data = contactSchema.parse(req.body);
    const contact = await prisma.supplierContact.create({
      data: { ...data, supplierId: req.params.id },
    });
    res.status(201).json(contact);
  }),
);

suppliersRouter.patch(
  "/:id/contacts/:contactId",
  asyncHandler(async (req, res) => {
    const data = contactSchema.partial().parse(req.body);
    const contact = await prisma.supplierContact.update({
      where: { id: req.params.contactId },
      data,
    });
    res.json(contact);
  }),
);

suppliersRouter.delete(
  "/:id/contacts/:contactId",
  asyncHandler(async (req, res) => {
    await prisma.supplierContact.delete({ where: { id: req.params.contactId } });
    res.status(204).send();
  }),
);

// --- Certificações ----------------------------------------------------
// ao renovar, o certificado antigo vira versão anterior (histórico preservado)

const certificationSchema = z.object({
  type: z.string().min(1),
  number: z.string().min(1),
  issuer: z.string().min(1),
  issueDate: z.coerce.date(),
  expiryDate: z.coerce.date(),
  fileUrl: z.string().optional().nullable(),
});

suppliersRouter.post(
  "/:id/certifications",
  asyncHandler(async (req, res) => {
    const data = certificationSchema.parse(req.body);
    const certification = await prisma.certification.create({
      data: { ...data, supplierId: req.params.id },
    });
    res.status(201).json({ ...certification, status: certificationStatus(certification.expiryDate) });
  }),
);

// renova um certificado: cria nova versão apontando para a anterior, marca a anterior como não-atual
suppliersRouter.post(
  "/:id/certifications/:certificationId/renew",
  asyncHandler(async (req, res) => {
    const data = certificationSchema.parse(req.body);
    const previous = await prisma.certification.findUnique({ where: { id: req.params.certificationId } });
    if (!previous || previous.supplierId !== req.params.id) {
      return res.status(404).json({ error: "Certificado não encontrado" });
    }

    const [, renewed] = await prisma.$transaction([
      prisma.certification.update({ where: { id: previous.id }, data: { isCurrent: false } }),
      prisma.certification.create({
        data: { ...data, supplierId: req.params.id, previousVersionId: previous.id, isCurrent: true },
      }),
    ]);
    res.status(201).json({ ...renewed, status: certificationStatus(renewed.expiryDate) });
  }),
);

suppliersRouter.get(
  "/:id/certifications/:certificationId/history",
  asyncHandler(async (req, res) => {
    const chain: any[] = [];
    let currentId: string | null = req.params.certificationId;
    while (currentId) {
      const cert: any = await prisma.certification.findUnique({ where: { id: currentId } });
      if (!cert) break;
      chain.push({ ...cert, status: certificationStatus(cert.expiryDate) });
      currentId = cert.previousVersionId;
    }
    res.json(chain);
  }),
);

// alertas de vencimento (90/60/30 dias) e certificados vencidos, para todos os fornecedores
suppliersRouter.get(
  "/alerts/expiring",
  asyncHandler(async (req, res) => {
    const certifications = await prisma.certification.findMany({
      where: { isCurrent: true },
      include: { supplier: { select: { id: true, razaoSocial: true } } },
    });
    const alerts = certifications
      .map((c) => ({ ...c, status: certificationStatus(c.expiryDate) }))
      .filter((c) => c.status !== "VALIDO")
      .sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime());
    res.json(alerts);
  }),
);
