import cors from "cors";
import express from "express";
import { ZodError } from "zod";
import { suppliersRouter } from "./modules/suppliers/suppliers.routes";
import { componentsRouter } from "./modules/suppliers/components.routes";
import { bomRouter } from "./modules/planning/bom.routes";
import { scenariosRouter } from "./modules/planning/scenarios.routes";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

// Módulo A — cadastros de suprimentos
app.use("/api/suppliers", suppliersRouter);
app.use("/api/components", componentsRouter);

// pré-requisito de dados — LMC (Lista de Materiais/Componentes)
app.use("/api/boms", bomRouter);

// Módulo B — centro de planejamento e custos
app.use("/api/scenarios", scenariosRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "Dados inválidos", issues: err.issues });
  }
  console.error(err);
  const message = err instanceof Error ? err.message : "Erro interno";
  res.status(500).json({ error: message });
});

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => {
  console.log(`API rodando em http://localhost:${port}`);
});
