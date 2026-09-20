interface Props {
  scenarioId: string;
  kind: "purchase-plan" | "summary" | "comparison";
}

// Exportar plano de compras, resumo e comparativo em PDF e Excel.
export function ExportButtons({ scenarioId, kind }: Props) {
  const base = `/api/scenarios/${scenarioId}/exports/${kind}`;
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <a className="btn btn-sm" href={`${base}.xlsx`}>
        Exportar Excel
      </a>
      <a className="btn btn-sm" href={`${base}.pdf`}>
        Exportar PDF
      </a>
    </div>
  );
}
