import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { prisma } from "../../lib/prisma";
import { formatCurrency, formatDate, formatNumber } from "../../lib/format";
import { computeQuotationComparison, computeScenarioSummary, getPurchasePlanItems } from "./queries";

// --- Excel -------------------------------------------------------------

interface SheetSpec {
  name: string;
  columns: { header: string; key: string; width?: number }[];
  rows: Record<string, unknown>[];
}

async function buildWorkbook(sheets: SheetSpec[]): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sistema de Planejamento e Suprimentos";
  workbook.created = new Date();

  for (const sheet of sheets) {
    const ws = workbook.addWorksheet(sheet.name);
    ws.columns = sheet.columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 22 }));
    ws.getRow(1).font = { bold: true };
    ws.addRows(sheet.rows);
  }

  return workbook.xlsx.writeBuffer();
}

export async function buildPurchasePlanWorkbook(scenarioId: string) {
  const items = await getPurchasePlanItems(scenarioId);
  return buildWorkbook([
    {
      name: "Plano de compras",
      columns: [
        { header: "Data limite", key: "deadline", width: 14 },
        { header: "Componente", key: "componentCode", width: 14 },
        { header: "Descrição", key: "description", width: 28 },
        { header: "Fornecedor", key: "supplier", width: 28 },
        { header: "Código do fornecedor", key: "supplierPartNumber", width: 20 },
        { header: "Quantidade", key: "quantity", width: 14 },
        { header: "Unidade de venda", key: "salesUnit", width: 16 },
        { header: "Custo (BRL)", key: "costBRL", width: 16 },
        { header: "Moeda original", key: "originalCost", width: 18 },
        { header: "Fora do horizonte", key: "outOfHorizon", width: 16 },
        { header: "LMC de origem", key: "lmc", width: 20 },
      ],
      rows: items.map((i) => ({
        deadline: formatDate(i.deadlineDate),
        componentCode: i.component.internalCode,
        description: i.component.description,
        supplier: i.componentSupplier.supplier.razaoSocial,
        supplierPartNumber: i.componentSupplier.supplierPartNumber,
        quantity: formatNumber(Number(i.quantitySalesUnit)),
        salesUnit: i.componentSupplier.salesUnit,
        costBRL: formatCurrency(Number(i.costBRL), "BRL"),
        originalCost:
          i.currency !== "BRL" ? formatCurrency(Number(i.quantitySalesUnit) * Number(i.unitCost), "USD") : "—",
        outOfHorizon: i.outOfHorizon ? "Sim" : "Não",
        lmc: i.sourceLmcCodes.join(", "),
      })),
    },
  ]);
}

export async function buildSummaryWorkbook(scenarioId: string) {
  const summary = await computeScenarioSummary(scenarioId);
  return buildWorkbook([
    {
      name: "Por período",
      columns: [
        { header: "Período", key: "label", width: 14 },
        { header: "Total (BRL)", key: "totalBRL", width: 18 },
      ],
      rows: summary.byPeriod.map((p) => ({ label: p.label, totalBRL: formatCurrency(p.totalBRL, "BRL") })),
    },
    {
      name: "Por LMC",
      columns: [
        { header: "LMC", key: "lmcCode", width: 18 },
        { header: "Total (BRL)", key: "totalBRL", width: 18 },
      ],
      rows: summary.byLmc.map((l) => ({ lmcCode: l.lmcCode, totalBRL: formatCurrency(l.totalBRL, "BRL") })),
    },
    {
      name: "Por fornecedor",
      columns: [
        { header: "Fornecedor", key: "name", width: 30 },
        { header: "Total (BRL)", key: "totalBRL", width: 18 },
      ],
      rows: summary.bySupplier.map((s) => ({ name: s.name, totalBRL: formatCurrency(s.totalBRL, "BRL") })),
    },
    {
      name: "Total geral",
      columns: [
        { header: "Indicador", key: "label", width: 26 },
        { header: "Valor", key: "value", width: 22 },
      ],
      rows: [
        { label: "Total geral (BRL)", value: formatCurrency(summary.totalBRL, "BRL") },
        { label: "Exposição em USD", value: formatCurrency(summary.exposureUSD, "USD") },
        { label: "Taxa de câmbio usada (USD→BRL)", value: summary.exchangeRateUsdBrl.toFixed(4) },
      ],
    },
  ]);
}

