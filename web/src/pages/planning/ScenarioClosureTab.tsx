import { useEffect, useState } from "react";
import { api } from "../../api";
import type { ClosureResult, Scenario } from "../../types";
import { formatCurrency } from "../../format";

interface Props {
  scenario: Scenario;
}

export function ScenarioClosureTab({ scenario }: Props) {
  const [closure, setClosure] = useState<ClosureResult | null>(null);

  useEffect(() => {
    api.get<ClosureResult>(`/scenarios/${scenario.id}/closure`).then(setClosure);
  }, [scenario.id]);

  if (!closure) return <p className="muted">Carregando...</p>;

  if (closure.rows.length === 0) {
    return (
      <div className="card">
        <p className="muted mt-0">
          Nenhum preço cotado lançado ainda. Assim que os retornos forem registrados na aba "Cotação", o fechamento
          planejado × cotado aparece aqui.
        </p>
      </div>
    );
  }

  const deviationPct = closure.totalPlanned !== 0 ? (closure.totalDeviation / closure.totalPlanned) * 100 : 0;

  return (
    <div>
      <div className="stat-row">
        <div className="stat-tile">
          <div className="label">Planejado</div>
          <div className="value">{formatCurrency(closure.totalPlanned, "BRL")}</div>
        </div>
        <div className="stat-tile">
          <div className="label">Cotado</div>
          <div className="value">{formatCurrency(closure.totalQuoted, "BRL")}</div>
        </div>
        <div className="stat-tile">
          <div className="label">Desvio total</div>
          <div className="value" style={{ color: closure.totalDeviation > 0 ? "var(--danger)" : "var(--success)" }}>
            {formatCurrency(closure.totalDeviation, "BRL")} ({deviationPct.toFixed(1)}%)
          </div>
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Componente</th>
              <th>Fornecedor</th>
              <th className="text-right">Planejado</th>
              <th className="text-right">Cotado</th>
              <th className="text-right">Desvio</th>
            </tr>
          </thead>
          <tbody>
            {closure.rows.map((row, i) => (
              <tr key={i}>
                <td>{row.componentCode}</td>
                <td>{row.supplier}</td>
                <td className="text-right">{formatCurrency(row.planned, "BRL")}</td>
                <td className="text-right">{formatCurrency(row.quoted, "BRL")}</td>
                <td className="text-right" style={{ color: row.deviation > 0 ? "var(--danger)" : "var(--success)" }}>
                  {formatCurrency(row.deviation, "BRL")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
