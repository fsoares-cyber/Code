import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import type { Customer, CustomerType } from "../../types";
import { formatDocument } from "../../lib/documentValidation";
import { CustomerForm } from "./CustomerForm";

const customerTypeLabel: Record<CustomerType, string> = {
  HOSPITAL: "Hospital",
  MEDICO: "Médico",
  FORNECEDOR: "Fornecedor",
  REPARO: "Empresa de Reparo",
  OUTROS: "Outros",
};

export function CustomersListPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [q, setQ] = useState("");
  const [customerType, setCustomerType] = useState("");

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (customerType) params.set("customerType", customerType);
    const data = await api.get<Customer[]>(`/customers?${params.toString()}`);
    setCustomers(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerType]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Clientes</h2>
          <p>Cadastro de clientes — Hospital, Médico, Fornecedor, Empresa de Reparo ou Outros.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancelar" : "+ Novo cliente"}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <CustomerForm
            onSaved={() => {
              // deixa o formulário aberto para mostrar a confirmação e
              // permitir cadastrar o próximo cliente em seguida; a lista
              // já atualiza em segundo plano
              load();
            }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      <div className="card" style={{ display: "flex", gap: 12 }}>
        <input placeholder="Buscar por nome, apelido ou documento..." value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} />
        <select value={customerType} onChange={(e) => setCustomerType(e.target.value)}>
          <option value="">Todos os tipos</option>
          {Object.entries(customerTypeLabel).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
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
                <th>Nome</th>
                <th>Tipo de cliente</th>
                <th>Pessoa</th>
                <th>CPF/CNPJ</th>
                <th>CRM</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link to={`/clientes/${c.id}`}>{c.name}</Link>
                    {c.nickname && <div className="muted small">{c.nickname}</div>}
                  </td>
                  <td>{customerTypeLabel[c.customerType]}</td>
                  <td>{c.personType === "FISICA" ? "Física" : "Jurídica"}</td>
                  <td>{formatDocument(c.document, c.personType)}</td>
                  <td>{c.crm ?? "—"}</td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted">
                    Nenhum cliente encontrado.
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
