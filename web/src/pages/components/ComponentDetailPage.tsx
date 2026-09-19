import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../api";
import type { Component } from "../../types";
import { AddSupplierToComponentForm } from "../../components/AddSupplierToComponentForm";
import { formatCurrency, formatDate } from "../../format";
import { QualificationBadge } from "../../components/Badges";

export function ComponentDetailPage() {
  const { id } = useParams();
  const [component, setComponent] = useState<Component | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    if (!id) return;
    const data = await api.get<Component>(`/components/${id}`);
    setComponent(data);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!component) return <p className="muted">Carregando...</p>;

  const now = new Date();

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>{component.internalCode}</h2>
          <p>
            {component.description} · unidade de uso: {component.usageUnit}
            {component.critical && (
              <>
                {" "}
                · <span className="badge badge-warning">Crítico</span>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="card">
        <div className="flex-between">
          <h3 className="mt-0">Fornecedores deste componente</h3>
          <button className="btn btn-sm" onClick={() => setShowForm((s) => !s)}>
            {showForm ? "Cancelar" : "+ Adicionar fornecedor"}
          </button>
        </div>
        {showForm && (
          <div style={{ marginBottom: 12 }}>
            <AddSupplierToComponentForm
              componentId={component.id}
              onAdded={() => {
                setShowForm(false);
                load();
              }}
            />
          </div>
        )}
        <table>
          <thead>
            <tr>
              <th>Fornecedor</th>
              <th>Código dele</th>
              <th>Preço</th>
              <th>Lote mín. / múltiplo</th>
              <th>Lead time</th>
              <th>Validade do preço</th>
              <th>Preferencial</th>
            </tr>
          </thead>
          <tbody>
            {component.componentSuppliers?.map((cs) => {
              const stale = new Date(cs.priceValidUntil) < now;
              return (
                <tr key={cs.id}>
                  <td>
                    {cs.supplier.razaoSocial} <QualificationBadge status={cs.supplier.qualificationStatus} />
                  </td>
                  <td>{cs.supplierPartNumber}</td>
                  <td>{formatCurrency(cs.unitPrice, cs.currency as "BRL" | "USD")}</td>
                  <td>
                    {cs.minLotSize} / {cs.purchaseMultiple} {cs.salesUnit}
                  </td>
                  <td>{cs.leadTimeDays} dias</td>
                  <td>
                    {formatDate(cs.priceValidUntil)} {stale && <span className="badge badge-danger">Vencido</span>}
                  </td>
                  <td>{cs.preferred ? "Sim" : "Não"}</td>
                </tr>
              );
            })}
            {(!component.componentSuppliers || component.componentSuppliers.length === 0) && (
              <tr>
                <td colSpan={7} className="muted">
                  Nenhum fornecedor cadastrado para este componente ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
