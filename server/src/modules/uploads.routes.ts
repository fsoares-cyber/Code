import { Router } from "express";
import { upload } from "../lib/uploads";

export const uploadsRouter = Router();

// anexo de certificado (A2): guarda o arquivo em disco e devolve a URL para
// o campo fileUrl da certificação. Não há leitura/OCR do conteúdo aqui.
uploadsRouter.post("/", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Nenhum arquivo enviado" });
  }
  res.status(201).json({
    url: `/uploads/${req.file.filename}`,
    originalName: req.file.originalname,
    size: req.file.size,
    mimeType: req.file.mimetype,
  });
});

uploadsRouter.use((err: unknown, _req: any, res: any, _next: any) => {
  if (err instanceof Error) {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: "Erro ao enviar arquivo" });
});
