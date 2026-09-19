import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../api";
import type { Scenario, ScenarioHorizon } from "../../types";
import { formatDate } from "../../format";

const statusBadge: Record<Scenario["status"], string> = {
  RASCUNHO: "badge-neutral",
  APROVADO: "badge-success",
  COTADO: "badge-warning",
  REVISADO: "badge-warning",
};

export function ScenariosListPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [horizon, setHorizon] = useState<ScenarioHorizon>("TRIMESTRAL");
  const [startDate, setStartDate] = useState("");
  const [fx, setFx] = useState("5.00");
  const navigate = useNavigate();

  async function load() {
    setScenarios(await api.get<Scenario[]>("/scenarios"));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const scenario = await api.post<Scenario>("/scenarios", {
      name,
      horizon,
      startDate,
      exchangeRateUsdBrl: Number(fx),
    });
    navigate(`/cenarios/${scenario.id}`);
  }

  async function duplicate(id: string) {
    const clone = await api.post<Scenario>(`/scenarios/${id}/duplicate`, {});
    navigate(`/cenarios/${clone.id}`);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Cenários de planejamento</h2>
          <p>Cada cenário é um plano nomeado com taxa de câmbio fixa e horizonte próprio.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancelar" : "+ Novo cenário"}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <form className="form-grid" onSubmit={handleSubmit}>
            <div>
              <label>Nome *</label>
              <input required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label>Horizonte *</label>
              <select value={horizon} onChange={(e) => setHorizon(e.target.value as ScenarioHorizon)}>
                <option value="TRIMESTRAL">Trimestral</option>
                <option value="SEMESTRAL">Semestral</option>
                <option value="ANUAL">Anual</option>
              </select>
            </div>
            <div>
              <label>Data de início *</label>
              <input required type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label>Taxa de câmbio USD→BRL *</label>
              <input required type="number" step="0.0001" value={fx} onChange={(e) => setFx(e.target.value)} />
            </div>
            <div className="full">
              <button className="btn btn-primary" type="submit">
                Criar cenário
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Horizonte</th>
              <th>Início</th>
              <th>Câmbio</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {scenarios.map((s) => (
              <tr key={s.id}>
                <td>
                  <Link to={`/cenarios/${s.id}`}>{s.name}</Link>
                </td>
                <td>{s.horizon}</td>
                <td>{formatDate(s.startDate)}</td>
                <td>{s.exchangeRateUsdBrl}</td>
                <td>
                  <span className={`badge ${statusBadge[s.status]}`}>{s.status}</span>
                </td>
                <td>
                  <button className="btn btn-sm" onClick={() => duplicate(s.id)}>
                    Duplicar
                  </button>
                </td>
              </tr>
            ))}
            {scenarios.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  Nenhum cenário criado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
