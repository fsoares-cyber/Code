import { useEffect, useState } from "react";
import { api } from "../../api";
import type { Quotation, QuotationGenerateResult, Scenario } from "../../types";
import { formatDate, formatNumber } from "../../format";
import { SidePanel } from "../../components/SidePanel";

interface Props {
  scenario: Scenario;
}

const statusBadge: Record<Quotation["status"], string> = {
  ENVIADA: "badge-neutral",
  RESPONDIDA: "badge-success",
  VENCIDA: "badge-danger",
};

const statusLabel: Record<Quotation["status"], string> = {
  ENVIADA: "Enviada",
  RESPONDIDA: "Respondida",
  VENCIDA: "Vencida",
};

function QuotationPanel({ quotation, onClose, onSaved }: { quotation: Quotation; onClose: () => void; onSaved: () => void }) {
  const [items, setItems] = useState(quotation.items);
  const [drafts, setDrafts] = useState<Record<string, { price: string; leadTime: string; minLot: string }>>(
    Object.fromEntries(
      quotation.items.map((i) => [
        i.id,
        {
          price: i.respondedPrice ?? "",
          leadTime: i.respondedLeadTimeDays?.toString() ?? "",
          minLot: i.respondedMinLotSize ?? "",
        },
      ]),
    ),
  );

  const receivesQuotationContacts = quotation.supplier.contacts.filter((c) => c.receivesQuotation);

  async function saveItem(itemId: string) {
    const draft = drafts[itemId];
    if (!draft.price) return;
    const updated = await api.patch<typeof items[number]>(`/quotations/${quotation.id}/items/${itemId}`, {
      respondedPrice: Number(draft.price),
      respondedLeadTimeDays: draft.leadTime ? Number(draft.leadTime) : undefined,
      respondedMinLotSize: draft.minLot ? Number(draft.minLot) : undefined,
    });
    setItems((rows) => rows.map((r) => (r.id === itemId ? updated : r)));
    onSaved();
  }

  const emailBody = [
    `Cotação ${quotation.number}`,
    "",
    ...items.map(
      (i) =>
        `${i.component?.internalCode ?? ""} / ${i.supplierPartNumber} — ${i.description} — Qtd: ${formatNumber(i.quantitySalesUnit)} — Entrega até: ${formatDate(i.deadlineDate)}`,
    ),
  ].join("\n");

  return (
    <SidePanel title={`Cotação ${quotation.number}`} onClose={onClose}>
      <div className="card">
        <h4 className="mt-0">{quotation.supplier.razaoSocial}</h4>
        <p className="small muted">
          {receivesQuotationContacts.length > 0
            ? `Enviar para: ${receivesQuotationContacts.map((c) => c.email).join(", ")}`
            : "Nenhum contato marcado como \"recebe cotação\" para este fornecedor."}
        </p>
        <p className="small muted">
          Status: <span className={`badge ${statusBadge[quotation.status]}`}>{statusLabel[quotation.status]}</span>
          {quotation.dueAt && <> · prazo de resposta: {formatDate(quotation.dueAt)}</>}
        </p>
      </div>

      <div className="card">
        <h4 className="mt-0">Conteúdo do e-mail (sem preço)</h4>
        <textarea readOnly rows={6 + items.length} value={emailBody} />
      </div>

      <div className="card">
        <h4 className="mt-0">Retorno — digitar preços recebidos</h4>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Preço</th>
              <th>Lead time</th>
              <th>Lote mín.</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  {item.component?.internalCode ?? item.supplierPartNumber}
                  {item.respondedAt && <div className="badge badge-success small">Respondido</div>}
                </td>
                <td>
                  <input
                    type="number"
                    step="0.0001"
                    value={drafts[item.id].price}
                    onChange={(e) => setDrafts((d) => ({ ...d, [item.id]: { ...d[item.id], price: e.target.value } }))}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={drafts[item.id].leadTime}
                    onChange={(e) => setDrafts((d) => ({ ...d, [item.id]: { ...d[item.id], leadTime: e.target.value } }))}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="0.0001"
                    value={drafts[item.id].minLot}
                    onChange={(e) => setDrafts((d) => ({ ...d, [item.id]: { ...d[item.id], minLot: e.target.value } }))}
                  />
                </td>
                <td>
                  <button className="btn btn-sm" onClick={() => saveItem(item.id)}>
                    Salvar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SidePanel>
  );
}

export function ScenarioQuotationsTab({ scenario }: Props) {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [generateResult, setGenerateResult] = useState<QuotationGenerateResult | null>(null);
  const [selected, setSelected] = useState<Quotation | null>(null);
  const [generating, setGenerating] = useState(false);

  async function load() {
    const data = await api.get<Quotation[]>(`/scenarios/${scenario.id}/quotations`);
    setQuotations(data);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario.id]);

  async function generate() {
    setGenerating(true);
    const result = await api.post<QuotationGenerateResult>(`/scenarios/${scenario.id}/quotations/generate`);
    setGenerating(false);
    setGenerateResult(result);
    load();
  }

  async function openQuotation(id: string) {
    const full = await api.get<Quotation>(`/quotations/${id}`);
    setSelected(full);
  }

  if (scenario.status === "RASCUNHO") {
    return (
      <div className="card">
        <p className="muted mt-0">Aprove o cenário para liberar a geração de cotações.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <div className="flex-between">
          <p className="mt-0 small muted">
            Agrupa os itens do plano de compras por fornecedor e cria uma cotação por fornecedor. Fornecedores não
            qualificados ou com certificado vencido são bloqueados automaticamente.
          </p>
          <button className="btn btn-primary" onClick={generate} disabled={generating}>
            {generating ? "Gerando..." : "Gerar cotações"}
          </button>
        </div>
        {generateResult && (
          <div>
            <p className="small">{generateResult.created.length} cotação(ões) criada(s).</p>
            {generateResult.skipped.length > 0 && (
              <div className="alert-row alert-fornecedor">
                <div>
                  <strong>Fornecedores bloqueados da cotação:</strong>
                  {generateResult.skipped.map((s) => (
                    <div key={s.supplierId} className="small">
                      {s.razaoSocial} — {s.reason}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Número</th>
              <th>Fornecedor</th>
              <th>Status</th>
              <th>Itens respondidos</th>
              <th>Prazo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {quotations.map((q) => (
              <tr key={q.id}>
                <td>{q.number}</td>
                <td>{q.supplier.razaoSocial}</td>
                <td>
                  <span className={`badge ${statusBadge[q.status]}`}>{statusLabel[q.status]}</span>
                </td>
                <td>
                  {q.respondedCount ?? 0} / {q.itemsCount ?? q.items.length}
                </td>
                <td>{q.dueAt ? formatDate(q.dueAt) : "—"}</td>
                <td>
                  <button className="btn btn-sm" onClick={() => openQuotation(q.id)}>
                    Abrir
                  </button>
                </td>
              </tr>
            ))}
            {quotations.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  Nenhuma cotação gerada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <QuotationPanel
          quotation={selected}
          onClose={() => setSelected(null)}
          onSaved={() => {
            load();
            openQuotation(selected.id);
          }}
        />
      )}
    </div>
  );
}