export async function buildComparisonWorkbook(scenarioId: string) {
  const entries = await computeQuotationComparison(scenarioId);
  const rows = entries.flatMap((entry) =>
    entry.options.map((o) => ({
      componentCode: entry.componentCode,
      description: entry.description,
      supplier: o.supplierName,
      unitPrice: formatCurrency(o.unitPrice, o.currency as "BRL" | "USD"),
      leadTimeDays: `${o.leadTimeDays} dias`,
      minLotSize: formatNumber(o.minLotSize),
      quantity: formatNumber(o.quantity),
      totalCostBRL: formatCurrency(o.totalCostBRL, "BRL"),
      cheapest: o.isCheapestTotal ? "Sim" : "Não",
    })),
  );
  return buildWorkbook([
    {
      name: "Comparativo de cotação",
      columns: [
        { header: "Componente", key: "componentCode", width: 14 },
        { header: "Descrição", key: "description", width: 26 },
        { header: "Fornecedor", key: "supplier", width: 28 },
        { header: "Preço unitário", key: "unitPrice", width: 16 },
        { header: "Prazo", key: "leadTimeDays", width: 12 },
        { header: "Lote mínimo", key: "minLotSize", width: 14 },
        { header: "Quantidade", key: "quantity", width: 14 },
        { header: "Custo total (BRL)", key: "totalCostBRL", width: 18 },
        { header: "Menor custo total", key: "cheapest", width: 16 },
      ],
      rows,
    },
  ]);
}

// --- PDF -----------------------------------------------------------------

const PAGE_MARGIN = 40;
const ROW_HEIGHT = 20;

function drawTable(
  doc: PDFKit.PDFDocument,
  { columns, rows }: { columns: { header: string; width: number }[]; rows: string[][] },
) {
  const pageBottom = doc.page.height - PAGE_MARGIN;
  const startX = PAGE_MARGIN;

  function drawHeader() {
    const headerY = doc.y;
    let x = startX;
    doc.font("Helvetica-Bold").fontSize(9);
    for (const col of columns) {
      doc.text(col.header, x, headerY, { width: col.width, continued: false });
      x += col.width;
    }
    doc.y = headerY;
    doc.moveDown(0.6);
    doc
      .moveTo(startX, doc.y)
      .lineTo(startX + columns.reduce((s, c) => s + c.width, 0), doc.y)
      .strokeColor("#cccccc")
      .stroke();
    doc.moveDown(0.3);
    doc.font("Helvetica").fontSize(8.5);
  }

  drawHeader();

  for (const row of rows) {
    if (doc.y + ROW_HEIGHT > pageBottom) {
      doc.addPage();
      doc.y = PAGE_MARGIN;
      drawHeader();
    }
    const rowY = doc.y;
    let x = startX;
    for (let i = 0; i < columns.length; i++) {
      doc.text(row[i] ?? "", x, rowY, { width: columns[i].width });
      x += columns[i].width;
    }
    doc.y = rowY;
    doc.moveDown(1.1);
  }

  // deixa o cursor pronto para o próximo elemento (título, tabela) começar
  // na margem esquerda, em vez de na posição da última célula escrita.
  doc.x = startX;
}

function newPdfDoc(title: string): PDFKit.PDFDocument {
  const doc = new PDFDocument({ margin: PAGE_MARGIN, size: "A4", layout: "landscape" });
  doc.font("Helvetica-Bold").fontSize(16).text(title);
  doc.moveDown(0.3);
  doc.font("Helvetica").fontSize(9).fillColor("#666666").text(`Gerado em ${formatDate(new Date())}`);
  doc.fillColor("#000000");
  doc.moveDown(1);
  return doc;
}

async function toBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));
  doc.end();
  return done;
}

