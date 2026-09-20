import { useEffect, useState } from "react";
import { api } from "../../api";
import type { ComparisonEntry, Scenario } from "../../types";
import { formatCurrency, formatNumber } from "../../format";
import { ExportButtons } from "../../components/ExportButtons";

interface Props {
  scenario: Scenario;
}

export function ScenarioComparisonTab({ scenario }: Props) {
  const [entries, setEntries] = useState<ComparisonEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.get<ComparisonEntry[]>(`/scenarios/${scenario.id}/quotations/comparison`).then((data) => {
      setEntries(data);
      setLoaded(true);
    });
  }, [scenario.id]);

  if (!loaded) return <p className="muted">Carregando...</p>;

  if (entries.length === 0) {
    return (
      <div className="card">
        <p className="muted mt-0">
          Nenhum preço de cotação lançado ainda. Registre o retorno na aba "Cotação" para ver o comparativo aqui.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex-between">
        <p className="small muted mt-0">
          Mesmo componente cotado com vários fornecedores, lado a lado. O mais barato por unidade nem sempre é o mais
          barato no total, depois do lote mínimo — por isso o custo total considera o lote mínimo/múltiplo de cada
          fornecedor.
        </p>
        <ExportButtons scenarioId={scenario.id} kind="comparison" />
      </div>
      {entries.map((entry) => (
        <div className="card" key={entry.componentId}>
          <h4 className="mt-0">
            {entry.componentCode} — {entry.description}
          </h4>
          <table>
            <thead>
              <tr>
                <th>Fornecedor</th>
                <th className="text-right">Preço unitário</th>
                <th className="text-right">Prazo</th>
                <th className="text-right">Lote mínimo</th>
                <th className="text-right">Quantidade</th>
                <th className="text-right">Custo total</th>
              </tr>
            </thead>
            <tbody>
              {entry.options.map((o) => (
                <tr key={o.supplierId}>
                  <td>{o.supplierName}</td>
                  <td className="text-right">
                    {formatCurrency(o.unitPrice, o.currency as "BRL" | "USD")}
                    {o.isCheapestUnit && <span className="badge badge-success small"> menor/un.</span>}
                  </td>
                  <td className="text-right">{o.leadTimeDays} dias</td>
                  <td className="text-right">{formatNumber(o.minLotSize)}</td>
                  <td className="text-right">{formatNumber(o.quantity)}</td>
                  <td className="text-right">
                    {formatCurrency(o.totalCostBRL, "BRL")}
                    {o.isCheapestTotal && <span className="badge badge-success small"> menor total</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
