import { useEffect, useState } from "react";
import { api } from "../../api";
import type { PurchasePlanItem, Scenario } from "../../types";
import { formatCurrency, formatDate, formatNumber } from "../../format";
import { SidePanel } from "../../components/SidePanel";
import { AddSupplierToComponentForm } from "../../components/AddSupplierToComponentForm";

interface Props {
  scenario: Scenario;
}

export function ScenarioPurchasePlanTab({ scenario }: Props) {
  const [items, setItems] = useState<PurchasePlanItem[]>([]);
  const [panelComponent, setPanelComponent] = useState<{ id: string; label: string } | null>(null);

  async function load() {
    setItems(await api.get<PurchasePlanItem[]>(`/scenarios/${scenario.id}/purchase-plan`));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario.id]);

  return (
    <div>
      <div className="card">
        <p className="small muted mt-0">
          Uma linha por componente por período, ordenado por data limite. Itens com preço vencido ou fornecedor
          irregular são destacados — use "Cadastro" para adicionar um fornecedor alternativo sem sair desta tela.
        </p>
        <table>
          <thead>
            <tr>
              <th>Data limite</th>
              <th>Componente</th>
              <th>Fornecedor</th>
              <th>Código dele</th>
              <th>Qtd. (unid. venda)</th>
              <th>Custo</th>
              <th>Moeda original</th>
              <th>LMC de origem</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} style={item.outOfHorizon ? { background: "#fdecea" } : undefined}>
                <td>
                  {formatDate(item.deadlineDate)}
                  {item.outOfHorizon && <div className="badge badge-danger small">Fora do horizonte</div>}
                </td>
                <td>
                  {item.component.internalCode}
                  <div className="muted small">{item.component.description}</div>
                </td>
                <td>{item.componentSupplier.supplier.razaoSocial}</td>
                <td>{item.componentSupplier.supplierPartNumber}</td>
                <td>
                  {formatNumber(item.quantitySalesUnit)} {item.componentSupplier.salesUnit}
                </td>
                <td>{formatCurrency(item.costBRL, "BRL")}</td>
                <td>
                  {item.currency !== "BRL" ? formatCurrency(Number(item.quantitySalesUnit) * Number(item.unitCost), "USD") : "—"}
                </td>
                <td>{item.sourceLmcCodes.join(", ")}</td>
                <td>
                  <button
                    className="btn btn-sm"
                    onClick={() => setPanelComponent({ id: item.componentId, label: item.component.internalCode })}
                  >
                    Cadastro
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={9} className="muted">
                  Nenhum item calculado ainda. Lance linhas de fabricação e clique em "Calcular".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {panelComponent && (
        <SidePanel title={`Adicionar fornecedor a ${panelComponent.label}`} onClose={() => setPanelComponent(null)}>
          <AddSupplierToComponentForm
            componentId={panelComponent.id}
            onAdded={() => {
              setPanelComponent(null);
            }}
          />
        </SidePanel>
      )}
    </div>
  );
}
