import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import type { Incoterm, PaymentTerm, Supplier, SupplierOrigin } from "../../types";
import { QualificationBadge, SupplierStatusBadge } from "../../components/Badges";

const emptyForm = {
  razaoSocial: "",
  nomeFantasia: "",
  taxId: "",
  origin: "NACIONAL" as SupplierOrigin,
  country: "Brasil",
  address: "",
  currency: "BRL",
  paymentTerm: "DIAS_30" as PaymentTerm,
  incoterm: "" as Incoterm | "",
  avgLeadTimeDays: "",
};

export function SuppliersListPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [originFilter, setOriginFilter] = useState("");
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (originFilter) params.set("origin", originFilter);
    if (q) params.set("q", q);
    const data = await api.get<Supplier[]>(`/suppliers?${params.toString()}`);
    setSuppliers(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originFilter]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await api.post("/suppliers", {
      ...form,
      nomeFantasia: form.nomeFantasia || undefined,
      address: form.address || undefined,
      incoterm: form.incoterm || undefined,
      avgLeadTimeDays: form.avgLeadTimeDays ? Number(form.avgLeadTimeDays) : undefined,
    });
    setForm(emptyForm);
    setShowForm(false);
    load();
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Fornecedores</h2>
          <p>Identificação, contatos e condições comerciais padrão.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancelar" : "+ Novo fornecedor"}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <form className="form-grid" onSubmit={handleSubmit}>
            <div>
              <label>Razão social *</label>
              <input required value={form.razaoSocial} onChange={(e) => setForm({ ...form, razaoSocial: e.target.value })} />
            </div>
            <div>
              <label>Nome fantasia</label>
              <input value={form.nomeFantasia} onChange={(e) => setForm({ ...form, nomeFantasia: e.target.value })} />
            </div>
            <div>
              <label>CNPJ / Tax ID *</label>
              <input required value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} />
            </div>
            <div>
              <label>Origem *</label>
              <select value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value as SupplierOrigin })}>
                <option value="NACIONAL">Nacional</option>
                <option value="IMPORTADO">Importado</option>
              </select>
            </div>
            <div>
              <label>País *</label>
              <input required value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </div>
            <div>
              <label>Endereço</label>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div>
              <label>Moeda</label>
              <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                <option value="BRL">BRL</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div>
              <label>Condição de pagamento</label>
              <select value={form.paymentTerm} onChange={(e) => setForm({ ...form, paymentTerm: e.target.value as PaymentTerm })}>
                <option value="ANTECIPADO">Antecipado</option>
                <option value="DIAS_30">30 dias</option>
                <option value="DIAS_30_60">30/60 dias</option>
                <option value="DIAS_30_60_90">30/60/90 dias</option>
              </select>
            </div>
            <div>
              <label>Incoterm</label>
              <select value={form.incoterm} onChange={(e) => setForm({ ...form, incoterm: e.target.value as Incoterm })}>
                <option value="">—</option>
                {["EXW", "FCA", "FOB", "CFR", "CIF", "DAP", "DDP"].map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Prazo médio de entrega (dias)</label>
              <input type="number" value={form.avgLeadTimeDays} onChange={(e) => setForm({ ...form, avgLeadTimeDays: e.target.value })} />
            </div>
            <div className="full">
              <button className="btn btn-primary" type="submit">
                Salvar fornecedor
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card" style={{ display: "flex", gap: 12 }}>
        <input placeholder="Buscar por nome ou CNPJ..." value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} />
        <select value={originFilter} onChange={(e) => setOriginFilter(e.target.value)}>
          <option value="">Todas as origens</option>
          <option value="NACIONAL">Nacional</option>
          <option value="IMPORTADO">Importado</option>
        </select>
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
                <th>Razão social</th>
                <th>Origem</th>
                <th>Status</th>
                <th>Qualificação</th>
                <th>Regularidade</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Link to={`/fornecedores/${s.id}`}>{s.razaoSocial}</Link>
                    {s.nomeFantasia && <div className="muted small">{s.nomeFantasia}</div>}
                  </td>
                  <td>{s.origin === "NACIONAL" ? "Nacional" : "Importado"}</td>
                  <td>
                    <SupplierStatusBadge status={s.status} />
                  </td>
                  <td>
                    <QualificationBadge status={s.qualificationStatus} />
                  </td>
                  <td>
                    {s.isRegular ? (
                      <span className="badge badge-success">Regular</span>
                    ) : (
                      <span className="badge badge-danger">Irregular</span>
                    )}
                  </td>
                </tr>
              ))}
              {suppliers.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted">
                    Nenhum fornecedor encontrado.
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
