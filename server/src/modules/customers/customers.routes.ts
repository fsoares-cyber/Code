import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../lib/asyncHandler";
import { isValidDocument, onlyDigits } from "../../lib/documentValidation";

export const customersRouter = Router();

const customerBaseSchema = z.object({
  customerType: z.enum(["HOSPITAL", "MEDICO", "FORNECEDOR", "REPARO", "OUTROS"]),
  personType: z.enum(["FISICA", "JURIDICA"]),
  document: z.string().min(1, "Informe o CPF/CNPJ"),
  crm: z.string().optional().nullable(),
  name: z.string().min(1, "Informe o nome"),
  nickname: z.string().optional().nullable(),
  invoiceName: z.string().optional().nullable(),
  active: z.boolean().optional(),
});

function checkCrossFieldRules(
  data: { customerType: string; personType: "FISICA" | "JURIDICA"; document: string; crm?: string | null },
  ctx: z.RefinementCtx,
) {
  if (!isValidDocument(data.document, data.personType)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["document"],
      message: data.personType === "FISICA" ? "CPF inválido" : "CNPJ inválido",
    });
  }
  if (data.customerType === "MEDICO" && data.personType === "FISICA" && !data.crm?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["crm"],
      message: "CRM é obrigatório para médico pessoa física",
    });
  }
}

const customerCreateSchema = customerBaseSchema.superRefine(checkCrossFieldRules);

customersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { q, customerType, personType, active } = req.query as Record<string, string | undefined>;
    const customers = await prisma.customer.findMany({
      where: {
        customerType: customerType ? (customerType as any) : undefined,
        personType: personType ? (personType as any) : undefined,
        active: active !== undefined ? active === "true" : undefined,
        OR: q
          ? [
              { name: { contains: q, mode: "insensitive" } },
              { nickname: { contains: q, mode: "insensitive" } },
              { document: { contains: onlyDigits(q), mode: "insensitive" } },
            ]
          : undefined,
      },
      orderBy: { name: "asc" },
    });
    res.json(customers);
  }),
);

customersRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const customer = await prisma.customer.findUnique({ where: { id: req.params.id } });
    if (!customer) return res.status(404).json({ error: "Cliente não encontrado" });
    res.json(customer);
  }),
);

customersRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = customerCreateSchema.parse(req.body);
    const document = onlyDigits(data.document);

    const existing = await prisma.customer.findUnique({ where: { document } });
    if (existing) return res.status(409).json({ error: "Já existe um cliente com este CPF/CNPJ" });

    const crm = data.customerType === "MEDICO" && data.personType === "FISICA" ? data.crm?.trim() : null;

    const customer = await prisma.customer.create({
      data: { ...data, document, crm },
    });
    res.status(201).json(customer);
  }),
);

customersRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = customerBaseSchema.partial().parse(req.body);
    const existing = await prisma.customer.findUniqueOrThrow({ where: { id: req.params.id } });

    const personType = data.personType ?? existing.personType;
    const customerType = data.customerType ?? existing.customerType;
    const document = data.document ? onlyDigits(data.document) : existing.document;
    const crm = data.crm !== undefined ? data.crm : existing.crm;

    if (!isValidDocument(document, personType)) {
      return res.status(400).json({ error: personType === "FISICA" ? "CPF inválido" : "CNPJ inválido" });
    }
    if (customerType === "MEDICO" && personType === "FISICA" && !crm?.trim()) {
      return res.status(400).json({ error: "CRM é obrigatório para médico pessoa física" });
    }
    if (data.document) {
      const duplicate = await prisma.customer.findUnique({ where: { document } });
      if (duplicate && duplicate.id !== req.params.id) {
        return res.status(409).json({ error: "Já existe um cliente com este CPF/CNPJ" });
      }
    }

    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: {
        ...data,
        document,
        crm: customerType === "MEDICO" && personType === "FISICA" ? crm?.trim() : null,
      },
    });
    res.json(customer);
  }),
);

customersRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.customer.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);
