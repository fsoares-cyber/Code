import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { hashPassword, requireAdmin, requireAuth, signToken, verifyPassword } from "../lib/auth";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return res.status(401).json({ error: "E-mail ou senha inválidos" });
    }
    const token = signToken({ sub: user.id, email: user.email, role: user.role });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  }),
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });
    res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
  }),
);

authRouter.get(
  "/users",
  requireAuth,
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    res.json(users);
  }),
);

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres"),
  role: z.enum(["ADMIN", "USER"]).optional(),
});

// só administradores podem criar novas contas — evita autocadastro aberto
// num sistema interno que já guarda dados de fornecedores.
authRouter.post(
  "/users",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const data = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) return res.status(409).json({ error: "Já existe um usuário com este e-mail" });

    const passwordHash = await hashPassword(data.password);
    const user = await prisma.user.create({
      data: { email: data.email, name: data.name, passwordHash, role: data.role ?? "USER" },
    });
    res.status(201).json({ id: user.id, email: user.email, name: user.name, role: user.role });
  }),
);
