import { Router } from "express";
import type ExcelJS from "exceljs";
import { asyncHandler } from "../../lib/asyncHandler";
import {
  buildComparisonPdf,
  buildComparisonWorkbook,
  buildPurchasePlanPdf,
  buildPurchasePlanWorkbook,
  buildSummaryPdf,
  buildSummaryWorkbook,
} from "./exports";

export const scenarioExportsRouter = Router({ mergeParams: true });

function sendXlsx(res: import("express").Response, filename: string, buffer: ExcelJS.Buffer) {
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(Buffer.from(buffer));
}

function sendPdf(res: import("express").Response, filename: string, buffer: Buffer) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(buffer);
}

scenarioExportsRouter.get(
  "/purchase-plan.xlsx",
  asyncHandler(async (req, res) => {
    sendXlsx(res, "plano-de-compras.xlsx", await buildPurchasePlanWorkbook(req.params.id));
  }),
);

scenarioExportsRouter.get(
  "/purchase-plan.pdf",
  asyncHandler(async (req, res) => {
    sendPdf(res, "plano-de-compras.pdf", await buildPurchasePlanPdf(req.params.id));
  }),
);

scenarioExportsRouter.get(
  "/summary.xlsx",
  asyncHandler(async (req, res) => {
    sendXlsx(res, "resumo.xlsx", await buildSummaryWorkbook(req.params.id));
  }),
);

scenarioExportsRouter.get(
  "/summary.pdf",
  asyncHandler(async (req, res) => {
    sendPdf(res, "resumo.pdf", await buildSummaryPdf(req.params.id));
  }),
);

scenarioExportsRouter.get(
  "/comparison.xlsx",
  asyncHandler(async (req, res) => {
    sendXlsx(res, "comparativo-cotacao.xlsx", await buildComparisonWorkbook(req.params.id));
  }),
);

scenarioExportsRouter.get(
  "/comparison.pdf",
  asyncHandler(async (req, res) => {
    sendPdf(res, "comparativo-cotacao.pdf", await buildComparisonPdf(req.params.id));
  }),
);