export async function buildPurchasePlanPdf(scenarioId: string): Promise<Buffer> {
  const scenario = await prisma.scenario.findUniqueOrThrow({ where: { id: scenarioId } });
  const items = await getPurchasePlanItems(scenarioId);
  const doc = newPdfDoc(`Plano de compras — ${scenario.name}`);

  drawTable(doc, {
    columns: [
      { header: "Data limite", width: 70 },
      { header: "Componente", width: 70 },
      { header: "Descrição", width: 130 },
      { header: "Fornecedor", width: 150 },
      { header: "Código forn.", width: 90 },
      { header: "Quantidade", width: 80 },
      { header: "Custo (BRL)", width: 80 },
      { header: "Fora horiz.", width: 60 },
    ],
    rows: items.map((i) => [
      formatDate(i.deadlineDate),
      i.component.internalCode,
      i.component.description,
      i.componentSupplier.supplier.razaoSocial,
      i.componentSupplier.supplierPartNumber,
      `${formatNumber(Number(i.quantitySalesUnit))} ${i.componentSupplier.salesUnit}`,
      formatCurrency(Number(i.costBRL), "BRL"),
      i.outOfHorizon ? "Sim" : "Não",
    ]),
  });

  return toBuffer(doc);
}

export async function buildSummaryPdf(scenarioId: string): Promise<Buffer> {
  const scenario = await prisma.scenario.findUniqueOrThrow({ where: { id: scenarioId } });
  const summary = await computeScenarioSummary(scenarioId);
  const doc = newPdfDoc(`Resumo — ${scenario.name}`);

  doc.font("Helvetica-Bold").fontSize(12).text("Por período");
  doc.moveDown(0.4);
  drawTable(doc, {
    columns: [
      { header: "Período", width: 150 },
      { header: "Total (BRL)", width: 150 },
    ],
    rows: summary.byPeriod.map((p) => [p.label, formatCurrency(p.totalBRL, "BRL")]),
  });

  doc.moveDown(1.2);
  doc.font("Helvetica-Bold").fontSize(12).text("Por LMC");
  doc.moveDown(0.4);
  drawTable(doc, {
    columns: [
      { header: "LMC", width: 150 },
      { header: "Total (BRL)", width: 150 },
    ],
    rows: summary.byLmc.map((l) => [l.lmcCode, formatCurrency(l.totalBRL, "BRL")]),
  });

  doc.moveDown(1.2);
  doc.font("Helvetica-Bold").fontSize(12).text("Por fornecedor");
  doc.moveDown(0.4);
  drawTable(doc, {
    columns: [
      { header: "Fornecedor", width: 250 },
      { header: "Total (BRL)", width: 150 },
    ],
    rows: summary.bySupplier.map((s) => [s.name, formatCurrency(s.totalBRL, "BRL")]),
  });

  doc.moveDown(1.2);
  doc.font("Helvetica-Bold").fontSize(12).text("Total geral");
  doc.moveDown(0.4);
  drawTable(doc, {
    columns: [
      { header: "Indicador", width: 250 },
      { header: "Valor", width: 200 },
    ],
    rows: [
      ["Total geral (BRL)", formatCurrency(summary.totalBRL, "BRL")],
      ["Exposição em USD", formatCurrency(summary.exposureUSD, "USD")],
      ["Taxa usada (USD para BRL)", summary.exchangeRateUsdBrl.toFixed(4)],
    ],
  });

  return toBuffer(doc);
}

export async function buildComparisonPdf(scenarioId: string): Promise<Buffer> {
  const scenario = await prisma.scenario.findUniqueOrThrow({ where: { id: scenarioId } });
  const entries = await computeQuotationComparison(scenarioId);
  const doc = newPdfDoc(`Comparativo de cotação — ${scenario.name}`);

  if (entries.length === 0) {
    doc.font("Helvetica").fontSize(11).text("Nenhum preço de cotação lançado ainda.");
    return toBuffer(doc);
  }

  for (const entry of entries) {
    doc.font("Helvetica-Bold").fontSize(12).text(`${entry.componentCode} — ${entry.description}`);
    doc.moveDown(0.4);
    drawTable(doc, {
      columns: [
        { header: "Fornecedor", width: 150 },
        { header: "Preço un.", width: 80 },
        { header: "Prazo", width: 60 },
        { header: "Lote mín.", width: 70 },
        { header: "Quantidade", width: 80 },
        { header: "Custo total", width: 90 },
        { header: "Menor total", width: 70 },
      ],
      rows: entry.options.map((o) => [
        o.supplierName,
        formatCurrency(o.unitPrice, o.currency as "BRL" | "USD"),
        `${o.leadTimeDays}d`,
        formatNumber(o.minLotSize),
        formatNumber(o.quantity),
        formatCurrency(o.totalCostBRL, "BRL"),
        o.isCheapestTotal ? "Sim" : "Não",
      ]),
    });
    doc.moveDown(1.2);
  }

  return toBuffer(doc);
}
