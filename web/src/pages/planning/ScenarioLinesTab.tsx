import { useEffect, useState } from "react";
import { api } from "../../api";
import type { Bom, ProductionLine, Scenario } from "../../types";
import { formatNumber } from "../../format";

interface Props {
  scenario: Scenario;
  readOnly: boolean;
}

export function ScenarioLinesTab({ scenario, readOnly }: Props) {
  const [lines, setLines] = useState<ProductionLine[]>([]);
  const [boms, setBoms] = useState<Bom[]>([]);
  const [bomId, setBomId] = useState("");
  const [periodId, setPeriodId] = useState(scenario.periods[0]?.id ?? "");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");

  async function load() {
    const [linesData, bomsData] = await Promise.all([
      api.get<ProductionLine[]>(`/scenarios/${scenario.id}/lines`),
      api.get<Bom[]>("/boms"),
    ]);
    setLines(linesData);
    setBoms(bomsData);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await api.post(`/scenarios/${scenario.id}/lines`, { bomId, periodId, quantity: Number(quantity), notes: notes || undefined });
    setBomId("");
    setQuantity("");
    setNotes("");
    load();
  }

  async function remove(lineId: string) {
    await api.delete(`/scenarios/${scenario.id}/lines/${lineId}`);
    load();
  }

  return (
    <div>
      {!readOnly && (
        <div className="card">
          <h3 className="mt-0">Nova linha de fabricação</h3>
          <form className="form-grid" onSubmit={handleSubmit}>
            <div>
              <label>LMC *</label>
              <select required value={bomId} onChange={(e) => setBomId(e.target.value)}>
                <option value="">Selecione...</option>
                {boms.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.productCode} — {b.description}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Período *</label>
              <select required value={periodId} onChange={(e) => setPeriodId(e.target.value)}>
                {scenario.periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Quantidade *</label>
              <input required type="number" step="0.0001" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div>
              <label>Observação</label>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="full">
              <button className="btn btn-primary" type="submit">
                Adicionar linha
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>LMC</th>
              <th>Período</th>
              <th>Quantidade</th>
              <th>Observação</th>
              {!readOnly && <th></th>}
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id}>
                <td>
                  {l.bom.productCode} — {l.bom.description}
                </td>
                <td>{l.period.label}</td>
                <td>{formatNumber(l.quantity)}</td>
                <td>{l.notes ?? "—"}</td>
                {!readOnly && (
                  <td>
                    <button className="btn btn-sm btn-danger" onClick={() => remove(l.id)}>
                      Remover
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {lines.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  Nenhuma linha de fabricação lançada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
