import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../api";
import type { Supplier } from "../../types";
import { CertificationStatusBadge, QualificationBadge, SupplierStatusBadge } from "../../components/Badges";
import { FileUploadField } from "../../components/FileUploadField";
import { formatDate } from "../../format";

const emptyContact = { name: "", role: "", email: "", phone: "", receivesQuotation: false };
const emptyCert = { type: "", number: "", issuer: "", issueDate: "", expiryDate: "", fileUrl: "" };

export function SupplierDetailPage() {
  const { id } = useParams();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [contactForm, setContactForm] = useState(emptyContact);
  const [showContactForm, setShowContactForm] = useState(false);
  const [certForm, setCertForm] = useState(emptyCert);
  const [showCertForm, setShowCertForm] = useState(false);

  async function load() {
    if (!id) return;
    const data = await api.get<Supplier>(`/suppliers/${id}`);
    setSupplier(data);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function addContact(e: React.FormEvent) {
    e.preventDefault();
    await api.post(`/suppliers/${id}/contacts`, contactForm);
    setContactForm(emptyContact);
    setShowContactForm(false);
    load();
  }

  async function addCertification(e: React.FormEvent) {
    e.preventDefault();
    await api.post(`/suppliers/${id}/certifications`, certForm);
    setCertForm(emptyCert);
    setShowCertForm(false);
    load();
  }

  async function setQualification(status: string) {
    await api.patch(`/suppliers/${id}`, { qualificationStatus: status, qualificationLastReview: new Date().toISOString() });
    load();
  }

  if (!supplier) return <p className="muted">Carregando...</p>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>{supplier.razaoSocial}</h2>
          <p>
            {supplier.taxId} · {supplier.origin === "NACIONAL" ? "Nacional" : "Importado"} · {supplier.country}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <SupplierStatusBadge status={supplier.status} />
          <QualificationBadge status={supplier.qualificationStatus} />
          {supplier.isRegular ? (
            <span className="badge badge-success">Regular para cotação</span>
          ) : (
            <span className="badge badge-danger">Bloqueado para cotação</span>
          )}
        </div>
      </div>

      <div className="card">
        <h3 className="mt-0">Condições comerciais padrão</h3>
        <table>
          <tbody>
            <tr>
              <td className="muted">Moeda</td>
              <td>{supplier.currency}</td>
              <td className="muted">Condição de pagamento</td>
              <td>{supplier.paymentTerm.replace("DIAS_", "").replaceAll("_", "/")}</td>
            </tr>
            <tr>
              <td className="muted">Incoterm</td>
              <td>{supplier.incoterm ?? "—"}</td>
              <td className="muted">Prazo médio de entrega</td>
              <td>{supplier.avgLeadTimeDays ? `${supplier.avgLeadTimeDays} dias` : "—"}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3 className="mt-0">Qualificação</h3>
        <p className="small muted">
          Última avaliação: {supplier.qualificationLastReview ? formatDate(supplier.qualificationLastReview) : "—"} · Próxima
          revisão: {supplier.qualificationNextReview ? formatDate(supplier.qualificationNextReview) : "—"}
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          {["QUALIFICADO", "EM_QUALIFICACAO", "REPROVADO"].map((s) => (
            <button key={s} className="btn btn-sm" onClick={() => setQualification(s)} disabled={supplier.qualificationStatus === s}>
              Marcar como {s === "QUALIFICADO" ? "qualificado" : s === "EM_QUALIFICACAO" ? "em qualificação" : "reprovado"}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="flex-between">
          <h3 className="mt-0">Contatos</h3>
          <button className="btn btn-sm" onClick={() => setShowContactForm((s) => !s)}>
            {showContactForm ? "Cancelar" : "+ Contato"}
          </button>
        </div>
        {showContactForm && (
          <form className="form-grid" onSubmit={addContact} style={{ marginBottom: 12 }}>
            <div>
              <label>Nome *</label>
              <input required value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} />
            </div>
            <div>
              <label>Cargo</label>
              <input value={contactForm.role} onChange={(e) => setContactForm({ ...contactForm, role: e.target.value })} />
            </div>
            <div>
              <label>E-mail *</label>
              <input required type="email" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} />
            </div>
            <div>
              <label>Telefone</label>
              <input value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} />
            </div>
            <div>
              <label>
                <input
                  type="checkbox"
                  checked={contactForm.receivesQuotation}
                  onChange={(e) => setContactForm({ ...contactForm, receivesQuotation: e.target.checked })}
                />{" "}
                Recebe cotação
              </label>
            </div>
            <div className="full">
              <button className="btn btn-primary" type="submit">
                Salvar contato
              </button>
            </div>
          </form>
        )}
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Cargo</th>
              <th>E-mail</th>
              <th>Telefone</th>
              <th>Recebe cotação</th>
            </tr>
          </thead>
          <tbody>
            {supplier.contacts.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.role ?? "—"}</td>
                <td>{c.email}</td>
                <td>{c.phone ?? "—"}</td>
                <td>{c.receivesQuotation ? "Sim" : "Não"}</td>
              </tr>
            ))}
            {supplier.contacts.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  Nenhum contato cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="flex-between">
          <h3 className="mt-0">Certificações e qualificação</h3>
          <button className="btn btn-sm" onClick={() => setShowCertForm((s) => !s)}>
            {showCertForm ? "Cancelar" : "+ Certificado"}
          </button>
        </div>
        {showCertForm && (
          <form className="form-grid" onSubmit={addCertification} style={{ marginBottom: 12 }}>
            <div>
              <label>Tipo *</label>
              <input required placeholder="ISO 13485, RoHS..." value={certForm.type} onChange={(e) => setCertForm({ ...certForm, type: e.target.value })} />
            </div>
            <div>
              <label>Número *</label>
              <input required value={certForm.number} onChange={(e) => setCertForm({ ...certForm, number: e.target.value })} />
            </div>
            <div>
              <label>Órgão emissor *</label>
              <input required value={certForm.issuer} onChange={(e) => setCertForm({ ...certForm, issuer: e.target.value })} />
            </div>
            <div>
              <label>Arquivo (PDF, PNG, JPEG ou WEBP)</label>
              <FileUploadField value={certForm.fileUrl} onChange={(url) => setCertForm({ ...certForm, fileUrl: url })} />
            </div>
            <div>
              <label>Data de emissão *</label>
              <input required type="date" value={certForm.issueDate} onChange={(e) => setCertForm({ ...certForm, issueDate: e.target.value })} />
            </div>
            <div>
              <label>Data de validade *</label>
              <input required type="date" value={certForm.expiryDate} onChange={(e) => setCertForm({ ...certForm, expiryDate: e.target.value })} />
            </div>
            <div className="full">
              <button className="btn btn-primary" type="submit">
                Salvar certificado
              </button>
            </div>
          </form>
        )}
        <table>
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Número</th>
              <th>Emissor</th>
              <th>Validade</th>
              <th>Status</th>
              <th>Anexo</th>
            </tr>
          </thead>
          <tbody>
            {supplier.certifications
              .filter((c) => c.isCurrent)
              .map((c) => (
                <tr key={c.id}>
                  <td>{c.type}</td>
                  <td>{c.number}</td>
                  <td>{c.issuer}</td>
                  <td>{formatDate(c.expiryDate)}</td>
                  <td>
                    <CertificationStatusBadge status={c.status} />
                  </td>
                  <td>
                    {c.fileUrl ? (
                      <a href={c.fileUrl} target="_blank" rel="noreferrer">
                        Ver
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            {supplier.certifications.filter((c) => c.isCurrent).length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  Nenhum certificado cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {supplier.componentSuppliers && supplier.componentSuppliers.length > 0 && (
        <div className="card">
          <h3 className="mt-0">Componentes fornecidos</h3>
          <table>
            <thead>
              <tr>
                <th>Componente</th>
                <th>Código do fornecedor</th>
                <th>Preço</th>
                <th>Preferencial</th>
              </tr>
            </thead>
            <tbody>
              {supplier.componentSuppliers.map((cs) => (
                <tr key={cs.id}>
                  <td>{cs.component?.internalCode ?? cs.componentId}</td>
                  <td>{cs.supplierPartNumber}</td>
                  <td>
                    {cs.unitPrice} {cs.currency}
                  </td>
                  <td>{cs.preferred ? "Sim" : "Não"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
