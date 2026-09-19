import { useEffect, useState } from "react";
import { api } from "../../api";
import type { Bom, Component } from "../../types";

interface ItemRow {
  componentId: string;
  qtyPerUnit: string;
  lossPercent: string;
}

const emptyItem: ItemRow = { componentId: "", qtyPerUnit: "", lossPercent: "0" };

export function BomListPage() {
  const [boms, setBoms] = useState<Bom[]>([]);
  const [components, setComponents] = useState<Component[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [productCode, setProductCode] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<ItemRow[]>([{ ...emptyItem }]);

  async function load() {
    const [bomsData, componentsData] = await Promise.all([
      api.get<Bom[]>("/boms"),
      api.get<Component[]>("/components"),
    ]);
    setBoms(bomsData);
    setComponents(componentsData);
  }

  useEffect(() => {
    load();
  }, []);

  function updateItem(i: number, patch: Partial<ItemRow>) {
    setItems((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await api.post("/boms", {
      productCode,
      description,
      items: items.map((i) => ({
        componentId: i.componentId,
        qtyPerUnit: Number(i.qtyPerUnit),
        lossPercent: Number(i.lossPercent) / 100,
      })),
    });
    setProductCode("");
    setDescription("");
    setItems([{ ...emptyItem }]);
    setShowForm(false);
    load();
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>LMC — Lista de Materiais/Componentes</h2>
          <p>Pré-requisito do planejamento: cada linha de fabricação referencia uma LMC por revisão.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancelar" : "+ Nova LMC"}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div>
                <label>Código do produto *</label>
                <input required value={productCode} onChange={(e) => setProductCode(e.target.value)} />
              </div>
              <div>
                <label>Descrição *</label>
                <input required value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
            </div>

            <h4>Itens</h4>
            {items.map((item, i) => (
              <div key={i} className="form-grid" style={{ marginBottom: 8 }}>
                <div>
                  <label>Componente *</label>
                  <select required value={item.componentId} onChange={(e) => updateItem(i, { componentId: e.target.value })}>
                    <option value="">Selecione...</option>
                    {components.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.internalCode} — {c.description}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Qtd. por unidade *</label>
                  <input required type="number" step="0.000001" value={item.qtyPerUnit} onChange={(e) => updateItem(i, { qtyPerUnit: e.target.value })} />
                </div>
                <div>
                  <label>Perda (%)</label>
                  <input type="number" step="0.01" value={item.lossPercent} onChange={(e) => updateItem(i, { lossPercent: e.target.value })} />
                </div>
                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  <button type="button" className="btn btn-sm btn-danger" onClick={() => setItems((rows) => rows.filter((_, idx) => idx !== i))}>
                    Remover
                  </button>
                </div>
              </div>
            ))}
            <button type="button" className="btn btn-sm" onClick={() => setItems((rows) => [...rows, { ...emptyItem }])}>
              + Item
            </button>
            <div style={{ marginTop: 12 }}>
              <button className="btn btn-primary" type="submit">
                Salvar LMC
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Descrição</th>
              <th>Revisão atual</th>
              <th>Itens</th>
            </tr>
          </thead>
          <tbody>
            {boms.map((b) => {
              const current = b.revisions[0];
              return (
                <tr key={b.id}>
                  <td>{b.productCode}</td>
                  <td>{b.description}</td>
                  <td>{current ? `Rev. ${current.revisionNumber}` : "—"}</td>
                  <td>{current?.items.length ?? 0}</td>
                </tr>
              );
            })}
            {boms.length === 0 && (
              <tr>
                <td colSpan={4} className="muted">
                  Nenhuma LMC cadastrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
