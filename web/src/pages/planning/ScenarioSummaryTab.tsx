import { useEffect, useState } from "react";
import { api } from "../../api";
import type { Scenario, ScenarioSummary } from "../../types";
import { formatCurrency } from "../../format";

interface Props {
  scenario: Scenario;
}

function CashFlowChart({ data }: { data: ScenarioSummary["byPeriod"] }) {
  const width = 640;
  const height = 220;
  const padding = { top: 16, right: 16, bottom: 32, left: 70 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const max = Math.max(...data.map((d) => d.totalBRL), 1);
  const barWidth = data.length > 0 ? innerWidth / data.length : innerWidth;

  return (
    <svg width={width} height={height} role="img" aria-label="Fluxo de caixa por período">
      <g transform={`translate(${padding.left},${padding.top})`}>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={0} x2={innerWidth} y1={innerHeight * (1 - f)} y2={innerHeight * (1 - f)} stroke="#e5e7eb" />
            <text x={-8} y={innerHeight * (1 - f)} fontSize={10} fill="#6b7280" textAnchor="end" dominantBaseline="middle">
              {formatCurrency(max * f, "BRL")}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const barHeight = (d.totalBRL / max) * innerHeight;
          return (
            <g key={d.periodId} transform={`translate(${i * barWidth},0)`}>
              <rect x={barWidth * 0.15} y={innerHeight - barHeight} width={barWidth * 0.7} height={barHeight} rx={3} fill="#2455c9" />
              <text x={barWidth / 2} y={innerHeight + 16} fontSize={11} fill="#374151" textAnchor="middle">
                {d.label}
              </text>
              <text x={barWidth / 2} y={innerHeight - barHeight - 6} fontSize={10} fill="#1f2530" textAnchor="middle">
                {formatCurrency(d.totalBRL, "BRL")}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}

export function ScenarioSummaryTab({ scenario }: Props) {
  const [summary, setSummary] = useState<ScenarioSummary | null>(null);

  useEffect(() => {
    api.get<ScenarioSummary>(`/scenarios/${scenario.id}/summary`).then(setSummary);
  }, [scenario.id]);

  if (!summary) return <p className="muted">Carregando...</p>;

  return (
    <div>
      <div className="stat-row">
        <div className="stat-tile">
          <div className="label">Total geral</div>
          <div className="value">{formatCurrency(summary.totalBRL, "BRL")}</div>
        </div>
        <div className="stat-tile">
          <div className="label">Exposição em USD</div>
          <div className="value">{formatCurrency(summary.exposureUSD, "USD")}</div>
        </div>
        <div className="stat-tile">
          <div className="label">Taxa usada no cenário</div>
          <div className="value">{summary.exchangeRateUsdBrl.toFixed(4)}</div>
        </div>
      </div>

      <div className="card">
        <h3 className="mt-0">Por período — fluxo de caixa</h3>
        {summary.byPeriod.length > 0 ? <CashFlowChart data={summary.byPeriod} /> : <p className="muted">Sem dados.</p>}
      </div>

      <div className="card">
        <h3 className="mt-0">Por LMC — custo total</h3>
        <table>
          <thead>
            <tr>
              <th>LMC</th>
              <th className="text-right">Total (BRL)</th>
            </tr>
          </thead>
          <tbody>
            {summary.byLmc.map((l) => (
              <tr key={l.lmcCode}>
                <td>{l.lmcCode}</td>
                <td className="text-right">{formatCurrency(l.totalBRL, "BRL")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3 className="mt-0">Por fornecedor — volume no horizonte inteiro</h3>
        <p className="small muted">Única visão que ignora período; serve para negociação.</p>
        <table>
          <thead>
            <tr>
              <th>Fornecedor</th>
              <th className="text-right">Total (BRL)</th>
            </tr>
          </thead>
          <tbody>
            {summary.bySupplier.map((s) => (
              <tr key={s.supplierId}>
                <td>{s.name}</td>
                <td className="text-right">{formatCurrency(s.totalBRL, "BRL")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
