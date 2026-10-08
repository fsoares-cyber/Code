import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../api";
import type { Customer } from "../../types";
import { CustomerForm } from "./CustomerForm";

export function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);

  async function load() {
    if (!id) return;
    setCustomer(await api.get<Customer>(`/customers/${id}`));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleDelete() {
    if (!id) return;
    if (!confirm("Excluir este cliente? Essa ação não pode ser desfeita.")) return;
    await api.delete(`/customers/${id}`);
    navigate("/clientes");
  }

  if (!customer) return <p className="muted">Carregando...</p>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>{customer.name}</h2>
          <p>Editar cadastro de cliente.</p>
        </div>
        <button className="btn btn-danger" onClick={handleDelete}>
          Excluir cliente
        </button>
      </div>

      <div className="card">
        <CustomerForm
          initial={customer}
          onSaved={(saved) => setCustomer(saved)}
          onCancel={() => navigate("/clientes")}
        />
      </div>
    </div>
  );
}
