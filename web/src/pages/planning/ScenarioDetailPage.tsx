import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../api";
import type { Scenario } from "../../types";
import { formatDate } from "../../format";
import { ScenarioLinesTab } from "./ScenarioLinesTab";
import { ScenarioPurchasePlanTab } from "./ScenarioPurchasePlanTab";
import { ScenarioSummaryTab } from "./ScenarioSummaryTab";
import { ScenarioAlertsTab } from "./ScenarioAlertsTab";
import { ScenarioQuotationsTab } from "./ScenarioQuotationsTab";
import { ScenarioComparisonTab } from "./ScenarioComparisonTab";
import { ScenarioClosureTab } from "./ScenarioClosureTab";

type Tab = "linhas" | "plano" | "resumo" | "alertas" | "cotacao" | "comparativo" | "fechamento";

const statusLabel: Record<Scenario["status"], string> = {
  RASCUNHO: "Rascunho",
  APROVADO: "Aprovado",
  COTADO: "Cotado",
  REVISADO: "Revisado",
};

export function ScenarioDetailPage() {
  const { id } = useParams();
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [tab, setTab] = useState<Tab>("linhas");
  const [calculating, setCalculating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    if (!id) return;
    const data = await api.get<Scenario>(`/scenarios/${id}`);
    setScenario(data);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function calculate() {
    if (!id) return;
    setCalculating(true);
    const result = await api.post<{ purchasePlanItemsCount: number; alertsCount: number }>(`/scenarios/${id}/calculate`);
    setCalculating(false);
    setMessage(`Cálculo concluído: ${result.purchasePlanItemsCount} itens no plano, ${result.alertsCount} alerta(s).`);
    setTab("plano");
  }

  async function approve() {
    if (!id) return;
    await api.post(`/scenarios/${id}/approve`);
    setMessage("Cenário aprovado — preços, fornecedores e revisões de LMC foram congelados.");
    load();
  }

  if (!scenario) return <p className="muted">Carregando...</p>;

  const readOnly = scenario.status !== "RASCUNHO";

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>{scenario.name}</h2>
          <p>
            {scenario.horizon} · início em {formatDate(scenario.startDate)} · câmbio USD→BRL {scenario.exchangeRateUsdBrl} ·{" "}
            <span className="badge badge-neutral">{statusLabel[scenario.status]}</span>
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {scenario.status === "RASCUNHO" && (
            <button className="btn" onClick={calculate} disabled={calculating}>
              {calculating ? "Calculando..." : "Calcular"}
            </button>
          )}
          {scenario.status === "RASCUNHO" && (
            <button className="btn btn-primary" onClick={approve}>
              Aprovar cenário
            </button>
          )}
        </div>
      </div>

      {message && <div className="card small">{message}</div>}

      <div className="tabs">
        <button className={tab === "linhas" ? "active" : ""} onClick={() => setTab("linhas")}>
          Linhas de fabricação
        </button>
        <button className={tab === "plano" ? "active" : ""} onClick={() => setTab("plano")}>
          Plano de compras
        </button>
        <button className={tab === "resumo" ? "active" : ""} onClick={() => setTab("resumo")}>
          Resumo
        </button>
        <button className={tab === "alertas" ? "active" : ""} onClick={() => setTab("alertas")}>
          Alertas
        </button>
        <button className={tab === "cotacao" ? "active" : ""} onClick={() => setTab("cotacao")}>
          Cotação
        </button>
        <button className={tab === "comparativo" ? "active" : ""} onClick={() => setTab("comparativo")}>
          Comparativo
        </button>
        <button className={tab === "fechamento" ? "active" : ""} onClick={() => setTab("fechamento")}>
          Fechamento
        </button>
      </div>

      {tab === "linhas" && <ScenarioLinesTab scenario={scenario} readOnly={readOnly} />}
      {tab === "plano" && <ScenarioPurchasePlanTab scenario={scenario} />}
      {tab === "resumo" && <ScenarioSummaryTab scenario={scenario} />}
      {tab === "alertas" && <ScenarioAlertsTab scenario={scenario} />}
      {tab === "cotacao" && <ScenarioQuotationsTab scenario={scenario} />}
      {tab === "comparativo" && <ScenarioComparisonTab scenario={scenario} />}
      {tab === "fechamento" && <ScenarioClosureTab scenario={scenario} />}
    </div>
  );
}
