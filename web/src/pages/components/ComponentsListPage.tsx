import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import type { Component } from "../../types";

const emptyForm = {
  internalCode: "",
  description: "",
  category: "",
  technicalSpec: "",
  usageUnit: "",
  ncm: "",
  critical: false,
};

export function ComponentsListPage() {
  const [components, setComponents] = useState<Component[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    const data = await api.get<Component[]>(`/components?${params.toString()}`);
    setComponents(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await api.post("/components", form);
    setForm(emptyForm);
    setShowForm(false);
    load();
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Componentes</h2>
          <p>Cadastro técnico — preço e fornecedor vivem na relação componente × fornecedor.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancelar" : "+ Novo componente"}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <form className="form-grid" onSubmit={handleSubmit}>
            <div>
              <label>Código interno *</label>
              <input required value={form.internalCode} onChange={(e) => setForm({ ...form, internalCode: e.target.value })} />
            </div>
            <div>
              <label>Descrição *</label>
              <input required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label>Categoria</label>
              <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </div>
            <div>
              <label>Unidade de uso (como aparece no LMC) *</label>
              <input required placeholder="metro, unidade, grama..." value={form.usageUnit} onChange={(e) => setForm({ ...form, usageUnit: e.target.value })} />
            </div>
            <div>
              <label>NCM (se importado)</label>
              <input value={form.ncm} onChange={(e) => setForm({ ...form, ncm: e.target.value })} />
            </div>
            <div>
              <label>
                <input type="checkbox" checked={form.critical} onChange={(e) => setForm({ ...form, critical: e.target.checked })} /> Componente crítico
              </label>
            </div>
            <div className="full">
              <label>Especificação técnica / norma aplicável</label>
              <textarea value={form.technicalSpec} onChange={(e) => setForm({ ...form, technicalSpec: e.target.value })} />
            </div>
            <div className="full">
              <button className="btn btn-primary" type="submit">
                Salvar componente
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card" style={{ display: "flex", gap: 12 }}>
        <input placeholder="Buscar por código ou descrição..." value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} />
        <button className="btn" onClick={load}>
          Filtrar
        </button>
      </div>

      <div className="card">
        {loading ? (
          <p className="muted">Carregando...</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Descrição</th>
                <th>Unidade de uso</th>
                <th>Crítico</th>
                <th>Fornecedores</th>
              </tr>
            </thead>
            <tbody>
              {components.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link to={`/componentes/${c.id}`}>{c.internalCode}</Link>
                  </td>
                  <td>{c.description}</td>
                  <td>{c.usageUnit}</td>
                  <td>{c.critical ? <span className="badge badge-warning">Crítico</span> : "—"}</td>
                  <td>{c.componentSuppliers?.length ?? 0}</td>
                </tr>
              ))}
              {components.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted">
                    Nenhum componente encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
