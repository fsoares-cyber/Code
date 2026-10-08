import { useState } from "react";
import { api } from "../../api";
import type { Customer, CustomerType, PersonType } from "../../types";
import { formatDocument, isValidDocument, onlyDigits } from "../../lib/documentValidation";

interface Props {
  initial?: Customer;
  onSaved: (customer: Customer) => void;
  onCancel: () => void;
}

const customerTypeOptions: { value: CustomerType; label: string }[] = [
  { value: "HOSPITAL", label: "H — Hospital" },
  { value: "MEDICO", label: "M — Médico" },
  { value: "FORNECEDOR", label: "F — Fornecedor" },
  { value: "REPARO", label: "R — Empresa de Reparo" },
  { value: "OUTROS", label: "O — Outros" },
];

type FormState = {
  customerType: CustomerType;
  personType: PersonType;
  document: string;
  crm: string;
  name: string;
  nickname: string;
  invoiceName: string;
};

function toFormState(customer?: Customer): FormState {
  return {
    customerType: customer?.customerType ?? "HOSPITAL",
    personType: customer?.personType ?? "JURIDICA",
    document: customer ? formatDocument(customer.document, customer.personType) : "",
    crm: customer?.crm ?? "",
    name: customer?.name ?? "",
    nickname: customer?.nickname ?? "",
    invoiceName: customer?.invoiceName ?? "",
  };
}

export function CustomerForm({ initial, onSaved, onCancel }: Props) {
  const [form, setForm] = useState<FormState>(toFormState(initial));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [documentCheck, setDocumentCheck] = useState<"valido" | "invalido" | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const requiresCrm = form.customerType === "MEDICO" && form.personType === "FISICA";

  function updateDocument(raw: string) {
    setForm((f) => ({ ...f, document: formatDocument(raw, f.personType) }));
    setDocumentCheck(null);
  }

  function updatePersonType(personType: PersonType) {
    setForm((f) => ({ ...f, personType, document: formatDocument(f.document, personType) }));
    setDocumentCheck(null);
  }

  function validateDocument() {
    const valid = form.document.trim() !== "" && isValidDocument(form.document, form.personType);
    setDocumentCheck(valid ? "valido" : "invalido");
    setErrors((e) => ({
      ...e,
      document: valid ? "" : form.personType === "FISICA" ? "CPF inválido" : "CNPJ inválido",
    }));
  }

  function runClientValidation(): Record<string, string> {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Informe o nome";
    if (!form.document.trim()) next.document = "Informe o CPF/CNPJ";
    else if (!isValidDocument(form.document, form.personType)) {
      next.document = form.personType === "FISICA" ? "CPF inválido" : "CNPJ inválido";
    }
    if (requiresCrm && !form.crm.trim()) next.crm = "CRM é obrigatório para médico pessoa física";
    return next;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBanner(null);
    setConfirmation(null);
    const clientErrors = runClientValidation();
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) return;

    setSaving(true);
    try {
      const payload = {
        customerType: form.customerType,
        personType: form.personType,
        document: onlyDigits(form.document),
        crm: requiresCrm ? form.crm.trim() : undefined,
        name: form.name.trim(),
        nickname: form.nickname.trim() || undefined,
        invoiceName: form.invoiceName.trim() || undefined,
      };
      const saved = initial
        ? await api.patch<Customer>(`/customers/${initial.id}`, payload)
        : await api.post<Customer>("/customers", payload);
      setConfirmation(initial ? "Cliente atualizado com sucesso." : "Cliente cadastrado com sucesso.");
      if (!initial) setForm(toFormState(undefined));
      setDocumentCheck(null);
      onSaved(saved);
    } catch (err) {
      setBanner(err instanceof Error ? err.message : "Falha ao salvar cliente");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {banner && (
        <div className="alert-row alert-fora" style={{ marginBottom: 12 }}>
          {banner}
        </div>
      )}
      {confirmation && (
        <div className="alert-row" style={{ marginBottom: 12, background: "var(--success-bg)", color: "var(--success)" }}>
          {confirmation}
        </div>
      )}

      <h4 className="mt-0">Dados do cliente</h4>
      <div className="form-grid" style={{ marginBottom: 20 }}>
        <div>
          <label>Nome *</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Conforme CNPJ/CPF"
          />
          {errors.name && <p className="small" style={{ color: "var(--danger)" }}>{errors.name}</p>}
        </div>
        <div>
          <label>Apelido</label>
          <input
            value={form.nickname}
            onChange={(e) => setForm({ ...form, nickname: e.target.value })}
            placeholder="Nome fantasia / como é conhecido"
          />
        </div>
        <div>
          <label>Nome para Nota Fiscal</label>
          <input value={form.invoiceName} onChange={(e) => setForm({ ...form, invoiceName: e.target.value })} />
        </div>
      </div>

      <h4>Classificação</h4>
      <div className="form-grid" style={{ marginBottom: 20 }}>
        <div>
          <label>Tipo de cliente *</label>
          <select
            required
            value={form.customerType}
            onChange={(e) => setForm({ ...form, customerType: e.target.value as CustomerType })}
          >
            {customerTypeOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Tipo de pessoa *</label>
          <select required value={form.personType} onChange={(e) => updatePersonType(e.target.value as PersonType)}>
            <option value="JURIDICA">J — Jurídica (CNPJ)</option>
            <option value="FISICA">F — Física (CPF)</option>
          </select>
        </div>
      </div>

      <h4>Documentos</h4>
      <div className="form-grid">
        <div>
          <label>{form.personType === "FISICA" ? "CPF *" : "CNPJ *"}</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              required
              value={form.document}
              onChange={(e) => updateDocument(e.target.value)}
              placeholder={form.personType === "FISICA" ? "000.000.000-00" : "00.000.000/0000-00"}
            />
            <button type="button" className="btn btn-sm" onClick={validateDocument}>
              Validar
            </button>
          </div>
          <p className="small muted" style={{ marginTop: 4 }}>
            Validação local do dígito verificador — sem consulta a base oficial nesta etapa.
          </p>
          {documentCheck === "valido" && <span className="badge badge-success">Documento válido</span>}
          {documentCheck === "invalido" && <span className="badge badge-danger">Documento inválido</span>}
          {errors.document && !documentCheck && (
            <p className="small" style={{ color: "var(--danger)" }}>
              {errors.document}
            </p>
          )}
        </div>
        {requiresCrm && (
          <div>
            <label>CRM *</label>
            <input required value={form.crm} onChange={(e) => setForm({ ...form, crm: e.target.value })} />
            {errors.crm && (
              <p className="small" style={{ color: "var(--danger)" }}>
                {errors.crm}
              </p>
            )}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? "Salvando..." : "Salvar"}
        </button>
        <button className="btn" type="button" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
