import { useEffect, useState } from "react";
import { api } from "../api";
import type { Supplier } from "../types";

interface Props {
  componentId: string;
  onAdded: () => void;
}

const initial = {
  supplierId: "",
  supplierPartNumber: "",
  unitPrice: "",
  currency: "BRL",
  salesUnit: "",
  conversionFactorToUsageUnit: "1",
  minLotSize: "1",
  purchaseMultiple: "1",
  leadTimeDays: "",
  priceDate: new Date().toISOString().slice(0, 10),
  priceValidUntil: "",
  preferred: false,
};

// Formulário compartilhado: usado no cadastro de componente e no painel
// lateral aberto a partir do planejamento ("adicionar fornecedor a este
// componente"), para não duplicar a tela de cadastro em dois lugares.
export function AddSupplierToComponentForm({ componentId, onAdded }: Props) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [form, setForm] = useState(initial);

  useEffect(() => {
    api.get<Supplier[]>("/suppliers").then(setSuppliers);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await api.post(`/components/${componentId}/suppliers`, {
      ...form,
      unitPrice: Number(form.unitPrice),
      conversionFactorToUsageUnit: Number(form.conversionFactorToUsageUnit),
      minLotSize: Number(form.minLotSize),
      purchaseMultiple: Number(form.purchaseMultiple),
      leadTimeDays: Number(form.leadTimeDays),
    });
    setForm(initial);
    onAdded();
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <div className="full">
        <label>Fornecedor *</label>
        <select required value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
          <option value="">Selecione...</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.razaoSocial} {!s.isRegular ? "(irregular)" : ""}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label>Código do fornecedor para o item *</label>
        <input required value={form.supplierPartNumber} onChange={(e) => setForm({ ...form, supplierPartNumber: e.target.value })} />
      </div>
      <div>
        <label>Preço unitário *</label>
        <input required type="number" step="0.0001" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} />
      </div>
      <div>
        <label>Moeda</label>
        <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
          <option value="BRL">BRL</option>
          <option value="USD">USD</option>
        </select>
      </div>
      <div>
        <label>Unidade de venda *</label>
        <input required placeholder="rolo, caixa, unidade..." value={form.salesUnit} onChange={(e) => setForm({ ...form, salesUnit: e.target.value })} />
      </div>
      <div>
        <label>Fator de conversão p/ unidade de uso *</label>
        <input
          required
          type="number"
          step="0.000001"
          value={form.conversionFactorToUsageUnit}
          onChange={(e) => setForm({ ...form, conversionFactorToUsageUnit: e.target.value })}
        />
      </div>
      <div>
        <label>Lote mínimo *</label>
        <input required type="number" step="0.0001" value={form.minLotSize} onChange={(e) => setForm({ ...form, minLotSize: e.target.value })} />
      </div>
      <div>
        <label>Múltiplo de compra</label>
        <input type="number" step="0.0001" value={form.purchaseMultiple} onChange={(e) => setForm({ ...form, purchaseMultiple: e.target.value })} />
      </div>
      <div>
        <label>Lead time (dias) *</label>
        <input required type="number" value={form.leadTimeDays} onChange={(e) => setForm({ ...form, leadTimeDays: e.target.value })} />
      </div>
      <div>
        <label>Data do preço *</label>
        <input required type="date" value={form.priceDate} onChange={(e) => setForm({ ...form, priceDate: e.target.value })} />
      </div>
      <div>
        <label>Validade do preço *</label>
        <input required type="date" value={form.priceValidUntil} onChange={(e) => setForm({ ...form, priceValidUntil: e.target.value })} />
      </div>
      <div>
        <label>
          <input type="checkbox" checked={form.preferred} onChange={(e) => setForm({ ...form, preferred: e.target.checked })} /> Fornecedor preferencial
        </label>
      </div>
      <div className="full">
        <button className="btn btn-primary" type="submit">
          Salvar relação componente × fornecedor
        </button>
      </div>
    </form>
  );
}
