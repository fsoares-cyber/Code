import { useEffect, useState } from "react";
import { api } from "../../api";
import type { Alert, Scenario } from "../../types";

interface Props {
  scenario: Scenario;
}

const alertMeta: Record<Alert["type"], { label: string; cls: string }> = {
  FORA_DO_HORIZONTE: { label: "Compra fora do horizonte", cls: "alert-fora" },
  SUGESTAO_CONSOLIDACAO: { label: "Sugestão de consolidação", cls: "alert-consolidacao" },
  PRECO_DESATUALIZADO: { label: "Preço desatualizado", cls: "alert-preco" },
  FORNECEDOR_IRREGULAR: { label: "Fornecedor irregular", cls: "alert-fornecedor" },
};

export function ScenarioAlertsTab({ scenario }: Props) {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    api.get<Alert[]>(`/scenarios/${scenario.id}/alerts`).then(setAlerts);
  }, [scenario.id]);

  if (alerts.length === 0) {
    return (
      <div className="card">
        <p className="muted mt-0">Nenhum alerta neste cenário.</p>
      </div>
    );
  }

  return (
    <div className="card">
      {alerts.map((a) => {
        const meta = alertMeta[a.type];
        return (
          <div key={a.id} className={`alert-row ${meta.cls}`}>
            <div>
              <strong>{meta.label}</strong>
              {a.component && <span className="muted"> · {a.component.internalCode}</span>}
              <div>{a.message}</div>
              {a.type === "SUGESTAO_CONSOLIDACAO" && a.details && (
                <div className="small muted">
                  Economia consolidando: R$ {Number((a.details as any).economyBRL).toFixed(2)} · Antecipação de caixa: R${" "}
                  {Number((a.details as any).cashAdvanceBRL).toFixed(2)}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
